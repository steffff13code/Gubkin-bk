import { PrismaClient, type DepartmentCode, type DepartmentPosition } from "@prisma/client";
import { LECTURE_TEMPLATE } from "../lib/tasks/lecture-template";
import { buildTaskRows, type DepartmentAssignments } from "../lib/tasks/generate";
import { REGULATIONS } from "./regulations-seed-data";
import { ensureRolePasswords } from "../lib/role-passwords";

const prisma = new PrismaClient();

const DEPARTMENTS: { code: DepartmentCode; title: string }[] = [
  { code: "GUESTS", title: "Гости" },
  { code: "SECURITY", title: "ЦБ" },
  { code: "PR", title: "Пиар" },
  { code: "VENUE_BOOKING", title: "Аудитория" },
  { code: "CONTENT", title: "Контент" },
  { code: "STAGE", title: "Площадка" },
  { code: "INTENSIVES", title: "Интенсивы" }
];

// По одному тестовому пользователю на отдел: руководитель, зам, участник.
const TEST_MEMBERS: { code: DepartmentCode; position: DepartmentPosition; firstName: string; telegramId: string }[] =
  [
    { code: "GUESTS", position: "HEAD", firstName: "Анна Гостева", telegramId: "1000001" },
    { code: "GUESTS", position: "DEPUTY", firstName: "Борис Гостев", telegramId: "1000002" },
    { code: "GUESTS", position: "MEMBER", firstName: "Вера Гостева", telegramId: "1000003" },
    { code: "SECURITY", position: "HEAD", firstName: "Григорий Цебов", telegramId: "1000004" },
    { code: "SECURITY", position: "DEPUTY", firstName: "Дина Цебова", telegramId: "1000005" },
    { code: "SECURITY", position: "MEMBER", firstName: "Егор Цебов", telegramId: "1000006" },
    { code: "PR", position: "HEAD", firstName: "Жанна Пиарова", telegramId: "1000007" },
    { code: "PR", position: "DEPUTY", firstName: "Захар Пиаров", telegramId: "1000008" },
    { code: "PR", position: "MEMBER", firstName: "Ирина Пиарова", telegramId: "1000009" },
    { code: "VENUE_BOOKING", position: "HEAD", firstName: "Кирилл Аудиторов", telegramId: "1000010" },
    { code: "VENUE_BOOKING", position: "DEPUTY", firstName: "Лада Аудиторова", telegramId: "1000011" },
    { code: "VENUE_BOOKING", position: "MEMBER", firstName: "Марк Аудиторов", telegramId: "1000012" },
    { code: "CONTENT", position: "HEAD", firstName: "Надежда Контентова", telegramId: "1000013" },
    { code: "CONTENT", position: "DEPUTY", firstName: "Олег Контентов", telegramId: "1000014" },
    { code: "CONTENT", position: "MEMBER", firstName: "Полина Контентова", telegramId: "1000015" },
    { code: "STAGE", position: "HEAD", firstName: "Руслан Сценов", telegramId: "1000016" },
    { code: "STAGE", position: "DEPUTY", firstName: "Светлана Сценова", telegramId: "1000017" },
    { code: "STAGE", position: "MEMBER", firstName: "Тимур Сценов", telegramId: "1000018" },
    { code: "INTENSIVES", position: "HEAD", firstName: "Ульяна Интенсивова", telegramId: "1000019" },
    { code: "INTENSIVES", position: "DEPUTY", firstName: "Фёдор Интенсивов", telegramId: "1000020" },
    { code: "INTENSIVES", position: "MEMBER", firstName: "Христина Интенсивова", telegramId: "1000021" }
  ];

/** Находит демо-пользователя (в т.ч. созданного старыми версиями сида) или создаёт его. */
async function demoUser(firstName: string, legacyTelegramId: string, role: "ADMIN" | "LEAD" | "MEMBER") {
  const found = await prisma.user.findFirst({
    where: { OR: [{ telegramId: legacyTelegramId }, { firstName, isDemo: true }] }
  });
  if (found) {
    return prisma.user.update({ where: { id: found.id }, data: { isDemo: true, botStarted: false, telegramId: null } });
  }
  return prisma.user.create({ data: { firstName, role, isDemo: true } });
}

async function seedDemo() {
  console.log("Демо: люди по отделам...");
  const demoAdmin = await demoUser("Админ Клуба", "999999999", "ADMIN");
  for (const m of TEST_MEMBERS) {
    const user = await demoUser(m.firstName, m.telegramId, m.position === "HEAD" ? "LEAD" : "MEMBER");
    await prisma.userDepartment.upsert({
      where: { userId_departmentCode: { userId: user.id, departmentCode: m.code } },
      create: { userId: user.id, departmentCode: m.code, position: m.position },
      update: { position: m.position }
    });
  }
  const guestsHead = await prisma.user.findFirstOrThrow({ where: { firstName: "Анна Гостева", isDemo: true } });

  console.log("Демо: мероприятие с планом...");
  const existingEvent = await prisma.event.findFirst({ where: { title: "Лекция с гостем: пример" } });
  if (existingEvent) {
    await prisma.event.update({ where: { id: existingEvent.id }, data: { isDemo: true } });
  } else {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setUTCDate(targetDate.getUTCDate() + 35);
    targetDate.setUTCHours(0, 0, 0, 0);

    const event = await prisma.event.create({
      data: {
        title: "Лекция с гостем: пример",
        type: "LECTURE",
        stage: "IN_PROGRESS",
        isDemo: true,
        description:
          "## Программа\n\nВстреча с гостем из индустрии: выступление, вопросы, питч-сессия. Демо-мероприятие, чтобы посмотреть, как работает план по регламенту.",
        leadId: guestsHead.id,
        targetDate,
        dateFixed: true,
        timeSlot: "17:15",
        guestName: "Иван Гостев",
        guestOrganization: "Пример Индастриз",
        guestTopic: "Как построить карьеру в нефтегазе",
        guestStatus: "WINDOW_AGREED",
        expectedAttendance: 120,
        createdById: demoAdmin.id,
        approvedById: demoAdmin.id,
        approvedAt: now,
        stageChangedAt: now
      }
    });

    const templates = await prisma.taskTemplate.findMany({
      where: { eventType: "LECTURE" },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }]
    });
    const deptRows = await prisma.userDepartment.findMany({
      where: { position: { in: ["HEAD", "DEPUTY"] }, user: { isDemo: true } }
    });
    const assignments: DepartmentAssignments = {};
    for (const row of deptRows) {
      const code = row.departmentCode;
      assignments[code] ??= { headId: null, deputyId: null };
      if (row.position === "HEAD") assignments[code]!.headId = row.userId;
      if (row.position === "DEPUTY") assignments[code]!.deputyId = row.userId;
    }
    const rows = buildTaskRows(templates, targetDate, now, assignments, event.leadId);
    await prisma.task.createMany({
      data: rows.map((r) => ({
        eventId: event.id,
        ...r,
        // Дата в демо-мероприятии уже зафиксирована — задача, закрывающаяся фиксацией, выполнена.
        ...(r.autoComplete === "DATE_FIXED" ? { status: "DONE" as const, completedAt: now, completedById: guestsHead.id } : {})
      }))
    });
    await prisma.activityLog.create({
      data: { eventId: event.id, action: "TASKS_GENERATED", payload: { count: rows.length, seed: true } }
    });
  }

  console.log("Демо: идеи...");
  const ideas = [
    {
      text: "Делать общий чат для новых участников клуба с приветственным сообщением и ссылками на регламенты.",
      category: "IDEA" as const,
      authorId: guestsHead.id,
      targetDepartment: null
    },
    {
      text: "На последней лекции звук был тихим в задних рядах — нужен второй динамик или колонка.",
      category: "CRITIQUE" as const,
      authorId: null,
      targetDepartment: "STAGE" as const
    },
    {
      text: "Стоит завести шаблон сторис для анонсов, чтобы пиар не собирал макет с нуля каждый раз.",
      category: "OTHER" as const,
      authorId: null,
      targetDepartment: "PR" as const
    }
  ];
  for (const idea of ideas) {
    const found = await prisma.idea.findFirst({ where: { text: idea.text } });
    if (found) await prisma.idea.update({ where: { id: found.id }, data: { isDemo: true } });
    else await prisma.idea.create({ data: { ...idea, isDemo: true } });
  }
}

async function main() {
  console.log("Отделы...");
  for (const d of DEPARTMENTS) {
    await prisma.department.upsert({ where: { code: d.code }, create: d, update: { title: d.title } });
  }

  console.log("Шаблон задач LECTURE...");
  const existingLectureTemplates = await prisma.taskTemplate.count({ where: { eventType: "LECTURE" } });
  if (existingLectureTemplates === 0) {
    await prisma.taskTemplate.createMany({
      data: LECTURE_TEMPLATE.map((row) => ({ eventType: "LECTURE" as const, ...row }))
    });
  } else {
    // Дозаполняем поля, добавленные позже (autoComplete/firesTrigger), не трогая сроки —
    // их администратор мог уже поправить в настройках.
    for (const row of LECTURE_TEMPLATE) {
      if (!row.autoComplete) continue;
      await prisma.taskTemplate.updateMany({
        where: { eventType: "LECTURE", title: row.title, autoComplete: null },
        data: { autoComplete: row.autoComplete }
      });
    }
  }
  // Пустые шаблоны для остальных типов — заполнит администратор в настройках.
  for (const type of ["GAME", "CASE", "CONFERENCE", "SERIES", "INTENSIVE"] as const) {
    // ничего не создаём — отсутствие шаблона допустимо, карточка мероприятия
    // покажет плашку «зафиксируйте дату», план останется пустым до заполнения.
    void type;
  }

  console.log("Пароли ролей...");
  await ensureRolePasswords();

  // Демо-данные создаются один раз. Если администратор их удалил — не возвращаем.
  const demoFlag = await prisma.appSetting.findUnique({ where: { key: "demo_seeded" } });
  if (!demoFlag) {
    await seedDemo();
    await prisma.appSetting.create({ data: { key: "demo_seeded", value: new Date().toISOString() } });
  }

  console.log("Стартовый администратор...");
  let admin = await prisma.user.findFirst({ where: { role: "ADMIN", isDemo: false }, orderBy: { createdAt: "asc" } });
  if (!admin) {
    admin = await prisma.user.create({ data: { firstName: "Администратор", role: "ADMIN" } });
  }

  console.log("Регламенты...");
  for (const r of REGULATIONS) {
    const existing = await prisma.regulation.findUnique({ where: { slug: r.slug } });
    if (!existing) {
      await prisma.regulation.create({
        data: {
          slug: r.slug,
          title: r.title,
          department: r.department,
          body: r.body,
          sortOrder: r.sortOrder,
          updatedById: admin.id
        }
      });
    }
  }

  console.log("Сид завершён.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

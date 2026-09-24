import { PrismaClient, type DepartmentCode, type DepartmentPosition } from "@prisma/client";
import { LECTURE_TEMPLATE, LECTURE_TEMPLATE_VERSION } from "../lib/tasks/lecture-template";
import { buildTaskRows, type DepartmentAssignments } from "../lib/tasks/generate";
import { ensureRolePasswords } from "../lib/role-passwords";
import { deleteDemoData } from "../lib/demo";
import { addDays, calendarDay } from "../lib/time";

const prisma = new PrismaClient();

const DEPARTMENTS: { code: DepartmentCode; title: string }[] = [
  { code: "GUESTS", title: "Гости" },
  { code: "SECURITY", title: "ЦБ" },
  { code: "PR", title: "Пиар" },
  { code: "CONTENT", title: "Контент" },
  { code: "STAGE", title: "Площадка" },
  { code: "INTENSIVES", title: "Интенсивы" }
];

// Демо-состав по регламенту: по руководителю на отдел, на площадке двое, плюс рядовой
// участник Гостей — чтобы посмотреть кабинет участника. Без личных имён — только роли.
const DEMO_PEOPLE: { name: string; role: "LEAD" | "MEMBER"; code: DepartmentCode; position: DepartmentPosition }[] = [
  { name: "Руководитель Гостей", role: "LEAD", code: "GUESTS", position: "HEAD" },
  { name: "Участник Гостей", role: "MEMBER", code: "GUESTS", position: "MEMBER" },
  { name: "Руководитель ЦБ", role: "LEAD", code: "SECURITY", position: "HEAD" },
  { name: "Руководитель Пиара", role: "LEAD", code: "PR", position: "HEAD" },
  { name: "Руководитель Контента", role: "LEAD", code: "CONTENT", position: "HEAD" },
  { name: "Старший площадки", role: "LEAD", code: "STAGE", position: "HEAD" },
  { name: "Второй на площадке", role: "MEMBER", code: "STAGE", position: "DEPUTY" },
  { name: "Руководитель Интенсивов", role: "LEAD", code: "INTENSIVES", position: "HEAD" }
];
const DEMO_VERSION = "2";

/** Календарный день по Москве со сдвигом — в таком виде хранятся даты мероприятий. */
function day(offset: number): Date {
  return addDays(calendarDay(new Date()), offset);
}

/** Демо-мероприятие с планом по шаблону: всё, что по сроку уже прошло, выполнено вовремя. */
async function demoEvent(opts: { title: string; daysAhead: number; adminId: string; leadId: string; guest: string }) {
  const now = new Date();
  const targetDate = day(opts.daysAhead);
  const event = await prisma.event.create({
    data: {
      title: opts.title,
      type: "LECTURE",
      stage: "IN_PROGRESS",
      isDemo: true,
      description:
        "## Программа\n\nВыступление гостя, вопросы из заготовленного списка и из зала, питч-сессия 7 минут, общее фото. Демо-мероприятие — посмотреть, как план идёт по регламенту.",
      leadId: opts.leadId,
      targetDate,
      dateFixed: true,
      timeSlot: "17:15",
      venue: "Ауд. 1318",
      guestName: opts.guest,
      guestOrganization: "Пример Индастриз",
      guestTopic: "Как построить карьеру в энергетике",
      guestStatus: "SECURITY_APPROVED",
      expectedAttendance: 120,
      createdById: opts.leadId,
      approvedById: opts.adminId,
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
    assignments[row.departmentCode] ??= { headId: null, deputyId: null };
    if (row.position === "HEAD") assignments[row.departmentCode]!.headId = row.userId;
    if (row.position === "DEPUTY") assignments[row.departmentCode]!.deputyId = row.userId;
  }
  // Ход событий по регламенту: заявка в ЦБ за месяц, ответ через неделю, дата зафиксирована за 3 недели.
  const fired: Record<string, Date> = {
    SECURITY_SUBMITTED: day(opts.daysAhead - 30),
    SECURITY_ANSWERED: day(opts.daysAhead - 23),
    DATE_FIXED: day(opts.daysAhead - 21),
    REGISTRATION_CLOSED: day(opts.daysAhead - 6)
  };
  const today = day(0);
  const rows = buildTaskRows(templates, targetDate, now, assignments, opts.leadId).map((r) => {
    let dueDate = r.dueDate;
    if (r.triggerEvent && fired[r.triggerEvent] && fired[r.triggerEvent] <= today) {
      dueDate = new Date(fired[r.triggerEvent].getTime() + (r.offsetDays ?? 0) * 864e5);
    }
    const done = dueDate !== null && dueDate < today && r.group === "BEFORE";
    return { ...r, dueDate, ...(done ? { status: "DONE" as const, completedAt: dueDate, completedById: r.assigneeId } : {}) };
  });
  await prisma.task.createMany({ data: rows.map((r) => ({ eventId: event.id, ...r })) });
  await prisma.activityLog.create({ data: { eventId: event.id, action: "TASKS_GENERATED", payload: { count: rows.length, seed: true } } });
}

async function seedDemo() {
  console.log("Демо: люди по отделам...");
  const demoAdmin = await prisma.user.create({ data: { firstName: "Админ Клуба", role: "ADMIN", isDemo: true } });
  const people: Record<string, string> = {};
  for (const m of DEMO_PEOPLE) {
    const user = await prisma.user.create({ data: { firstName: m.name, role: m.role, isDemo: true } });
    await prisma.userDepartment.create({ data: { userId: user.id, departmentCode: m.code, position: m.position } });
    people[m.name] = user.id;
  }
  const guestsHead = people["Руководитель Гостей"];

  console.log("Демо: мероприятия...");
  await demoEvent({ title: "Лекция с гостем: пример", daysAhead: 16, adminId: demoAdmin.id, leadId: guestsHead, guest: "Иван Гостев" });
  await demoEvent({ title: "Лекция сегодня: пример дня мероприятия", daysAhead: 0, adminId: demoAdmin.id, leadId: guestsHead, guest: "Мария Спикерова" });

}

async function main() {
  console.log("Отделы...");
  for (const d of DEPARTMENTS) {
    await prisma.department.upsert({ where: { code: d.code }, create: d, update: { title: d.title } });
  }

  console.log("Шаблон задач LECTURE...");
  // Шаблон версионируется: при новой версии регламента заменяем его целиком.
  // Уже развёрнутые планы мероприятий не меняются — они хранят свои задачи.
  const templateKey = "template:LECTURE:version";
  const templateVersion = await prisma.appSetting.findUnique({ where: { key: templateKey } });
  if (templateVersion?.value !== LECTURE_TEMPLATE_VERSION) {
    await prisma.taskTemplate.deleteMany({ where: { eventType: "LECTURE" } });
    await prisma.taskTemplate.createMany({
      data: LECTURE_TEMPLATE.map((row) => ({ eventType: "LECTURE" as const, ...row }))
    });
    await prisma.appSetting.upsert({
      where: { key: templateKey },
      create: { key: templateKey, value: LECTURE_TEMPLATE_VERSION },
      update: { value: LECTURE_TEMPLATE_VERSION }
    });
  }
  // Пустые шаблоны для остальных типов — заполнит администратор в настройках.
  for (const type of ["GAME", "CASE", "CONFERENCE", "SERIES", "INTENSIVE"] as const) {
    // ничего не создаём — отсутствие шаблона допустимо, карточка мероприятия
    // покажет плашку «зафиксируйте дату», план останется пустым до заполнения.
    void type;
  }

  console.log("Пароли ролей...");
  await ensureRolePasswords();

  console.log("Стартовый администратор...");
  let admin = await prisma.user.findFirst({ where: { role: "ADMIN", isDemo: false }, orderBy: { createdAt: "asc" } });
  if (!admin) {
    admin = await prisma.user.create({ data: { firstName: "Руководитель клуба", role: "ADMIN" } });
  }

  // Демо-данные создаются один раз. Если администратор их удалил — не возвращаем.
  // Старую версию демо (до регламента v2) заменяем, пока её не удалили.
  const demoFlag = await prisma.appSetting.findUnique({ where: { key: "demo_seeded" } });
  const demoVersion = await prisma.appSetting.findUnique({ where: { key: "demo:version" } });
  const demoLeft = await prisma.user.count({ where: { isDemo: true } });
  if (!demoFlag || (demoVersion?.value !== DEMO_VERSION && demoLeft > 0)) {
    if (demoFlag) await deleteDemoData(admin.id);
    await seedDemo();
    await prisma.appSetting.upsert({
      where: { key: "demo_seeded" },
      create: { key: "demo_seeded", value: new Date().toISOString() },
      update: {}
    });
  }
  await prisma.appSetting.upsert({
    where: { key: "demo:version" },
    create: { key: "demo:version", value: DEMO_VERSION },
    update: { value: DEMO_VERSION }
  });

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

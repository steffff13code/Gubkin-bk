// Сид платформы: отделы и аккаунты ролей, шаблоны задач v3, общие правила регламента,
// пароль администратора. Запускается при каждом старте контейнера — всё идемпотентно.
// Демо-данных больше нет: CRM после деплоя пустая.
import type { DepartmentCode } from "@prisma/client";
import { prisma } from "../lib/db";
import { LECTURE_TEMPLATE, LECTURE_TEMPLATE_VERSION, TEMPLATE_TYPES } from "../lib/tasks/lecture-template";
import { ensureAdminPassword, LEGACY_PASSWORD_KEYS } from "../lib/passwords";
import { ensureRoleAccounts } from "../lib/role-accounts";
import { isRoleKey, type RoleKey } from "../lib/roles";
import { GENERAL_RULES } from "../lib/regulation";

async function flag(key: string): Promise<boolean> {
  return !!(await prisma.appSetting.findUnique({ where: { key } }));
}
async function setFlag(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/** Переносит всё, что сделали пользователи `ids`, на аккаунт роли `to`. */
async function reassign(ids: string[], to: string): Promise<void> {
  if (ids.length === 0) return;
  const inIds = { in: ids };
  await prisma.$transaction([
    prisma.event.updateMany({ where: { createdById: inIds }, data: { createdById: to } }),
    prisma.event.updateMany({ where: { leadId: inIds }, data: { leadId: to } }),
    prisma.event.updateMany({ where: { approvedById: inIds }, data: { approvedById: to } }),
    prisma.task.updateMany({ where: { assigneeId: inIds }, data: { assigneeId: to } }),
    prisma.task.updateMany({ where: { secondAssigneeId: inIds }, data: { secondAssigneeId: null } }),
    prisma.task.updateMany({ where: { completedById: inIds }, data: { completedById: to } }),
    prisma.attachment.updateMany({ where: { addedById: inIds }, data: { addedById: to } }),
    prisma.retro.updateMany({ where: { authorId: inIds }, data: { authorId: to } }),
    prisma.regulation.updateMany({ where: { updatedById: inIds }, data: { updatedById: to } }),
    prisma.regulationVersion.updateMany({ where: { editedById: inIds }, data: { editedById: to } }),
    prisma.eventDateOption.updateMany({ where: { createdById: inIds }, data: { createdById: to } }),
    prisma.activityLog.updateMany({ where: { userId: inIds }, data: { userId: to, actorLabel: null } }),
    prisma.idea.updateMany({ where: { authorId: inIds }, data: { authorId: null } }),
    prisma.telegramSubscription.updateMany({ where: { userId: inIds }, data: { userId: to } }),
    prisma.eventMember.deleteMany({ where: { userId: inIds } }),
    prisma.ideaVote.deleteMany({ where: { userId: inIds } })
  ]);
}

/**
 * Одноразовый переход на регламент v3 (флаг regulation:v3):
 * демо-данные удаляются, старые персональные пользователи отключаются,
 * их действия и подписки Telegram переходят к ролям по их отделу.
 * Настоящие мероприятия (не демо) остаются.
 */
async function migrateToV3(roles: Record<RoleKey, string>): Promise<void> {
  console.log("Переход на регламент v3: демо-данные и персональные пользователи...");
  const roleIds = Object.values(roles);

  await prisma.event.deleteMany({ where: { isDemo: true } });
  await prisma.idea.deleteMany({ where: { isDemo: true } });

  const people = await prisma.user.findMany({
    where: { isRoleAccount: false },
    include: { departments: true }
  });
  const byRole = new Map<string, string[]>();
  for (const u of people) {
    if (roleIds.includes(u.id)) continue;
    const dept = u.departments[0]?.departmentCode as DepartmentCode | undefined;
    const target = u.role === "ADMIN" || !dept || !isRoleKey(dept) ? roles.BOARD : roles[dept];
    byRole.set(target, [...(byRole.get(target) ?? []), u.id]);
  }
  for (const [to, ids] of byRole) await reassign(ids, to);

  const demoIds = people.filter((u) => u.isDemo).map((u) => u.id);
  const personalIds = people.filter((u) => !u.isDemo).map((u) => u.id);
  await prisma.userDepartment.deleteMany({ where: { userId: { in: [...demoIds, ...personalIds] } } });
  await prisma.notificationLog.deleteMany({ where: { userId: { in: demoIds } } });
  await prisma.user.deleteMany({ where: { id: { in: demoIds } } });
  // Историю сохраняем: персональные аккаунты не удаляем, а отключаем.
  await prisma.user.updateMany({
    where: { id: { in: personalIds } },
    data: { isActive: false, telegramId: null, botStarted: false }
  });

  // Старые регламенты v1–v2 заменяет раздел «Регламент» (схема + задачи из шаблона + общие правила).
  await prisma.regulation.deleteMany({ where: { slug: { not: "general-rules" } } });
  await prisma.appSetting.deleteMany({
    where: { key: { in: [...LEGACY_PASSWORD_KEYS, "demo_seeded", "demo:version", "regulations:version"] } }
  });
  console.log(`  удалено демо-пользователей: ${demoIds.length}, отключено персональных: ${personalIds.length}`);
}

async function main() {
  console.log("Роли и отделы...");
  const roles = await ensureRoleAccounts();

  if (!(await flag("regulation:v3"))) {
    await migrateToV3(roles);
    await setFlag("regulation:v3", new Date().toISOString());
  }

  console.log("Шаблоны задач v3...");
  const templateKey = "template:version";
  const current = await prisma.appSetting.findUnique({ where: { key: templateKey } });
  if (current?.value !== LECTURE_TEMPLATE_VERSION) {
    await prisma.taskTemplate.deleteMany({ where: { eventType: { in: TEMPLATE_TYPES } } });
    for (const eventType of TEMPLATE_TYPES) {
      await prisma.taskTemplate.createMany({ data: LECTURE_TEMPLATE.map((row) => ({ eventType, ...row })) });
    }
    await prisma.appSetting.deleteMany({ where: { key: "template:LECTURE:version" } });
    await setFlag(templateKey, LECTURE_TEMPLATE_VERSION);
  }

  console.log("Общие правила регламента...");
  const rules = await prisma.regulation.findUnique({ where: { slug: "general-rules" } });
  if (!rules) {
    await prisma.regulation.create({
      data: { slug: "general-rules", title: "Общие правила", body: GENERAL_RULES, sortOrder: 0, updatedById: roles.BOARD }
    });
  }

  console.log("Пароль администратора...");
  await ensureAdminPassword();

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

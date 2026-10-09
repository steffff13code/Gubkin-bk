import { prisma } from "@/lib/db";
import { ROLE_BY_KEY, ROLES, type RoleKey } from "@/lib/roles";

/** Служебный аккаунт роли (он же руководитель отдела). */
export async function getRoleAccount(key: RoleKey) {
  return prisma.user.findFirst({
    where: { isRoleAccount: true, departments: { some: { departmentCode: key, position: "HEAD" } } },
    orderBy: { createdAt: "asc" }
  });
}

export async function getRoleAccountId(key: RoleKey): Promise<string | null> {
  return (await getRoleAccount(key))?.id ?? null;
}

/** Создаёт недостающие аккаунты ролей и отделы. Идемпотентно. */
export async function ensureRoleAccounts(): Promise<Record<RoleKey, string>> {
  const ids = {} as Record<RoleKey, string>;
  for (const info of ROLES) {
    await prisma.department.upsert({
      where: { code: info.key },
      create: { code: info.key, title: info.title },
      update: { title: info.title }
    });
    let account = await getRoleAccount(info.key);
    if (!account) {
      account = await prisma.user.create({
        data: {
          firstName: info.title,
          role: info.role,
          isRoleAccount: true,
          departments: { create: { departmentCode: info.key, position: "HEAD" } }
        }
      });
    } else if (account.firstName !== info.title || account.role !== info.role || !account.isActive) {
      account = await prisma.user.update({
        where: { id: account.id },
        data: { firstName: info.title, role: info.role, isActive: true }
      });
    }
    ids[info.key] = account.id;
  }
  return ids;
}

export function roleTitle(key: RoleKey): string {
  return ROLE_BY_KEY[key].title;
}

/** Теги для рабочего чата: ники через пробел, задаются в настройках. */
export async function getChatTags(): Promise<Record<RoleKey, string>> {
  const rows = await prisma.appSetting.findMany({ where: { key: { startsWith: "chat-tags:" } } });
  const tags = {} as Record<RoleKey, string>;
  for (const r of ROLES) tags[r.key] = rows.find((x) => x.key === `chat-tags:${r.key}`)?.value ?? "";
  return tags;
}

export async function setChatTags(key: RoleKey, value: string): Promise<void> {
  const k = `chat-tags:${key}`;
  const clean = value
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => (t.startsWith("@") ? t : `@${t}`))
    .join(" ");
  await prisma.appSetting.upsert({ where: { key: k }, create: { key: k, value: clean }, update: { value: clean } });
}

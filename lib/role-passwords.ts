import crypto from "node:crypto";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

// Вход по паролю роли: у каждой роли (MEMBER / LEAD / ADMIN) один общий пароль,
// человек выбирает себя в списке и вводит пароль своей роли. Хранятся только хеши.

export const LOGIN_ROLES = ["MEMBER", "LEAD", "ADMIN"] as const;
export type LoginRole = (typeof LOGIN_ROLES)[number];

const DEFAULTS: Record<LoginRole, string> = {
  MEMBER: process.env.MEMBER_PASSWORD || "member-gubkin",
  LEAD: process.env.LEAD_PASSWORD || "lead-gubkin",
  ADMIN: process.env.ADMIN_PASSWORD || "admin-gubkin"
};

const key = (role: LoginRole) => `password:${role}`;
const defaultFlagKey = (role: LoginRole) => `password:${role}:is-default`;

function hash(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verify(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expected, "hex");
  return derived.length === expectedBuf.length && crypto.timingSafeEqual(derived, expectedBuf);
}

/** Создаёт хеши паролей по умолчанию для ролей, у которых их ещё нет. Идемпотентно. */
export async function ensureRolePasswords(): Promise<void> {
  for (const role of LOGIN_ROLES) {
    const existing = await prisma.appSetting.findUnique({ where: { key: key(role) } });
    if (existing) continue;
    const fromEnv = role === "MEMBER" ? process.env.MEMBER_PASSWORD : role === "LEAD" ? process.env.LEAD_PASSWORD : process.env.ADMIN_PASSWORD;
    await prisma.appSetting.create({ data: { key: key(role), value: hash(DEFAULTS[role]) } });
    await prisma.appSetting.upsert({
      where: { key: defaultFlagKey(role) },
      create: { key: defaultFlagKey(role), value: fromEnv ? "0" : "1" },
      update: { value: fromEnv ? "0" : "1" }
    });
  }
}

export async function checkRolePassword(role: Role, password: string): Promise<boolean> {
  if (role === "READER") return false;
  await ensureRolePasswords();
  const stored = await prisma.appSetting.findUnique({ where: { key: key(role as LoginRole) } });
  return !!stored && verify(password, stored.value);
}

export async function setRolePassword(role: LoginRole, password: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: key(role) },
    create: { key: key(role), value: hash(password) },
    update: { value: hash(password) }
  });
  await prisma.appSetting.upsert({
    where: { key: defaultFlagKey(role) },
    create: { key: defaultFlagKey(role), value: "0" },
    update: { value: "0" }
  });
}

/** Роли, у которых всё ещё стоит пароль по умолчанию из репозитория. */
export async function rolesWithDefaultPassword(): Promise<LoginRole[]> {
  await ensureRolePasswords();
  const flags = await prisma.appSetting.findMany({ where: { key: { in: LOGIN_ROLES.map(defaultFlagKey) } } });
  return LOGIN_ROLES.filter((r) => flags.find((f) => f.key === defaultFlagKey(r))?.value === "1");
}

export function defaultPasswordFor(role: LoginRole): string {
  return DEFAULTS[role];
}

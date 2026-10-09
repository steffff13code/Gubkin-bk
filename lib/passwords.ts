import crypto from "node:crypto";
import { prisma } from "@/lib/db";

// Пароли: у Администратора клуба — свой; у отделов — необязательный общий пароль
// (включается в настройках). В базе только scrypt-хэши, в репозитории паролей нет.

const ADMIN_KEY = "password:ADMIN";
const ADMIN_DEFAULT_FLAG = "password:ADMIN:is-default"; // «1» — в базе старый пароль из прошлых версий
const DEPARTMENTS_KEY = "password:DEPARTMENTS";
const DEPARTMENTS_ENABLED = "password:DEPARTMENTS:enabled";
// Ключи старой схемы «пароль на роль» — удаляются при обновлении.
export const LEGACY_PASSWORD_KEYS = ["password:MEMBER", "password:MEMBER:is-default", "password:LEAD", "password:LEAD:is-default"];

/** Пароль может быть на кириллице и с пробелами: сравниваем в одной юникод-нормализации. */
function normalize(password: string): string {
  return password.normalize("NFC");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(normalize(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const derived = crypto.scryptSync(normalize(password), salt, 64);
  const expectedBuf = Buffer.from(expected, "hex");
  return derived.length === expectedBuf.length && crypto.timingSafeEqual(derived, expectedBuf);
}

async function get(key: string): Promise<string | null> {
  return (await prisma.appSetting.findUnique({ where: { key } }))?.value ?? null;
}
async function set(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/**
 * Пароль администратора при старте:
 * - нет в базе, но задан ADMIN_PASSWORD — сохраняем его хэш;
 * - в базе старый пароль по умолчанию — заменяем на ADMIN_PASSWORD, а если его нет,
 *   удаляем (пароль из открытого репозитория не должен открывать вход).
 */
export async function ensureAdminPassword(env: string | undefined = process.env.ADMIN_PASSWORD): Promise<void> {
  const fromEnv = env && env.length > 0 ? env : null;
  const stored = await get(ADMIN_KEY);
  const isDefault = (await get(ADMIN_DEFAULT_FLAG)) === "1";
  if (stored && !isDefault) return;
  if (fromEnv) {
    await set(ADMIN_KEY, hashPassword(fromEnv));
  } else if (stored) {
    await prisma.appSetting.delete({ where: { key: ADMIN_KEY } });
  }
  await prisma.appSetting.deleteMany({ where: { key: ADMIN_DEFAULT_FLAG } });
}

export async function isAdminPasswordSet(): Promise<boolean> {
  return !!(await get(ADMIN_KEY));
}

export async function checkAdminPassword(password: string): Promise<boolean> {
  await ensureAdminPassword();
  const stored = await get(ADMIN_KEY);
  return !!stored && verifyPassword(password, stored);
}

export async function setAdminPassword(password: string): Promise<void> {
  await set(ADMIN_KEY, hashPassword(password));
  await prisma.appSetting.deleteMany({ where: { key: ADMIN_DEFAULT_FLAG } });
}

export async function departmentsPasswordEnabled(): Promise<boolean> {
  return (await get(DEPARTMENTS_ENABLED)) === "1" && !!(await get(DEPARTMENTS_KEY));
}

export async function checkDepartmentsPassword(password: string): Promise<boolean> {
  const stored = await get(DEPARTMENTS_KEY);
  return !!stored && verifyPassword(password, stored);
}

/** Включает общий пароль отделов (новый пароль — по желанию) или выключает его. */
export async function setDepartmentsPassword(enabled: boolean, password?: string): Promise<void> {
  if (password) await set(DEPARTMENTS_KEY, hashPassword(password));
  if (enabled && !(await get(DEPARTMENTS_KEY))) throw new Error("Задайте общий пароль для отделов.");
  await set(DEPARTMENTS_ENABLED, enabled ? "1" : "0");
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE, SIGNER_COOKIE } from "@/lib/session";
import { checkAdminPassword, checkDepartmentsPassword, departmentsPasswordEnabled, isAdminPasswordSet } from "@/lib/passwords";
import { ensureRoleAccounts, getRoleAccount } from "@/lib/role-accounts";
import { isRoleKey, ROLE_BY_KEY } from "@/lib/roles";

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/my";
}

const slow = () => new Promise((r) => setTimeout(r, 700)); // против перебора паролей

/** Вход по роли: отдел — сразу (или с общим паролем отделов), Администратор клуба — по своему паролю. */
export async function loginAction(formData: FormData): Promise<void> {
  // Enter в поле пароля администратора отправляет форму первой кнопкой (отделом) —
  // поэтому введённый пароль администратора означает вход администратора.
  const roleRaw = String(formData.get("adminPassword") || "") ? "BOARD" : String(formData.get("role") || "");
  const next = safeNext(String(formData.get("next") || "/my"));
  const signer = String(formData.get("signer") || "").trim().replace(/\s+/g, " ").slice(0, 40) || null;

  const fail = (message: string): never => {
    const params = new URLSearchParams({ error: message });
    if (roleRaw) params.set("role", roleRaw);
    if (next !== "/my") params.set("next", next);
    redirect(`/login?${params.toString()}`);
  };

  if (!isRoleKey(roleRaw)) fail("Выберите свою роль.");
  const role = ROLE_BY_KEY[roleRaw as keyof typeof ROLE_BY_KEY];

  if (role.needsPassword) {
    if (!(await isAdminPasswordSet())) fail("Пароль администратора не задан. Укажите ADMIN_PASSWORD в настройках сервера.");
    const password = String(formData.get("adminPassword") || "");
    if (!password) fail("Введите пароль администратора.");
    if (!(await checkAdminPassword(password))) {
      await slow();
      fail("Неверный пароль администратора.");
    }
  } else if (await departmentsPasswordEnabled()) {
    const password = String(formData.get("departmentsPassword") || "");
    if (!password) fail("Введите общий пароль отделов.");
    if (!(await checkDepartmentsPassword(password))) {
      await slow();
      fail("Неверный пароль отделов.");
    }
  }

  let account = await getRoleAccount(role.key);
  if (!account) {
    await ensureRoleAccounts();
    account = await getRoleAccount(role.key);
  }
  if (!account) fail("Не удалось войти. Попробуйте ещё раз.");

  const secure = process.env.NODE_ENV === "production";
  cookies().set(SESSION_COOKIE_NAME, createSessionCookie(account!.id, signer), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });
  if (signer) {
    cookies().set(SIGNER_COOKIE, encodeURIComponent(signer), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  } else {
    cookies().delete(SIGNER_COOKIE);
  }
  await prisma.activityLog.create({ data: { userId: account!.id, action: "LOGIN", actorLabel: signer } });
  redirect(next);
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

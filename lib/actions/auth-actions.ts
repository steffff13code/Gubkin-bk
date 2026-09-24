"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/session";
import { checkRolePassword } from "@/lib/role-passwords";

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/my";
}

export async function loginAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") || "");
  const password = String(formData.get("password") || "");
  const next = safeNext(String(formData.get("next") || "/my"));

  const fail = (message: string): never => {
    const params = new URLSearchParams({ error: message });
    if (userId) params.set("user", userId);
    if (next !== "/my") params.set("next", next);
    redirect(`/login?${params.toString()}`);
  };

  if (!userId) fail("Выберите себя в списке.");
  if (!password) fail("Введите пароль.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) fail("Этот человек не найден или отключён. Обратитесь к руководителю клуба.");

  const ok = await checkRolePassword(user!.role, password);
  if (!ok) {
    // Небольшая задержка против перебора.
    await new Promise((r) => setTimeout(r, 700));
    fail("Неверный пароль для вашей роли.");
  }

  cookies().set(SESSION_COOKIE_NAME, createSessionCookie(user!.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });
  await prisma.activityLog.create({ data: { userId: user!.id, action: "LOGIN" } });
  redirect(next);
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/");
}

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { friendlyError } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";

export async function updateProfileAction(formData: FormData): Promise<void> {
  let error: string | null = null;
  try {
    const user = await requireUser();
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim() || null;
    if (!firstName) throw new Error("Имя не может быть пустым.");
    await prisma.user.update({ where: { id: user.id }, data: { firstName, lastName } });
  } catch (e) {
    error = friendlyError(e, "Не удалось сохранить.");
  }
  redirect(error ? `/profile?error=${encodeURIComponent(error)}` : "/profile?saved=1");
}

export async function disconnectTelegramAction(): Promise<void> {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { telegramId: null, botStarted: false } });
  redirect("/profile");
}

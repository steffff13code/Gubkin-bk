"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { canManageEvent, PermissionError, requireUser } from "@/lib/permissions";

async function runOrRedirect(eventId: string, fn: () => Promise<void>): Promise<never> {
  let error: string | null = null;
  try {
    await fn();
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось выполнить действие.";
  }
  const params = new URLSearchParams({ tab: "itogi" });
  if (error) params.set("error", error);
  redirect(`/events/${eventId}?${params.toString()}`);
}

export async function saveRetroAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireUser();
    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    if (!canManageEvent(user, event)) {
      throw new PermissionError("Заполнить итоги может только лид мероприятия или администратор.");
    }

    const wentWell = String(formData.get("wentWell") || "").trim();
    const wentWrong = String(formData.get("wentWrong") || "").trim();
    const doDifferently = String(formData.get("doDifferently") || "").trim();
    const actualAttendanceStr = String(formData.get("actualAttendance") || "");

    if (!wentWell || !wentWrong || !doDifferently) {
      throw new Error("Заполните все три поля ретро.");
    }

    await prisma.retro.upsert({
      where: { eventId },
      create: { eventId, wentWell, wentWrong, doDifferently, authorId: user.id },
      update: { wentWell, wentWrong, doDifferently }
    });

    if (actualAttendanceStr) {
      await prisma.event.update({
        where: { id: eventId },
        data: { actualAttendance: Number(actualAttendanceStr) }
      });
    }
  });
}

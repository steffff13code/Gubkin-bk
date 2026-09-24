"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { friendlyError } from "@/lib/errors";
import { canManageEvent, PermissionError, requireUser } from "@/lib/permissions";
import { autoCompleteTasks } from "@/lib/tasks/service";

async function runOrRedirect(eventId: string, fn: () => Promise<void>): Promise<never> {
  let error: string | null = null;
  try {
    await fn();
  } catch (e) {
    error = friendlyError(e, "Не удалось выполнить действие.");
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
      throw new PermissionError("Заполнить итоги может только лид мероприятия или руководитель клуба.");
    }
    if (event.stage !== "DONE" && event.stage !== "CLOSED") {
      throw new Error("Итоги заполняются после того, как мероприятие отмечено проведённым.");
    }

    const wentWell = String(formData.get("wentWell") || "").trim();
    const wentWrong = String(formData.get("wentWrong") || "").trim();
    const doDifferently = String(formData.get("doDifferently") || "").trim();
    const actualAttendanceStr = String(formData.get("actualAttendance") || "").trim();

    if (!wentWell || !wentWrong || !doDifferently) {
      throw new Error("Заполните все три поля ретро.");
    }
    const actualAttendance = actualAttendanceStr ? Number(actualAttendanceStr) : null;
    if (actualAttendanceStr && (!Number.isInteger(actualAttendance) || actualAttendance! < 0)) {
      throw new Error("Посещаемость — целое число, не меньше нуля.");
    }

    await prisma.retro.upsert({
      where: { eventId },
      create: { eventId, wentWell, wentWrong, doDifferently, authorId: user.id },
      update: { wentWell, wentWrong, doDifferently }
    });
    if (actualAttendance !== null) {
      await prisma.event.update({ where: { id: eventId }, data: { actualAttendance } });
    }
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "RETRO_SAVED" } });

    // Задача «Ретро заполнено, посещаемость внесена» закрывается по факту, а не галочкой.
    if (actualAttendance !== null || event.actualAttendance !== null) {
      await autoCompleteTasks(eventId, "RETRO_SAVED", user.id);
    }
  });
}

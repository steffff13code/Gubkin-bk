"use server";

import { redirect } from "next/navigation";
import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canManageEvent, PermissionError, requireRole, requireUser } from "@/lib/permissions";
import { checkStageEntry } from "@/lib/stages";
import { fireTaskTrigger, generateTasksForEvent, recalcTasksOnDateChange } from "@/lib/tasks/service";
import { startOfUtcDay } from "@/lib/time";
import { notifyAdminsOfApproval } from "@/lib/notifications/approval";

function goBack(eventId: string, tab: string, error?: string): never {
  const params = new URLSearchParams({ tab });
  if (error) params.set("error", error);
  redirect(`/events/${eventId}?${params.toString()}`);
}

async function runOrRedirect(eventId: string, tab: string, fn: () => Promise<void>): Promise<never> {
  let error: string | null = null;
  try {
    await fn();
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось выполнить действие.";
  }
  goBack(eventId, tab, error ?? undefined);
}

async function loadEventOrThrow(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { retro: true, attachments: true }
  });
  if (!event) throw new Error("Мероприятие не найдено.");
  return event;
}

export async function createEventAction(formData: FormData): Promise<void> {
  const user = await requireRole("LEAD");
  const title = String(formData.get("title") || "").trim();
  const type = String(formData.get("type") || "") as EventType;
  const description = String(formData.get("description") || "").trim();

  if (!title || !type) {
    goBack("new", "obzor", "Заполните название и тип мероприятия.");
  }

  const event = await prisma.event.create({
    data: {
      title,
      type,
      description: description || null,
      leadId: user.id,
      createdById: user.id,
      stage: "IDEA",
      stageChangedAt: new Date()
    }
  });
  await prisma.activityLog.create({ data: { eventId: event.id, userId: user.id, action: "CREATED" } });
  redirect(`/events/${event.id}`);
}

export async function updateOverviewAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Редактировать это мероприятие может только его лид или администратор.");

    const leadId = String(formData.get("leadId") || "") || null;

    await prisma.event.update({
      where: { id: eventId },
      data: {
        title: String(formData.get("title") || event.title).trim(),
        description: String(formData.get("description") || ""),
        leadId,
        venue: String(formData.get("venue") || "") || null,
        driveFolderUrl: String(formData.get("driveFolderUrl") || "") || null,
        guestName: String(formData.get("guestName") || "") || null,
        guestOrganization: String(formData.get("guestOrganization") || "") || null,
        guestTopic: String(formData.get("guestTopic") || "") || null,
        guestStatus: (String(formData.get("guestStatus") || event.guestStatus) as typeof event.guestStatus),
        expectedAttendance: formData.get("expectedAttendance")
          ? Number(formData.get("expectedAttendance"))
          : null
      }
    });
  });
}

export async function sendToApprovalAction(eventId: string): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Отправить на согласование может только лид мероприятия или администратор.");

    const error = checkStageEntry("APPROVAL", {
      title: event.title,
      type: event.type,
      description: event.description,
      targetDate: event.targetDate,
      dateFixed: event.dateFixed,
      leadId: event.leadId,
      actualAttendance: event.actualAttendance,
      hasRetro: !!event.retro,
      hasPhotoReport: event.attachments.some((a) => a.kind === "PHOTO_REPORT")
    });
    if (error) throw new Error(error);

    await prisma.event.update({
      where: { id: eventId },
      data: { stage: "APPROVAL", stageChangedAt: new Date() }
    });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "SENT_TO_APPROVAL" } });
    await notifyAdminsOfApproval(eventId);
  });
}

export async function approveEventAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireRole("ADMIN");
    const comment = String(formData.get("comment") || "").trim();
    await prisma.event.update({
      where: { id: eventId },
      data: {
        stage: "PLANNING",
        stageChangedAt: new Date(),
        approvedById: user.id,
        approvedAt: new Date(),
        approvalComment: comment || null
      }
    });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "APPROVED" } });
  });
}

export async function returnToIdeaAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireRole("ADMIN");
    const comment = String(formData.get("comment") || "").trim();
    if (!comment) throw new Error("Укажите комментарий: что нужно доработать.");
    await prisma.event.update({
      where: { id: eventId },
      data: { stage: "IDEA", stageChangedAt: new Date(), approvalComment: comment }
    });
    await prisma.activityLog.create({
      data: { eventId, userId: user.id, action: "RETURNED_TO_IDEA", payload: { comment } }
    });
  });
}

export async function rejectEventAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireRole("ADMIN");
    const reason = String(formData.get("reason") || "").trim();
    if (!reason) throw new Error("Укажите причину отклонения.");
    await prisma.event.update({
      where: { id: eventId },
      data: { stage: "REJECTED", stageChangedAt: new Date(), approvalComment: reason }
    });
    await prisma.activityLog.create({
      data: { eventId, userId: user.id, action: "REJECTED", payload: { reason } }
    });
  });
}

export async function fixDateAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Назначать дату может только лид мероприятия или администратор.");

    const dateStr = String(formData.get("targetDate") || "");
    if (!dateStr) throw new Error("Укажите дату мероприятия.");
    const targetDate = startOfUtcDay(new Date(dateStr));
    const timeSlot = String(formData.get("timeSlot") || "") || null;
    const venue = String(formData.get("venue") || "") || event.venue;

    const wasFixed = event.dateFixed;

    await prisma.event.update({
      where: { id: eventId },
      data: { targetDate, timeSlot, venue, dateFixed: true }
    });

    if (!wasFixed) {
      const error = checkStageEntry("IN_PROGRESS", {
        title: event.title,
        type: event.type,
        description: event.description,
        targetDate,
        dateFixed: true,
        leadId: event.leadId,
        actualAttendance: event.actualAttendance,
        hasRetro: !!event.retro,
        hasPhotoReport: event.attachments.some((a) => a.kind === "PHOTO_REPORT")
      });
      if (error) throw new Error(error);

      await generateTasksForEvent(eventId);
      await prisma.event.update({
        where: { id: eventId },
        data: { stage: "IN_PROGRESS", stageChangedAt: new Date() }
      });
      await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "DATE_FIXED" } });
    } else {
      await recalcTasksOnDateChange(eventId, targetDate, user.id);
    }
  });
}

export async function markDoneAction(eventId: string): Promise<void> {
  await runOrRedirect(eventId, "itogi", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Отметить мероприятие проведённым может только лид или администратор.");

    const error = checkStageEntry("DONE", {
      title: event.title,
      type: event.type,
      description: event.description,
      targetDate: event.targetDate,
      dateFixed: event.dateFixed,
      leadId: event.leadId,
      actualAttendance: event.actualAttendance,
      hasRetro: !!event.retro,
      hasPhotoReport: event.attachments.some((a) => a.kind === "PHOTO_REPORT")
    });
    if (error) throw new Error(error);

    await prisma.event.update({ where: { id: eventId }, data: { stage: "DONE", stageChangedAt: new Date() } });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "MARKED_DONE" } });
    await fireTaskTrigger(eventId, "EVENT_DONE");
  });
}

export async function closeEventAction(eventId: string): Promise<void> {
  await runOrRedirect(eventId, "itogi", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Закрыть мероприятие может только лид или администратор.");

    const error = checkStageEntry("CLOSED", {
      title: event.title,
      type: event.type,
      description: event.description,
      targetDate: event.targetDate,
      dateFixed: event.dateFixed,
      leadId: event.leadId,
      actualAttendance: event.actualAttendance,
      hasRetro: !!event.retro,
      hasPhotoReport: event.attachments.some((a) => a.kind === "PHOTO_REPORT")
    });
    if (error) throw new Error(error);

    await prisma.event.update({
      where: { id: eventId },
      data: { stage: "CLOSED", stageChangedAt: new Date(), closedAt: new Date() }
    });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "CLOSED" } });
  });
}

export async function addEventMemberAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Изменять состав может только лид мероприятия или администратор.");

    const userId = String(formData.get("userId") || "");
    const roleInEvent = String(formData.get("roleInEvent") || "").trim();
    if (!userId || !roleInEvent) throw new Error("Выберите человека и укажите его роль.");

    await prisma.eventMember.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, roleInEvent },
      update: { roleInEvent }
    });
  });
}

export async function removeEventMemberAction(eventId: string, memberId: string): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Изменять состав может только лид мероприятия или администратор.");
    await prisma.eventMember.delete({ where: { id: memberId } });
  });
}

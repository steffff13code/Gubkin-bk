"use server";

import { redirect } from "next/navigation";
import type { EventStage, EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canManageEvent, PermissionError, requireRole, requireUser } from "@/lib/permissions";
import { checkStageEntry, type EventForStageCheck } from "@/lib/stages";
import { fireTaskTrigger, generateTasksForEvent, recalcTasksOnDateChange } from "@/lib/tasks/service";
import { startOfUtcDay } from "@/lib/time";
import { EVENT_STAGE_LABELS } from "@/lib/labels";
import { notifyAdminsOfApproval } from "@/lib/notifications/approval";
import { notifyLeadOfDecision } from "@/lib/notifications/lead";

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
    include: { retro: true, attachments: true, _count: { select: { tasks: true } } }
  });
  if (!event) throw new Error("Мероприятие не найдено.");
  return event;
}

type LoadedEvent = Awaited<ReturnType<typeof loadEventOrThrow>>;

function toStageCheck(event: LoadedEvent, overrides: Partial<EventForStageCheck> = {}): EventForStageCheck {
  return {
    title: event.title,
    type: event.type,
    description: event.description,
    targetDate: event.targetDate,
    dateFixed: event.dateFixed,
    leadId: event.leadId,
    actualAttendance: event.actualAttendance,
    hasRetro: !!event.retro,
    hasPhotoReport: event.attachments.some((a) => a.kind === "PHOTO_REPORT"),
    ...overrides
  };
}

/** Переход возможен только из ожидаемой стадии — защита от устаревшей вкладки и двойных кликов. */
function assertStage(event: LoadedEvent, allowed: EventStage[]) {
  if (!allowed.includes(event.stage)) {
    throw new Error(
      `Мероприятие сейчас на стадии «${EVENT_STAGE_LABELS[event.stage]}» — это действие здесь недоступно. Обновите страницу.`
    );
  }
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
    const requestedType = String(formData.get("type") || "") as EventType | "";
    // Тип определяет шаблон задач — менять его после разворачивания плана нельзя.
    const type = requestedType && requestedType !== event.type && event._count.tasks === 0 ? requestedType : event.type;

    await prisma.event.update({
      where: { id: eventId },
      data: {
        title: String(formData.get("title") || event.title).trim(),
        type,
        description: String(formData.get("description") || ""),
        leadId,
        venue: String(formData.get("venue") || "") || null,
        driveFolderUrl: String(formData.get("driveFolderUrl") || "") || null,
        guestName: String(formData.get("guestName") || "") || null,
        guestOrganization: String(formData.get("guestOrganization") || "") || null,
        guestTopic: String(formData.get("guestTopic") || "") || null,
        guestStatus: String(formData.get("guestStatus") || event.guestStatus) as typeof event.guestStatus,
        expectedAttendance: formData.get("expectedAttendance") ? Number(formData.get("expectedAttendance")) : null
      }
    });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "OVERVIEW_UPDATED" } });
  });
}

export async function sendToApprovalAction(eventId: string): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Отправить на согласование может только лид мероприятия или администратор.");
    assertStage(event, ["IDEA"]);

    const error = checkStageEntry("APPROVAL", toStageCheck(event));
    if (error) throw new Error(error);

    await prisma.event.update({ where: { id: eventId }, data: { stage: "APPROVAL", stageChangedAt: new Date() } });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "SENT_TO_APPROVAL" } });
    await notifyAdminsOfApproval(eventId);
  });
}

export async function approveEventAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireRole("ADMIN");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["APPROVAL"]);
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
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "APPROVED", payload: comment ? { comment } : undefined } });
    await notifyLeadOfDecision(eventId, "APPROVED", comment || null);
  });
}

export async function returnToIdeaAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireRole("ADMIN");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["APPROVAL"]);
    const comment = String(formData.get("comment") || "").trim();
    if (!comment) throw new Error("Укажите комментарий: что нужно доработать.");

    await prisma.event.update({
      where: { id: eventId },
      data: { stage: "IDEA", stageChangedAt: new Date(), approvalComment: comment }
    });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "RETURNED_TO_IDEA", payload: { comment } } });
    await notifyLeadOfDecision(eventId, "RETURNED", comment);
  });
}

export async function rejectEventAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireRole("ADMIN");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["APPROVAL"]);
    const reason = String(formData.get("reason") || "").trim();
    if (!reason) throw new Error("Укажите причину отклонения.");

    await prisma.event.update({
      where: { id: eventId },
      data: { stage: "REJECTED", stageChangedAt: new Date(), approvalComment: reason }
    });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "REJECTED", payload: { reason } } });
    await notifyLeadOfDecision(eventId, "REJECTED", reason);
  });
}

function parseDateFields(formData: FormData, event: LoadedEvent) {
  const dateStr = String(formData.get("targetDate") || "");
  if (!dateStr) throw new Error("Укажите дату мероприятия.");
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) throw new Error("Дата указана неверно.");
  return {
    targetDate: startOfUtcDay(parsed),
    timeSlot: String(formData.get("timeSlot") || "") || event.timeSlot,
    venue: String(formData.get("venue") || "") || event.venue
  };
}

/** Предварительная дата в PLANNING: видна в календаре, план ещё не разворачивается. */
export async function setTentativeDateAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Назначать дату может только лид мероприятия или администратор.");
    assertStage(event, ["PLANNING"]);

    const fields = parseDateFields(formData, event);
    await prisma.event.update({ where: { id: eventId }, data: { ...fields, dateFixed: false } });
    await prisma.activityLog.create({
      data: { eventId, userId: user.id, action: "TENTATIVE_DATE_SET", payload: { targetDate: fields.targetDate.toISOString() } }
    });
  });
}

/** Фиксация даты (PLANNING → IN_PROGRESS, разворачивает план) или перенос уже зафиксированной даты. */
export async function fixDateAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Назначать дату может только лид мероприятия или администратор.");
    assertStage(event, ["PLANNING", "IN_PROGRESS"]);

    const fields = parseDateFields(formData, event);

    if (!event.dateFixed) {
      const error = checkStageEntry("IN_PROGRESS", toStageCheck(event, { targetDate: fields.targetDate, dateFixed: true }));
      if (error) throw new Error(error);

      await prisma.event.update({ where: { id: eventId }, data: { ...fields, dateFixed: true } });
      await generateTasksForEvent(eventId);
      await prisma.event.update({ where: { id: eventId }, data: { stage: "IN_PROGRESS", stageChangedAt: new Date() } });
      await prisma.activityLog.create({
        data: { eventId, userId: user.id, action: "DATE_FIXED", payload: { targetDate: fields.targetDate.toISOString() } }
      });
      return;
    }

    const unchanged = event.targetDate && event.targetDate.getTime() === fields.targetDate.getTime();
    await prisma.event.update({ where: { id: eventId }, data: fields });
    if (!unchanged) {
      await recalcTasksOnDateChange(eventId, fields.targetDate, user.id);
    }
  });
}

export async function markDoneAction(eventId: string): Promise<void> {
  await runOrRedirect(eventId, "itogi", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Отметить мероприятие проведённым может только лид или администратор.");
    assertStage(event, ["IN_PROGRESS"]);

    const error = checkStageEntry("DONE", toStageCheck(event));
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
    assertStage(event, ["DONE"]);

    const error = checkStageEntry("CLOSED", toStageCheck(event));
    if (error) throw new Error(error);

    await prisma.event.update({
      where: { id: eventId },
      data: { stage: "CLOSED", stageChangedAt: new Date(), closedAt: new Date() }
    });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "CLOSED" } });
  });
}

/** Удаление — только администратор (раздел 4 ТЗ). Каскадом уходят задачи, файлы, ретро, состав. */
export async function deleteEventAction(eventId: string): Promise<void> {
  let error: string | null = null;
  try {
    const user = await requireRole("ADMIN");
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error("Мероприятие не найдено.");
    await prisma.$transaction([
      prisma.idea.updateMany({ where: { convertedEventId: eventId }, data: { convertedEventId: null } }),
      prisma.event.delete({ where: { id: eventId } }),
      prisma.activityLog.create({
        data: { userId: user.id, action: "EVENT_DELETED", payload: { title: event.title, eventId } }
      })
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось удалить мероприятие.";
  }
  if (error) goBack(eventId, "obzor", error);
  redirect("/");
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

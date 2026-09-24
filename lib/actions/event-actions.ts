"use server";

import { redirect } from "next/navigation";
import type { EventStage, EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { friendlyError } from "@/lib/errors";
import { canManageEvent, PermissionError, requireRole, requireUser } from "@/lib/permissions";
import { checkStageEntry, type EventForStageCheck } from "@/lib/stages";
import { fireTaskTrigger, generateTasksForEvent, markDateFixed, recalcTasksOnDateChange } from "@/lib/tasks/service";
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
    error = friendlyError(e, "Не удалось выполнить действие.");
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

  const leadId = String(formData.get("leadId") || "") || user.id;
  const sendNow = formData.get("intent") === "send";

  if (!title || !type) {
    redirect(`/events/new?error=${encodeURIComponent("Заполните название и тип мероприятия.")}`);
  }
  if (sendNow && !description) {
    redirect(`/events/new?error=${encodeURIComponent("Чтобы отправить на согласование, заполните описание.")}`);
  }

  const event = await prisma.event.create({
    data: {
      title,
      type,
      description: description || null,
      leadId,
      createdById: user.id,
      stage: sendNow ? "APPROVAL" : "IDEA",
      stageChangedAt: new Date()
    }
  });
  await prisma.activityLog.create({ data: { eventId: event.id, userId: user.id, action: "CREATED" } });
  if (sendNow) {
    await prisma.activityLog.create({ data: { eventId: event.id, userId: user.id, action: "SENT_TO_APPROVAL" } });
    await notifyAdminsOfApproval(event.id);
  }
  redirect(`/events/${event.id}`);
}

export async function updateOverviewAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Редактировать это мероприятие может только его лид или руководитель клуба.");

    const leadId = String(formData.get("leadId") || "") || null;
    const requestedType = String(formData.get("type") || "") as EventType | "";
    // Тип определяет шаблон задач — менять его после разворачивания плана нельзя.
    const type = requestedType && requestedType !== event.type && event._count.tasks === 0 ? requestedType : event.type;

    if (leadId !== event.leadId && event.leadId) {
      // Задачи «без отдела» — задачи лида: открытые переходят к новому лиду.
      await prisma.task.updateMany({
        where: { eventId, status: "TODO", department: null, assigneeId: event.leadId },
        data: { assigneeId: leadId }
      });
    }

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
    if (!canManageEvent(user, event)) throw new PermissionError("Отправить на согласование может только лид мероприятия или руководитель клуба.");
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
    assertStage(event, ["APPROVAL", "REJECTED"]);
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

/**
 * Запуск подготовки по окну дат (PLANNING → IN_PROGRESS). По регламенту гостю обещаем окно,
 * а не дату: план разворачивается от первого дня окна, чтобы заявка в ЦБ ушла за месяц.
 * Задачи «после фиксации даты» (аудитория, анонсы, съёмка) ждут фиксации.
 */
export async function startPreparationAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Запустить подготовку может только лид мероприятия или руководитель клуба.");
    assertStage(event, ["PLANNING"]);

    const fields = parseDateFields(formData, event);
    const error = checkStageEntry("IN_PROGRESS", toStageCheck(event, { targetDate: fields.targetDate, dateFixed: false }));
    if (error) throw new Error(error);

    await prisma.event.update({ where: { id: eventId }, data: { ...fields, dateFixed: false } });
    await generateTasksForEvent(eventId, user.id);
    await prisma.event.update({ where: { id: eventId }, data: { stage: "IN_PROGRESS", stageChangedAt: new Date() } });
    await prisma.activityLog.create({
      data: { eventId, userId: user.id, action: "PREPARATION_STARTED", payload: { targetDate: fields.targetDate.toISOString() } }
    });
  });
}

/** Сдвиг окна дат до фиксации: пересчитывает сроки открытых задач от нового первого дня окна. */
export async function moveWindowAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Менять окно дат может только лид мероприятия или руководитель клуба.");
    assertStage(event, ["IN_PROGRESS"]);
    if (event.dateFixed) throw new Error("Дата уже зафиксирована — используйте «Перенести дату».");
    const fields = parseDateFields(formData, event);
    await prisma.event.update({ where: { id: eventId }, data: fields });
    if (!event.targetDate || event.targetDate.getTime() !== fields.targetDate.getTime()) {
      await recalcTasksOnDateChange(eventId, fields.targetDate, user.id);
    }
  });
}

/**
 * Фиксация даты — по регламенту только после ответа ЦБ («Дата — только после ЦБ»).
 * Из PLANNING (типы без проверки ЦБ) сразу разворачивает план; в IN_PROGRESS пересчитывает
 * сроки от точной даты и запускает задачи, ждавшие фиксации. Уже зафиксированную дату переносит.
 */
export async function fixDateAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, "obzor", async () => {
    const user = await requireUser();
    const event = await loadEventOrThrow(eventId);
    if (!canManageEvent(user, event)) throw new PermissionError("Назначать дату может только лид мероприятия или руководитель клуба.");
    assertStage(event, ["PLANNING", "IN_PROGRESS"]);

    const fields = parseDateFields(formData, event);

    if (!event.dateFixed) {
      const securityAnswer = await prisma.task.findFirst({ where: { eventId, firesTrigger: "SECURITY_ANSWERED" } });
      if (securityAnswer && securityAnswer.status === "TODO") {
        throw new Error(
          `По регламенту дату фиксируем только после ответа ЦБ. Сначала ЦБ закрывает задачу «${securityAnswer.title}».`
        );
      }
      if (event.stage === "PLANNING") {
        const needsSecurity = await prisma.taskTemplate.count({ where: { eventType: event.type, firesTrigger: "SECURITY_ANSWERED" } });
        if (needsSecurity > 0) {
          throw new Error("Сначала запустите подготовку по окну дат: заявка в ЦБ уходит до фиксации даты.");
        }
        const error = checkStageEntry("IN_PROGRESS", toStageCheck(event, { targetDate: fields.targetDate }));
        if (error) throw new Error(error);
        await prisma.event.update({ where: { id: eventId }, data: { ...fields, dateFixed: true } });
        await generateTasksForEvent(eventId, user.id);
        await prisma.event.update({ where: { id: eventId }, data: { stage: "IN_PROGRESS", stageChangedAt: new Date() } });
      } else {
        const changed = !event.targetDate || event.targetDate.getTime() !== fields.targetDate.getTime();
        await prisma.event.update({ where: { id: eventId }, data: { ...fields, dateFixed: true } });
        if (changed) await recalcTasksOnDateChange(eventId, fields.targetDate, user.id);
        await markDateFixed(eventId, user.id);
      }
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
    if (!canManageEvent(user, event)) throw new PermissionError("Отметить мероприятие проведённым может только лид или руководитель клуба.");
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
    if (!canManageEvent(user, event)) throw new PermissionError("Закрыть мероприятие может только лид или руководитель клуба.");
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
    error = friendlyError(e, "Не удалось удалить мероприятие.");
  }
  if (error) goBack(eventId, "obzor", error);
  redirect("/");
}


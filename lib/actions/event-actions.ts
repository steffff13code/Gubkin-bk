"use server";

import { redirect } from "next/navigation";
import type { EventStage, EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { friendlyError } from "@/lib/errors";
import { PermissionError, requireRight } from "@/lib/permissions";
import { checkStageEntry, MAX_OPTIONS, tooLateWarning, type EventForStageCheck } from "@/lib/stages";
import { fireTaskTrigger, generateTasksForEvent, recalcTasksOnDateChange } from "@/lib/tasks/service";
import { startOfUtcDay } from "@/lib/time";
import { EVENT_STAGE_LABELS } from "@/lib/labels";
import { getRoleAccountId } from "@/lib/role-accounts";
import { notifyStep } from "@/lib/notifications/roles";

const FORM_TYPES: EventType[] = ["LECTURE", "CASE", "INTENSIVE", "ACCELERATOR"];

function goBack(eventId: string, error?: string, notice?: string): never {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (notice) params.set("notice", notice);
  const q = params.toString();
  redirect(`/events/${eventId}${q ? `?${q}` : ""}`);
}

async function runOrRedirect(eventId: string, fn: () => Promise<string | void>): Promise<never> {
  let error: string | null = null;
  let notice: string | null = null;
  try {
    notice = (await fn()) || null;
  } catch (e) {
    error = friendlyError(e);
  }
  goBack(eventId, error ?? undefined, notice ?? undefined);
}

async function loadEventOrThrow(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { retro: true, attachments: true, dateOptions: true, _count: { select: { tasks: true } } }
  });
  if (!event) throw new Error("Мероприятие не найдено.");
  return event;
}

type LoadedEvent = Awaited<ReturnType<typeof loadEventOrThrow>>;

function toStageCheck(event: LoadedEvent, overrides: Partial<EventForStageCheck> = {}): EventForStageCheck {
  return {
    title: event.title,
    type: event.type,
    guestName: event.guestName,
    guestOccupation: event.guestOccupation,
    guestOrganization: event.guestOrganization,
    guestTopic: event.guestTopic,
    format: event.format,
    speakerWindowStart: event.speakerWindowStart,
    speakerWindowEnd: event.speakerWindowEnd,
    dateOptionsCount: event.dateOptions.length,
    targetDate: event.targetDate,
    dateFixed: event.dateFixed,
    speakerWarned: event.speakerWarned,
    actualAttendance: event.actualAttendance,
    hasRetro: !!event.retro,
    hasPhotoReport: event.attachments.some((a) => a.kind === "PHOTO_REPORT"),
    ...overrides
  };
}

/** Переход возможен только из ожидаемого этапа — защита от устаревшей вкладки и двойных кликов. */
function assertStage(event: { stage: EventStage }, allowed: EventStage[]) {
  if (!allowed.includes(event.stage)) {
    throw new Error(`Мероприятие сейчас на этапе «${EVENT_STAGE_LABELS[event.stage]}» — это действие недоступно. Обновите страницу.`);
  }
}

function text(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v || null;
}

function date(formData: FormData, key: string): Date | null {
  const v = text(formData, key);
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error("Дата указана неверно.");
  return startOfUtcDay(d);
}

function int(formData: FormData, key: string): number | null {
  const v = text(formData, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Поля карточки спикера из формы (создание и правка). */
function speakerFields(formData: FormData) {
  const typeRaw = String(formData.get("type") || "LECTURE") as EventType;
  const type = FORM_TYPES.includes(typeRaw) ? typeRaw : "LECTURE";
  const cycle = text(formData, "intensiveCycle") === "OTHER" ? text(formData, "intensiveCycleOther") : text(formData, "intensiveCycle");
  return {
    type,
    guestName: text(formData, "guestName"),
    guestOccupation: text(formData, "guestOccupation"),
    guestOrganization: text(formData, "guestOrganization"),
    guestTopic: text(formData, "guestTopic"),
    format: text(formData, "format"),
    speakerWindowStart: date(formData, "speakerWindowStart"),
    speakerWindowEnd: date(formData, "speakerWindowEnd"),
    externalOwner: text(formData, "externalOwner"),
    description: text(formData, "description"),
    intensiveCycle: type === "INTENSIVE" ? cycle : null,
    intensiveMeeting: type === "INTENSIVE" ? int(formData, "intensiveMeeting") : null,
    intensiveTotal: type === "INTENSIVE" ? int(formData, "intensiveTotal") : null
  };
}

function titleFrom(fields: ReturnType<typeof speakerFields>, explicit: string | null): string {
  return explicit || fields.guestTopic || (fields.guestName ? `Встреча со спикером: ${fields.guestName}` : "");
}

/** Карточка спикера. Если всё заполнено — сразу на подбор дат, иначе черновик. */
export async function createEventAction(formData: FormData): Promise<void> {
  let eventId: string | null = null;
  let error: string | null = null;
  try {
    const user = await requireRight("CREATE_EVENT");
    const fields = speakerFields(formData);
    const title = titleFrom(fields, text(formData, "title"));
    if (!title) throw new Error("Укажите хотя бы ФИО спикера или тему — остальное можно дописать позже.");
    const leadId = (await getRoleAccountId("GUESTS")) ?? user.id;

    const event = await prisma.event.create({
      data: { ...fields, title, leadId, createdById: user.id, stage: "IDEA", stageChangedAt: new Date() }
    });
    eventId = event.id;
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "CREATED" } });

    const loaded = await loadEventOrThrow(event.id);
    if (!checkStageEntry("APPROVAL", toStageCheck(loaded))) {
      await prisma.event.update({ where: { id: event.id }, data: { stage: "APPROVAL", stageChangedAt: new Date() } });
      await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "SENT_TO_DATES" } });
      await notifyStep(event.id, "CREATED");
    }
  } catch (e) {
    error = friendlyError(e);
  }
  if (!eventId) redirect(`/events/new?error=${encodeURIComponent(error ?? "Не удалось создать мероприятие.")}`);
  redirect(`/events/${eventId}`);
}

/** Правка карточки спикера — Внешний отдел и Администратор. */
export async function updateSpeakerAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("CREATE_EVENT");
    const event = await loadEventOrThrow(eventId);
    if (event.stage === "CLOSED") throw new Error("Мероприятие закрыто — карточку больше не меняем.");
    const fields = speakerFields(formData);
    // Направление определяет шаблон задач — после разворачивания плана его не меняем.
    const type = event._count.tasks > 0 ? event.type : fields.type;
    await prisma.event.update({
      where: { id: eventId },
      data: {
        ...fields,
        type,
        title: titleFrom(fields, text(formData, "title")) || event.title,
        driveFolderUrl: text(formData, "driveFolderUrl")
      }
    });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "OVERVIEW_UPDATED" } });
    return "Карточка сохранена.";
  });
}

/** Черновик → «Подбор дат». */
export async function sendToDatesAction(eventId: string): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("CREATE_EVENT");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["IDEA"]);
    const error = checkStageEntry("APPROVAL", toStageCheck(event));
    if (error) throw new Error(error);
    await prisma.event.update({ where: { id: eventId }, data: { stage: "APPROVAL", stageChangedAt: new Date() } });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "SENT_TO_DATES" } });
    await notifyStep(eventId, "CREATED");
    return "Отправлено на подбор дат — Администратор и Пиар получили уведомление.";
  });
}

/** Вариант даты: дата, время, аудитория (Администратор и Пиар, до 4 штук). */
export async function addDateOptionAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("ADD_DATE_OPTIONS");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["APPROVAL"]);
    if (event.dateOptions.length >= MAX_OPTIONS) throw new Error(`Вариантов уже ${MAX_OPTIONS} — больше не нужно.`);
    const d = date(formData, "date");
    if (!d) throw new Error("Укажите дату.");
    const timeSlot = text(formData, "timeSlotCustom") ?? text(formData, "timeSlot");
    await prisma.eventDateOption.create({
      data: { eventId, date: d, timeSlot, venue: text(formData, "venue"), comment: text(formData, "comment"), createdById: user.id }
    });
    await prisma.activityLog.create({
      data: { eventId, userId: user.id, action: "DATE_OPTION_ADDED", payload: { date: d.toISOString(), timeSlot } }
    });
  });
}

export async function deleteDateOptionAction(eventId: string, optionId: string): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("ADD_DATE_OPTIONS");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["APPROVAL"]);
    await prisma.eventDateOption.deleteMany({ where: { id: optionId, eventId } });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "DATE_OPTION_REMOVED" } });
  });
}

/** «Варианты готовы» → «Дата у спикера», Внешнему отделу уходит уведомление. */
export async function optionsReadyAction(eventId: string): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("ADD_DATE_OPTIONS");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["APPROVAL"]);
    const error = checkStageEntry("PLANNING", toStageCheck(event));
    if (error) throw new Error(error);
    await prisma.event.update({ where: { id: eventId }, data: { stage: "PLANNING", stageChangedAt: new Date() } });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "OPTIONS_READY" } });
    await notifyStep(eventId, "OPTIONS_READY");
    return "Варианты отправлены Внешнему отделу.";
  });
}

/** Спикеру не подошёл ни один вариант — обратно на подбор дат. */
export async function backToDatesAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("FIX_DATE");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["PLANNING"]);
    const comment = text(formData, "comment");
    await prisma.event.update({ where: { id: eventId }, data: { stage: "APPROVAL", stageChangedAt: new Date() } });
    await prisma.activityLog.create({
      data: { eventId, userId: user.id, action: "BACK_TO_DATES", payload: comment ? { comment } : undefined }
    });
    await notifyStep(eventId, "CREATED");
  });
}

/**
 * «Спикер подтвердил»: выбранный вариант становится датой, временем и местом,
 * разворачивается план задач. Пропуск — после даты (регламент v3), блокировок «до ЦБ» нет.
 */
export async function confirmSpeakerDateAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("FIX_DATE");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["PLANNING"]);
    const option = event.dateOptions.find((o) => o.id === String(formData.get("optionId") || ""));
    if (!option) throw new Error("Выберите вариант, который подтвердил спикер.");
    const warned = formData.get("speakerWarned") === "on";
    if (!warned) throw new Error("Отметьте, что предупредили спикера: пропуск могут не одобрить.");
    const late = tooLateWarning(option.date);
    if (late && formData.get("confirmLate") !== "on") {
      throw new Error(`${late} Если всё равно фиксируем — отметьте «Понимаю, фиксируем».`);
    }
    const error = checkStageEntry("IN_PROGRESS", toStageCheck(event, { targetDate: option.date, dateFixed: true, speakerWarned: true }));
    if (error) throw new Error(error);

    await prisma.event.update({
      where: { id: eventId },
      data: { targetDate: option.date, timeSlot: option.timeSlot, venue: option.venue, dateFixed: true, speakerWarned: true }
    });
    // План разворачивается с уже зафиксированной датой: задачи «после фиксации» сразу получают сроки.
    await generateTasksForEvent(eventId, user.id);
    await prisma.event.update({ where: { id: eventId }, data: { stage: "IN_PROGRESS", stageChangedAt: new Date() } });
    await prisma.activityLog.create({
      data: { eventId, userId: user.id, action: "DATE_FIXED", payload: { targetDate: option.date.toISOString(), late: !!late } }
    });
    await notifyStep(eventId, "DATE_FIXED");
    return "Дата зафиксирована, план задач развёрнут. Пиару ушло уведомление про пропуск.";
  });
}

/** Перенос уже зафиксированной даты: сроки открытых задач пересчитываются. */
export async function rescheduleAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("FIX_DATE");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["IN_PROGRESS"]);
    const d = date(formData, "targetDate");
    if (!d) throw new Error("Укажите новую дату.");
    const timeSlot = text(formData, "timeSlot") ?? event.timeSlot;
    const venue = text(formData, "venue") ?? event.venue;
    await prisma.event.update({ where: { id: eventId }, data: { targetDate: d, timeSlot, venue } });
    if (!event.targetDate || event.targetDate.getTime() !== d.getTime()) {
      await recalcTasksOnDateChange(eventId, d, user.id);
    }
    return "Дата перенесена, сроки задач пересчитаны.";
  });
}

async function cancelEvent(eventId: string, userId: string, reason: string, action: string) {
  await prisma.$transaction([
    prisma.event.update({ where: { id: eventId }, data: { stage: "REJECTED", stageChangedAt: new Date(), approvalComment: reason } }),
    prisma.task.updateMany({ where: { eventId, status: "TODO" }, data: { status: "SKIPPED" } })
  ]);
  await prisma.activityLog.create({ data: { eventId, userId, action, payload: { reason } } });
}

/** Пропуск не одобрен: мероприятие отменяется, Внешнему отделу и Администратору — «Сообщите спикеру». */
export async function passRejectedAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("PASS_DECISION");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["IN_PROGRESS"]);
    const reason = text(formData, "reason");
    if (!reason) throw new Error("Укажите причину — её увидит Внешний отдел.");
    await cancelEvent(eventId, user.id, `Пропуск не одобрен: ${reason}`, "PASS_REJECTED");
    await notifyStep(eventId, "PASS_REJECTED", reason);
    return "Мероприятие отменено. Внешний отдел и Администратор получили уведомление.";
  });
}

/** Отмена мероприятия — только Администратор. */
export async function cancelEventAction(eventId: string, formData: FormData): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("CANCEL_DELETE");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["IDEA", "APPROVAL", "PLANNING", "IN_PROGRESS", "DONE"]);
    const reason = text(formData, "reason");
    if (!reason) throw new Error("Укажите причину отмены.");
    await cancelEvent(eventId, user.id, reason, "CANCELLED");
  });
}

/** Отменённое — обратно на подбор дат: план сбрасывается, дата снова не выбрана. */
export async function restoreToDatesAction(eventId: string): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("CANCEL_DELETE");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["REJECTED"]);
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { eventId } }),
      prisma.event.update({
        where: { id: eventId },
        data: {
          stage: "APPROVAL",
          stageChangedAt: new Date(),
          dateFixed: false,
          speakerWarned: false,
          passReadyAt: null,
          targetDate: null,
          approvalComment: null
        }
      })
    ]);
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "RESTORED_TO_DATES" } });
  });
}

export async function markDoneAction(eventId: string, formData?: FormData): Promise<void> {
  const returnTo = formData ? String(formData.get("returnTo") || "") : "";
  let error: string | null = null;
  try {
    const user = await requireRight("FINISH");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["IN_PROGRESS"]);
    const check = checkStageEntry("DONE", toStageCheck(event));
    if (check) throw new Error(check);
    await prisma.event.update({ where: { id: eventId }, data: { stage: "DONE", stageChangedAt: new Date() } });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "MARKED_DONE" } });
    await fireTaskTrigger(eventId, "EVENT_DONE");
  } catch (e) {
    error = friendlyError(e);
  }
  if (error) goBack(eventId, error);
  redirect(returnTo === "day" ? `/events/${eventId}/day` : `/events/${eventId}`);
}

export async function closeEventAction(eventId: string): Promise<void> {
  await runOrRedirect(eventId, async () => {
    const user = await requireRight("FINISH");
    const event = await loadEventOrThrow(eventId);
    assertStage(event, ["DONE"]);
    const error = checkStageEntry("CLOSED", toStageCheck(event));
    if (error) throw new Error(error);
    await prisma.event.update({ where: { id: eventId }, data: { stage: "CLOSED", stageChangedAt: new Date(), closedAt: new Date() } });
    await prisma.activityLog.create({ data: { eventId, userId: user.id, action: "CLOSED" } });
  });
}

/** Удаление — только Администратор. Каскадом уходят задачи, варианты дат, файлы, ретро. */
export async function deleteEventAction(eventId: string): Promise<void> {
  let error: string | null = null;
  try {
    const user = await requireRight("CANCEL_DELETE");
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error("Мероприятие не найдено.");
    await prisma.idea.updateMany({ where: { convertedEventId: eventId }, data: { convertedEventId: null } });
    await prisma.event.delete({ where: { id: eventId } });
    await prisma.activityLog.create({ data: { userId: user.id, action: "EVENT_DELETED", payload: { title: event.title, eventId } } });
  } catch (e) {
    error = e instanceof PermissionError ? e.message : friendlyError(e, "Не удалось удалить мероприятие.");
  }
  if (error) goBack(eventId, error);
  redirect("/");
}

import type { DepartmentCode, TaskAutoComplete, TaskTriggerEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  applyTriggerDueDates,
  buildTaskRows,
  recalcDueDatesOnDateChange,
  type DepartmentAssignments
} from "@/lib/tasks/generate";
import { calendarDay } from "@/lib/time";

async function loadDepartmentAssignments(): Promise<DepartmentAssignments> {
  const rows = await prisma.userDepartment.findMany({
    where: { position: { in: ["HEAD", "DEPUTY"] } }
  });
  const assignments: DepartmentAssignments = {};
  for (const row of rows) {
    const code = row.departmentCode as DepartmentCode;
    assignments[code] ??= { headId: null, deputyId: null };
    if (row.position === "HEAD") assignments[code]!.headId = row.userId;
    if (row.position === "DEPUTY") assignments[code]!.deputyId = row.userId;
  }
  return assignments;
}

/** Разворачивает план задач по шаблону типа мероприятия. Вызывается один раз, когда dateFixed становится true. */
export async function generateTasksForEvent(eventId: string, actorId: string | null = null, now: Date = new Date()) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  if (!event.targetDate) {
    throw new Error("У мероприятия не задана дата — план не может быть развёрнут.");
  }

  const existingCount = await prisma.task.count({ where: { eventId } });
  if (existingCount > 0) return; // план уже развёрнут, повторно не создаём

  const templates = await prisma.taskTemplate.findMany({
    where: { eventType: event.type },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }]
  });
  const assignments = await loadDepartmentAssignments();

  const rows = buildTaskRows(templates, event.targetDate, now, assignments, event.leadId);
  if (rows.length === 0) return;

  await prisma.task.createMany({ data: rows.map((r) => ({ eventId, ...r })) });
  await prisma.activityLog.create({
    data: { eventId, userId: actorId, action: "TASKS_GENERATED", payload: { count: rows.length } }
  });
  // «Зафиксировать дату с гостем» выполнена по определению: план разворачивается фиксацией даты.
  await autoCompleteTasks(eventId, "DATE_FIXED", actorId);
}

/** Перенос даты мероприятия: пересчитывает сроки открытых DATE_OFFSET-задач, закрытые не трогает. */
export async function recalcTasksOnDateChange(
  eventId: string,
  newTargetDate: Date,
  actorId: string | null
) {
  const tasks = await prisma.task.findMany({ where: { eventId } });
  const updates = recalcDueDatesOnDateChange(tasks, newTargetDate);

  await prisma.$transaction([
    ...updates.map((u) => prisma.task.update({ where: { id: u.id }, data: { dueDate: u.dueDate } })),
    prisma.activityLog.create({
      data: {
        eventId,
        userId: actorId,
        action: "DATE_CHANGED",
        payload: { newTargetDate: newTargetDate.toISOString(), tasksRescheduled: updates.length }
      }
    })
  ]);
}

/** Срабатывание событийного триггера — назначает срок задачам, которые его ждали. */
export async function fireTaskTrigger(eventId: string, triggerEvent: TaskTriggerEvent, firedAt: Date = new Date()) {
  const pending = await prisma.task.findMany({
    where: { eventId, triggerEvent, dueDate: null }
  });
  const updates = applyTriggerDueDates(pending, triggerEvent, calendarDay(firedAt));
  if (updates.length === 0) return;

  await prisma.$transaction(
    updates.map((u) => prisma.task.update({ where: { id: u.id }, data: { dueDate: u.dueDate } }))
  );
  await prisma.activityLog.create({
    data: { eventId, action: "TRIGGER_FIRED", payload: { triggerEvent, tasksScheduled: updates.length } }
  });
}

/** Автозакрытие задач, чьё состояние уже наступило в карточке (фотоотчёт прикреплён, ретро заполнено). */
export async function autoCompleteTasks(eventId: string, reason: TaskAutoComplete, actorId: string | null) {
  const pending = await prisma.task.findMany({ where: { eventId, autoComplete: reason, status: "TODO" } });
  if (pending.length === 0) return;
  const now = new Date();
  await prisma.$transaction([
    ...pending.map((t) =>
      prisma.task.update({ where: { id: t.id }, data: { status: "DONE", completedAt: now, completedById: actorId } })
    ),
    prisma.activityLog.create({
      data: { eventId, userId: actorId, action: "TASKS_AUTO_COMPLETED", payload: { reason, titles: pending.map((t) => t.title) } }
    })
  ]);
  for (const t of pending) {
    if (t.firesTrigger) await fireTaskTrigger(eventId, t.firesTrigger, now);
  }
}

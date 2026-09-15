import type { DepartmentCode, TaskTriggerEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  applyTriggerDueDates,
  buildTaskRows,
  recalcDueDatesOnDateChange,
  type DepartmentAssignments
} from "@/lib/tasks/generate";

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
export async function generateTasksForEvent(eventId: string, now: Date = new Date()) {
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
    data: { eventId, action: "TASKS_GENERATED", payload: { count: rows.length } }
  });
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
  const updates = applyTriggerDueDates(pending, triggerEvent, firedAt);
  if (updates.length === 0) return;

  await prisma.$transaction(
    updates.map((u) => prisma.task.update({ where: { id: u.id }, data: { dueDate: u.dueDate } }))
  );
  await prisma.activityLog.create({
    data: { eventId, action: "TRIGGER_FIRED", payload: { triggerEvent, tasksScheduled: updates.length } }
  });
}

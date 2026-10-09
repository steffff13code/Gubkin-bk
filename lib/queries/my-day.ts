import type { EventStage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, calendarDay, daysBetween, isOverdue } from "@/lib/time";
import { can, type RoleKey } from "@/lib/roles";

const LIVE_STAGES: EventStage[] = ["IDEA", "APPROVAL", "PLANNING", "IN_PROGRESS", "DONE"];

export type MyTask = Awaited<ReturnType<typeof loadMyTasks>>[number];

/** Задачи роли: её отдела и назначенные на её аккаунт. */
function myTasksWhere(userId: string, roleKey: RoleKey | null): Prisma.TaskWhereInput {
  return {
    status: "TODO",
    event: { stage: { in: LIVE_STAGES } },
    OR: [{ assigneeId: userId }, { secondAssigneeId: userId }, ...(roleKey ? [{ department: roleKey }] : [])]
  };
}

async function loadMyTasks(userId: string, roleKey: RoleKey | null) {
  return prisma.task.findMany({
    where: myTasksWhere(userId, roleKey),
    include: { event: { select: { id: true, title: true, targetDate: true } } },
    orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }]
  });
}

/** Открытые задачи роли, разложенные по срокам. */
export async function getMyTasks(userId: string, roleKey: RoleKey | null, now: Date = new Date()) {
  const tasks = await loadMyTasks(userId, roleKey);
  const buckets = {
    overdue: [] as MyTask[],
    today: [] as MyTask[],
    week: [] as MyTask[],
    later: [] as MyTask[],
    waiting: [] as MyTask[]
  };
  for (const t of tasks) {
    if (!t.dueDate) buckets.waiting.push(t);
    else if (isOverdue(t.dueDate, now)) buckets.overdue.push(t);
    else {
      const d = daysBetween(now, t.dueDate);
      if (d === 0) buckets.today.push(t);
      else if (d <= 7) buckets.week.push(t);
      else buckets.later.push(t);
    }
  }
  return buckets;
}

export async function countMyOverdueTasks(userId: string, roleKey: RoleKey | null): Promise<number> {
  return prisma.task.count({ where: { ...myTasksWhere(userId, roleKey), dueDate: { lt: calendarDay(new Date()) } } });
}

export type Decision = { eventId: string; title: string; action: string; danger?: boolean };

/** Мероприятия, где следующий шаг этапа — за этой ролью. */
export async function getDecisions(roleKey: RoleKey | null, now: Date = new Date()): Promise<Decision[]> {
  if (!roleKey) return [];
  const events = await prisma.event.findMany({
    where: { stage: { in: LIVE_STAGES } },
    include: { dateOptions: { select: { id: true } }, retro: { select: { eventId: true } } },
    orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }]
  });
  const today = calendarDay(now).getTime();
  const out: Decision[] = [];
  for (const e of events) {
    const base = { eventId: e.id, title: e.title };
    if (e.stage === "IDEA" && can(roleKey, "CREATE_EVENT")) out.push({ ...base, action: "Дописать карточку и отправить на подбор дат" });
    if (e.stage === "APPROVAL" && can(roleKey, "ADD_DATE_OPTIONS")) {
      out.push({ ...base, action: e.dateOptions.length ? `Вариантов ${e.dateOptions.length} — отметить «Варианты готовы»` : "Внести варианты дат" });
    }
    if (e.stage === "PLANNING" && can(roleKey, "FIX_DATE")) out.push({ ...base, action: "Согласовать дату со спикером" });
    if (e.stage === "IN_PROGRESS" && can(roleKey, "FINISH") && e.targetDate && calendarDay(e.targetDate).getTime() <= today) {
      out.push({ ...base, action: "Отметить «Проведено»" });
    }
    if (e.stage === "DONE" && can(roleKey, "FINISH")) out.push({ ...base, action: "Итоги и закрытие" });
  }
  if (roleKey === "BOARD") {
    for (const s of await getStuckEvents(now)) out.push({ eventId: s.id, title: s.title, action: `Стоит ${s.ageDays} дн.`, danger: true });
  }
  return out;
}

/** Мероприятия сегодня (по Москве) с зафиксированной датой — для баннера «Сегодня». */
export async function getTodayEvents(now: Date = new Date()) {
  const today = calendarDay(now);
  return prisma.event.findMany({
    where: { stage: { in: ["IN_PROGRESS", "DONE"] }, dateFixed: true, targetDate: today },
    select: { id: true, title: true, timeSlot: true, venue: true, stage: true }
  });
}

const STUCK_STAGES: EventStage[] = ["APPROVAL", "PLANNING", "IN_PROGRESS"];

export async function getStuckEvents(now: Date = new Date()) {
  const events = await prisma.event.findMany({
    where: { stage: { in: STUCK_STAGES } },
    include: { lead: true, tasks: { select: { status: true, completedAt: true } } }
  });

  return events
    .filter((e) => daysBetween(e.stageChangedAt, now) >= 7)
    .filter((e) => !e.tasks.some((t) => t.status === "DONE" && t.completedAt && t.completedAt >= addDays(now, -7)))
    .map((e) => ({ id: e.id, title: e.title, stage: e.stage, ageDays: daysBetween(e.stageChangedAt, now) }));
}

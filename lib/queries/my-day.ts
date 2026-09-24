import type { DepartmentCode, EventStage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, calendarDay, daysBetween, isOverdue } from "@/lib/time";

const LIVE_STAGES: EventStage[] = ["IDEA", "APPROVAL", "PLANNING", "IN_PROGRESS", "DONE"];

export type MyTask = Awaited<ReturnType<typeof loadMyTasks>>[number];

async function loadMyTasks(userId: string) {
  return prisma.task.findMany({
    where: {
      status: "TODO",
      event: { stage: { in: LIVE_STAGES } },
      OR: [{ assigneeId: userId }, { secondAssigneeId: userId }]
    },
    include: { event: { select: { id: true, title: true, targetDate: true } } },
    orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }]
  });
}

/** Мои открытые задачи, разложенные по срокам — как человек планирует день. */
export async function getMyTasks(userId: string, now: Date = new Date()) {
  const tasks = await loadMyTasks(userId);
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

function eventSummary(e: {
  id: string;
  title: string;
  stage: EventStage;
  targetDate: Date | null;
  dateFixed: boolean;
  retro: { eventId: string } | null;
  tasks: { status: string; required: boolean; dueDate: Date | null }[];
}) {
  return {
    id: e.id,
    title: e.title,
    stage: e.stage,
    targetDate: e.targetDate,
    dateFixed: e.dateFixed,
    needsRetro: e.stage === "DONE" && !e.retro,
    tasksDone: e.tasks.filter((t) => t.status === "DONE").length,
    tasksTotal: e.tasks.length,
    overdueCount: e.tasks.filter((t) => t.status === "TODO" && t.required && isOverdue(t.dueDate)).length
  };
}

/** Мероприятия, где я лид, и где я в составе (EventMember). */
export async function getMyEvents(userId: string) {
  const include = {
    tasks: { select: { status: true, required: true, dueDate: true } },
    retro: { select: { eventId: true } }
  } as const;
  const [led, member] = await Promise.all([
    prisma.event.findMany({ where: { leadId: userId, stage: { in: LIVE_STAGES } }, include, orderBy: { targetDate: "asc" } }),
    // В команде (EventMember) или есть мои задачи — человек участвует в мероприятии.
    prisma.event.findMany({
      where: {
        stage: { in: LIVE_STAGES },
        NOT: { leadId: userId },
        OR: [
          { members: { some: { userId } } },
          { tasks: { some: { OR: [{ assigneeId: userId }, { secondAssigneeId: userId }] } } }
        ]
      },
      include: { ...include, members: { where: { userId }, select: { roleInEvent: true } } },
      orderBy: { targetDate: "asc" }
    })
  ]);
  return {
    led: led.map(eventSummary),
    member: member.map((e) => ({ ...eventSummary(e), roleInEvent: e.members[0]?.roleInEvent || "Мои задачи" }))
  };
}

const CHECKLIST_STAGES: EventStage[] = ["IN_PROGRESS", "DONE"];

/**
 * Чек-лист отдела по каждому мероприятию в работе — видят все люди отдела.
 * Руководителю и заму дополнительно — загрузка команды.
 */
export async function getDepartmentOverview(departments: DepartmentCode[], withTeam: DepartmentCode[] = []) {
  if (departments.length === 0) return [];
  const [tasks, people] = await Promise.all([
    prisma.task.findMany({
      where: { department: { in: departments }, event: { stage: { in: CHECKLIST_STAGES } } },
      include: {
        event: { select: { id: true, title: true, targetDate: true, dateFixed: true, stage: true, leadId: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        secondAssignee: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: [{ event: { targetDate: "asc" } }, { group: "asc" }, { sortOrder: "asc" }]
    }),
    withTeam.length
      ? prisma.userDepartment.findMany({
          where: { departmentCode: { in: withTeam }, user: { isActive: true } },
          include: { user: { select: { id: true, firstName: true, lastName: true } } }
        })
      : Promise.resolve([])
  ]);

  return departments.map((code) => {
    const deptTasks = tasks.filter((t) => t.department === code);
    const open = deptTasks.filter((t) => t.status === "TODO");
    const byEvent = new Map<string, { event: (typeof deptTasks)[number]["event"]; tasks: typeof deptTasks }>();
    for (const t of deptTasks) {
      const entry = byEvent.get(t.eventId) ?? { event: t.event, tasks: [] };
      entry.tasks.push(t);
      byEvent.set(t.eventId, entry);
    }
    const team = withTeam.includes(code)
      ? people
          .filter((p) => p.departmentCode === code)
          .map((p) => ({
            ...p.user,
            position: p.position,
            open: open.filter((t) => t.assigneeId === p.user.id || t.secondAssigneeId === p.user.id).length,
            overdue: open.filter((t) => (t.assigneeId === p.user.id || t.secondAssigneeId === p.user.id) && isOverdue(t.dueDate)).length
          }))
      : null;
    return {
      code,
      events: Array.from(byEvent.values()),
      unassigned: open.filter((t) => !t.assigneeId),
      overdueCount: open.filter((t) => isOverdue(t.dueDate)).length,
      openCount: open.length,
      team
    };
  });
}

/** Руководитель клуба видит всё: по каждому мероприятию в работе — прогресс каждого отдела. */
export async function getClubOverview() {
  const events = await prisma.event.findMany({
    where: { stage: { in: ["PLANNING", "IN_PROGRESS", "DONE"] } },
    include: {
      lead: { select: { firstName: true, lastName: true } },
      tasks: { select: { department: true, status: true, required: true, dueDate: true } }
    },
    orderBy: [{ targetDate: "asc" }]
  });
  return events.map((e) => {
    const cells: Record<string, { done: number; total: number; overdue: number }> = {};
    for (const t of e.tasks) {
      const key = t.department ?? "_";
      cells[key] ??= { done: 0, total: 0, overdue: 0 };
      cells[key].total++;
      if (t.status !== "TODO") cells[key].done++;
      else if (t.required && isOverdue(t.dueDate)) cells[key].overdue++;
    }
    return {
      id: e.id,
      title: e.title,
      stage: e.stage,
      targetDate: e.targetDate,
      dateFixed: e.dateFixed,
      leadName: e.lead ? (e.lead.lastName ? `${e.lead.firstName} ${e.lead.lastName}` : e.lead.firstName) : null,
      cells
    };
  });
}

/** Мероприятия сегодня (по Москве) с зафиксированной датой — для баннера «сегодня мероприятие». */
export async function getTodayEvents(now: Date = new Date()) {
  const today = calendarDay(now);
  return prisma.event.findMany({
    where: { stage: { in: ["IN_PROGRESS", "DONE"] }, dateFixed: true, targetDate: today },
    select: { id: true, title: true, timeSlot: true, venue: true, stage: true }
  });
}

/** Регламенты человека: свои отделы + общие. */
export async function getMyRegulations(departments: DepartmentCode[]) {
  return prisma.regulation.findMany({
    where: { OR: [{ department: { in: departments } }, { department: null }] },
    orderBy: { sortOrder: "asc" }
  });
}

export async function getPendingApprovals() {
  return prisma.event.findMany({
    where: { stage: "APPROVAL" },
    include: { lead: true },
    orderBy: { stageChangedAt: "asc" }
  });
}

export async function countUnassignedTasks() {
  return prisma.task.count({
    where: { status: "TODO", assigneeId: null, event: { stage: { in: ["IN_PROGRESS", "DONE"] } } }
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
    .map((e) => ({ id: e.id, title: e.title, stage: e.stage, leadName: e.lead?.firstName ?? null, ageDays: daysBetween(e.stageChangedAt, now) }));
}

export async function countMyOverdueTasks(userId: string): Promise<number> {
  return prisma.task.count({
    where: {
      status: "TODO",
      dueDate: { lt: calendarDay(new Date()) },
      event: { stage: { in: LIVE_STAGES } },
      OR: [{ assigneeId: userId }, { secondAssigneeId: userId }]
    }
  });
}

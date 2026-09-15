import type { EventStage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, daysBetween, isOverdue } from "@/lib/time";

export async function getMyTasks(userId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      status: "TODO",
      OR: [{ assigneeId: userId }, { secondAssigneeId: userId }]
    },
    include: { event: true },
    orderBy: [{ dueDate: "asc" }]
  });

  const overdue = tasks.filter((t) => t.required && isOverdue(t.dueDate));
  const upcoming = tasks.filter((t) => !overdue.includes(t));

  return { overdue, upcoming };
}

const ACTIVE_STAGES: EventStage[] = ["IDEA", "APPROVAL", "PLANNING", "IN_PROGRESS"];

export async function getMyLedEvents(userId: string) {
  const events = await prisma.event.findMany({
    where: { leadId: userId, stage: { in: ACTIVE_STAGES } },
    include: { tasks: { select: { status: true, required: true, dueDate: true } } },
    orderBy: { targetDate: "asc" }
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    stage: e.stage,
    targetDate: e.targetDate,
    tasksDone: e.tasks.filter((t) => t.status === "DONE").length,
    tasksTotal: e.tasks.length,
    hasOverdue: e.tasks.some((t) => t.status === "TODO" && t.required && isOverdue(t.dueDate))
  }));
}

export async function getPendingApprovals() {
  return prisma.event.findMany({
    where: { stage: "APPROVAL" },
    include: { lead: true },
    orderBy: { stageChangedAt: "asc" }
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

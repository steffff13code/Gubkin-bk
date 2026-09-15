import type { DepartmentCode, EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isOverdue } from "@/lib/time";

export type EventFilters = {
  type?: EventType;
  department?: DepartmentCode;
  leadId?: string;
  mine?: boolean;
  currentUserId?: string | null;
  includeRejected?: boolean;
};

export type EventListItem = {
  id: string;
  title: string;
  type: EventType;
  stage: string;
  targetDate: Date | null;
  timeSlot: string | null;
  venue: string | null;
  leadName: string | null;
  guestName: string | null;
  tasksDone: number;
  tasksTotal: number;
  isOverdue: boolean;
};

export async function getEventsList(filters: EventFilters): Promise<EventListItem[]> {
  const where: NonNullable<Parameters<typeof prisma.event.findMany>[0]>["where"] = {};

  if (filters.type) where.type = filters.type;
  if (filters.leadId) where.leadId = filters.leadId;
  if (filters.department) where.tasks = { some: { department: filters.department } };
  if (!filters.includeRejected) where.stage = { not: "REJECTED" };

  if (filters.mine && filters.currentUserId) {
    where.OR = [
      { leadId: filters.currentUserId },
      { tasks: { some: { assigneeId: filters.currentUserId } } },
      { members: { some: { userId: filters.currentUserId } } }
    ];
  }

  const events = await prisma.event.findMany({
    where,
    include: {
      lead: true,
      tasks: { select: { status: true, required: true, dueDate: true } }
    },
    orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }]
  });

  return events.map((e) => {
    const tasksTotal = e.tasks.length;
    const tasksDone = e.tasks.filter((t) => t.status === "DONE").length;
    const overdue = e.tasks.some(
      (t) => t.status === "TODO" && t.required && isOverdue(t.dueDate)
    );
    return {
      id: e.id,
      title: e.title,
      type: e.type,
      stage: e.stage,
      targetDate: e.targetDate,
      timeSlot: e.timeSlot,
      venue: e.venue,
      leadName: e.lead ? e.lead.firstName : null,
      guestName: e.guestName,
      tasksDone,
      tasksTotal,
      isOverdue: overdue
    };
  });
}

export async function getLeadOptions() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["LEAD", "ADMIN"] }, isActive: true },
    orderBy: { firstName: "asc" },
    select: { id: true, firstName: true, lastName: true }
  });
  return users;
}

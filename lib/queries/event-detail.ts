import { prisma } from "@/lib/db";

export async function getEventDetail(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      lead: true,
      createdBy: true,
      approvedBy: true,
      members: { include: { user: true } },
      tasks: {
        include: { assignee: true, secondAssignee: true, completedBy: true },
        orderBy: [{ group: "asc" }, { sortOrder: "asc" }]
      },
      attachments: { include: { addedBy: true }, orderBy: { createdAt: "desc" } },
      retro: true,
      activityLogs: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 50 }
    }
  });
}

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEventDetail>>>;

export async function getPastRetros(type: string, excludeEventId: string) {
  return prisma.event.findMany({
    where: {
      type: type as never,
      stage: "CLOSED",
      retro: { isNot: null },
      NOT: { id: excludeEventId }
    },
    include: { retro: true },
    orderBy: { closedAt: "desc" },
    take: 3
  });
}

export async function getActiveUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: { firstName: "asc" },
    select: { id: true, firstName: true, lastName: true }
  });
}

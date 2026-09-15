import { prisma } from "@/lib/db";
import { formatDate, startOfUtcDay } from "@/lib/time";
import { notifyOnce, NOTIFICATION_KIND } from "@/lib/notifications/notify";

/** Раздел 8, п. 2: просроченная задача — однократно исполнителю и лиду, дальше только в дайджесте. */
export async function runOverdueCheck(now: Date = new Date()): Promise<void> {
  const tasks = await prisma.task.findMany({
    where: {
      status: "TODO",
      required: true,
      dueDate: { lt: startOfUtcDay(now) },
      overdueNotifiedAt: null
    },
    include: { event: true }
  });

  for (const task of tasks) {
    const recipients = new Set<string>();
    if (task.assigneeId) recipients.add(task.assigneeId);
    if (task.secondAssigneeId) recipients.add(task.secondAssigneeId);
    if (task.event.leadId) recipients.add(task.event.leadId);

    const text = `Просрочена задача «${task.title}» по мероприятию «${task.event.title}» (срок был ${formatDate(task.dueDate)}).`;

    for (const userId of recipients) {
      await notifyOnce(userId, NOTIFICATION_KIND.TASK_OVERDUE, `overdue:${task.id}:${userId}`, text, now);
    }

    await prisma.task.update({ where: { id: task.id }, data: { overdueNotifiedAt: now } });
  }
}

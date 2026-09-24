import { prisma } from "@/lib/db";
import { calendarDay, formatDate } from "@/lib/time";
import { notifyOnce, NOTIFICATION_KIND, type Delivery } from "@/lib/notifications/notify";

/** Раздел 8, п. 2: просроченная задача — однократно исполнителю и лиду, дальше только в дайджесте. */
export async function runOverdueCheck(now: Date = new Date()): Promise<Delivery[]> {
  const tasks = await prisma.task.findMany({
    where: {
      status: "TODO",
      required: true,
      dueDate: { lt: calendarDay(now) },
      overdueNotifiedAt: null
    },
    include: { event: true }
  });

  const deliveries: Delivery[] = [];
  for (const task of tasks) {
    const recipients = new Set<string>();
    if (task.assigneeId) recipients.add(task.assigneeId);
    if (task.secondAssigneeId) recipients.add(task.secondAssigneeId);
    if (task.event.leadId) recipients.add(task.event.leadId);

    const text = `Просрочена задача «${task.title}» по мероприятию «${task.event.title}» (срок был ${formatDate(task.dueDate)}).`;

    const attempts: Delivery[] = [];
    for (const userId of recipients) {
      attempts.push(await notifyOnce(userId, NOTIFICATION_KIND.TASK_OVERDUE, `overdue:${task.id}:${userId}`, text, now));
    }
    deliveries.push(...attempts);

    // «Однократно» считаем выполненным, только если сообщение реально ушло (или упёрлось в дневной лимит —
    // тогда его увидят в дайджесте). Если бот ещё не подключён, попробуем в следующий тик.
    if (attempts.some((a) => a.result === "sent" || a.result === "duplicate" || a.result === "capped")) {
      await prisma.task.update({ where: { id: task.id }, data: { overdueNotifiedAt: now } });
    }
  }
  return deliveries;
}

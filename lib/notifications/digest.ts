import { prisma } from "@/lib/db";
import { formatDate, isDueSoon, isOverdue } from "@/lib/time";
import { notifyOnce, NOTIFICATION_KIND } from "@/lib/notifications/notify";

/** Раздел 8, п. 1: ежедневный дайджест в 09:00 МСК. Молчим, если сказать нечего. */
export async function runDigest(now: Date = new Date()): Promise<void> {
  const dateKey = now.toISOString().slice(0, 10);
  const users = await prisma.user.findMany({ where: { botStarted: true, isActive: true } });

  for (const user of users) {
    const myTasks = await prisma.task.findMany({
      where: {
        status: "TODO",
        OR: [{ assigneeId: user.id }, { secondAssigneeId: user.id }]
      },
      include: { event: true }
    });
    const overdue = myTasks.filter((t) => t.required && isOverdue(t.dueDate, now));
    const dueSoon = myTasks.filter((t) => !overdue.includes(t) && isDueSoon(t.dueDate, now, 2));

    const ledEvents = await prisma.event.findMany({
      where: { leadId: user.id, stage: { in: ["APPROVAL", "PLANNING", "IN_PROGRESS"] } },
      include: { tasks: true }
    });
    const ledWithOverdue = ledEvents
      .map((e) => ({ event: e, overdueCount: e.tasks.filter((t) => t.status === "TODO" && t.required && isOverdue(t.dueDate, now)).length }))
      .filter((x) => x.overdueCount > 0);

    if (overdue.length === 0 && dueSoon.length === 0 && ledWithOverdue.length === 0) continue;

    const lines: string[] = ["Доброе утро! Ваш дайджест на сегодня:"];

    if (overdue.length > 0) {
      lines.push(`\nПросрочено (${overdue.length}):`);
      for (const t of overdue) lines.push(`• ${t.title} — «${t.event.title}» (срок был ${formatDate(t.dueDate)})`);
    }
    if (dueSoon.length > 0) {
      lines.push(`\nБлижайшие 2 дня (${dueSoon.length}):`);
      for (const t of dueSoon) lines.push(`• ${t.title} — «${t.event.title}» (срок ${formatDate(t.dueDate)})`);
    }
    if (ledWithOverdue.length > 0) {
      lines.push(`\nВаши мероприятия с просрочками:`);
      for (const x of ledWithOverdue) lines.push(`• «${x.event.title}» — просроченных задач: ${x.overdueCount}`);
    }

    await notifyOnce(user.id, NOTIFICATION_KIND.DIGEST, `digest:${user.id}:${dateKey}`, lines.join("\n"), now);
  }
}

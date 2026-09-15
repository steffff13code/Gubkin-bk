import { prisma } from "@/lib/db";
import { daysBetween } from "@/lib/time";
import { notifyOnce, NOTIFICATION_KIND } from "@/lib/notifications/notify";

/** Раздел 8, п. 4: за 2 дня до мероприятия — стоп-лист незакрытых обязательных задач лиду и администраторам. */
export async function runStoplistCheck(now: Date = new Date()): Promise<void> {
  const events = await prisma.event.findMany({
    where: { stage: "IN_PROGRESS", dateFixed: true, targetDate: { not: null } },
    include: { tasks: true }
  });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true } });

  for (const event of events) {
    if (!event.targetDate) continue;
    if (daysBetween(now, event.targetDate) !== 2) continue;

    const openRequired = event.tasks.filter((t) => t.required && t.status === "TODO");
    const list = openRequired.length
      ? openRequired.map((t) => `• ${t.title}`).join("\n")
      : "Все обязательные задачи закрыты.";
    const text = `Стоп-лист по «${event.title}» — мероприятие через 2 дня:\n${list}`;
    const dateKey = event.targetDate.toISOString().slice(0, 10);

    const recipients = new Set<string>(admins.map((a) => a.id));
    if (event.leadId) recipients.add(event.leadId);

    for (const userId of recipients) {
      await notifyOnce(userId, NOTIFICATION_KIND.STOPLIST, `stoplist:${event.id}:${dateKey}:${userId}`, text, now);
    }
  }
}

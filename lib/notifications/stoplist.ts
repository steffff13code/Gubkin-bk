import { prisma } from "@/lib/db";
import { addDays, daysBetween } from "@/lib/time";
import { notifyOnce, NOTIFICATION_KIND, type Delivery } from "@/lib/notifications/notify";

export const STOPLIST_TITLE_PREFIX = "Стоп-лист";

/**
 * Раздел 8, п. 4: за 2 дня до мероприятия система собирает список незакрытых
 * обязательных задач, кладёт его в задачу «Стоп-лист» лида (создаёт её, если
 * шаблон её не содержит) и отправляет лиду и администраторам.
 */
export async function runStoplistCheck(now: Date = new Date()): Promise<Delivery[]> {
  const deliveries: Delivery[] = [];
  const events = await prisma.event.findMany({
    where: { stage: "IN_PROGRESS", dateFixed: true, targetDate: { not: null } },
    include: { tasks: true }
  });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true } });

  for (const event of events) {
    if (!event.targetDate) continue;
    if (daysBetween(now, event.targetDate) !== 2) continue;

    const stoplistTask = event.tasks.find((t) => t.title.startsWith(STOPLIST_TITLE_PREFIX));
    const openRequired = event.tasks.filter(
      (t) => t.required && t.status === "TODO" && t.id !== stoplistTask?.id
    );
    const list = openRequired.length
      ? openRequired.map((t) => `• ${t.title}`).join("\n")
      : "Все обязательные задачи закрыты.";

    if (stoplistTask) {
      await prisma.task.update({ where: { id: stoplistTask.id }, data: { description: list } });
    } else {
      await prisma.task.create({
        data: {
          eventId: event.id,
          title: `${STOPLIST_TITLE_PREFIX}: проверить, что все обязательные задачи закрыты`,
          description: list,
          assigneeId: event.leadId,
          dueDate: addDays(event.targetDate, -2),
          triggerType: "DATE_OFFSET",
          offsetDays: -2,
          required: true,
          group: "BEFORE",
          sortOrder: 999
        }
      });
    }

    const text = `Стоп-лист по «${event.title}» — мероприятие через 2 дня:\n${list}`;
    const dateKey = event.targetDate.toISOString().slice(0, 10);

    const recipients = new Set<string>(admins.map((a) => a.id));
    if (event.leadId) recipients.add(event.leadId);

    for (const userId of recipients) {
      deliveries.push(await notifyOnce(userId, NOTIFICATION_KIND.STOPLIST, `stoplist:${event.id}:${dateKey}:${userId}`, text, now));
    }
  }
  return deliveries;
}

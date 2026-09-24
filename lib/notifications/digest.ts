import { prisma } from "@/lib/db";
import { calendarDay, formatDate, isDueSoon, isOverdue } from "@/lib/time";
import { notifyOnce, NOTIFICATION_KIND, type Delivery } from "@/lib/notifications/notify";
import { scheduleDay } from "@/lib/event-day";
import { appUrl } from "@/lib/app-url";

export type DigestInput = {
  /** Мероприятия сегодня, где у человека есть шаги тайминга. */
  today?: { eventTitle: string; timeSlot: string | null; link: string | null; steps: { when: string; title: string }[] }[];
  overdue: { title: string; eventTitle: string; dueDate: Date | null }[];
  dueSoon: { title: string; eventTitle: string; dueDate: Date | null }[];
  ledWithOverdue: { eventTitle: string; overdueCount: number }[];
};

/** Текст дайджеста; null — сказать нечего, ничего не отправляем. */
export function composeDigest(input: DigestInput): string | null {
  const today = input.today ?? [];
  if (today.length === 0 && input.overdue.length === 0 && input.dueSoon.length === 0 && input.ledWithOverdue.length === 0) {
    return null;
  }

  const lines: string[] = ["Доброе утро! Ваш дайджест на сегодня:"];
  for (const e of today) {
    lines.push(`\nСегодня мероприятие «${e.eventTitle}»${e.timeSlot ? ` в ${e.timeSlot}` : ""}. Ваши шаги:`);
    for (const st of e.steps) lines.push(`• ${st.when} — ${st.title}`);
    if (e.link) lines.push(`Тайминг: ${e.link}`);
  }
  if (input.overdue.length > 0) {
    lines.push(`\nПросрочено (${input.overdue.length}):`);
    for (const t of input.overdue) lines.push(`• ${t.title} — «${t.eventTitle}» (срок был ${formatDate(t.dueDate)})`);
  }
  if (input.dueSoon.length > 0) {
    lines.push(`\nБлижайшие 2 дня (${input.dueSoon.length}):`);
    for (const t of input.dueSoon) lines.push(`• ${t.title} — «${t.eventTitle}» (срок ${formatDate(t.dueDate)})`);
  }
  if (input.ledWithOverdue.length > 0) {
    lines.push(`\nВаши мероприятия с просрочками:`);
    for (const x of input.ledWithOverdue) lines.push(`• «${x.eventTitle}» — просроченных задач: ${x.overdueCount}`);
  }
  return lines.join("\n");
}

/** Раздел 8, п. 1: ежедневный дайджест в 09:00 МСК. Молчим, если сказать нечего. */
export async function runDigest(now: Date = new Date()): Promise<Delivery[]> {
  const dateKey = calendarDay(now).toISOString().slice(0, 10);
  const users = await prisma.user.findMany({ where: { botStarted: true, isActive: true } });
  const deliveries: Delivery[] = [];

  for (const user of users) {
    const myTasks = await prisma.task.findMany({
      where: { status: "TODO", OR: [{ assigneeId: user.id }, { secondAssigneeId: user.id }] },
      include: { event: true }
    });
    // Шаги дня мероприятия, которое сегодня, идут отдельным блоком с временем по таймингу.
    const todayDay = calendarDay(now).getTime();
    const daySteps = myTasks.filter(
      (t) =>
        t.group === "EVENT_DAY" &&
        t.event.dateFixed &&
        t.event.targetDate &&
        calendarDay(t.event.targetDate).getTime() === todayDay
    );
    const todayByEvent = new Map<string, { event: (typeof daySteps)[number]["event"]; steps: typeof daySteps }>();
    for (const t of daySteps) {
      const entry = todayByEvent.get(t.eventId) ?? { event: t.event, steps: [] };
      entry.steps.push(t);
      todayByEvent.set(t.eventId, entry);
    }
    const today = Array.from(todayByEvent.values()).map(({ event, steps }) => ({
      eventTitle: event.title,
      timeSlot: event.timeSlot,
      link: appUrl() ? `${appUrl()}/events/${event.id}/day` : null,
      steps: scheduleDay(steps.sort((a, b) => a.sortOrder - b.sortOrder), event.timeSlot).map((st) => ({
        when: st.clock ?? st.dayTimeLabel ?? "в течение дня",
        title: st.title
      }))
    }));

    const rest = myTasks.filter((t) => !daySteps.includes(t));
    const overdue = rest.filter((t) => t.required && isOverdue(t.dueDate, now));
    const dueSoon = rest.filter((t) => !overdue.includes(t) && isDueSoon(t.dueDate, now, 2));

    const ledEvents = await prisma.event.findMany({
      where: { leadId: user.id, stage: { in: ["APPROVAL", "PLANNING", "IN_PROGRESS"] } },
      include: { tasks: true }
    });
    const ledWithOverdue = ledEvents
      .map((e) => ({
        eventTitle: e.title,
        overdueCount: e.tasks.filter((t) => t.status === "TODO" && t.required && isOverdue(t.dueDate, now)).length
      }))
      .filter((x) => x.overdueCount > 0);

    const text = composeDigest({
      today,
      overdue: overdue.map((t) => ({ title: t.title, eventTitle: t.event.title, dueDate: t.dueDate })),
      dueSoon: dueSoon.map((t) => ({ title: t.title, eventTitle: t.event.title, dueDate: t.dueDate })),
      ledWithOverdue
    });
    if (!text) continue;

    deliveries.push(await notifyOnce(user.id, NOTIFICATION_KIND.DIGEST, `digest:${user.id}:${dateKey}`, text, now));
  }
  return deliveries;
}

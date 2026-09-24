import Link from "next/link";
import { notFound } from "next/navigation";
import { displayName, getCurrentUser } from "@/lib/auth";
import { canManageEvent } from "@/lib/permissions";
import { getEventDetail } from "@/lib/queries/event-detail";
import { DEPARTMENT_LABELS } from "@/lib/labels";
import { calendarDay, formatDate, formatDateLong } from "@/lib/time";
import { scheduleDay } from "@/lib/event-day";
import { markDoneAction } from "@/lib/actions/event-actions";
import { DayTimeline, type TimelineStep } from "@/components/events/day-timeline";

export const dynamic = "force-dynamic";

export default async function EventDayPage({ params }: { params: { id: string } }) {
  const [user, event] = await Promise.all([getCurrentUser(), getEventDetail(params.id)]);
  if (!event) notFound();

  const canManage = canManageEvent(user, event);
  const locked = event.stage === "CLOSED" || event.stage === "REJECTED";
  const isToday = !!event.targetDate && calendarDay(event.targetDate).getTime() === calendarDay(new Date()).getTime();

  const dayTasks = event.tasks.filter((t) => t.group === "EVENT_DAY").sort((a, b) => a.sortOrder - b.sortOrder);
  const steps: TimelineStep[] = scheduleDay(dayTasks, event.timeSlot).map((t) => {
    const mine = !!user && (t.assigneeId === user.id || t.secondAssigneeId === user.id);
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      required: t.required,
      clock: t.clock,
      at: t.at,
      label: t.dayTimeLabel,
      department: t.department ? DEPARTMENT_LABELS[t.department] : null,
      people: [t.assignee, t.secondAssignee].filter((p): p is NonNullable<typeof p> => !!p).map(displayName),
      canToggle: !locked && t.status !== "SKIPPED" && (mine || canManage),
      mine
    };
  });
  const leftovers = event.tasks.filter((t) => t.group === "BEFORE" && t.required && t.status === "TODO");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/events/${event.id}`} className="text-xs text-muted hover:text-gold">
        ← карточка мероприятия
      </Link>
      <div className="mb-4 mt-1">
        <p className="text-xs font-bold uppercase tracking-wide text-gold">
          {isToday ? "Сегодня — день мероприятия" : "День мероприятия"}
        </p>
        <h1 className="text-2xl font-bold text-ink">{event.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {event.targetDate ? formatDateLong(event.targetDate) : "дата не выбрана"}
          {event.timeSlot && ` · ${event.timeSlot}`}
          {event.venue && ` · ${event.venue}`}
          {event.guestName && ` · гость: ${event.guestName}`}
        </p>
        {!event.dateFixed && (
          <p className="mt-2 rounded border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">
            Дата ещё не зафиксирована — тайминг показан заранее, чтобы все знали порядок.
          </p>
        )}
      </div>

      {leftovers.length > 0 && event.stage === "IN_PROGRESS" && (
        <section className="mb-4 rounded-xl border border-danger/40 bg-danger/5 p-3">
          <h2 className="text-sm font-bold text-danger">Стоп-лист: до мероприятия не закрыто {leftovers.length}</h2>
          <ul className="mt-1 space-y-0.5 text-xs text-ink">
            {leftovers.map((t) => (
              <li key={t.id}>
                • {t.title}
                <span className="text-muted">
                  {" "}
                  · {t.department ? DEPARTMENT_LABELS[t.department] : "лид"} · до {formatDate(t.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {steps.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
          У этого мероприятия нет шагов дня мероприятия: план ещё не развёрнут или в шаблоне типа нет группы «День
          мероприятия».
        </p>
      ) : (
        <DayTimeline eventId={event.id} steps={steps} timeSlot={event.timeSlot} isToday={isToday} />
      )}

      {canManage && event.stage === "IN_PROGRESS" && event.dateFixed && isToday && (
        <form action={markDoneAction.bind(null, event.id)} className="mt-4">
          <button type="submit" className="w-full rounded-lg bg-gold py-3 text-sm font-bold text-bg hover:bg-gold/90">
            Мероприятие прошло — отметить проведённым
          </button>
          <p className="mt-1 text-center text-xs text-muted">
            После этого у Контента, Пиара и Гостей появятся задачи «после»: монтаж, фото, пост-отчёт, спасибо гостю.
          </p>
        </form>
      )}
    </div>
  );
}

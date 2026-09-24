import Link from "next/link";
import { EVENT_TYPE_LABELS, EVENT_TYPE_PILL_CLASSES } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import type { EventListItem } from "@/lib/queries/events";
import { Avatar } from "@/components/avatar";
import { CalendarIcon } from "@/components/icons";

export function EventCard({ event }: { event: EventListItem }) {
  const progress = event.tasksTotal > 0 ? Math.round((event.tasksDone / event.tasksTotal) * 100) : 0;

  return (
    <Link
      href={`/events/${event.id}`}
      className="block rounded-xl border border-line bg-surface p-3 transition hover:border-accent/60 hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${EVENT_TYPE_PILL_CLASSES[event.type]}`}>
          {EVENT_TYPE_LABELS[event.type]}
        </span>
        {event.isOverdue && (
          <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger">Просрочка</span>
        )}
      </div>

      <p className="mt-2 text-sm font-bold text-ink">{event.title}</p>

      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <CalendarIcon className="h-3.5 w-3.5" />
        {event.targetDate && !event.dateFixed ? `окно с ${formatDate(event.targetDate)}` : formatDate(event.targetDate)}
        {event.dateFixed && event.timeSlot ? ` · ${event.timeSlot}` : ""}
      </p>

      {event.tasksTotal > 0 && (
        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>Задачи</span>
            <span className="font-bold text-ink">
              {event.tasksDone}/{event.tasksTotal}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-[#5FA8FF]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
        <Avatar name={event.leadName ?? "?"} size={22} />
        <span className="text-xs text-muted">{event.leadName ? `Лид: ${event.leadName}` : "Лид не назначен"}</span>
      </div>
    </Link>
  );
}

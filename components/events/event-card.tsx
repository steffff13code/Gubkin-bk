import Link from "next/link";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import type { EventListItem } from "@/lib/queries/events";

export function EventCard({ event }: { event: EventListItem }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="block rounded border border-line bg-surface p-2 transition hover:border-gold"
    >
      <p className="text-sm font-bold text-ink">{event.title}</p>
      <p className="mt-0.5 text-xs text-muted">
        {EVENT_TYPE_LABELS[event.type]} · {formatDate(event.targetDate)}
        {event.timeSlot ? ` · ${event.timeSlot}` : ""}
      </p>
      {event.leadName && <p className="mt-0.5 text-xs text-muted">Лид: {event.leadName}</p>}
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-muted">
          {event.tasksDone}/{event.tasksTotal} задач
        </span>
        {event.isOverdue && (
          <span className="rounded bg-danger/10 px-1.5 py-0.5 text-xs font-bold text-danger">
            Просрочка
          </span>
        )}
      </div>
    </Link>
  );
}

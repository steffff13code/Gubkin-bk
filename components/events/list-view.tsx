import Link from "next/link";
import clsx from "clsx";
import { EVENT_STAGE_DOT_CLASSES, EVENT_STAGE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import type { EventListItem } from "@/lib/queries/events";

/** Список всех мероприятий, включая закрытые — удобно на телефоне и для архива. */
export function ListView({ events }: { events: EventListItem[] }) {
  if (events.length === 0) {
    return <p className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">Мероприятий не найдено.</p>;
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {events.map((e) => {
        const stage = e.stage as keyof typeof EVENT_STAGE_LABELS;
        const pct = e.tasksTotal ? Math.round((e.tasksDone / e.tasksTotal) * 100) : 0;
        return (
          <li key={e.id}>
            <Link href={`/events/${e.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface2">
              <span className="min-w-0 flex-1 basis-60">
                <span className="block font-bold text-ink">{e.title}</span>
                <span className="text-xs text-muted">
                  {e.targetDate ? (e.dateFixed ? formatDate(e.targetDate) : `окно с ${formatDate(e.targetDate)}`) : "дата не выбрана"}
                  {e.dateFixed && e.timeSlot ? ` · ${e.timeSlot}` : ""}
                  {e.leadName ? ` · лид: ${e.leadName}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className={clsx("h-2 w-2 rounded-full", EVENT_STAGE_DOT_CLASSES[stage])} />
                {EVENT_STAGE_LABELS[stage]}
              </span>
              {e.tasksTotal > 0 && (
                <span className="flex w-28 items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <span className={clsx("block h-full rounded-full", e.isOverdue ? "bg-danger" : "bg-success")} style={{ width: `${pct}%` }} />
                  </span>
                  <span className={clsx("text-xs", e.isOverdue ? "font-bold text-danger" : "text-muted")}>
                    {e.tasksDone}/{e.tasksTotal}
                  </span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

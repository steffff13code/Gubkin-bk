import Link from "next/link";
import { EVENT_STAGE_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import type { EventListItem } from "@/lib/queries/events";

export function ListView({ events }: { events: EventListItem[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">Мероприятий не найдено.</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-line bg-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line text-muted">
          <tr>
            <th className="px-3 py-2">Название</th>
            <th className="px-3 py-2">Тип</th>
            <th className="px-3 py-2">Дата</th>
            <th className="px-3 py-2">Стадия</th>
            <th className="px-3 py-2">Лид</th>
            <th className="px-3 py-2">Гость</th>
            <th className="px-3 py-2">Площадка</th>
            <th className="px-3 py-2">Задачи</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b border-line last:border-0 hover:bg-bg">
              <td className="px-3 py-2">
                <Link href={`/events/${e.id}`} className="font-bold text-ink hover:text-gold">
                  {e.title}
                </Link>
              </td>
              <td className="px-3 py-2 text-muted">{EVENT_TYPE_LABELS[e.type]}</td>
              <td className="px-3 py-2 text-muted">{formatDate(e.targetDate)}</td>
              <td className="px-3 py-2 text-muted">
                {EVENT_STAGE_LABELS[e.stage as keyof typeof EVENT_STAGE_LABELS]}
              </td>
              <td className="px-3 py-2 text-muted">{e.leadName ?? "—"}</td>
              <td className="px-3 py-2 text-muted">{e.guestName ?? "—"}</td>
              <td className="px-3 py-2 text-muted">{e.venue ?? "—"}</td>
              <td className="px-3 py-2">
                <span className={e.isOverdue ? "font-bold text-danger" : "text-muted"}>
                  {e.tasksDone}/{e.tasksTotal}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

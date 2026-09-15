import Link from "next/link";
import clsx from "clsx";
import { getMonthGrid, MONTH_LABELS_RU, WEEKDAY_LABELS_RU, startOfUtcDay } from "@/lib/time";
import type { EventListItem } from "@/lib/queries/events";

function buildMonthHref(baseParams: URLSearchParams, year: number, month: number) {
  const params = new URLSearchParams(baseParams);
  params.set("month", `${year}-${String(month + 1).padStart(2, "0")}`);
  return `/?${params.toString()}`;
}

export function CalendarView({
  events,
  year,
  month,
  searchParams
}: {
  events: EventListItem[];
  year: number;
  month: number; // 0-11
  searchParams: Record<string, string | undefined>;
}) {
  const weeks = getMonthGrid(year, month);
  const today = startOfUtcDay(new Date()).getTime();

  const eventsByDay = new Map<string, EventListItem[]>();
  for (const e of events) {
    if (!e.targetDate) continue;
    const key = startOfUtcDay(e.targetDate).toISOString();
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), e]);
  }

  const baseParams = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "month") baseParams.set(k, v);
  }

  const prevMonth = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const nextMonth = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };

  return (
    <div className="rounded border border-line bg-surface p-3">
      <div className="mb-3 flex items-center justify-between">
        <Link href={buildMonthHref(baseParams, prevMonth.y, prevMonth.m)} className="text-sm text-muted hover:text-ink">
          ← Пред.
        </Link>
        <h2 className="text-sm font-bold text-ink">
          {MONTH_LABELS_RU[month]} {year}
        </h2>
        <Link href={buildMonthHref(baseParams, nextMonth.y, nextMonth.m)} className="text-sm text-muted hover:text-ink">
          След. →
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-px text-xs">
        {WEEKDAY_LABELS_RU.map((w) => (
          <div key={w} className="px-1 pb-1 text-center font-bold text-muted">
            {w}
          </div>
        ))}
        {weeks.flat().map((cell, i) => {
          const key = cell.date.toISOString();
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = cell.date.getTime() === today;
          return (
            <div
              key={i}
              className={clsx(
                "min-h-[72px] rounded border border-line p-1 align-top",
                !cell.inMonth && "bg-bg text-muted/50",
                isToday && "border-gold"
              )}
            >
              <div className="text-right text-[11px] text-muted">{cell.date.getUTCDate()}</div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    className="block truncate rounded bg-bg px-1 text-[11px] text-ink hover:text-gold"
                    title={e.title}
                  >
                    {e.title}
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[11px] text-muted">+{dayEvents.length - 3} ещё</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

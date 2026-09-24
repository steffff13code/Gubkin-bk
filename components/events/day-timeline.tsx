"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { toggleTaskAction } from "@/lib/actions/task-actions";
import { formatClock, isLate, moscowMinutes, nextStepId, parseTimeSlot } from "@/lib/event-day";

export type TimelineStep = {
  id: string;
  title: string;
  status: "TODO" | "DONE" | "SKIPPED";
  required: boolean;
  clock: string | null;
  at: number | null;
  label: string | null;
  department: string | null;
  people: string[];
  canToggle: boolean;
  mine: boolean;
};

/**
 * Живой тайминг дня мероприятия: часы по Москве, следующий шаг, опоздания.
 * В день мероприятия страница сама обновляется, чтобы все видели отметки друг друга.
 */
export function DayTimeline({
  eventId,
  steps,
  timeSlot,
  isToday
}: {
  eventId: string;
  steps: TimelineStep[];
  timeSlot: string | null;
  isToday: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(moscowMinutes(new Date()));
    const tick = setInterval(() => setNow(moscowMinutes(new Date())), 20_000);
    const refresh = isToday ? setInterval(() => router.refresh(), 30_000) : null;
    return () => {
      clearInterval(tick);
      if (refresh) clearInterval(refresh);
    };
  }, [isToday, router]);

  const start = parseTimeSlot(timeSlot);
  const next = nextStepId(steps);
  const done = steps.filter((s) => s.status !== "TODO").length;

  let status: string | null = null;
  if (isToday && now !== null && start !== null) {
    const diff = start - now;
    status =
      diff > 0
        ? `До начала ${diff >= 60 ? `${Math.floor(diff / 60)} ч ` : ""}${diff % 60} мин`
        : `Идёт ${Math.floor(-diff / 60) ? `${Math.floor(-diff / 60)} ч ` : ""}${-diff % 60} мин`;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
        {isToday && now !== null && (
          <span className="rounded-lg bg-bg px-3 py-1.5 font-mono text-2xl font-bold text-ink">{formatClock(now)}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">
            {start !== null ? `Начало в ${formatClock(start)}` : "Время начала не указано — шаги без часов"}
          </p>
          <p className="text-xs text-muted">
            {status ?? (isToday ? "Сегодня" : "Тайминг на день мероприятия")} · отмечено {done} из {steps.length}
          </p>
        </div>
      </div>

      <ol data-timeline className="relative space-y-2 before:absolute before:bottom-3 before:left-[4.25rem] before:top-3 before:w-px before:bg-line">
        {steps.map((s) => {
          const isNext = s.id === next;
          const late = isToday && now !== null && isLate(s, now);
          const closed = s.status !== "TODO";
          return (
            <li key={s.id} className="relative flex items-stretch gap-3">
              <div className="w-14 shrink-0 pt-2.5 text-right">
                {s.clock && <p className={clsx("font-mono text-sm font-bold", late ? "text-danger" : "text-ink")}>{s.clock}</p>}
                {s.label && <p className="text-[10px] leading-tight text-muted">{s.label}</p>}
              </div>
              <span
                aria-hidden
                className={clsx(
                  "relative z-10 mt-3.5 h-3 w-3 shrink-0 rounded-full border-2",
                  closed ? "border-success bg-success" : isNext ? "border-gold bg-gold" : late ? "border-danger bg-bg" : "border-line bg-bg"
                )}
              />
              <div
                className={clsx(
                  "flex min-w-0 flex-1 items-start gap-3 rounded-lg border p-3",
                  isNext ? "border-gold bg-gold/10" : late ? "border-danger/40 bg-danger/5" : "border-line bg-surface",
                  closed && "opacity-60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className={clsx("text-sm font-bold", closed ? "text-muted line-through" : "text-ink")}>{s.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {s.department ?? "Лид мероприятия"}
                    {s.people.length > 0 && ` · ${s.people.join(", ")}`}
                    {!s.required && " · если согласовано"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {isNext && <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase text-bg">Сейчас</span>}
                    {late && <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-bold text-danger">время прошло</span>}
                    {s.mine && !closed && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">ваш шаг</span>}
                  </div>
                </div>
                {s.canToggle ? (
                  <form action={toggleTaskAction.bind(null, s.id, s.status !== "DONE")}>
                    <input type="hidden" name="returnTo" value={`/events/${eventId}/day`} />
                    <button
                      type="submit"
                      aria-label={s.status === "DONE" ? "Открыть заново" : "Отметить выполненной"}
                      className={clsx(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 text-lg font-bold",
                        s.status === "DONE" ? "border-success bg-success text-bg" : "border-line text-transparent hover:border-success hover:text-success"
                      )}
                    >
                      ✓
                    </button>
                  </form>
                ) : (
                  closed && <span className="text-lg font-bold text-success">✓</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

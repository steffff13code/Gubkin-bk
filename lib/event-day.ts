// Тайминг дня мероприятия: время каждого шага от начала (timeSlot) по регламенту
// «День мероприятия». Чистые функции — покрыты юнит-тестами.

const MOSCOW_TZ = "Europe/Moscow";

/** «17:15» → 1035 минут от полуночи; мусор → null. */
export function parseTimeSlot(timeSlot: string | null | undefined): number | null {
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(timeSlot ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Минуты от полуночи по Москве. */
export function moscowMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: MOSCOW_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(now)
    .split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

export type DayStepInput = {
  id: string;
  title: string;
  status: "TODO" | "DONE" | "SKIPPED";
  dayOffsetMinutes: number | null;
  dayTimeLabel: string | null;
};

export type DayStep<T extends DayStepInput = DayStepInput> = T & {
  /** Время шага по часам, если известны начало и смещение. */
  clock: string | null;
  /** Минуты от полуночи — для сравнения с текущим временем. */
  at: number | null;
};

/** Проставляет шагам время по часам от начала мероприятия. Порядок шагов не меняется. */
export function scheduleDay<T extends DayStepInput>(steps: T[], timeSlot: string | null): DayStep<T>[] {
  const start = parseTimeSlot(timeSlot);
  return steps.map((s) => {
    const at = start !== null && s.dayOffsetMinutes !== null ? start + s.dayOffsetMinutes : null;
    return { ...s, at, clock: at !== null ? formatClock(at) : null };
  });
}

/** Следующий шаг — первый невыполненный по порядку. */
export function nextStepId(steps: { id: string; status: string }[]): string | null {
  return steps.find((s) => s.status === "TODO")?.id ?? null;
}

/** Шаг с точным временем, которое уже прошло, а он не отмечен. */
export function isLate(step: { status: string; at: number | null }, nowMinutes: number): boolean {
  return step.status === "TODO" && step.at !== null && nowMinutes > step.at;
}

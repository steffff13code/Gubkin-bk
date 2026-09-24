// Все даты в базе — UTC. Отображение — всегда в московском времени.

const MOSCOW_TZ = "Europe/Moscow";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(d);
}

export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW_TZ,
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Календарная дата момента по Москве, представленная как полночь UTC —
 * в таком же виде хранятся сроки задач и даты мероприятий. Так «сегодня»
 * для просрочек и календаря совпадает с тем, что видит организатор в Москве,
 * а не сдвинуто на три часа.
 */
export function calendarDay(date: Date): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = calendarDay(b).getTime() - calendarDay(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate: Date | null, now: Date = new Date()): boolean {
  if (!dueDate) return false;
  return calendarDay(dueDate).getTime() < calendarDay(now).getTime();
}

export function isDueSoon(dueDate: Date | null, now: Date = new Date(), withinDays = 2): boolean {
  if (!dueDate) return false;
  const diff = daysBetween(now, dueDate);
  return diff >= 0 && diff <= withinDays;
}

/** Сетка календаря на месяц: недели с понедельника, включая дни соседних месяцев. */
export function getMonthGrid(year: number, month: number): { date: Date; inMonth: boolean }[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7; // 0 = понедельник
  const gridStart = addDays(first, -firstWeekday);

  const weeks: { date: Date; inMonth: boolean }[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week: { date: Date; inMonth: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({ date: cursor, inMonth: cursor.getUTCMonth() === month });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export const WEEKDAY_LABELS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const MONTH_LABELS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь"
];

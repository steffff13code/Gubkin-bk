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

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfUtcDay(b).getTime() - startOfUtcDay(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate: Date | null, now: Date = new Date()): boolean {
  if (!dueDate) return false;
  return startOfUtcDay(dueDate).getTime() < startOfUtcDay(now).getTime();
}

export function isDueSoon(dueDate: Date | null, now: Date = new Date(), withinDays = 2): boolean {
  if (!dueDate) return false;
  const diff = daysBetween(now, dueDate);
  return diff >= 0 && diff <= withinDays;
}

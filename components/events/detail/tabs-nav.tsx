import Link from "next/link";
import clsx from "clsx";

const TABS = [
  { key: "obzor", label: "Обзор" },
  { key: "tasks", label: "Задачи" },
  { key: "files", label: "Файлы" },
  { key: "itogi", label: "Итоги" },
  { key: "history", label: "История" }
];

export function TabsNav({ eventId, tab, showResults }: { eventId: string; tab: string; showResults: boolean }) {
  return (
    <div className="mb-4 flex gap-1 border-b border-line">
      {TABS.filter((t) => t.key !== "itogi" || showResults).map((t) => (
        <Link
          key={t.key}
          href={`/events/${eventId}?tab=${t.key}`}
          className={clsx(
            "border-b-2 px-3 py-2 text-sm",
            tab === t.key ? "border-gold font-bold text-ink" : "border-transparent text-muted hover:text-ink"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

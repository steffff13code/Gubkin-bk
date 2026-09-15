import Link from "next/link";
import clsx from "clsx";
import { CalendarIcon, GridIcon } from "@/components/icons";

const VIEWS = [
  { key: "board", label: "Доска", icon: GridIcon },
  { key: "list", label: "Список", icon: null },
  { key: "calendar", label: "Календарь", icon: CalendarIcon }
];

export function ViewTabs({
  view,
  searchParams
}: {
  view: string;
  searchParams: Record<string, string | undefined>;
}) {
  function hrefFor(v: string) {
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(searchParams)) {
      if (val && k !== "view") params.set(k, val);
    }
    params.set("view", v);
    return `/?${params.toString()}`;
  }

  return (
    <div className="mb-4 inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
      {VIEWS.map((v) => {
        const Icon = v.icon;
        return (
          <Link
            key={v.key}
            href={hrefFor(v.key)}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
              view === v.key ? "bg-accent/20 font-bold text-ink" : "text-muted hover:text-ink"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {v.label}
          </Link>
        );
      })}
    </div>
  );
}

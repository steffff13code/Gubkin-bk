import Link from "next/link";
import clsx from "clsx";

const VIEWS = [
  { key: "board", label: "Доска" },
  { key: "list", label: "Список" },
  { key: "calendar", label: "Календарь" }
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
    <div className="mb-4 flex gap-2">
      {VIEWS.map((v) => (
        <Link
          key={v.key}
          href={hrefFor(v.key)}
          className={clsx(
            "rounded border px-3 py-1.5 text-sm",
            view === v.key ? "border-gold bg-gold/10 font-bold text-ink" : "border-line text-muted hover:text-ink"
          )}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}

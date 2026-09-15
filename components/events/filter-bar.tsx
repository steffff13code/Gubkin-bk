"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEPARTMENT_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import { SearchIcon } from "@/components/icons";

type LeadOption = { id: string; firstName: string; lastName: string | null };

function Select({
  value,
  onChange,
  children
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
    >
      {children}
    </select>
  );
}

export function FilterBar({ leads, showMine }: { leads: LeadOption[]; showMine: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function reset() {
    const params = new URLSearchParams();
    const view = searchParams.get("view");
    if (view) params.set("view", view);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = ["type", "department", "lead", "mine", "q"].some((k) => searchParams.get(k));

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Select value={searchParams.get("type") ?? ""} onChange={(v) => update("type", v)}>
        <option value="">Все типы</option>
        {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </Select>

      <Select value={searchParams.get("department") ?? ""} onChange={(v) => update("department", v)}>
        <option value="">Все отделы</option>
        {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </Select>

      <Select value={searchParams.get("lead") ?? ""} onChange={(v) => update("lead", v)}>
        <option value="">Все лиды</option>
        {leads.map((l) => (
          <option key={l.id} value={l.id}>
            {l.firstName}
            {l.lastName ? ` ${l.lastName}` : ""}
          </option>
        ))}
      </Select>

      {showMine && (
        <label className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={searchParams.get("mine") === "1"}
            onChange={(e) => update("mine", e.target.checked ? "1" : "")}
          />
          Только мои
        </label>
      )}

      <div className="relative ml-auto">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => update("q", e.target.value)}
          placeholder="Поиск..."
          className="w-40 rounded-lg border border-line bg-surface py-1.5 pl-8 pr-2 text-sm text-ink placeholder:text-muted sm:w-56"
        />
      </div>

      {hasFilters && (
        <button type="button" onClick={reset} className="text-sm font-bold text-muted hover:text-ink">
          Сбросить
        </button>
      )}
    </div>
  );
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEPARTMENT_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";

type LeadOption = { id: string; firstName: string; lastName: string | null };

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

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select
        value={searchParams.get("type") ?? ""}
        onChange={(e) => update("type", e.target.value)}
        className="rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
      >
        <option value="">Все типы</option>
        {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("department") ?? ""}
        onChange={(e) => update("department", e.target.value)}
        className="rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
      >
        <option value="">Все отделы</option>
        {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("lead") ?? ""}
        onChange={(e) => update("lead", e.target.value)}
        className="rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
      >
        <option value="">Все лиды</option>
        {leads.map((l) => (
          <option key={l.id} value={l.id}>
            {l.firstName}
            {l.lastName ? ` ${l.lastName}` : ""}
          </option>
        ))}
      </select>

      {showMine && (
        <label className="flex items-center gap-1.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={searchParams.get("mine") === "1"}
            onChange={(e) => update("mine", e.target.checked ? "1" : "")}
          />
          Только мои
        </label>
      )}
    </div>
  );
}

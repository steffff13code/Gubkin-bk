import Link from "next/link";
import { getRegulationsList } from "@/lib/queries/regulations";
import { DEPARTMENT_LABELS } from "@/lib/labels";
import type { DepartmentCode } from "@prisma/client";

export default async function RegulationsPage() {
  const regulations = await getRegulationsList();

  const groups = new Map<string, typeof regulations>();
  for (const r of regulations) {
    const key = r.department ?? "_";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-ink">Регламенты</h1>
      <div className="space-y-6">
        {Array.from(groups.entries()).map(([key, items]) => (
          <section key={key}>
            <h2 className="mb-2 text-sm font-bold text-muted">
              {key === "_" ? "Общее" : DEPARTMENT_LABELS[key as DepartmentCode]}
            </h2>
            <ul className="divide-y divide-line rounded border border-line bg-surface">
              {items.map((r) => (
                <li key={r.id}>
                  <Link href={`/regulations/${r.slug}`} className="block px-4 py-3 text-sm text-ink hover:bg-bg">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

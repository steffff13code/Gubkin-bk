import Link from "next/link";
import { getRegulationsList } from "@/lib/queries/regulations";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { DEPARTMENT_LABELS } from "@/lib/labels";
import type { DepartmentCode } from "@prisma/client";
import {
  CameraIcon,
  ChevronRightIcon,
  DocIcon,
  MapPinIcon,
  MegaphoneIcon,
  ShieldIcon,
  UsersIcon
} from "@/components/icons";

const GROUP_ICONS: Record<string, (p: { className?: string }) => React.ReactElement> = {
  _: DocIcon,
  GUESTS: UsersIcon,
  SECURITY: ShieldIcon,
  PR: MegaphoneIcon,
  VENUE_BOOKING: MapPinIcon,
  CONTENT: CameraIcon,
  STAGE: MapPinIcon,
  INTENSIVES: DocIcon
};

export default async function RegulationsPage() {
  const [regulations, user] = await Promise.all([getRegulationsList(), getCurrentUser()]);
  const admin = isAdmin(user);

  const groups = new Map<string, typeof regulations>();
  for (const r of regulations) {
    const key = r.department ?? "_";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Регламенты</h1>
          <p className="mt-1 text-sm text-muted">Основные документы и регламенты клуба</p>
        </div>
        {admin && (
          <Link href="/regulations/new" className="shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg hover:bg-gold/90">
            Новый регламент
          </Link>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {Array.from(groups.entries()).map(([key, items]) => {
          const Icon = GROUP_ICONS[key] ?? DocIcon;
          return (
            <section key={key}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-accent">
                <Icon className="h-4 w-4" />
                {key === "_" ? "Общее" : DEPARTMENT_LABELS[key as DepartmentCode]}
              </h2>
              <div className="space-y-1.5">
                {items.map((r) => (
                  <Link
                    key={r.id}
                    href={`/regulations/${r.slug}`}
                    className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink hover:border-accent/50"
                  >
                    {r.title}
                    <ChevronRightIcon className="h-4 w-4 text-muted" />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

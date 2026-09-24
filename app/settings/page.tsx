import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { rolesWithDefaultPassword } from "@/lib/role-passwords";
import { getAllTaskTemplates, getAllUsersWithDepartments } from "@/lib/queries/settings";
import { PeopleTab } from "@/components/settings/people-tab";
import { TemplatesTab } from "@/components/settings/templates-tab";
import { AccessTab } from "@/components/settings/access-tab";

const TABS = [
  { key: "people", label: "Люди" },
  { key: "access", label: "Доступ и запуск" },
  { key: "templates", label: "Шаблоны задач" }
] as const;

export default async function SettingsPage({
  searchParams
}: {
  searchParams: { tab?: string; error?: string; notice?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");
  if (!isAdmin(user)) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
        Настройки доступны только администраторам.
      </div>
    );
  }

  const tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "people";

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">Настройки</h1>

      {searchParams.error && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
      )}
      {searchParams.notice && (
        <p className="mb-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">{searchParams.notice}</p>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/settings?tab=${t.key}`}
            className={clsx(
              "shrink-0 border-b-2 px-3 py-2 text-sm",
              tab === t.key ? "border-gold font-bold text-ink" : "border-transparent text-muted hover:text-ink"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "people" && <PeopleTab users={await getAllUsersWithDepartments()} currentUserId={user.id} />}
      {tab === "templates" && <TemplatesTab templates={await getAllTaskTemplates()} />}
      {tab === "access" && (
        <AccessTab
          defaultRoles={await rolesWithDefaultPassword()}
          demoCount={
            (await prisma.user.count({ where: { isDemo: true } })) +
            (await prisma.event.count({ where: { isDemo: true } })) +
            (await prisma.idea.count({ where: { isDemo: true } }))
          }
        />
      )}
    </div>
  );
}

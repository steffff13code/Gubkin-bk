import Link from "next/link";
import clsx from "clsx";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getAllTaskTemplates, getAllUsersWithDepartments } from "@/lib/queries/settings";
import { PeopleTab } from "@/components/settings/people-tab";
import { TemplatesTab } from "@/components/settings/templates-tab";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: { tab?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return (
      <div className="rounded border border-line bg-surface p-6 text-sm text-muted">
        Настройки доступны только администраторам.
      </div>
    );
  }

  const tab = searchParams.tab === "templates" ? "templates" : "people";
  const [users, templates] = await Promise.all([getAllUsersWithDepartments(), getAllTaskTemplates()]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-ink">Настройки</h1>

      {searchParams.error && (
        <p className="mb-4 rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
      )}

      <div className="mb-4 flex gap-1 border-b border-line">
        {[
          { key: "people", label: "Люди" },
          { key: "templates", label: "Шаблоны задач" }
        ].map((t) => (
          <Link
            key={t.key}
            href={`/settings?tab=${t.key}`}
            className={clsx(
              "border-b-2 px-3 py-2 text-sm",
              tab === t.key ? "border-gold font-bold text-ink" : "border-transparent text-muted hover:text-ink"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "people" ? <PeopleTab users={users} /> : <TemplatesTab templates={templates} />}
    </div>
  );
}

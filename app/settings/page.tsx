import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { RIGHT_ERRORS } from "@/lib/roles";
import { departmentsPasswordEnabled, isAdminPasswordSet } from "@/lib/passwords";
import { getChatTags } from "@/lib/role-accounts";
import { getAllTaskTemplates, getRoleSubscriptionCounts } from "@/lib/queries/settings";
import { RolesTab } from "@/components/settings/roles-tab";
import { AccessTab } from "@/components/settings/access-tab";
import { TemplatesTab } from "@/components/settings/templates-tab";
import { ServiceTab } from "@/components/settings/service-tab";

const TABS = [
  { key: "roles", label: "Роли" },
  { key: "access", label: "Доступ" },
  { key: "templates", label: "Шаблоны" },
  { key: "service", label: "Обслуживание" }
] as const;

export default async function SettingsPage({
  searchParams
}: {
  searchParams: { tab?: string; error?: string; notice?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");
  if (!userCan(user, "SETTINGS")) {
    return <div className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">{RIGHT_ERRORS.SETTINGS}</div>;
  }

  const tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "roles";

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">Настройки</h1>

      {searchParams.error && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
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

      {tab === "roles" && <RolesTab tags={await getChatTags()} subscriptions={await getRoleSubscriptionCounts()} />}
      {tab === "access" && (
        <AccessTab adminPasswordSet={await isAdminPasswordSet()} departmentsPassword={await departmentsPasswordEnabled()} />
      )}
      {tab === "templates" && <TemplatesTab templates={await getAllTaskTemplates()} />}
      {tab === "service" && <ServiceTab eventsCount={await prisma.event.count()} />}
    </div>
  );
}

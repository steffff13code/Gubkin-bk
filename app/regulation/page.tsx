import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import type { EventType, TaskTemplate } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { ROLES, ROLE_BY_KEY, isRoleKey, type RoleKey } from "@/lib/roles";
import { EVENT_TYPE_LABELS, TASK_GROUP_LABELS } from "@/lib/labels";
import { FLOW, GENERAL_RULES, timingLabel } from "@/lib/regulation";
import { TEMPLATE_NOTES, TEMPLATE_TYPES } from "@/lib/tasks/lecture-template";
import { renderMarkdown } from "@/lib/markdown";
import { saveGeneralRulesAction } from "@/lib/actions/settings-actions";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Регламент" };

type Tab = "flow" | "rules" | RoleKey;

export default async function RegulationPage({
  searchParams
}: {
  searchParams: { tab?: string; type?: string; error?: string; notice?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/regulation");

  const requested = searchParams.tab ?? "";
  const tab: Tab = requested === "rules" || requested === "flow" || isRoleKey(requested) ? requested : user.roleKey ?? "flow";
  const type: EventType = TEMPLATE_TYPES.find((t) => t === searchParams.type) ?? "LECTURE";
  const canEdit = userCan(user, "SETTINGS");

  const tabs: { key: Tab; label: string }[] = [
    { key: "flow", label: "Общая схема" },
    ...ROLES.map((r) => ({ key: r.key as Tab, label: r.title })),
    { key: "rules", label: "Общие правила" }
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Регламент</h1>
          <p className="text-sm text-muted">Как мы готовим мероприятие: кто, что и к какому сроку. D — день мероприятия.</p>
        </div>
        <PrintButton />
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line print:hidden">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/regulation?tab=${t.key}${type !== "LECTURE" ? `&type=${type}` : ""}`}
            className={clsx(
              "shrink-0 border-b-2 px-3 py-2 text-sm",
              tab === t.key ? "border-gold font-bold text-ink" : "border-transparent text-muted hover:text-ink"
            )}
          >
            {t.label}
            {t.key === user.roleKey && <span className="ml-1 text-xs text-gold">· вы</span>}
          </Link>
        ))}
      </div>

      {searchParams.error && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
      )}
      {searchParams.notice && (
        <p className="mb-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">Правила сохранены.</p>
      )}

      {tab === "flow" && <FlowView />}
      {tab === "rules" && <RulesView canEdit={canEdit} />}
      {isRoleKey(tab) && <RoleView role={tab} type={type} />}
    </div>
  );
}

function FlowView() {
  return (
    <ol className="space-y-2">
      {FLOW.map((s, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-gold">{s.when}</p>
            <p className="mt-0.5 text-sm text-ink">{s.what}</p>
            <p className="mt-1 text-xs text-muted">{s.who.map((k) => ROLE_BY_KEY[k].title).join(" · ")}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

async function RulesView({ canEdit }: { canEdit: boolean }) {
  const rules = await prisma.regulation.findUnique({ where: { slug: "general-rules" } });
  const body = rules?.body ?? GENERAL_RULES;
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="markdown text-sm text-ink" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
      {canEdit && (
        <details className="mt-4 print:hidden">
          <summary className="cursor-pointer text-sm font-bold text-gold">Изменить правила</summary>
          <form action={saveGeneralRulesAction} className="mt-2 space-y-2">
            <textarea
              name="body"
              defaultValue={body}
              rows={12}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 font-mono text-sm text-ink"
            />
            <p className="text-xs text-muted">Каждое правило — с новой строки, начиная с «- ». Жирный — **так**.</p>
            <button type="submit" className="rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-bg hover:bg-gold/90">
              Сохранить
            </button>
          </form>
        </details>
      )}
    </section>
  );
}

async function RoleView({ role, type }: { role: RoleKey; type: EventType }) {
  const templates = await prisma.taskTemplate.findMany({
    where: { eventType: type, OR: [{ department: role }, { department: null }] },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }]
  });
  const steps = FLOW.filter((s) => s.who.includes(role));
  const groups = (["BEFORE", "EVENT_DAY", "AFTER"] as const)
    .map((g) => ({ group: g, items: templates.filter((t) => t.group === g) }))
    .filter((g) => g.items.length > 0);
  const info = ROLE_BY_KEY[role];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="font-bold text-ink">{info.title}</h2>
        <p className="mt-0.5 text-sm text-muted">{info.does}</p>
        {steps.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-28 shrink-0 text-xs font-bold text-gold sm:w-40">{s.when}</span>
                <span className="text-ink">{s.what}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-1 print:hidden">
        {TEMPLATE_TYPES.map((t) => (
          <Link
            key={t}
            href={`/regulation?tab=${role}&type=${t}`}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-bold",
              t === type ? "border-gold bg-gold/10 text-ink" : "border-line text-muted hover:text-ink"
            )}
          >
            {EVENT_TYPE_LABELS[t]}
          </Link>
        ))}
      </div>
      {TEMPLATE_NOTES[type] && <p className="text-xs text-gold">{TEMPLATE_NOTES[type]}</p>}

      {groups.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          В шаблоне «{EVENT_TYPE_LABELS[type]}» у этой роли задач нет.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.group} className="rounded-xl border border-line bg-surface p-4" data-regulation-group={g.group}>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{TASK_GROUP_LABELS[g.group]}</h3>
            <ul className="divide-y divide-line">
              {g.items.map((t) => (
                <TemplateItem key={t.id} template={t} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function TemplateItem({ template: t }: { template: TaskTemplate }) {
  return (
    <li className="py-2">
      <p className="text-xs font-bold text-gold">{timingLabel(t)}</p>
      <p className="text-sm font-bold text-ink">
        {t.title}
        {!t.required && <span className="ml-1 font-normal text-muted">(по возможности)</span>}
        {!t.department && <span className="ml-1 font-normal text-muted">· любая роль</span>}
      </p>
      {t.description && (
        <div className="markdown mt-1 text-xs text-muted" dangerouslySetInnerHTML={{ __html: renderMarkdown(t.description) }} />
      )}
    </li>
  );
}

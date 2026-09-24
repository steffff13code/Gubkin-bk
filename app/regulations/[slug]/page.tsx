import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/permissions";
import { getRegulationBySlug } from "@/lib/queries/regulations";
import { renderMarkdown } from "@/lib/markdown";
import { displayName } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { updateRegulationAction } from "@/lib/actions/regulation-actions";
import { FLOWS } from "@/lib/regulation-flows";
import { RegulationFlow } from "@/components/regulation-flow";

export default async function RegulationPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { error?: string };
}) {
  const [user, regulation] = await Promise.all([getCurrentUser(), getRegulationBySlug(params.slug)]);
  if (!regulation) notFound();

  const canEdit = isLeadOrAdmin(user);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-bold text-ink">{regulation.title}</h1>
      <p className="mb-4 text-xs text-muted">
        Обновлено {formatDateTime(regulation.updatedAt)} · {displayName(regulation.updatedBy)}
      </p>

      {searchParams.error && (
        <p className="mb-4 rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
      )}

      {FLOWS[regulation.slug] && (
        <div className="mb-4">
          <RegulationFlow flow={FLOWS[regulation.slug]} />
        </div>
      )}

      <div
        className="markdown rounded border border-line bg-surface p-4 text-sm text-ink"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(regulation.body) }}
      />

      {canEdit && (
        <details className="mt-4 rounded border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-bold text-ink">Редактировать</summary>
          <form action={updateRegulationAction.bind(null, regulation.slug)} className="mt-3 space-y-3">
            <textarea
              name="body"
              defaultValue={regulation.body}
              rows={10}
              className="w-full rounded border border-line bg-bg px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded bg-gold px-3 py-1.5 text-sm font-bold text-bg hover:bg-gold/90">
              Сохранить новую версию
            </button>
          </form>
        </details>
      )}

      {regulation.versions.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-ink">История версий</h2>
          <div className="space-y-2">
            {regulation.versions.map((v) => (
              <details key={v.id} className="rounded border border-line bg-surface p-3">
                <summary className="cursor-pointer text-sm text-muted">
                  {formatDateTime(v.createdAt)} · {displayName(v.editedBy)}
                </summary>
                <div
                  className="markdown mt-2 text-sm text-ink"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(v.body) }}
                />
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

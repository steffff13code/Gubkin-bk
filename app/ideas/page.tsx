import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getIdeasList } from "@/lib/queries/ideas";
import { DEPARTMENT_LABELS, IDEA_CATEGORY_LABELS, IDEA_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import {
  convertIdeaToEventAction,
  createIdeaAction,
  setIdeaStatusAction,
  voteIdeaAction
} from "@/lib/actions/idea-actions";
import type { DepartmentCode } from "@prisma/client";

export default async function IdeasPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await getCurrentUser();
  const ideas = await getIdeasList(user?.id ?? null);
  const admin = isAdmin(user);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-ink">Идеи и критика</h1>

      {searchParams.error && (
        <p className="rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{searchParams.error}</p>
      )}

      <form action={createIdeaAction} className="space-y-3 rounded border border-line bg-surface p-4">
        <textarea
          name="text"
          required
          rows={3}
          placeholder="Идея, критика или предложение..."
          className="w-full rounded border border-line bg-bg px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select name="category" className="rounded border border-line bg-bg px-2 py-1.5 text-sm">
            {Object.entries(IDEA_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select name="targetDepartment" className="rounded border border-line bg-bg px-2 py-1.5 text-sm">
            <option value="">Без адресата</option>
            {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {user ? (
            <label className="flex items-center gap-1.5 text-sm text-ink">
              <input type="checkbox" name="anonymous" />
              Отправить анонимно
            </label>
          ) : (
            <p className="text-xs text-muted">Без входа идея отправляется анонимно.</p>
          )}
          <button type="submit" className="ml-auto rounded bg-gold px-3 py-1.5 text-sm font-bold text-bg hover:bg-gold/90">
            Отправить
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {ideas.map((idea) => (
          <div key={idea.id} className="rounded border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-ink">{idea.text}</p>
              <form action={voteIdeaAction.bind(null, idea.id)}>
                <button
                  type="submit"
                  className={`shrink-0 rounded border px-2 py-1 text-xs font-bold ${
                    idea.hasVoted ? "border-gold bg-gold/10 text-ink" : "border-line text-muted"
                  }`}
                >
                  ▲ {idea.voteCount}
                </button>
              </form>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{IDEA_CATEGORY_LABELS[idea.category]}</span>
              <span>· {idea.authorName ?? "Анонимно"}</span>
              <span>· {formatDate(idea.createdAt)}</span>
              {idea.targetDepartment && <span>· {DEPARTMENT_LABELS[idea.targetDepartment as DepartmentCode]}</span>}
              <span className="ml-auto font-bold text-ink">{IDEA_STATUS_LABELS[idea.status]}</span>
            </div>
            {idea.adminComment && (
              <p className="mt-2 rounded bg-bg px-2 py-1 text-xs text-muted">Комментарий: {idea.adminComment}</p>
            )}

            {admin && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-bold text-ink">Управление</summary>
                <form action={setIdeaStatusAction.bind(null, idea.id)} className="mt-2 flex flex-wrap gap-2">
                  <select name="status" defaultValue={idea.status} className="rounded border border-line bg-bg px-2 py-1 text-xs">
                    {Object.entries(IDEA_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input
                    name="adminComment"
                    defaultValue={idea.adminComment ?? ""}
                    placeholder="Комментарий"
                    className="flex-1 rounded border border-line bg-bg px-2 py-1 text-xs"
                  />
                  <button type="submit" className="rounded border border-line px-2 py-1 text-xs font-bold text-ink">
                    Сохранить
                  </button>
                </form>
                {!idea.convertedEventId && (
                  <form action={convertIdeaToEventAction.bind(null, idea.id)} className="mt-2">
                    <button type="submit" className="text-xs font-bold text-ink underline">
                      Сделать мероприятием
                    </button>
                  </form>
                )}
              </details>
            )}
          </div>
        ))}
        {ideas.length === 0 && <p className="text-sm text-muted">Идей пока нет.</p>}
      </div>
    </div>
  );
}

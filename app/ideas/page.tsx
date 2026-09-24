import { getCurrentUser } from "@/lib/auth";
import { isAdmin, isLeadOrAdmin } from "@/lib/permissions";
import { getIdeasList } from "@/lib/queries/ideas";
import Link from "next/link";
import { DEPARTMENT_LABELS, EVENT_TYPE_LABELS, IDEA_CATEGORY_LABELS, IDEA_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import {
  convertIdeaToEventAction,
  createIdeaAction,
  deleteIdeaAction,
  setIdeaStatusAction,
  voteIdeaAction
} from "@/lib/actions/idea-actions";
import type { DepartmentCode } from "@prisma/client";

export default async function IdeasPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await getCurrentUser();
  const ideas = await getIdeasList(user?.id ?? null);
  const admin = isAdmin(user);
  const canConvert = isLeadOrAdmin(user);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Идеи и критика</h1>
        <p className="mt-1 text-sm text-muted">
          Банк идей клуба: любой может предложить мероприятие, улучшение или честную критику — можно анонимно.
          Голосуйте за то, что нравится. {canConvert ? "Лучшие идеи вы можете сразу превратить в мероприятие — оно появится в Потоке в колонке «Идея», а вы станете его лидом." : "Лучшие идеи руководители превращают в мероприятия в Потоке."}
        </p>
      </div>

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
              {user ? (
                <form action={voteIdeaAction.bind(null, idea.id)}>
                  <button
                    type="submit"
                    title={idea.hasVoted ? "Снять голос" : "Поддержать"}
                    className={`shrink-0 rounded border px-2 py-1 text-xs font-bold ${
                      idea.hasVoted ? "border-gold bg-gold/10 text-ink" : "border-line text-muted"
                    }`}
                  >
                    ▲ {idea.voteCount}
                  </button>
                </form>
              ) : (
                <Link
                  href="/login?next=/ideas"
                  title="Войдите, чтобы голосовать"
                  className="shrink-0 rounded border border-line px-2 py-1 text-xs font-bold text-muted"
                >
                  ▲ {idea.voteCount}
                </Link>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              {idea.isDemo && (
                <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold" title="Пример из демо-данных, удаляется в Настройках">
                  пример
                </span>
              )}
              <span>{IDEA_CATEGORY_LABELS[idea.category]}</span>
              <span>· {idea.authorName ?? "Анонимно"}</span>
              <span>· {formatDate(idea.createdAt)}</span>
              {idea.targetDepartment && <span>· {DEPARTMENT_LABELS[idea.targetDepartment as DepartmentCode]}</span>}
              <span className="ml-auto font-bold text-ink">{IDEA_STATUS_LABELS[idea.status]}</span>
            </div>
            {idea.adminComment && (
              <p className="mt-2 rounded bg-bg px-2 py-1 text-xs text-muted">Комментарий: {idea.adminComment}</p>
            )}

            {idea.convertedEventId ? (
              <Link
                href={`/events/${idea.convertedEventId}`}
                className="mt-3 inline-flex items-center gap-1 rounded border border-success/40 px-2 py-1 text-xs font-bold text-success hover:bg-success/10"
              >
                Мероприятие создано — открыть →
              </Link>
            ) : (
              canConvert && (
                <details className="mt-3">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded bg-gold px-2.5 py-1 text-xs font-bold text-bg hover:bg-gold/90">
                    + Сделать мероприятием
                  </summary>
                  <form
                    action={convertIdeaToEventAction.bind(null, idea.id)}
                    className="mt-2 grid gap-2 rounded border border-line bg-bg p-3 sm:grid-cols-[1fr_auto_auto]"
                  >
                    <input
                      name="title"
                      defaultValue={idea.text.slice(0, 80)}
                      required
                      placeholder="Название мероприятия"
                      className="rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                    />
                    <select name="type" className="rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink">
                      {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded bg-gold px-3 py-1.5 text-sm font-bold text-bg hover:bg-gold/90">
                      Создать
                    </button>
                  </form>
                </details>
              )
            )}

            {admin && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-bold text-muted hover:text-ink">Статус, комментарий, удаление</summary>
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
                <form action={deleteIdeaAction.bind(null, idea.id)} className="mt-2">
                  <button type="submit" className="text-xs text-danger underline">
                    Удалить идею
                  </button>
                </form>
              </details>
            )}
          </div>
        ))}
        {ideas.length === 0 && <p className="text-sm text-muted">Идей пока нет.</p>}
      </div>
    </div>
  );
}

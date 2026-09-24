import { redirect } from "next/navigation";
import { getCurrentUser, displayName } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/permissions";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { getLeadOptions } from "@/lib/queries/events";
import { createEventAction } from "@/lib/actions/event-actions";

export default async function NewEventPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/events/new");

  if (!isLeadOrAdmin(user)) {
    return (
      <div className="rounded border border-line bg-surface p-6 text-sm text-muted">
        Создавать мероприятия могут руководители отделов и руководитель клуба. Войдите с соответствующей ролью.
      </div>
    );
  }

  const leads = await getLeadOptions();
  const input = "w-full rounded border border-line bg-bg px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-ink">Новое мероприятие</h1>
      {searchParams.error && (
        <p className="mb-4 rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{searchParams.error}</p>
      )}
      <form action={createEventAction} className="space-y-4 rounded border border-line bg-surface p-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-ink">Название</label>
          <input name="title" required className={input} placeholder="Например: Лекция с гостем из индустрии" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-ink">Тип</label>
            <select name="type" required className={input}>
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-ink">Лид</label>
            <select name="leadId" defaultValue={user!.id} className={input}>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {displayName(l)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-ink">Описание (программа)</label>
          <textarea name="description" rows={6} className={input} placeholder="Markdown — программа мероприятия" />
          <p className="mt-1 text-xs text-muted">Для отправки на согласование описание обязательно.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="intent"
            value="draft"
            className="rounded border border-line px-4 py-2 text-sm font-bold text-ink hover:border-gold"
          >
            Сохранить черновик
          </button>
          <button
            type="submit"
            name="intent"
            value="send"
            className="rounded bg-gold px-4 py-2 text-sm font-bold text-bg hover:bg-gold/90"
          >
            Отправить на согласование
          </button>
        </div>
      </form>
    </div>
  );
}

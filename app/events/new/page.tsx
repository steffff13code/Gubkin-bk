import { getCurrentUser } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/permissions";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { createEventAction } from "@/lib/actions/event-actions";

export default async function NewEventPage() {
  const user = await getCurrentUser();

  if (!isLeadOrAdmin(user)) {
    return (
      <div className="rounded border border-line bg-surface p-6 text-sm text-muted">
        Создавать мероприятия могут руководители отделов и администраторы. Войдите с соответствующей ролью.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-ink">Новое мероприятие</h1>
      <form action={createEventAction} className="space-y-4 rounded border border-line bg-surface p-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-ink">Название</label>
          <input
            name="title"
            required
            className="w-full rounded border border-line bg-bg px-3 py-2 text-sm"
            placeholder="Например: Лекция с гостем из индустрии"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-ink">Тип</label>
          <select name="type" required className="w-full rounded border border-line bg-bg px-3 py-2 text-sm">
            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-ink">Описание (программа)</label>
          <textarea
            name="description"
            rows={6}
            className="w-full rounded border border-line bg-bg px-3 py-2 text-sm"
            placeholder="Markdown — программа мероприятия"
          />
        </div>
        <button type="submit" className="rounded bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-ink/90">
          Создать
        </button>
      </form>
    </div>
  );
}

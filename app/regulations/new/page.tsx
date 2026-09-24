import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { DEPARTMENT_LABELS } from "@/lib/labels";
import { createRegulationAction } from "@/lib/actions/regulation-actions";

export default async function NewRegulationPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return (
      <div className="rounded border border-line bg-surface p-6 text-sm text-muted">
        Добавлять регламенты может только администратор. Редактировать существующие — руководители и администраторы.
      </div>
    );
  }

  const input = "w-full rounded border border-line bg-bg px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-ink">Новый регламент</h1>
      {searchParams.error && (
        <p className="mb-4 rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{searchParams.error}</p>
      )}
      <form action={createRegulationAction} className="space-y-4 rounded border border-line bg-surface p-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-ink">Название</label>
          <input name="title" required className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-ink">Отдел</label>
          <select name="department" className={input}>
            <option value="">Общее</option>
            {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-ink">Текст (markdown)</label>
          <textarea name="body" required rows={10} className={input} />
        </div>
        <button type="submit" className="rounded bg-gold px-4 py-2 text-sm font-bold text-bg hover:bg-gold/90">
          Создать
        </button>
      </form>
    </div>
  );
}

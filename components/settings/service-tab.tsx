import { deleteAllEventsAction } from "@/lib/actions/settings-actions";

export function ServiceTab({ eventsCount }: { eventsCount: number }) {
  return (
    <section className="rounded-xl border border-danger/40 bg-surface p-4">
      <h2 className="font-bold text-danger">Удалить все мероприятия</h2>
      <p className="mt-1 text-sm text-muted">
        Сейчас мероприятий: {eventsCount}. Удалятся карточки вместе с задачами, файлами и историей. Отменить нельзя. Роли,
        шаблоны и регламент останутся.
      </p>
      <form action={deleteAllEventsAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-bold text-ink">Для подтверждения введите слово УДАЛИТЬ</span>
          <input
            name="confirm"
            required
            autoComplete="off"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-base text-ink sm:text-sm"
          />
        </label>
        <button type="submit" className="rounded-lg border border-danger/60 px-4 py-2.5 text-sm font-bold text-danger hover:bg-danger/10">
          Удалить все мероприятия
        </button>
      </form>
    </section>
  );
}

import type { EventDetail } from "@/lib/queries/event-detail";
import { saveRetroAction } from "@/lib/actions/retro-actions";
import { closeEventAction } from "@/lib/actions/event-actions";

export function ResultsTab({ event, canManage }: { event: EventDetail; canManage: boolean }) {
  const hasPhotoReport = event.attachments.some((a) => a.kind === "PHOTO_REPORT");

  return (
    <div className="space-y-6">
      <section className="rounded border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-bold text-ink">Посещаемость и ретро</h2>
        {canManage ? (
          <form action={saveRetroAction.bind(null, event.id)} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Фактическая посещаемость</label>
              <input
                type="number"
                name="actualAttendance"
                defaultValue={event.actualAttendance ?? ""}
                className="w-40 rounded border border-line bg-bg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Что прошло хорошо</label>
              <textarea
                name="wentWell"
                defaultValue={event.retro?.wentWell ?? ""}
                rows={2}
                className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Что пошло не так</label>
              <textarea
                name="wentWrong"
                defaultValue={event.retro?.wentWrong ?? ""}
                rows={2}
                className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Что сделать по-другому</label>
              <textarea
                name="doDifferently"
                defaultValue={event.retro?.doDifferently ?? ""}
                rows={2}
                className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm"
              />
            </div>
            <button type="submit" className="rounded bg-gold px-3 py-1.5 text-sm font-bold text-bg hover:bg-gold/90">
              Сохранить ретро
            </button>
          </form>
        ) : (
          <div className="text-sm text-ink">
            <p>Посещаемость: {event.actualAttendance ?? "не указана"}</p>
            {event.retro && (
              <>
                <p className="mt-2">
                  <span className="font-bold">Хорошо:</span> {event.retro.wentWell}
                </p>
                <p className="mt-1">
                  <span className="font-bold">Не так:</span> {event.retro.wentWrong}
                </p>
                <p className="mt-1">
                  <span className="font-bold">По-другому:</span> {event.retro.doDifferently}
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {event.stage === "DONE" && canManage && (
        <section className="rounded border border-line bg-surface p-4">
          <h2 className="mb-2 text-sm font-bold text-ink">Закрытие мероприятия</h2>
          <p className="mb-2 text-xs text-muted">
            Нужны: заполненное ретро, ссылка на фотоотчёт{hasPhotoReport ? " (есть)" : " (нет)"} и фактическая посещаемость.
          </p>
          <form action={closeEventAction.bind(null, event.id)}>
            <button type="submit" className="rounded bg-gold px-3 py-1.5 text-sm font-bold text-bg hover:bg-gold/90">
              Закрыть мероприятие
            </button>
          </form>
        </section>
      )}

      {event.stage === "CLOSED" && (
        <p className="rounded border border-success/30 bg-success/5 px-3 py-2 text-sm font-bold text-success">
          Мероприятие закрыто и в архиве.
        </p>
      )}
    </div>
  );
}

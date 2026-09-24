import type { EventDetail } from "@/lib/queries/event-detail";
import { saveRetroAction } from "@/lib/actions/retro-actions";
import { closeEventAction } from "@/lib/actions/event-actions";
import { addAttachmentAction } from "@/lib/actions/attachment-actions";

/** Итоги проведённого мероприятия: фотоотчёт, посещаемость, ретро и закрытие — всё в одном месте. */
export function ResultsTab({ event, canManage, canPost }: { event: EventDetail; canManage: boolean; canPost: boolean }) {
  const photo = event.attachments.find((a) => a.kind === "PHOTO_REPORT");

  return (
    <section className="space-y-5 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-bold text-ink">Итоги</h2>

      <div>
        <h3 className="mb-2 text-sm font-bold text-ink">1. Фотоотчёт</h3>
        {photo ? (
          <a href={photo.url} target="_blank" rel="noreferrer" className="text-sm text-gold underline">
            {photo.title}
          </a>
        ) : canPost && event.stage === "DONE" ? (
          <form action={addAttachmentAction.bind(null, event.id)} className="flex flex-wrap gap-2">
            <input type="hidden" name="kind" value="PHOTO_REPORT" />
            <input type="hidden" name="title" value="Фотоотчёт" />
            <input
              name="url"
              type="url"
              required
              pattern="https://.*"
              title="Ссылка должна начинаться с https://"
              placeholder="https://… ссылка на папку с фото"
              className="min-w-0 flex-1 rounded border border-line bg-bg px-2 py-1.5 text-sm"
            />
            <button type="submit" className="rounded border border-line px-3 py-1.5 text-sm font-bold text-ink hover:border-gold">
              Прикрепить
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted">Ещё не прикреплён.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-ink">2. Посещаемость и ретро</h3>
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
      </div>

      {event.stage === "DONE" && canManage && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-ink">3. Закрыть мероприятие</h3>
          <p className="mb-2 text-xs text-muted">
            Нужны фотоотчёт{photo ? " ✓" : ""}, посещаемость{event.actualAttendance != null ? " ✓" : ""} и ретро{event.retro ? " ✓" : ""}.
          </p>
          <form action={closeEventAction.bind(null, event.id)}>
            <button type="submit" className="rounded bg-gold px-3 py-1.5 text-sm font-bold text-bg hover:bg-gold/90">
              Закрыть мероприятие
            </button>
          </form>
        </div>
      )}

      {event.stage === "CLOSED" && (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-bold text-success">
          Мероприятие закрыто и в архиве.
        </p>
      )}
    </section>
  );
}

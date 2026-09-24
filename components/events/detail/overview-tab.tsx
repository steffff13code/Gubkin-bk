import type { EventDetail } from "@/lib/queries/event-detail";
import { renderMarkdown } from "@/lib/markdown";
import { displayName } from "@/lib/auth";
import { EVENT_TYPE_LABELS, GUEST_STATUS_LABELS } from "@/lib/labels";
import { updateOverviewAction } from "@/lib/actions/event-actions";

export function OverviewTab({
  event,
  canManage,
  users
}: {
  event: EventDetail;
  canManage: boolean;
  users: { id: string; firstName: string; lastName: string | null }[];
}) {
  return (
    <div className="space-y-6">
      <section className="rounded border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-bold text-ink">Программа</h2>
        {event.description ? (
          <div className="markdown text-sm text-ink" dangerouslySetInnerHTML={{ __html: renderMarkdown(event.description) }} />
        ) : (
          <p className="text-sm text-muted">Описание пока не заполнено.</p>
        )}
        {event.driveFolderUrl && (
          <a href={event.driveFolderUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-ink underline">
            Папка на Google Диске
          </a>
        )}
      </section>

      <section className="rounded border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-bold text-ink">Гость</h2>
        {event.guestName ? (
          <div className="text-sm text-ink">
            <p className="font-bold">{event.guestName}</p>
            {event.guestOrganization && <p className="text-muted">{event.guestOrganization}</p>}
            {event.guestTopic && <p className="mt-1">{event.guestTopic}</p>}
            <p className="mt-1 text-muted">Статус: {GUEST_STATUS_LABELS[event.guestStatus]}</p>
          </div>
        ) : (
          <p className="text-sm text-muted">Гость пока не выбран.</p>
        )}
      </section>

      {canManage && (
        <details className="rounded border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-bold text-gold">Изменить данные мероприятия</summary>
          <form action={updateOverviewAction.bind(null, event.id)} className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Название</label>
              <input name="title" defaultValue={event.title} className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Тип мероприятия</label>
              <select
                name="type"
                defaultValue={event.type}
                disabled={event.tasks.length > 0}
                className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm disabled:opacity-60"
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              {event.tasks.length > 0 && (
                <p className="mt-1 text-xs text-muted">Тип нельзя менять после разворачивания плана задач.</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Описание (markdown)</label>
              <textarea
                name="description"
                defaultValue={event.description ?? ""}
                rows={6}
                className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Лид мероприятия</label>
              <select name="leadId" defaultValue={event.leadId ?? ""} className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm">
                <option value="">Не назначен</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {displayName(u)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Аудитория</label>
                <input name="venue" defaultValue={event.venue ?? ""} className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Ссылка на папку Диска</label>
                <input
                  name="driveFolderUrl"
                  defaultValue={event.driveFolderUrl ?? ""}
                  className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Гость: имя</label>
                <input name="guestName" defaultValue={event.guestName ?? ""} className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Гость: организация</label>
                <input
                  name="guestOrganization"
                  defaultValue={event.guestOrganization ?? ""}
                  className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Гость: тема</label>
              <input name="guestTopic" defaultValue={event.guestTopic ?? ""} className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Статус гостя</label>
                <select name="guestStatus" defaultValue={event.guestStatus} className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm">
                  {Object.entries(GUEST_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Ожидаемая посещаемость</label>
                <input
                  type="number"
                  name="expectedAttendance"
                  defaultValue={event.expectedAttendance ?? ""}
                  className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <button type="submit" className="rounded bg-gold px-3 py-1.5 text-sm font-bold text-bg hover:bg-gold/90">
              Сохранить
            </button>
          </form>
        </details>
      )}
    </div>
  );
}


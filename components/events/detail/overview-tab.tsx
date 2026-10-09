import type { CurrentUser } from "@/lib/auth";
import type { EventDetail } from "@/lib/queries/event-detail";
import { renderMarkdown } from "@/lib/markdown";
import { userCan } from "@/lib/permissions";
import { formatDate } from "@/lib/time";
import { windowWarning } from "@/lib/stages";
import { cancelEventAction, updateSpeakerAction } from "@/lib/actions/event-actions";
import { SpeakerForm } from "@/components/events/speaker-form";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink">{value || <span className="text-muted">—</span>}</dd>
    </div>
  );
}

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Карточка спикера: что известно о спикере и мероприятии; правка — Внешний отдел и Администратор. */
export function OverviewTab({ event, user }: { event: EventDetail; user: CurrentUser | null }) {
  const canEdit = userCan(user, "CREATE_EVENT") && event.stage !== "CLOSED";
  const canCancel = userCan(user, "CANCEL_DELETE") && !["CLOSED", "REJECTED"].includes(event.stage);
  const warn = windowWarning(event.speakerWindowStart, event.speakerWindowEnd);

  return (
    <div className="space-y-4">
      <dl className="divide-y divide-line">
        <Row label="Спикер" value={event.guestName} />
        <Row label="Род деятельности" value={event.guestOccupation} />
        <Row label="Компания" value={event.guestOrganization} />
        <Row label="О чём" value={event.guestTopic} />
        <Row label="Формат" value={event.format} />
        <Row
          label="Окно спикера"
          value={
            event.speakerWindowStart && event.speakerWindowEnd ? (
              <>
                {formatDate(event.speakerWindowStart)} — {formatDate(event.speakerWindowEnd)}
                {warn && <span className="block text-xs text-gold">{warn}</span>}
              </>
            ) : null
          }
        />
        <Row label="Ведёт" value={event.externalOwner} />
        {event.type === "INTENSIVE" && (
          <Row
            label="Интенсив"
            value={[event.intensiveCycle, event.intensiveMeeting ? `встреча ${event.intensiveMeeting}${event.intensiveTotal ? ` из ${event.intensiveTotal}` : ""}` : null]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
        {event.driveFolderUrl && (
          <Row
            label="Материалы"
            value={
              <a href={event.driveFolderUrl} target="_blank" rel="noreferrer" className="text-gold underline">
                папка
              </a>
            }
          />
        )}
      </dl>
      {event.description && (
        <div className="markdown text-sm text-ink" dangerouslySetInnerHTML={{ __html: renderMarkdown(event.description) }} />
      )}

      {canEdit && (
        <details className="rounded-lg border border-line bg-bg p-3">
          <summary className="cursor-pointer text-sm font-bold text-gold">Изменить карточку</summary>
          <div className="mt-3">
            <SpeakerForm
              action={updateSpeakerAction.bind(null, event.id)}
              submitLabel="Сохранить карточку"
              typeLocked={event.tasks.length > 0}
              showDrive
              defaults={{
                title: event.title,
                type: event.type,
                guestName: event.guestName,
                guestOccupation: event.guestOccupation,
                guestOrganization: event.guestOrganization,
                guestTopic: event.guestTopic,
                format: event.format,
                speakerWindowStart: iso(event.speakerWindowStart),
                speakerWindowEnd: iso(event.speakerWindowEnd),
                externalOwner: event.externalOwner,
                description: event.description,
                driveFolderUrl: event.driveFolderUrl,
                intensiveCycle: event.intensiveCycle,
                intensiveMeeting: event.intensiveMeeting,
                intensiveTotal: event.intensiveTotal
              }}
            />
          </div>
        </details>
      )}

      {canCancel && (
        <details>
          <summary className="cursor-pointer text-xs text-muted hover:text-danger">Отменить мероприятие</summary>
          <form action={cancelEventAction.bind(null, event.id)} className="mt-2 flex flex-wrap gap-2">
            <input name="reason" required placeholder="Причина отмены" className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink" />
            <button type="submit" className="rounded-lg border border-danger/50 px-3 py-2 text-sm font-bold text-danger">
              Отменить
            </button>
          </form>
        </details>
      )}
    </div>
  );
}

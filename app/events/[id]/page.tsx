import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { getEventDetail } from "@/lib/queries/event-detail";
import { EVENT_TYPE_LABELS, EVENT_TYPE_PILL_CLASSES } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { getChatTags } from "@/lib/role-accounts";
import { messagesFor } from "@/lib/chat-messages";
import { deleteEventAction } from "@/lib/actions/event-actions";
import { StageStepper } from "@/components/events/detail/stage-stepper";
import { StageActions } from "@/components/events/detail/stage-actions";
import { OverviewTab } from "@/components/events/detail/overview-tab";
import { TasksTab } from "@/components/events/detail/tasks-tab";
import { FilesTab } from "@/components/events/detail/files-tab";
import { ResultsTab } from "@/components/events/detail/results-tab";
import { HistoryTab } from "@/components/events/detail/history-tab";
import { CopyButton } from "@/components/copy-button";

export default async function EventPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { all?: string; error?: string; notice?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/events/${params.id}`);
  const [event, tags] = await Promise.all([getEventDetail(params.id), getChatTags()]);
  if (!event) notFound();

  const showResults = event.stage === "DONE" || event.stage === "CLOSED";
  const hasTasks = event.tasks.length > 0;
  const messages = messagesFor(event, tags);
  const latest = messages[messages.length - 1];
  const date = event.targetDate
    ? `${formatDate(event.targetDate)}${event.timeSlot ? `, ${event.timeSlot}` : ""}`
    : event.speakerWindowStart && event.speakerWindowEnd
      ? `окно ${formatDate(event.speakerWindowStart)} — ${formatDate(event.speakerWindowEnd)}`
      : "дата не выбрана";

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-muted hover:text-gold">
        ← Мероприятия
      </Link>

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${EVENT_TYPE_PILL_CLASSES[event.type]}`}>
            {EVENT_TYPE_LABELS[event.type]}
          </span>
          {event.type === "INTENSIVE" && (event.intensiveCycle || event.intensiveMeeting) && (
            <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger">
              {[event.intensiveCycle, event.intensiveMeeting ? `встреча ${event.intensiveMeeting}${event.intensiveTotal ? ` из ${event.intensiveTotal}` : ""}` : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
          <span className="text-sm text-muted">{date}</span>
          {event.venue && <span className="text-sm text-muted">· ауд. {event.venue}</span>}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-ink">{event.title}</h1>
        {event.guestName && (
          <p className="mt-1 text-sm text-muted">
            {event.guestName}
            {event.guestOrganization && ` · ${event.guestOrganization}`}
          </p>
        )}

        <div className="mt-4">
          <StageStepper stage={event.stage} />
        </div>

        <div className="mt-4 rounded-lg border border-gold/30 bg-bg p-3 sm:p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gold">Что сейчас</p>
          <StageActions event={event} user={user} />
        </div>
      </section>

      {searchParams.error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
      )}
      {searchParams.notice && (
        <p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">{searchParams.notice}</p>
      )}

      {latest && (
        <section className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">Сообщение в рабочий чат · {latest.title.toLowerCase()}</h2>
            <CopyButton text={latest.text} />
          </div>
          <p className="whitespace-pre-line rounded-lg bg-bg p-3 text-sm text-ink">{latest.text}</p>
          {messages.length > 1 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted hover:text-ink">Предыдущие сообщения</summary>
              <ul className="mt-2 space-y-2">
                {messages.slice(0, -1).map((m) => (
                  <li key={m.key} className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 whitespace-pre-line rounded-lg bg-bg p-2 text-xs text-muted">{m.text}</p>
                    <CopyButton text={m.text} />
                  </li>
                ))}
              </ul>
            </details>
          )}
          {userCan(user, "SETTINGS") && !Object.values(tags).some(Boolean) && (
            <p className="mt-2 text-xs text-muted">
              Кого тегать — задайте в{" "}
              <Link href="/settings?tab=roles" className="text-gold hover:underline">
                Настройки → Роли
              </Link>
              .
            </p>
          )}
        </section>
      )}

      {hasTasks && <TasksTab event={event} user={user} showAll={searchParams.all === "1"} />}

      {showResults && <ResultsTab event={event} canManage={userCan(user, "FINISH")} canPost />}

      <details className="rounded-xl border border-line bg-surface p-4" open={!hasTasks}>
        <summary className="cursor-pointer text-sm font-bold text-ink">Карточка спикера, файлы, история</summary>
        <div className="mt-4 space-y-6">
          <OverviewTab event={event} user={user} />
          <FilesTab event={event} canPost currentUserId={user.id} isAdmin={userCan(user, "CANCEL_DELETE")} />
          <HistoryTab event={event} />
          {userCan(user, "CANCEL_DELETE") && (
            <details>
              <summary className="cursor-pointer text-xs text-muted hover:text-danger">Удалить мероприятие</summary>
              <form action={deleteEventAction.bind(null, event.id)} className="mt-2">
                <button type="submit" className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-bold text-danger">
                  Да, удалить безвозвратно
                </button>
              </form>
            </details>
          )}
        </div>
      </details>
    </div>
  );
}

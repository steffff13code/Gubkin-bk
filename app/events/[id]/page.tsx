import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { displayName, getCurrentUser } from "@/lib/auth";
import { canManageEvent, isAdmin } from "@/lib/permissions";
import { getActiveUsers, getEventDetail } from "@/lib/queries/event-detail";
import { EVENT_TYPE_LABELS, EVENT_TYPE_PILL_CLASSES } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { deleteEventAction } from "@/lib/actions/event-actions";
import { StageStepper } from "@/components/events/detail/stage-stepper";
import { StageActions } from "@/components/events/detail/stage-actions";
import { OverviewTab } from "@/components/events/detail/overview-tab";
import { TasksTab } from "@/components/events/detail/tasks-tab";
import { FilesTab } from "@/components/events/detail/files-tab";
import { ResultsTab } from "@/components/events/detail/results-tab";
import { HistoryTab } from "@/components/events/detail/history-tab";

export default async function EventPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { all?: string; error?: string };
}) {
  const [user, event, users] = await Promise.all([getCurrentUser(), getEventDetail(params.id), getActiveUsers()]);
  if (!event) notFound();

  // Тип мероприятия с проверкой ЦБ: дату нельзя фиксировать до ответа ЦБ.
  const requiresSecurityCheck =
    (await prisma.taskTemplate.count({ where: { eventType: event.type, firesTrigger: "SECURITY_ANSWERED" } })) > 0;

  const canManage = canManageEvent(user, event);
  const admin = isAdmin(user);
  const showResults = event.stage === "DONE" || event.stage === "CLOSED";
  const hasTasks = event.tasks.length > 0;
  const date = event.targetDate
    ? event.dateFixed
      ? `${formatDate(event.targetDate)}${event.timeSlot ? `, ${event.timeSlot}` : ""}`
      : `окно с ${formatDate(event.targetDate)}`
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
          <span className="text-sm text-muted">{date}</span>
          {event.venue && <span className="text-sm text-muted">· {event.venue}</span>}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-ink">{event.title}</h1>
        <p className="mt-1 text-sm text-muted">
          Лид: {event.lead ? displayName(event.lead) : "не назначен"}
          {event.guestName && ` · Гость: ${event.guestName}`}
        </p>

        <div className="mt-4">
          <StageStepper stage={event.stage} />
        </div>

        <div className="mt-4 rounded-lg border border-gold/30 bg-bg p-3 sm:p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gold">Что сейчас</p>
          <StageActions event={event} canManage={canManage} isAdmin={admin} requiresSecurityCheck={requiresSecurityCheck} />
        </div>
      </section>

      {searchParams.error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
      )}

      {hasTasks && (
        <TasksTab
          event={event}
          users={users}
          currentUserId={user?.id ?? null}
          canManage={canManage}
          showAll={searchParams.all === "1"}
        />
      )}

      {showResults && <ResultsTab event={event} canManage={canManage} canPost={!!user} />}

      <details className="rounded-xl border border-line bg-surface p-4" open={!hasTasks}>
        <summary className="cursor-pointer text-sm font-bold text-ink">Подробнее: описание, гость, файлы, история</summary>
        <div className="mt-4 space-y-6">
          <OverviewTab event={event} canManage={canManage} users={users} />
          <FilesTab event={event} canPost={!!user} currentUserId={user?.id ?? null} isAdmin={admin} />
          <HistoryTab event={event} />
          {admin && (
            <details>
              <summary className="cursor-pointer text-xs text-muted hover:text-danger">Удалить мероприятие</summary>
              <form action={deleteEventAction.bind(null, event.id)} className="mt-2">
                <button type="submit" className="rounded border border-danger/40 px-3 py-1.5 text-sm font-bold text-danger">
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

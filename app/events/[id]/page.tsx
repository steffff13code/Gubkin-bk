import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManageEvent, isAdmin } from "@/lib/permissions";
import { getEventDetail, getActiveUsers } from "@/lib/queries/event-detail";
import { EVENT_STAGE_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { displayName } from "@/lib/auth";
import { TabsNav } from "@/components/events/detail/tabs-nav";
import { StageActions } from "@/components/events/detail/stage-actions";
import { OverviewTab } from "@/components/events/detail/overview-tab";
import { TasksTab } from "@/components/events/detail/tasks-tab";
import { FilesTab } from "@/components/events/detail/files-tab";
import { ResultsTab } from "@/components/events/detail/results-tab";
import { HistoryTab } from "@/components/events/detail/history-tab";

export default async function EventDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { tab?: string; error?: string };
}) {
  const [user, event, users] = await Promise.all([
    getCurrentUser(),
    getEventDetail(params.id),
    getActiveUsers()
  ]);

  if (!event) notFound();

  const tab = searchParams.tab ?? "obzor";
  const canManage = canManageEvent(user, event);
  const admin = isAdmin(user);
  const tasksDone = event.tasks.filter((t) => t.status === "DONE").length;
  const showResults = event.stage === "DONE" || event.stage === "CLOSED";

  return (
    <div>
      <div className="mb-4 rounded border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-ink">{event.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {EVENT_TYPE_LABELS[event.type]} · {EVENT_STAGE_LABELS[event.stage]} · {formatDate(event.targetDate)}
              {event.timeSlot ? `, ${event.timeSlot}` : ""}
              {event.venue ? ` · ${event.venue}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted">
              Лид: {event.lead ? displayName(event.lead) : "не назначен"}
              {event.guestName ? ` · Гость: ${event.guestName}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-ink">
              {tasksDone}/{event.tasks.length} задач
            </p>
          </div>
        </div>
        <div className="mt-3">
          <StageActions event={event} canManage={canManage} isAdmin={admin} />
        </div>
      </div>

      {searchParams.error && (
        <p className="mb-4 rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
      )}

      <TabsNav eventId={event.id} tab={tab} showResults={showResults} />

      {tab === "obzor" && <OverviewTab event={event} canManage={canManage} users={users} />}
      {tab === "tasks" && <TasksTab event={event} users={users} currentUserId={user?.id ?? null} />}
      {tab === "files" && <FilesTab event={event} canPost={!!user} />}
      {tab === "itogi" && showResults && <ResultsTab event={event} canManage={canManage} />}
      {tab === "history" && <HistoryTab event={event} />}
    </div>
  );
}

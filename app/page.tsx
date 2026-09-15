import Link from "next/link";
import type { DepartmentCode, EventType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/permissions";
import { getEventsList, getLeadOptions } from "@/lib/queries/events";
import { EVENT_STAGE_LABELS } from "@/lib/labels";
import { FilterBar } from "@/components/events/filter-bar";
import { ViewTabs } from "@/components/events/view-tabs";
import { BoardView } from "@/components/events/board-view";
import { ListView } from "@/components/events/list-view";
import { CalendarView } from "@/components/events/calendar-view";
import { PlusIcon } from "@/components/icons";

export default async function HomePage({
  searchParams
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const user = await getCurrentUser();
  const view = searchParams.view ?? "board";

  const now = new Date();
  const [year, month] = searchParams.month
    ? searchParams.month.split("-").map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];

  const [events, leads] = await Promise.all([
    getEventsList({
      type: searchParams.type as EventType | undefined,
      department: searchParams.department as DepartmentCode | undefined,
      leadId: searchParams.lead,
      mine: searchParams.mine === "1",
      currentUserId: user?.id ?? null,
      q: searchParams.q,
      includeRejected: view === "list" && searchParams.rejected === "1"
    }),
    getLeadOptions()
  ]);

  const stageCounts = new Map<string, number>();
  for (const e of events) stageCounts.set(e.stage, (stageCounts.get(e.stage) ?? 0) + 1);
  const statLine = [`${events.length} мероприятий`]
    .concat(
      (["IN_PROGRESS", "APPROVAL", "DONE"] as const)
        .filter((s) => stageCounts.get(s))
        .map((s) => `${stageCounts.get(s)} ${EVENT_STAGE_LABELS[s].toLowerCase()}`)
    )
    .join(" · ");

  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Поток мероприятий</h1>
          <p className="mt-1 text-sm text-muted">{statLine}</p>
        </div>
        {isLeadOrAdmin(user) && (
          <Link
            href="/events/new"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg hover:bg-gold/90"
          >
            <PlusIcon className="h-4 w-4" />
            Новое мероприятие
          </Link>
        )}
      </div>

      <div className="mt-4">
        <ViewTabs view={view} searchParams={searchParams} />
        <FilterBar leads={leads} showMine={!!user} showRejected={view === "list"} />
      </div>

      {view === "list" && <ListView events={events} />}
      {view === "calendar" && (
        <CalendarView events={events} year={year} month={month - 1} searchParams={searchParams} />
      )}
      {view !== "list" && view !== "calendar" && <BoardView events={events} />}
    </div>
  );
}

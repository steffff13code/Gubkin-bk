import Link from "next/link";
import type { DepartmentCode, EventType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/permissions";
import { getEventsList, getLeadOptions } from "@/lib/queries/events";
import { FilterBar } from "@/components/events/filter-bar";
import { ViewTabs } from "@/components/events/view-tabs";
import { BoardView } from "@/components/events/board-view";
import { ListView } from "@/components/events/list-view";
import { CalendarView } from "@/components/events/calendar-view";

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
      currentUserId: user?.id ?? null
    }),
    getLeadOptions()
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Поток мероприятий</h1>
        {isLeadOrAdmin(user) && (
          <Link
            href="/events/new"
            className="rounded border border-line bg-surface px-3 py-1.5 text-sm font-bold text-ink hover:border-gold"
          >
            Новое мероприятие
          </Link>
        )}
      </div>

      <ViewTabs view={view} searchParams={searchParams} />
      <FilterBar leads={leads} showMine={!!user} />

      {view === "list" && <ListView events={events} />}
      {view === "calendar" && (
        <CalendarView events={events} year={year} month={month - 1} searchParams={searchParams} />
      )}
      {view !== "list" && view !== "calendar" && <BoardView events={events} />}
    </div>
  );
}

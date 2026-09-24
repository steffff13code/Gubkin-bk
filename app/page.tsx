import Link from "next/link";
import clsx from "clsx";
import { getCurrentUser } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/permissions";
import { getEventsList } from "@/lib/queries/events";
import { getTodayEvents } from "@/lib/queries/my-day";
import { BoardView } from "@/components/events/board-view";
import { ListView } from "@/components/events/list-view";
import { PlusIcon, SearchIcon } from "@/components/icons";

export default async function EventsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await getCurrentUser();
  const view = searchParams.view === "list" ? "list" : "board";
  const mine = !!user && searchParams.mine === "1";
  const q = searchParams.q?.trim() || "";

  const [events, today] = await Promise.all([
    getEventsList({ mine, currentUserId: user?.id ?? null, q }),
    getTodayEvents()
  ]);

  // Ссылка с сохранением остальных параметров.
  const href = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const next = { view: view === "list" ? "list" : null, mine: mine ? "1" : null, q: q || null, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div>
      {today.map((e) => (
        <Link
          key={e.id}
          href={`/events/${e.id}/day`}
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold bg-gold/10 px-4 py-3 hover:bg-gold/15"
        >
          <span className="rounded bg-gold px-2 py-1 text-xs font-bold uppercase text-bg">Сегодня</span>
          <span className="min-w-0 flex-1 font-bold text-ink">
            {e.title}
            <span className="font-normal text-muted">
              {e.timeSlot ? ` · ${e.timeSlot}` : ""}
              {e.venue ? ` · ${e.venue}` : ""}
            </span>
          </span>
          <span className="text-sm font-bold text-gold">Тайминг дня →</span>
        </Link>
      ))}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Мероприятия</h1>
        {isLeadOrAdmin(user) && (
          <Link
            href="/events/new"
            className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg hover:bg-gold/90"
          >
            <PlusIcon className="h-4 w-4" />
            Новое мероприятие
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form action="/" method="get" className="relative min-w-0 flex-1 basis-56">
          {view === "list" && <input type="hidden" name="view" value="list" />}
          {mine && <input type="hidden" name="mine" value="1" />}
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Найти мероприятие"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted"
          />
        </form>
        {user && (
          <Segmented
            items={[
              { label: "Все", href: href({ mine: null }), active: !mine },
              { label: "Мои", href: href({ mine: "1" }), active: mine }
            ]}
          />
        )}
        <Segmented
          items={[
            { label: "Доска", href: href({ view: null }), active: view === "board" },
            { label: "Список", href: href({ view: "list" }), active: view === "list" }
          ]}
        />
      </div>

      {q && (
        <p className="mb-3 text-sm text-muted">
          По запросу «{q}» найдено: {events.length}.{" "}
          <Link href={href({ q: null })} className="text-gold hover:underline">
            Сбросить
          </Link>
        </p>
      )}

      {view === "list" ? <ListView events={events} /> : <BoardView events={events} canCreate={isLeadOrAdmin(user)} />}
    </div>
  );
}

function Segmented({ items }: { items: { label: string; href: string; active: boolean }[] }) {
  return (
    <div className="flex rounded-lg border border-line bg-surface p-0.5">
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          className={clsx(
            "rounded-md px-3 py-1.5 text-sm font-bold",
            i.active ? "bg-surface2 text-ink" : "text-muted hover:text-ink"
          )}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}

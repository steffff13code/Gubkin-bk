import { BOARD_STAGES, EVENT_STAGE_LABELS } from "@/lib/labels";
import type { EventListItem } from "@/lib/queries/events";
import { EventCard } from "@/components/events/event-card";

export function BoardView({ events }: { events: EventListItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {BOARD_STAGES.map((stage) => {
        const items = events.filter((e) => e.stage === stage);
        return (
          <div key={stage} className="rounded border border-line bg-bg p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-ink">{EVENT_STAGE_LABELS[stage]}</h2>
              <span className="text-xs text-muted">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
              {items.length === 0 && <p className="px-1 text-xs text-muted">Пусто</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

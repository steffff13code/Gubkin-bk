import Link from "next/link";
import type { EventStage } from "@prisma/client";
import { EVENT_STAGE_DOT_CLASSES, EVENT_STAGE_LABELS } from "@/lib/labels";
import type { EventListItem } from "@/lib/queries/events";
import { EventCard } from "@/components/events/event-card";

// Колонки доски — путь мероприятия. Закрытые (архив) — во вкладке «Список».
const COLUMNS: { stage: EventStage; hint: string }[] = [
  { stage: "IDEA", hint: "Черновик: заполнить и отправить" },
  { stage: "APPROVAL", hint: "Ждёт руководителя клуба" },
  { stage: "PLANNING", hint: "Нужно окно дат с гостем" },
  { stage: "IN_PROGRESS", hint: "Отделы работают по плану" },
  { stage: "DONE", hint: "Нужны итоги" }
];

export function BoardView({ events, canCreate = false }: { events: EventListItem[]; canCreate?: boolean }) {
  const closed = events.filter((e) => e.stage === "CLOSED").length;
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map(({ stage, hint }) => {
          const items = events.filter((e) => e.stage === stage);
          return (
            <div key={stage} className="rounded-xl border border-line bg-surface/40 p-2.5">
              <div className="mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${EVENT_STAGE_DOT_CLASSES[stage]}`} />
                  <h2 className="min-w-0 truncate text-sm font-bold text-ink">{EVENT_STAGE_LABELS[stage]}</h2>
                  <span className="ml-auto text-xs text-muted">{items.length}</span>
                  {stage === "IDEA" && canCreate && (
                    <Link
                      href="/events/new"
                      title="Новое мероприятие"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gold/15 text-sm font-bold text-gold hover:bg-gold hover:text-bg"
                    >
                      +
                    </Link>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
              </div>
              <div className="space-y-2">
                {items.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
                {items.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted/70">Пусто</p>}
              </div>
            </div>
          );
        })}
      </div>
      {closed > 0 && (
        <p className="mt-3 text-sm text-muted">
          Закрытых мероприятий: {closed} —{" "}
          <Link href="/?view=list" className="text-gold hover:underline">
            смотреть в списке
          </Link>
        </p>
      )}
    </div>
  );
}

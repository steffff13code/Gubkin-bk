import { BOARD_STAGES, EVENT_STAGE_DOT_CLASSES, EVENT_STAGE_LABELS } from "@/lib/labels";
import type { EventListItem } from "@/lib/queries/events";
import { EventCard } from "@/components/events/event-card";
import { CalendarIcon, CheckCircleIcon, DocIcon, LightbulbIcon, LockIcon } from "@/components/icons";
import type { EventStage } from "@prisma/client";

const EMPTY_STATE: Record<EventStage, { icon: (p: { className?: string }) => React.ReactElement; title: string; hint: string }> = {
  IDEA: { icon: LightbulbIcon, title: "Пока нет идей", hint: "Здесь будут появляться новые идеи мероприятий" },
  APPROVAL: { icon: DocIcon, title: "Ничего не ждёт согласования", hint: "Мероприятия появятся здесь после отправки" },
  PLANNING: { icon: CalendarIcon, title: "Нечего планировать", hint: "Согласованные мероприятия появятся здесь" },
  IN_PROGRESS: { icon: CalendarIcon, title: "Нет мероприятий в подготовке", hint: "После фиксации даты план появится здесь" },
  DONE: { icon: CheckCircleIcon, title: "Пока нет проведённых мероприятий", hint: "Завершённые мероприятия будут отображаться здесь" },
  CLOSED: { icon: LockIcon, title: "Пока нет закрытых мероприятий", hint: "Архив завершённых мероприятий" },
  REJECTED: { icon: DocIcon, title: "Ничего отклонённого", hint: "" }
};

export function BoardView({ events }: { events: EventListItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {BOARD_STAGES.map((stage) => {
        const items = events.filter((e) => e.stage === stage);
        const empty = EMPTY_STATE[stage];
        const EmptyIcon = empty.icon;
        return (
          <div key={stage} className="rounded-xl border border-line bg-surface/40 p-2.5">
            <div className="mb-3 flex items-center gap-2 px-1">
              <h2 className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-bold text-ink">
                <span className={`h-2 w-2 shrink-0 rounded-full ${EVENT_STAGE_DOT_CLASSES[stage]}`} />
                <span className="truncate">{EVENT_STAGE_LABELS[stage]}</span>
              </h2>
              <span className="ml-auto shrink-0 text-xs text-muted">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
              {items.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
                  <EmptyIcon className="h-8 w-8 text-muted/50" />
                  <p className="text-sm text-muted">{empty.title}</p>
                  {empty.hint && <p className="text-xs text-muted/70">{empty.hint}</p>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

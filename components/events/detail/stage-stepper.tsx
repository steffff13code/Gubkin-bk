import clsx from "clsx";
import type { EventStage } from "@prisma/client";
import { BOARD_STAGES, EVENT_STAGE_LABELS } from "@/lib/labels";

const STEPS = BOARD_STAGES.map((stage) => ({ stage, label: EVENT_STAGE_LABELS[stage] }));

/** Шкала этапов: где мероприятие сейчас и что уже пройдено. */
export function StageStepper({ stage }: { stage: EventStage }) {
  if (stage === "REJECTED") {
    return <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-bold text-danger">{EVENT_STAGE_LABELS.REJECTED}</p>;
  }
  const current = STEPS.findIndex((s) => s.stage === stage);
  return (
    <ol className="flex gap-1">
      {STEPS.map((s, i) => (
        <li key={s.stage} className="min-w-0 flex-1">
          <div
            className={clsx(
              "h-1.5 rounded-full",
              i < current ? "bg-success" : i === current ? "bg-gold" : "bg-line"
            )}
          />
          <p
            className={clsx(
              "mt-1 text-[11px]",
              i === current ? "whitespace-nowrap font-bold text-gold" : "truncate",
              i < current ? "text-ink" : i > current ? "text-muted" : "",
              i !== current && "hidden sm:block"
            )}
          >
            {s.label}
          </p>
        </li>
      ))}
    </ol>
  );
}

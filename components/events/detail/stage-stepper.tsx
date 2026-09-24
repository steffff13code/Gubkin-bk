import clsx from "clsx";
import type { EventStage } from "@prisma/client";

const STEPS: { stage: EventStage; label: string }[] = [
  { stage: "IDEA", label: "Идея" },
  { stage: "APPROVAL", label: "Согласование" },
  { stage: "PLANNING", label: "Планирование" },
  { stage: "IN_PROGRESS", label: "Подготовка" },
  { stage: "DONE", label: "Проведено" },
  { stage: "CLOSED", label: "Закрыто" }
];

/** Шкала этапов: где мероприятие сейчас и что уже пройдено. */
export function StageStepper({ stage }: { stage: EventStage }) {
  if (stage === "REJECTED") {
    return <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-bold text-danger">Отклонено</p>;
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

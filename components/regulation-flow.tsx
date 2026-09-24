import Link from "next/link";
import clsx from "clsx";
import type { Flow } from "@/lib/regulation-flows";

/** Схема регламента как на слайдах: шаги со сроками слева направо, ключевой шаг выделен золотом. */
export function RegulationFlow({
  flow,
  compact = false,
  vertical = false,
  href
}: {
  flow: Flow;
  compact?: boolean;
  /** Всегда столбиком — для узких колонок (кабинет). */
  vertical?: boolean;
  href?: string;
}) {
  const row = !vertical;
  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink">{flow.title}</h3>
          <div className="mt-1 h-0.5 w-10 rounded bg-gold" />
        </div>
        {href && (
          <Link href={href} className="text-xs text-muted hover:text-gold">
            регламент →
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {flow.rows.map((r, i) => (
          <div key={i} className={clsx(r.label && row && "sm:flex sm:items-center sm:gap-3")}>
            {r.label && <p className={clsx("mb-1 w-24 shrink-0 text-xs font-bold text-muted", row && "sm:mb-0")}>{r.label}</p>}
            <ol className={clsx("flex flex-col gap-1.5", row && "sm:flex-row sm:items-stretch sm:gap-0")}>
              {r.steps.map((step, j) => (
                <li key={j} className={clsx("flex items-stretch", row && "sm:flex-1")}>
                  <div className={clsx("flex w-full", row ? "flex-col" : "items-center gap-2")}>
                    <span className={clsx("text-[11px] text-muted", row ? "mb-1 sm:text-center" : "w-20 shrink-0 text-right")}>
                      {step.when}
                    </span>
                    <div
                      className={clsx(
                        "flex flex-1 flex-col justify-center rounded-lg border px-2.5 text-sm font-bold",
                        row && "sm:text-center",
                        compact ? "py-1.5" : "py-2.5",
                        step.key ? "border-gold bg-gold text-bg" : "border-line bg-surface text-ink"
                      )}
                    >
                      {step.what}
                      {step.who && (
                        <span className={clsx("text-[11px] font-normal", step.key ? "text-bg/70" : "text-muted")}>
                          {step.who}
                        </span>
                      )}
                    </div>
                  </div>
                  {row && j < r.steps.length - 1 && (
                    <span aria-hidden className="hidden shrink-0 items-end px-1 pb-3 text-gold sm:flex">
                      ▶
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {flow.note && <p className="mt-3 text-xs text-muted">{flow.note}</p>}
      <p className="mt-3 border-t border-line pt-2 text-sm font-bold text-ink">{flow.footer}</p>
    </div>
  );
}

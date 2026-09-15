import type { EventDetail } from "@/lib/queries/event-detail";
import { formatDate } from "@/lib/time";
import {
  approveEventAction,
  fixDateAction,
  markDoneAction,
  rejectEventAction,
  returnToIdeaAction,
  sendToApprovalAction
} from "@/lib/actions/event-actions";

export function StageActions({
  event,
  canManage,
  isAdmin
}: {
  event: EventDetail;
  canManage: boolean;
  isAdmin: boolean;
}) {
  if (event.stage === "IDEA") {
    if (!canManage) return null;
    return (
      <form action={sendToApprovalAction.bind(null, event.id)}>
        <button type="submit" className="rounded bg-ink px-3 py-1.5 text-sm font-bold text-white hover:bg-ink/90">
          Отправить на согласование
        </button>
      </form>
    );
  }

  if (event.stage === "APPROVAL") {
    if (!isAdmin) {
      return <p className="text-sm text-muted">Ждёт решения администратора.</p>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        <form action={approveEventAction.bind(null, event.id)}>
          <button type="submit" className="rounded bg-ink px-3 py-1.5 text-sm font-bold text-white hover:bg-ink/90">
            Согласовать
          </button>
        </form>
        <details className="rounded border border-line px-3 py-1.5">
          <summary className="cursor-pointer text-sm font-bold text-ink">Вернуть на доработку</summary>
          <form action={returnToIdeaAction.bind(null, event.id)} className="mt-2 space-y-2">
            <textarea
              name="comment"
              required
              rows={2}
              placeholder="Что нужно доработать?"
              className="w-64 rounded border border-line bg-bg px-2 py-1 text-sm"
            />
            <button type="submit" className="block rounded border border-line px-3 py-1 text-sm font-bold text-ink">
              Вернуть
            </button>
          </form>
        </details>
        <details className="rounded border border-line px-3 py-1.5">
          <summary className="cursor-pointer text-sm font-bold text-danger">Отклонить</summary>
          <form action={rejectEventAction.bind(null, event.id)} className="mt-2 space-y-2">
            <textarea
              name="reason"
              required
              rows={2}
              placeholder="Причина отклонения"
              className="w-64 rounded border border-line bg-bg px-2 py-1 text-sm"
            />
            <button type="submit" className="block rounded border border-danger/40 px-3 py-1 text-sm font-bold text-danger">
              Отклонить
            </button>
          </form>
        </details>
      </div>
    );
  }

  if (event.stage === "PLANNING") {
    if (!canManage) return <p className="text-sm text-muted">Дата ещё не зафиксирована.</p>;
    return (
      <form action={fixDateAction.bind(null, event.id)} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted">Дата</label>
          <input type="date" name="targetDate" required className="rounded border border-line bg-bg px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Время</label>
          <input
            type="text"
            name="timeSlot"
            placeholder="17:15"
            className="w-24 rounded border border-line bg-bg px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Аудитория</label>
          <input type="text" name="venue" className="rounded border border-line bg-bg px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded bg-ink px-3 py-1.5 text-sm font-bold text-white hover:bg-ink/90">
          Зафиксировать дату
        </button>
      </form>
    );
  }

  if (event.stage === "IN_PROGRESS") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-ink">
          Дата зафиксирована: <strong>{formatDate(event.targetDate)}</strong>
          {event.timeSlot ? `, ${event.timeSlot}` : ""}
          {event.venue ? ` · ${event.venue}` : ""}
        </p>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <details className="rounded border border-line px-3 py-1.5">
              <summary className="cursor-pointer text-sm font-bold text-ink">Перенести дату</summary>
              <form action={fixDateAction.bind(null, event.id)} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="date" name="targetDate" required className="rounded border border-line bg-bg px-2 py-1.5 text-sm" />
                <input type="text" name="timeSlot" placeholder="17:15" className="w-24 rounded border border-line bg-bg px-2 py-1.5 text-sm" />
                <input type="text" name="venue" placeholder="Аудитория" className="rounded border border-line bg-bg px-2 py-1.5 text-sm" />
                <button type="submit" className="rounded border border-line px-3 py-1 text-sm font-bold text-ink">
                  Перенести
                </button>
              </form>
            </details>
            <form action={markDoneAction.bind(null, event.id)}>
              <button type="submit" className="rounded bg-ink px-3 py-1.5 text-sm font-bold text-white hover:bg-ink/90">
                Отметить проведённым
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  if (event.stage === "REJECTED") {
    return (
      <p className="text-sm text-danger">Отклонено{event.approvalComment ? `: ${event.approvalComment}` : "."}</p>
    );
  }

  return null;
}

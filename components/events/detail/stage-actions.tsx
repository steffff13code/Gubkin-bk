import Link from "next/link";
import type { EventDetail } from "@/lib/queries/event-detail";
import { addDays, calendarDay, formatDate } from "@/lib/time";
import {
  approveEventAction,
  fixDateAction,
  markDoneAction,
  moveWindowAction,
  rejectEventAction,
  returnToIdeaAction,
  sendToApprovalAction,
  startPreparationAction
} from "@/lib/actions/event-actions";

const primaryBtn = "rounded bg-gold px-3 py-1.5 text-sm font-bold text-bg hover:bg-gold/90";
const ghostBtn = "rounded border border-line px-3 py-1.5 text-sm font-bold text-ink hover:border-gold";
const input = "rounded border border-line bg-bg px-2 py-1.5 text-sm";

function toInputDate(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

// Типовое время лекции по регламенту отдела «Гости».
const TIME_SLOTS = ["15:45", "17:15", "17:20"];

function DateFields({ event, id, label = "Дата" }: { event: EventDetail; id: string; label?: string }) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs text-muted">{label}</label>
        <input type="date" name="targetDate" required defaultValue={toInputDate(event.targetDate)} className={input} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">Время</label>
        <input
          type="text"
          name="timeSlot"
          list={`time-slots-${id}`}
          placeholder="17:15"
          defaultValue={event.timeSlot ?? ""}
          className={`w-24 ${input}`}
        />
        <datalist id={`time-slots-${id}`}>
          {TIME_SLOTS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">Аудитория</label>
        <input type="text" name="venue" defaultValue={event.venue ?? ""} className={input} />
      </div>
    </>
  );
}

export function StageActions({
  event,
  canManage,
  isAdmin,
  requiresSecurityCheck
}: {
  event: EventDetail;
  canManage: boolean;
  isAdmin: boolean;
  requiresSecurityCheck: boolean;
}) {
  if (event.stage === "IDEA") {
    return (
      <div className="space-y-2">
        {event.approvalComment && (
          <p className="rounded border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-ink">
            Комментарий руководителя клуба: {event.approvalComment}
          </p>
        )}
        {canManage ? (
          <form action={sendToApprovalAction.bind(null, event.id)}>
            <button type="submit" className={primaryBtn}>
              Отправить на согласование
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted">Черновик — ждёт отправки на согласование лидом.</p>
        )}
      </div>
    );
  }

  if (event.stage === "APPROVAL") {
    if (!isAdmin) {
      return <p className="text-sm text-muted">Ждёт решения руководителя клуба.</p>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        <form action={approveEventAction.bind(null, event.id)} className="flex flex-wrap items-center gap-2">
          <input name="comment" placeholder="Комментарий (необязательно)" className={`w-56 ${input}`} />
          <button type="submit" className={primaryBtn}>
            Согласовать
          </button>
        </form>
        <details className="rounded border border-line px-3 py-1.5">
          <summary className="cursor-pointer text-sm font-bold text-ink">Вернуть на доработку</summary>
          <form action={returnToIdeaAction.bind(null, event.id)} className="mt-2 space-y-2">
            <textarea name="comment" required rows={2} placeholder="Что нужно доработать?" className={`w-64 ${input}`} />
            <button type="submit" className={`block ${ghostBtn}`}>
              Вернуть
            </button>
          </form>
        </details>
        <details className="rounded border border-line px-3 py-1.5">
          <summary className="cursor-pointer text-sm font-bold text-danger">Отклонить</summary>
          <form action={rejectEventAction.bind(null, event.id)} className="mt-2 space-y-2">
            <textarea name="reason" required rows={2} placeholder="Причина отклонения" className={`w-64 ${input}`} />
            <button type="submit" className="block rounded border border-danger/40 px-3 py-1 text-sm font-bold text-danger">
              Отклонить
            </button>
          </form>
        </details>
      </div>
    );
  }

  if (event.stage === "PLANNING") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">
          Согласовано. По регламенту гостю обещаем окно из 10 дней, а не дату. Укажите первый день окна и
          запустите подготовку: план развернётся по отделам, ЦБ получит задачу подать заявку за месяц. Точную
          дату фиксируем после ответа ЦБ.
        </p>
        {canManage && (
          <form className="flex flex-wrap items-end gap-2">
            <DateFields event={event} id="plan" label="Первый день окна" />
            <button type="submit" formAction={startPreparationAction.bind(null, event.id)} className={primaryBtn}>
              Запустить подготовку
            </button>
            {!requiresSecurityCheck && (
              <button type="submit" formAction={fixDateAction.bind(null, event.id)} className={ghostBtn}>
                Дата точная — зафиксировать
              </button>
            )}
          </form>
        )}
      </div>
    );
  }

  if (event.stage === "IN_PROGRESS" && !event.dateFixed) {
    const securityPending = event.tasks.find((t) => t.firesTrigger === "SECURITY_ANSWERED" && t.status === "TODO");
    const windowEnd = event.targetDate ? addDays(event.targetDate, 9) : null;
    return (
      <div className="space-y-2">
        <p className="text-sm text-ink">
          Подготовка идёт. Окно дат: <strong>{formatDate(event.targetDate)}</strong> — <strong>{formatDate(windowEnd)}</strong>
          <span className="text-muted"> · дата ещё не зафиксирована</span>
        </p>
        {securityPending ? (
          <p className="rounded border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">
            Дату фиксируем после ответа ЦБ — сейчас ждём задачу «{securityPending.title}».
          </p>
        ) : null}
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {!securityPending && (
              <form action={fixDateAction.bind(null, event.id)} className="flex flex-wrap items-end gap-2">
                <DateFields event={event} id="fix" label="Дата мероприятия" />
                <button type="submit" className={primaryBtn}>
                  Зафиксировать дату
                </button>
              </form>
            )}
            <details className="rounded border border-line px-3 py-1.5">
              <summary className="cursor-pointer text-sm font-bold text-ink">Сдвинуть окно</summary>
              <form action={moveWindowAction.bind(null, event.id)} className="mt-2 flex flex-wrap items-end gap-2">
                <DateFields event={event} id="window" label="Первый день окна" />
                <button type="submit" className={ghostBtn}>
                  Сдвинуть
                </button>
              </form>
              <p className="mt-1 text-xs text-muted">Сроки открытых задач пересчитаются от нового окна.</p>
            </details>
          </div>
        )}
      </div>
    );
  }

  if (event.stage === "IN_PROGRESS") {
    const isToday = event.targetDate && calendarDay(event.targetDate).getTime() === calendarDay(new Date()).getTime();
    return (
      <div className="space-y-2">
        <p className="text-sm text-ink">
          Дата зафиксирована: <strong>{formatDate(event.targetDate)}</strong>
          {event.timeSlot ? `, ${event.timeSlot}` : ""}
          {event.venue ? ` · ${event.venue}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/events/${event.id}/day`} className={isToday ? primaryBtn : ghostBtn}>
            {isToday ? "Сегодня мероприятие — открыть тайминг" : "Тайминг дня мероприятия"}
          </Link>
          {canManage && (
            <>
              <details className="rounded border border-line px-3 py-1.5">
                <summary className="cursor-pointer text-sm font-bold text-ink">Перенести дату</summary>
                <form action={fixDateAction.bind(null, event.id)} className="mt-2 flex flex-wrap items-end gap-2">
                  <DateFields event={event} id="move" />
                  <button type="submit" className={ghostBtn}>
                    Перенести
                  </button>
                </form>
                <p className="mt-1 text-xs text-muted">Сроки открытых задач пересчитаются от новой даты, закрытые не тронем.</p>
              </details>
              <form action={markDoneAction.bind(null, event.id)}>
                <button type="submit" className={primaryBtn}>
                  Отметить проведённым
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  if (event.stage === "DONE") {
    return <p className="text-sm text-muted">Мероприятие проведено. Заполните итоги во вкладке «Итоги», чтобы закрыть его.</p>;
  }

  if (event.stage === "REJECTED") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-danger">Отклонено{event.approvalComment ? `: ${event.approvalComment}` : "."}</p>
        {isAdmin && (
          <details className="inline-block rounded border border-line px-3 py-1.5">
            <summary className="cursor-pointer text-sm font-bold text-ink">Вернуть в идеи</summary>
            <form action={returnToIdeaAction.bind(null, event.id)} className="mt-2 space-y-2">
              <textarea name="comment" required rows={2} placeholder="Почему возвращаем" className={`w-64 ${input}`} />
              <button type="submit" className={`block ${ghostBtn}`}>
                Вернуть
              </button>
            </form>
          </details>
        )}
      </div>
    );
  }

  return null;
}

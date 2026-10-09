import Link from "next/link";
import clsx from "clsx";
import type { CurrentUser } from "@/lib/auth";
import type { EventDetail } from "@/lib/queries/event-detail";
import { userCan } from "@/lib/permissions";
import { calendarDay, daysBetween, formatDate } from "@/lib/time";
import {
  checkStageEntry,
  isOutsideWindow,
  MAX_OPTIONS,
  missingSpeakerFields,
  optionsWarning,
  tooLateWarning,
  type EventForStageCheck
} from "@/lib/stages";
import {
  addDateOptionAction,
  backToDatesAction,
  confirmSpeakerDateAction,
  deleteDateOptionAction,
  markDoneAction,
  optionsReadyAction,
  passRejectedAction,
  rescheduleAction,
  restoreToDatesAction,
  sendToDatesAction
} from "@/lib/actions/event-actions";

const primaryBtn = "rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-bg hover:bg-gold/90";
const ghostBtn = "rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-ink hover:border-gold";
const input = "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-base text-ink sm:text-sm";
const TIME_SLOTS = ["15:45", "17:15", "17:20"];

function toInputDate(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function stageCheckOf(event: EventDetail): EventForStageCheck {
  return {
    title: event.title,
    type: event.type,
    guestName: event.guestName,
    guestOccupation: event.guestOccupation,
    guestOrganization: event.guestOrganization,
    guestTopic: event.guestTopic,
    format: event.format,
    speakerWindowStart: event.speakerWindowStart,
    speakerWindowEnd: event.speakerWindowEnd,
    dateOptionsCount: event.dateOptions.length,
    targetDate: event.targetDate,
    dateFixed: event.dateFixed,
    speakerWarned: event.speakerWarned,
    actualAttendance: event.actualAttendance,
    hasRetro: !!event.retro,
    hasPhotoReport: event.attachments.some((a) => a.kind === "PHOTO_REPORT")
  };
}

function Waiting({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

function OptionLine({ event, option }: { event: EventDetail; option: EventDetail["dateOptions"][number] }) {
  const outside = isOutsideWindow(option.date, event.speakerWindowStart, event.speakerWindowEnd);
  return (
    <span className="min-w-0 flex-1">
      <span className="font-bold text-ink">
        {formatDate(option.date)}
        {option.timeSlot && `, ${option.timeSlot}`}
      </span>
      {option.venue && <span className="text-ink"> · ауд. {option.venue}</span>}
      {outside && <span className="ml-1 rounded bg-gold/15 px-1.5 py-0.5 text-[11px] font-bold text-gold">вне окна спикера</span>}
      {option.comment && <span className="block text-xs text-muted">{option.comment}</span>}
    </span>
  );
}

/** Блок «Что сейчас»: один следующий шаг этапа и кнопки — только для тех, кому они разрешены. */
export function StageActions({ event, user }: { event: EventDetail; user: CurrentUser | null }) {
  const check = stageCheckOf(event);

  if (event.stage === "IDEA") {
    const missing = missingSpeakerFields(check);
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink">
          Черновик карточки спикера.{" "}
          {missing.length > 0 ? (
            <span className="text-muted">Не хватает: {missing.join(", ")}.</span>
          ) : (
            <span className="text-muted">Всё заполнено — можно отправлять на подбор дат.</span>
          )}
        </p>
        {userCan(user, "CREATE_EVENT") ? (
          <form action={sendToDatesAction.bind(null, event.id)}>
            <button type="submit" className={primaryBtn} disabled={missing.length > 0}>
              Отправить на подбор дат
            </button>
            {missing.length > 0 && <p className="mt-1 text-xs text-muted">Допишите карточку ниже — «Изменить карточку».</p>}
          </form>
        ) : (
          <Waiting>Карточку дописывает Внешний отдел.</Waiting>
        )}
      </div>
    );
  }

  if (event.stage === "APPROVAL") {
    const canAdd = userCan(user, "ADD_DATE_OPTIONS");
    const warning = optionsWarning(event.dateOptions.length);
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink">
          Администратор и Пиар подбирают 3–4 варианта: дата, время, свободная аудитория.
          {event.speakerWindowStart && event.speakerWindowEnd && (
            <span className="text-muted">
              {" "}
              Окно спикера: {formatDate(event.speakerWindowStart)} — {formatDate(event.speakerWindowEnd)}.
            </span>
          )}
        </p>

        {event.dateOptions.length > 0 ? (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {event.dateOptions.map((o, i) => (
              <li key={o.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                <span className="mt-0.5 text-xs text-muted">{i + 1}.</span>
                <OptionLine event={event} option={o} />
                {canAdd && (
                  <form action={deleteDateOptionAction.bind(null, event.id, o.id)}>
                    <button type="submit" className="text-xs text-muted hover:text-danger" aria-label="Удалить вариант">
                      Удалить
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Вариантов пока нет.</p>
        )}
        {warning && <p className="text-xs text-gold">{warning}</p>}

        {canAdd && event.dateOptions.length < MAX_OPTIONS && (
          <form action={addDateOptionAction.bind(null, event.id)} className="space-y-2 rounded-lg border border-line bg-surface p-3">
            <p className="text-sm font-bold text-ink">Добавить вариант {event.dateOptions.length + 1}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted" htmlFor="opt-date">
                  Дата
                </label>
                <input id="opt-date" type="date" name="date" required className={input} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted" htmlFor="opt-venue">
                  Аудитория
                </label>
                <input id="opt-venue" name="venue" placeholder="Например, 1318" className={input} />
              </div>
            </div>
            <fieldset>
              <legend className="mb-1 text-xs text-muted">Время</legend>
              <div className="flex flex-wrap gap-2">
                {TIME_SLOTS.map((t, i) => (
                  <label key={t} className="cursor-pointer">
                    <input type="radio" name="timeSlot" value={t} defaultChecked={i === 1} className="peer sr-only" />
                    <span className="block rounded-lg border border-line px-3 py-2 text-sm font-bold text-muted peer-checked:border-gold peer-checked:bg-gold/10 peer-checked:text-ink">
                      {t}
                    </span>
                  </label>
                ))}
                <input name="timeSlotCustom" placeholder="своё время" className="w-32 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink" />
              </div>
            </fieldset>
            <input name="comment" placeholder="Комментарий (необязательно)" className={input} />
            <button type="submit" className={ghostBtn}>
              Добавить вариант
            </button>
          </form>
        )}

        {canAdd ? (
          <form action={optionsReadyAction.bind(null, event.id)}>
            <button type="submit" className={primaryBtn} disabled={event.dateOptions.length === 0}>
              Варианты готовы — отправить Внешнему отделу
            </button>
          </form>
        ) : (
          <Waiting>Когда варианты будут готовы, Внешний отдел получит уведомление.</Waiting>
        )}
      </div>
    );
  }

  if (event.stage === "PLANNING") {
    const canFix = userCan(user, "FIX_DATE");
    const anyLate = event.dateOptions.some((o) => tooLateWarning(o.date));
    if (!canFix) {
      return (
        <div className="space-y-2">
          <Waiting>Внешний отдел согласует со спикером один из вариантов:</Waiting>
          <ul className="space-y-1 text-sm">
            {event.dateOptions.map((o) => (
              <li key={o.id} className="flex">
                <OptionLine event={event} option={o} />
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink">Согласуйте со спикером один вариант и отметьте его.</p>
        <form action={confirmSpeakerDateAction.bind(null, event.id)} className="space-y-3">
          <fieldset className="space-y-2">
            {event.dateOptions.map((o, i) => {
              const late = tooLateWarning(o.date);
              return (
                <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm has-[:checked]:border-gold has-[:checked]:bg-gold/10">
                  <input type="radio" name="optionId" value={o.id} required defaultChecked={i === 0 && event.dateOptions.length === 1} className="mt-1 accent-[#E8B86D]" />
                  <span className="min-w-0 flex-1">
                    <OptionLine event={event} option={o} />
                    {late && <span className="mt-1 block text-xs text-danger">{late}</span>}
                  </span>
                </label>
              );
            })}
          </fieldset>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" name="speakerWarned" required className="mt-1 h-4 w-4 accent-[#E8B86D]" />
            Предупредил спикера, что пропуск могут не одобрить
          </label>
          {anyLate && (
            <label className="flex items-start gap-2 text-sm text-danger">
              <input type="checkbox" name="confirmLate" className="mt-1 h-4 w-4 accent-[#FF6B6B]" />
              Понимаю, что по регламенту не успеваем, — фиксируем
            </label>
          )}
          <button type="submit" className={primaryBtn}>
            Спикер подтвердил
          </button>
        </form>
        <details>
          <summary className="cursor-pointer text-sm text-muted hover:text-ink">Ни один вариант не подошёл</summary>
          <form action={backToDatesAction.bind(null, event.id)} className="mt-2 space-y-2">
            <input name="comment" placeholder="Что сказал спикер (необязательно)" className={input} />
            <button type="submit" className={ghostBtn}>
              Вернуть на подбор дат
            </button>
          </form>
        </details>
      </div>
    );
  }

  if (event.stage === "IN_PROGRESS") {
    const today = calendarDay(new Date()).getTime();
    const day = event.targetDate ? calendarDay(event.targetDate).getTime() : null;
    const isToday = day === today;
    const dayCame = day !== null && day <= today;
    const left = event.targetDate ? daysBetween(new Date(), event.targetDate) : null;
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink">
          <strong>{formatDate(event.targetDate)}</strong>
          {event.timeSlot && `, ${event.timeSlot}`}
          {event.venue && ` · ауд. ${event.venue}`}
          {left !== null && left > 0 && <span className="text-muted"> · через {left} дн.</span>}
        </p>
        <p className={clsx("rounded-lg px-3 py-2 text-sm font-bold", event.passReadyAt ? "bg-success/10 text-success" : "bg-gold/10 text-gold")}>
          {event.passReadyAt ? "Пропуск готов ✓" : "Ждём пропуск на спикера — делает Пиар"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/events/${event.id}/day`} className={isToday ? primaryBtn : ghostBtn}>
            {isToday ? "Сегодня мероприятие — тайминг" : "Тайминг дня мероприятия"}
          </Link>
          {dayCame && userCan(user, "FINISH") && (
            <form action={markDoneAction.bind(null, event.id)}>
              <button type="submit" className={primaryBtn}>
                Проведено
              </button>
            </form>
          )}
        </div>
        {!event.passReadyAt && userCan(user, "PASS_DECISION") && (
          <details className="rounded-lg border border-danger/30 px-3 py-2">
            <summary className="cursor-pointer text-sm font-bold text-danger">Пропуск не одобрен</summary>
            <form action={passRejectedAction.bind(null, event.id)} className="mt-2 space-y-2">
              <p className="text-xs text-muted">
                Мероприятие отменится, открытые задачи закроются. Внешний отдел и Администратор получат «Сообщите спикеру».
              </p>
              <input name="reason" required placeholder="Причина" className={input} />
              <button type="submit" className="rounded-lg border border-danger/50 px-4 py-2 text-sm font-bold text-danger">
                Отметить: пропуск не одобрен
              </button>
            </form>
          </details>
        )}
        {userCan(user, "FIX_DATE") && (
          <details>
            <summary className="cursor-pointer text-sm text-muted hover:text-ink">Перенести дату</summary>
            <form action={rescheduleAction.bind(null, event.id)} className="mt-2 grid gap-2 sm:grid-cols-3">
              <input type="date" name="targetDate" required defaultValue={toInputDate(event.targetDate)} className={input} />
              <input name="timeSlot" defaultValue={event.timeSlot ?? ""} placeholder="Время" className={input} />
              <input name="venue" defaultValue={event.venue ?? ""} placeholder="Аудитория" className={input} />
              <button type="submit" className={`${ghostBtn} sm:col-span-3 sm:justify-self-start`}>
                Перенести
              </button>
              <p className="text-xs text-muted sm:col-span-3">Сроки открытых задач пересчитаются от новой даты.</p>
            </form>
          </details>
        )}
      </div>
    );
  }

  if (event.stage === "DONE") {
    const closeError = checkStageEntry("CLOSED", check);
    return (
      <p className="text-sm text-ink">
        Мероприятие проведено. {closeError ? "Ниже — итоги: фотоотчёт, посещаемость, ретро." : "Итоги заполнены — можно закрывать."}
      </p>
    );
  }

  if (event.stage === "REJECTED") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-danger">Отменено{event.approvalComment ? `: ${event.approvalComment}` : "."}</p>
        {userCan(user, "CANCEL_DELETE") && (
          <form action={restoreToDatesAction.bind(null, event.id)}>
            <button type="submit" className={ghostBtn}>
              Вернуть в подбор дат
            </button>
          </form>
        )}
      </div>
    );
  }

  return <p className="text-sm text-success">Мероприятие закрыто и в архиве.</p>;
}

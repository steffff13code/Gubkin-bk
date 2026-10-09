import { calendarDay, daysBetween } from "@/lib/time";

// Этапы мероприятия по регламенту v3. Чистые функции без обращения к БД — покрыты тестами.
//   IDEA «Черновик» → APPROVAL «Подбор дат» → PLANNING «Дата у спикера» →
//   IN_PROGRESS «Подготовка» → DONE «Проведено» → CLOSED «Закрыто»; REJECTED «Отменено».

export type EventForStageCheck = {
  title: string;
  type: string | null;
  guestName: string | null;
  guestOccupation: string | null;
  guestOrganization: string | null;
  guestTopic: string | null;
  format: string | null;
  speakerWindowStart: Date | null;
  speakerWindowEnd: Date | null;
  dateOptionsCount: number;
  targetDate: Date | null;
  dateFixed: boolean;
  speakerWarned: boolean;
  actualAttendance: number | null;
  hasRetro: boolean;
  hasPhotoReport: boolean;
};

/** Пропуск — пара дней, после него до мероприятия минимум 1,5 недели: 2 + 10 = 12 дней. */
export const MIN_DAYS_FROM_FIX = 12;
export const RECOMMENDED_WINDOW_DAYS = 14;
export const MIN_WINDOW_DAYS = 7;
export const RECOMMENDED_OPTIONS = 3;
export const MAX_OPTIONS = 4;

function joinRu(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} и ${items[items.length - 1]}`;
}

/** Чего не хватает в карточке спикера, чтобы отправить её на подбор дат. */
export function missingSpeakerFields(event: EventForStageCheck): string[] {
  const missing: string[] = [];
  if (!event.title?.trim()) missing.push("название");
  if (!event.guestName?.trim()) missing.push("ФИО спикера");
  if (!event.guestOccupation?.trim()) missing.push("род деятельности");
  if (!event.guestOrganization?.trim()) missing.push("компанию");
  if (!event.guestTopic?.trim()) missing.push("о чём мероприятие");
  if (!event.format?.trim()) missing.push("формат");
  if (!event.speakerWindowStart || !event.speakerWindowEnd) missing.push("окно спикера");
  return missing;
}

/** Возвращает текст ошибки, если перейти на этап нельзя, иначе null. */
export function checkStageEntry(
  targetStage: "APPROVAL" | "PLANNING" | "IN_PROGRESS" | "DONE" | "CLOSED" | "IDEA" | "REJECTED",
  event: EventForStageCheck,
  now: Date = new Date()
): string | null {
  switch (targetStage) {
    case "APPROVAL": {
      const missing = missingSpeakerFields(event);
      if (missing.length > 0) return `Чтобы отправить на подбор дат, заполните: ${joinRu(missing)}.`;
      if (event.speakerWindowStart! > event.speakerWindowEnd!) return "Окно спикера: дата «с» позже даты «по».";
      return null;
    }

    case "PLANNING": {
      if (event.dateOptionsCount < 1) return "Внесите хотя бы один вариант: дату, время и аудиторию.";
      if (event.dateOptionsCount > MAX_OPTIONS) return `Вариантов не больше ${MAX_OPTIONS}.`;
      return null;
    }

    case "IN_PROGRESS": {
      if (!event.targetDate || !event.dateFixed) return "Выберите вариант, который подтвердил спикер.";
      if (!event.speakerWarned) return "Отметьте, что предупредили спикера: пропуск могут не одобрить.";
      return null;
    }

    case "DONE": {
      if (!event.targetDate || !event.dateFixed) return "Чтобы отметить проведённым, дата должна быть зафиксирована.";
      if (calendarDay(now).getTime() < calendarDay(event.targetDate).getTime()) {
        return "Отметить проведённым можно в день мероприятия или позже.";
      }
      return null;
    }

    case "CLOSED": {
      const missing: string[] = [];
      if (!event.hasPhotoReport) missing.push("прикрепите ссылку на фотоотчёт");
      if (event.actualAttendance === null || event.actualAttendance === undefined) missing.push("укажите посещаемость");
      if (!event.hasRetro) missing.push("заполните ретро");
      if (missing.length > 0) return `Чтобы закрыть мероприятие, ${joinRu(missing)}.`;
      return null;
    }

    case "IDEA":
    case "REJECTED":
      return null;
  }
}

/** Окно спикера короче недели — предупреждаем, но сохранить можно. */
export function windowWarning(start: Date | null, end: Date | null): string | null {
  if (!start || !end) return null;
  const days = daysBetween(start, end) + 1;
  if (days < MIN_WINDOW_DAYS) return `Окно всего ${days} дн. — по регламенту спикер даёт две недели.`;
  return null;
}

/** Меньше трёх вариантов — мягкое предупреждение. */
export function optionsWarning(count: number): string | null {
  if (count > 0 && count < RECOMMENDED_OPTIONS) {
    return `Вариантов ${count} — по регламенту лучше 3–4, чтобы спикеру было из чего выбрать.`;
  }
  return null;
}

/** Вариант вне окна спикера. */
export function isOutsideWindow(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  const d = calendarDay(date).getTime();
  return d < calendarDay(start).getTime() || d > calendarDay(end).getTime();
}

/** До мероприятия меньше 12 дней: пропуск (2 дня) + минимум 1,5 недели после него не помещаются. */
export function tooLateWarning(date: Date, now: Date = new Date()): string | null {
  const days = daysBetween(now, date);
  if (days < MIN_DAYS_FROM_FIX) {
    return `Не успеем по регламенту: после пропуска должно остаться минимум 1,5 недели (до мероприятия ${Math.max(days, 0)} дн.).`;
  }
  return null;
}

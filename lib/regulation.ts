import type { RoleKey } from "@/lib/roles";

// Регламент v3 внутри CRM: общая схема этапов и стартовый текст общих правил.
// Задачи ролей на странице «Регламент» строятся из шаблона задач — они всегда совпадают с тем,
// что реально приходит в задачи.

export type FlowStep = { when: string; what: string; who: RoleKey[] };

export const FLOW: FlowStep[] = [
  {
    when: "за 1–1,5 месяца",
    what: "Спикер одобрил двухнедельное окно. Внешний отдел заводит карточку: ФИО, род деятельности, компания, тема, формат",
    who: ["GUESTS"]
  },
  { when: "сразу после", what: "Администратор и Пиар подбирают 3–4 варианта: дата, время, свободная аудитория", who: ["BOARD", "PR"] },
  {
    when: "дальше",
    what: "Внешний отдел согласует со спикером один вариант и предупреждает: есть небольшая вероятность, что пропуск не одобрят",
    who: ["GUESTS"]
  },
  { when: "+2 дня", what: "Пиар делает пропуск на спикера и бронирует аудиторию", who: ["PR"] },
  {
    when: "пропуск готов (до мероприятия ≥ 1,5 недели)",
    what: "Event-отдел готовит план проведения, Контент — съёмки: рилс-анонс и рилс-интервью",
    who: ["STAGE", "CONTENT"]
  },
  { when: "за неделю", what: "Пиар публикует пост-анонс с регистрацией", who: ["PR"] },
  {
    when: "за 3 дня",
    what: "Рилс-анонс готов, Пиар выпускает второй анонс. Администратор проверяет регистрации — если мало, просим помощи у преподавателей МЭБ",
    who: ["CONTENT", "PR", "BOARD"]
  },
  { when: "день Д", what: "Мероприятие по таймингу", who: ["BOARD", "GUESTS", "PR", "STAGE", "CONTENT"] },
  { when: "через 3 дня", what: "Пост-отчёт с рилсом, фотоотчёт, спасибо спикеру, итоги", who: ["PR", "CONTENT", "GUESTS", "BOARD"] }
];

export const GENERAL_RULES = `- Вопросы по регламенту — лично руководству, не в общий чат.
- Все посты дублируются в ВК, Telegram и Max (Max — через ответственного), съёмочный материал — в сторис тех же сетей.
- У Контента есть доступы к Инстаграму и ТикТоку: контент выходит там одновременно.
- После того как пропуск готов, до мероприятия должно оставаться минимум 1,5 недели.
- Типовое время мероприятий: 15:45, 17:15, 17:20.`;

export type TemplateTiming = {
  group: "BEFORE" | "EVENT_DAY" | "AFTER";
  triggerType: "DATE_OFFSET" | "EVENT";
  offsetDays: number | null;
  triggerEvent: string | null;
  dayOffsetMinutes: number | null;
  dayTimeLabel: string | null;
};

const EVENT_NAMES: Record<string, string> = {
  DATE_FIXED: "спикер подтвердил дату",
  SECURITY_SUBMITTED: "заявка подана",
  SECURITY_ANSWERED: "пропуск готов",
  REGISTRATION_CLOSED: "регистрация закрыта",
  EVENT_DONE: "мероприятие проведено"
};

function days(n: number): string {
  const a = Math.abs(n);
  const mod10 = a % 10;
  const mod100 = a % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "день" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "дня" : "дней";
  return `${a} ${word}`;
}

function minutesLabel(m: number): string {
  const a = Math.abs(m);
  const text = a >= 60 ? `${Math.floor(a / 60)} ч${a % 60 ? ` ${a % 60} мин` : ""}` : `${a} мин`;
  return m < 0 ? `за ${text} до начала` : m === 0 ? "в начале" : `через ${text} после начала`;
}

/** Срок задачи шаблона простыми словами относительно дня мероприятия D. */
export function timingLabel(t: TemplateTiming): string {
  if (t.triggerType === "EVENT" && t.triggerEvent) {
    const what = EVENT_NAMES[t.triggerEvent] ?? t.triggerEvent;
    const n = t.offsetDays ?? 0;
    return n === 0 ? `сразу, как ${what}` : `через ${days(n)} после того, как ${what}`;
  }
  const n = t.offsetDays ?? 0;
  if (t.group === "EVENT_DAY" || n === 0) {
    const parts = ["день Д"];
    if (t.dayOffsetMinutes !== null) parts.push(minutesLabel(t.dayOffsetMinutes));
    else if (t.dayTimeLabel) parts.push(t.dayTimeLabel);
    return parts.join(", ");
  }
  return n < 0 ? `D−${Math.abs(n)} (за ${days(n)})` : `D+${n} (через ${days(n)})`;
}

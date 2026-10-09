import type {
  DepartmentCode,
  EventType,
  TaskAutoComplete,
  TaskGroup,
  TaskTriggerEvent,
  TaskTriggerType
} from "@prisma/client";

// Шаблон задач по регламенту v3 (общий регламент руководства клуба).
// D — дата мероприятия. «Пропуск готов» — триггер SECURITY_ANSWERED (зажигает закрытие задачи
// «Оформить пропуск на спикера»). Сроки — дни относительно D (для EVENT — дни после события).
// При изменении увеличьте LECTURE_TEMPLATE_VERSION — сид заменит шаблоны в базе.
export const LECTURE_TEMPLATE_VERSION = "3";

/** Направления, для которых сидится шаблон v3. */
export const TEMPLATE_TYPES: EventType[] = ["LECTURE", "CASE", "INTENSIVE", "ACCELERATOR"];

/** Пометки к шаблонам направлений — показываются в настройках и в регламенте. */
export const TEMPLATE_NOTES: Partial<Record<EventType, string>> = {
  CASE: "Базовый шаблон, руководство уточнит.",
  ACCELERATOR: "Базовый шаблон, руководство уточнит."
};

export type LectureTemplateRow = {
  title: string;
  department: DepartmentCode | null;
  triggerType: TaskTriggerType;
  offsetDays: number | null;
  triggerEvent: TaskTriggerEvent | null;
  required: boolean;
  needsTwoAssignees: boolean;
  firesTrigger: TaskTriggerEvent | null;
  autoComplete: TaskAutoComplete | null;
  group: TaskGroup;
  sortOrder: number;
  dayOffsetMinutes: number | null;
  dayTimeLabel: string | null;
  description: string | null;
};

export const LECTURE_TEMPLATE: LectureTemplateRow[] = [
  // --- До мероприятия: дата → пропуск → план проведения и съёмки → анонсы
  {
    title: "Оформить пропуск на спикера",
    department: "PR",
    triggerType: "EVENT",
    offsetDays: 2,
    triggerEvent: "DATE_FIXED",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: "SECURITY_ANSWERED",
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 10,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description:
      "Данные спикера — в карточке мероприятия; чего не хватает, запроси у Внешнего отдела. Сделал — закрой задачу. Если отказали — кнопка «Пропуск не одобрен» в карточке. Закрытие задачи означает «Пропуск готов»: Event-отдел и Контент начинают подготовку."
  },
  {
    title: "Забронировать аудиторию (служебка)",
    department: "PR",
    triggerType: "EVENT",
    offsetDays: 2,
    triggerEvent: "DATE_FIXED",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 20,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description:
      "Аудитория — из выбранного варианта дат (в карточке мероприятия).\n\n_Срок по умолчанию — руководство может поправить в «Настройки → Шаблоны»._"
  },
  {
    title: "План проведения",
    department: "STAGE",
    triggerType: "EVENT",
    offsetDays: 3,
    triggerEvent: "SECURITY_ANSWERED",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 30,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description:
      "Кто за что отвечает на площадке, кто берёт ноутбук, кто общается с участниками и зовёт в актив.\n\n_Срок по умолчанию — руководство может поправить в «Настройки → Шаблоны»._"
  },
  {
    title: "Подготовить съёмки: рилс-анонс и рилс-интервью",
    department: "CONTENT",
    triggerType: "EVENT",
    offsetDays: 2,
    triggerEvent: "SECURITY_ANSWERED",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 40,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description:
      "Сценарий, кто снимает, что нужно от спикера.\n\n_Срок по умолчанию — руководство может поправить в «Настройки → Шаблоны»._"
  },
  {
    title: "Пост-анонс с регистрацией",
    department: "PR",
    triggerType: "DATE_OFFSET",
    offsetDays: -7,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 50,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description:
      "Опубликовать лично в ВК и Telegram; попросить ответственного за Max продублировать; съёмочный материал — в сторис тех же сетей."
  },
  {
    title: "Рилс-анонс готов: передать Пиару и выложить в Инстаграм и ТикТок",
    department: "CONTENT",
    triggerType: "DATE_OFFSET",
    offsetDays: -3,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 60,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description: "Выход в Инстаграме и ТикТоке — одновременно. Если Пиар забыл про сторис — напомнить ему."
  },
  {
    title: "Второй анонс с рилсом — поторопить с регистрацией",
    department: "PR",
    triggerType: "DATE_OFFSET",
    offsetDays: -3,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 70,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description:
      "Прикрепить рилс-анонс от Контента. Каналы: лично в ВК и Telegram; попросить ответственного за Max продублировать; съёмочный материал — в сторис тех же сетей."
  },
  {
    title: "Проверить число регистраций",
    department: "BOARD",
    triggerType: "DATE_OFFSET",
    offsetDays: -3,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 80,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description: "Если мало — попросить помощи у преподавателей МЭБ и усилить набор."
  },
  {
    title: "Позвать людей вживую",
    department: null,
    triggerType: "DATE_OFFSET",
    offsetDays: -3,
    triggerEvent: null,
    required: false,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 90,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description: "Реклама даёт часть зала, остальное — личные приглашения."
  },
  {
    title: "Список внешних участников — на пропуска",
    department: "PR",
    triggerType: "DATE_OFFSET",
    offsetDays: -2,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 100,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description:
      "Срок уточнить у руководства.\n\n_Срок по умолчанию — руководство может поправить в «Настройки → Шаблоны»._"
  },
  {
    title: "Стоп-лист: все обязательные задачи закрыты",
    department: "BOARD",
    triggerType: "DATE_OFFSET",
    offsetDays: -2,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 110,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description: "За 2 дня до мероприятия сюда автоматически попадает список незакрытых обязательных задач."
  },
  {
    title: "Забрать оборудование накануне",
    department: "STAGE",
    triggerType: "DATE_OFFSET",
    offsetDays: -1,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 120,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description: null
  },
  // --- День мероприятия — по таймингу
  {
    title: "Аудитория открыта, проектор и звук работают, презентация загружена",
    department: "STAGE",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 300,
    dayOffsetMinutes: -120,
    dayTimeLabel: "−2 часа",
    description: null
  },
  {
    title: "Два волонтёра на посту охраны со списком",
    department: "STAGE",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 310,
    dayOffsetMinutes: -40,
    dayTimeLabel: "−40 минут",
    description: null
  },
  {
    title: "Встретить спикера — один человек",
    department: "GUESTS",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 320,
    dayOffsetMinutes: -20,
    dayTimeLabel: "−20 минут",
    description: null
  },
  {
    title: "Открытие, представление спикера",
    department: "BOARD",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 330,
    dayOffsetMinutes: 0,
    dayTimeLabel: "0:00",
    description: null
  },
  {
    title: "Съёмка: зал, спикер, реакция",
    department: "CONTENT",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 340,
    dayOffsetMinutes: 0,
    dayTimeLabel: "0:00",
    description: null
  },
  {
    title: "Один организатор в конце зала весь тайминг",
    department: "STAGE",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 350,
    dayOffsetMinutes: 0,
    dayTimeLabel: "всё мероприятие",
    description: null
  },
  {
    title: "Вопросы: первые — из заготовленного списка, дальше зал",
    department: "BOARD",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 360,
    dayOffsetMinutes: null,
    dayTimeLabel: "после выступления",
    description: null
  },
  {
    title: "Питч-сессия 7 минут по таймеру (если согласована)",
    department: "BOARD",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: false,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 370,
    dayOffsetMinutes: null,
    dayTimeLabel: "финал",
    description: null
  },
  {
    title: "Общее фото при полном зале",
    department: "CONTENT",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 380,
    dayOffsetMinutes: null,
    dayTimeLabel: "финал",
    description: null
  },
  {
    title: "Общаться с участниками и звать в актив",
    department: "STAGE",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 385,
    dayOffsetMinutes: null,
    dayTimeLabel: "финал",
    description: null
  },
  {
    title: "Спикера уводят — сначала фото, потом уводим",
    department: "GUESTS",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 390,
    dayOffsetMinutes: null,
    dayTimeLabel: "сразу после",
    description: null
  },
  {
    title: "Рилс-интервью со спикером",
    department: "CONTENT",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 400,
    dayOffsetMinutes: null,
    dayTimeLabel: "сразу после",
    description: null
  },
  {
    title: "Собрать и вернуть технику",
    department: "STAGE",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 410,
    dayOffsetMinutes: null,
    dayTimeLabel: "после",
    description: null
  },
  // --- После «Проведено»: рилсы, фото, пост-отчёт, спасибо спикеру, итоги
  {
    title: "Рилс-отчёт и рилс-интервью — Пиару, выложить в Инстаграм и ТикТок",
    department: "CONTENT",
    triggerType: "EVENT",
    offsetDays: 2,
    triggerEvent: "EVENT_DONE",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "AFTER",
    sortOrder: 500,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description: "Выход в Инстаграме и ТикТоке — одновременно."
  },
  {
    title: "Фотоотчёт: ссылка в карточке",
    department: "CONTENT",
    triggerType: "EVENT",
    offsetDays: 3,
    triggerEvent: "EVENT_DONE",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: "PHOTO_REPORT_ATTACHED",
    group: "AFTER",
    sortOrder: 510,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description: "Задача закроется сама, когда в блоке «Итоги» появится ссылка на фотоотчёт."
  },
  {
    title: "Пост-отчёт с рилсом",
    department: "PR",
    triggerType: "EVENT",
    offsetDays: 3,
    triggerEvent: "EVENT_DONE",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "AFTER",
    sortOrder: 520,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description:
      "Каналы: лично в ВК и Telegram; попросить ответственного за Max продублировать; съёмочный материал — в сторис тех же сетей."
  },
  {
    title: "Поблагодарить спикера, прислать ссылки",
    department: "GUESTS",
    triggerType: "EVENT",
    offsetDays: 3,
    triggerEvent: "EVENT_DONE",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "AFTER",
    sortOrder: 530,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description: "Ссылки на пост-отчёт, рилсы и фото."
  },
  {
    title: "Итоги: посещаемость и ретро",
    department: "BOARD",
    triggerType: "EVENT",
    offsetDays: 3,
    triggerEvent: "EVENT_DONE",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: "RETRO_SAVED",
    group: "AFTER",
    sortOrder: 540,
    dayOffsetMinutes: null,
    dayTimeLabel: null,
    description: "Закроется сама, когда в блоке «Итоги» сохранены посещаемость и ретро."
  }
];

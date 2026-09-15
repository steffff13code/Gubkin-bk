import type { DepartmentCode, TaskAutoComplete, TaskGroup, TaskTriggerEvent, TaskTriggerType } from "@prisma/client";

// Регламент «Лекция с гостем» — раздел 7 ТЗ. Данные используются сидом,
// чтобы засеять TaskTemplate для EventType.LECTURE.
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
};

export const LECTURE_TEMPLATE: LectureTemplateRow[] = [
  // --- До мероприятия --------------------------------------------------
  {
    title: "Выбрать гостя, написать ему, согласовать окно из 10 дней",
    department: "GUESTS",
    triggerType: "DATE_OFFSET",
    offsetDays: -45,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 10
  },
  {
    title: "Подать заявку в ЦБ на гостя",
    department: "SECURITY",
    triggerType: "DATE_OFFSET",
    offsetDays: -30,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: true,
    firesTrigger: "SECURITY_SUBMITTED",
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 20
  },
  {
    title: "Получить ответ ЦБ, результат в чат",
    department: "SECURITY",
    triggerType: "EVENT",
    offsetDays: 7,
    triggerEvent: "SECURITY_SUBMITTED",
    required: true,
    needsTwoAssignees: true,
    firesTrigger: "SECURITY_ANSWERED",
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 30
  },
  {
    title: "Зафиксировать дату с гостем",
    department: "GUESTS",
    triggerType: "DATE_OFFSET",
    offsetDays: -21,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 40
  },
  {
    title: "Выбрать аудиторию из списка голосованием в чате, подать служебку",
    department: "VENUE_BOOKING",
    triggerType: "EVENT",
    offsetDays: 0,
    triggerEvent: "DATE_FIXED",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 50
  },
  {
    title: "Анонсный ролик",
    department: "CONTENT",
    triggerType: "EVENT",
    offsetDays: 2,
    triggerEvent: "SECURITY_ANSWERED",
    required: false,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 60
  },
  {
    title: "Подтверждение аудитории в чат",
    department: "VENUE_BOOKING",
    triggerType: "DATE_OFFSET",
    offsetDays: -17,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 70
  },
  {
    title: "Пост №1, открыть регистрацию",
    department: "PR",
    triggerType: "DATE_OFFSET",
    offsetDays: -14,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 80
  },
  {
    title: "Согласовать афишу и пост с гостем",
    department: "GUESTS",
    triggerType: "DATE_OFFSET",
    offsetDays: -10,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 90
  },
  {
    title: "Пост №2 с афишей",
    department: "PR",
    triggerType: "DATE_OFFSET",
    offsetDays: -7,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 100
  },
  {
    title: "Личные приглашения: каждый участник зовёт своих",
    department: null,
    triggerType: "DATE_OFFSET",
    offsetDays: -7,
    triggerEvent: null,
    required: false,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 110
  },
  {
    title: "Закрыть регистрацию",
    department: "PR",
    triggerType: "DATE_OFFSET",
    offsetDays: -6,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: "REGISTRATION_CLOSED",
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 120
  },
  {
    title: "Передать список участников в ЦБ",
    department: "SECURITY",
    triggerType: "DATE_OFFSET",
    offsetDays: -6,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: true,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 130
  },
  {
    title: "Пост №3",
    department: "PR",
    triggerType: "DATE_OFFSET",
    offsetDays: -3,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 140
  },
  {
    title: "Подать списки в ЦБ лично, получить пропуска",
    department: "SECURITY",
    triggerType: "DATE_OFFSET",
    offsetDays: -3,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: true,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 150
  },
  {
    title: "Стоп-лист: проверить, что все обязательные задачи закрыты",
    department: null,
    triggerType: "DATE_OFFSET",
    offsetDays: -2,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "BEFORE",
    sortOrder: 160
  },

  // --- День мероприятия --------------------------------------------------
  {
    title: "Техника и презентация проверены (за 2 часа)",
    department: "STAGE",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 200
  },
  {
    title: "Волонтёры на посту (за 40 минут)",
    department: "STAGE",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 210
  },
  {
    title: "Встреча гостя, один человек (за 20 минут)",
    department: "GUESTS",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 220
  },
  {
    title: "Выступление, съёмка идёт",
    department: "CONTENT",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 230
  },
  {
    title: "Вопросы, питч-сессия (7 минут)",
    department: null,
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 240
  },
  {
    title: "Общее фото — до того, как гостя уводят",
    department: "CONTENT",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 250
  },
  {
    title: "Гостя уводят",
    department: "GUESTS",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 260
  },
  {
    title: "Интервью с гостем",
    department: "CONTENT",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 270
  },
  {
    title: "Порядок в зале, техника возвращена",
    department: "STAGE",
    triggerType: "DATE_OFFSET",
    offsetDays: 0,
    triggerEvent: null,
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "EVENT_DAY",
    sortOrder: 280
  },

  // --- После ----------------------------------------------------------
  {
    title: "Материал передан на монтаж",
    department: "CONTENT",
    triggerType: "EVENT",
    offsetDays: 1,
    triggerEvent: "EVENT_DONE",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: null,
    group: "AFTER",
    sortOrder: 300
  },
  {
    title: "Ссылка на фотоотчёт прикреплена",
    department: "CONTENT",
    triggerType: "EVENT",
    offsetDays: 1,
    triggerEvent: "EVENT_DONE",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: "PHOTO_REPORT_ATTACHED",
    group: "AFTER",
    sortOrder: 310
  },
  {
    title: "Ретро заполнено, посещаемость внесена",
    department: null,
    triggerType: "EVENT",
    offsetDays: 3,
    triggerEvent: "EVENT_DONE",
    required: true,
    needsTwoAssignees: false,
    firesTrigger: null,
    autoComplete: "RETRO_SAVED",
    group: "AFTER",
    sortOrder: 320
  }
];

import type {
  AttachmentKind,
  DepartmentCode,
  DepartmentPosition,
  EventStage,
  EventType,
  GuestStatus,
  IdeaCategory,
  IdeaStatus,
  Role,
  TaskAutoComplete,
  TaskGroup,
  TaskTriggerEvent,
  TaskTriggerType
} from "@prisma/client";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  LECTURE: "Лекция",
  GAME: "Игра",
  CASE: "Кейс-чемпионат",
  CONFERENCE: "Конференция",
  SERIES: "Серия",
  INTENSIVE: "Интенсив"
};

export const EVENT_STAGE_LABELS: Record<EventStage, string> = {
  IDEA: "Идея",
  APPROVAL: "На согласовании",
  PLANNING: "Планирование",
  IN_PROGRESS: "Подготовка",
  DONE: "Проведено",
  CLOSED: "Закрыто",
  REJECTED: "Отклонено"
};

export const BOARD_STAGES: EventStage[] = ["IDEA", "APPROVAL", "PLANNING", "IN_PROGRESS", "DONE", "CLOSED"];

// Цвет плашки-типа на карточке мероприятия и цветной точки колонки доски.
export const EVENT_TYPE_PILL_CLASSES: Record<EventType, string> = {
  LECTURE: "bg-accent/20 text-accent",
  GAME: "bg-success/20 text-success",
  CASE: "bg-gold/20 text-gold",
  CONFERENCE: "bg-[#B98CFF]/20 text-[#B98CFF]",
  SERIES: "bg-[#3FC1C9]/20 text-[#3FC1C9]",
  INTENSIVE: "bg-danger/20 text-danger"
};

export const EVENT_STAGE_DOT_CLASSES: Record<EventStage, string> = {
  IDEA: "bg-muted",
  APPROVAL: "bg-gold",
  PLANNING: "bg-accent",
  IN_PROGRESS: "bg-[#3FC1C9]",
  DONE: "bg-success",
  CLOSED: "bg-muted",
  REJECTED: "bg-danger"
};

export const DEPARTMENT_LABELS: Record<DepartmentCode, string> = {
  GUESTS: "Гости",
  SECURITY: "ЦБ",
  PR: "Пиар",
  VENUE_BOOKING: "Аудитория",
  CONTENT: "Контент",
  STAGE: "Площадка",
  INTENSIVES: "Интенсивы"
};

export const ROLE_LABELS: Record<Role, string> = {
  READER: "Гость",
  MEMBER: "Участник",
  LEAD: "Руководитель",
  ADMIN: "Администратор"
};

export const GUEST_STATUS_LABELS: Record<GuestStatus, string> = {
  NONE: "Не начато",
  CONTACTED: "Гость на связи",
  WINDOW_AGREED: "Окно согласовано",
  SECURITY_SUBMITTED: "Заявка в ЦБ подана",
  SECURITY_APPROVED: "ЦБ согласовал",
  SECURITY_REJECTED: "ЦБ отклонил"
};

export const TASK_GROUP_LABELS: Record<TaskGroup, string> = {
  BEFORE: "До мероприятия",
  EVENT_DAY: "День мероприятия",
  AFTER: "После"
};

export const IDEA_CATEGORY_LABELS: Record<IdeaCategory, string> = {
  IDEA: "Идея",
  CRITIQUE: "Критика",
  OTHER: "Другое"
};

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  NEW: "Новая",
  DISCUSSED: "Обсуждается",
  ACCEPTED: "Принята",
  REJECTED: "Отклонена"
};

export const DEPARTMENT_POSITION_LABELS: Record<DepartmentPosition, string> = {
  HEAD: "Руководитель",
  DEPUTY: "Заместитель",
  MEMBER: "Участник"
};

export const TASK_TRIGGER_TYPE_LABELS: Record<TaskTriggerType, string> = {
  DATE_OFFSET: "От даты мероприятия",
  EVENT: "По событию"
};

export const TASK_AUTO_COMPLETE_LABELS: Record<TaskAutoComplete, string> = {
  PHOTO_REPORT_ATTACHED: "когда прикреплён фотоотчёт",
  RETRO_SAVED: "когда заполнено ретро и посещаемость"
};

export const TASK_TRIGGER_EVENT_LABELS: Record<TaskTriggerEvent, string> = {
  DATE_FIXED: "Дата зафиксирована",
  SECURITY_SUBMITTED: "Заявка в ЦБ подана",
  SECURITY_ANSWERED: "ЦБ ответил",
  REGISTRATION_CLOSED: "Регистрация закрыта",
  EVENT_DONE: "Мероприятие проведено"
};

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  PROGRAM: "Программа",
  MEMO: "Служебка",
  GUEST_LIST: "Список гостей",
  PASS_PHOTO: "Фото пропуска",
  POSTER: "Афиша",
  PHOTO_REPORT: "Фотоотчёт",
  VIDEO: "Видео",
  OTHER: "Другое"
};

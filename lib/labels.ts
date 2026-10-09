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
  LECTURE: "Лекция / питч-сессия",
  CASE: "Бизнес-кейс",
  INTENSIVE: "Интенсив",
  ACCELERATOR: "Акселератор",
  GAME: "Игра",
  CONFERENCE: "Конференция",
  SERIES: "Серия"
};

/** Направления в форме создания (регламент v3). Остальные значения остаются в базе для старых записей. */
export const FORM_EVENT_TYPES: { type: EventType; label: string }[] = [
  { type: "LECTURE", label: "Лекция / питч-сессия" },
  { type: "CASE", label: "Бизнес-кейс" },
  { type: "ACCELERATOR", label: "Акселератор (4–6 часов, жюри и команды)" },
  { type: "INTENSIVE", label: "Интенсив" }
];

export const INTENSIVE_CYCLES = ["Продажи", "Маркетинг", "Привлечение клиентов"];

export const EVENT_STAGE_LABELS: Record<EventStage, string> = {
  IDEA: "Черновик",
  APPROVAL: "Подбор дат",
  PLANNING: "Дата у спикера",
  IN_PROGRESS: "Подготовка",
  DONE: "Проведено",
  CLOSED: "Закрыто",
  REJECTED: "Отменено"
};

export const BOARD_STAGES: EventStage[] = ["IDEA", "APPROVAL", "PLANNING", "IN_PROGRESS", "DONE", "CLOSED"];

// Цвет плашки-типа на карточке мероприятия и цветной точки колонки доски.
export const EVENT_TYPE_PILL_CLASSES: Record<EventType, string> = {
  LECTURE: "bg-accent/20 text-accent",
  GAME: "bg-success/20 text-success",
  CASE: "bg-gold/20 text-gold",
  CONFERENCE: "bg-[#B98CFF]/20 text-[#B98CFF]",
  SERIES: "bg-[#3FC1C9]/20 text-[#3FC1C9]",
  INTENSIVE: "bg-danger/20 text-danger",
  ACCELERATOR: "bg-success/20 text-success"
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
  BOARD: "Администратор клуба",
  GUESTS: "Внешний отдел",
  PR: "Пиар и пропуска",
  STAGE: "Event-отдел",
  CONTENT: "Контент"
};

export const ROLE_LABELS: Record<Role, string> = {
  READER: "Гость",
  MEMBER: "Участник",
  LEAD: "Отдел",
  ADMIN: "Администратор клуба"
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
  DATE_FIXED: "в момент фиксации даты",
  PHOTO_REPORT_ATTACHED: "когда прикреплён фотоотчёт",
  RETRO_SAVED: "когда заполнено ретро и посещаемость"
};

export const TASK_TRIGGER_EVENT_LABELS: Record<TaskTriggerEvent, string> = {
  DATE_FIXED: "Дата зафиксирована",
  SECURITY_SUBMITTED: "Заявка подана",
  SECURITY_ANSWERED: "Пропуск готов",
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

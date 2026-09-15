import type { AttachmentKind, DepartmentCode, EventStage, EventType, GuestStatus, Role, TaskGroup } from "@prisma/client";

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

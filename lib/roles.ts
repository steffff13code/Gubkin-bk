import type { DepartmentCode, Role } from "@prisma/client";

// Пять ролей клуба. Каждая роль — один служебный аккаунт (User.isRoleAccount),
// он же руководитель своего отдела: задачи отдела приходят роли автоматически.
// Чистые данные и функции — без базы, покрыты тестами.

export type RoleKey = "BOARD" | "GUESTS" | "PR" | "STAGE" | "CONTENT";

export type RoleInfo = {
  key: RoleKey;
  title: string;
  /** Одна строка «что делает» — на кнопке входа. */
  does: string;
  role: Role;
  needsPassword: boolean;
};

export const ROLES: RoleInfo[] = [
  {
    key: "GUESTS",
    title: "Внешний отдел",
    does: "Находит спикеров и ведёт их: лекции, кейсы, акселераторы, интенсивы",
    role: "LEAD",
    needsPassword: false
  },
  {
    key: "PR",
    title: "Пиар и пропуска",
    does: "Посты и анонсы, пропуск на спикера, бронь аудитории",
    role: "LEAD",
    needsPassword: false
  },
  {
    key: "STAGE",
    title: "Event-отдел",
    does: "План проведения, площадка, техника, люди на мероприятии",
    role: "LEAD",
    needsPassword: false
  },
  {
    key: "CONTENT",
    title: "Контент",
    does: "Рилсы, съёмка, фото, Инстаграм и ТикТок",
    role: "LEAD",
    needsPassword: false
  },
  {
    key: "BOARD",
    title: "Администратор клуба",
    does: "Руководство клуба: даты, проверка регистраций, итоги, настройки",
    role: "ADMIN",
    needsPassword: true
  }
];

export const ROLE_BY_KEY: Record<RoleKey, RoleInfo> = Object.fromEntries(ROLES.map((r) => [r.key, r])) as Record<
  RoleKey,
  RoleInfo
>;

export function isRoleKey(value: string): value is RoleKey {
  return value in ROLE_BY_KEY;
}

/** Роль пользователя: по отделу служебного аккаунта; администратор — всегда BOARD. */
export function roleKeyOf(user: { role: Role; departments: { code: DepartmentCode }[] } | null): RoleKey | null {
  if (!user) return null;
  if (user.role === "ADMIN") return "BOARD";
  const code = user.departments[0]?.code;
  return code && isRoleKey(code) ? code : null;
}

export type RightAction =
  | "VIEW"
  | "CREATE_EVENT"
  | "ADD_DATE_OPTIONS"
  | "FIX_DATE"
  | "PASS_DECISION"
  | "FINISH"
  | "CANCEL_DELETE"
  | "SETTINGS";

// Матрица прав из регламента v3. Закрытие задач — отдельно, см. canCloseTask.
const MATRIX: Record<RightAction, RoleKey[]> = {
  VIEW: ["BOARD", "GUESTS", "PR", "STAGE", "CONTENT"],
  CREATE_EVENT: ["BOARD", "GUESTS"],
  ADD_DATE_OPTIONS: ["BOARD", "PR"],
  FIX_DATE: ["BOARD", "GUESTS"],
  PASS_DECISION: ["BOARD", "PR"],
  FINISH: ["BOARD", "GUESTS"],
  CANCEL_DELETE: ["BOARD"],
  SETTINGS: ["BOARD"]
};

export function can(role: RoleKey | null, action: RightAction): boolean {
  return !!role && MATRIX[action].includes(role);
}

/** Задачу закрывает её отдел; администратор — любую; задачу без отдела — любая роль. */
export function canCloseTask(role: RoleKey | null, taskDepartment: DepartmentCode | null): boolean {
  if (!role) return false;
  if (role === "BOARD") return true;
  return taskDepartment === null || taskDepartment === role;
}

export const RIGHT_ERRORS: Record<RightAction, string> = {
  VIEW: "Нужно войти.",
  CREATE_EVENT: "Создавать мероприятия может Внешний отдел или Администратор клуба.",
  ADD_DATE_OPTIONS: "Варианты дат вносят Пиар или Администратор клуба.",
  FIX_DATE: "Дату фиксирует Внешний отдел или Администратор клуба.",
  PASS_DECISION: "Решение по пропуску отмечает Пиар или Администратор клуба.",
  FINISH: "Отметить проведённым и подвести итоги может Внешний отдел или Администратор клуба.",
  CANCEL_DELETE: "Отменять и удалять мероприятия может только Администратор клуба.",
  SETTINGS: "Настройки доступны только Администратору клуба."
};

export const ROLE_TITLE: Record<DepartmentCode, string> = {
  BOARD: "Администратор клуба",
  GUESTS: "Внешний отдел",
  PR: "Пиар и пропуска",
  STAGE: "Event-отдел",
  CONTENT: "Контент"
};

import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { can, canCloseTask, RIGHT_ERRORS, type RightAction } from "@/lib/roles";

// Серверные проверки прав. Сама матрица — чистая функция в lib/roles.ts (покрыта тестами),
// кнопки в интерфейсе спрашивают её же, поэтому видимое и разрешённое совпадают.

export class PermissionError extends Error {}

export function isAdmin(user: CurrentUser | null): boolean {
  return user?.roleKey === "BOARD";
}

export function userCan(user: CurrentUser | null, action: RightAction): boolean {
  return can(user?.roleKey ?? null, action);
}

export function userCanCloseTask(user: CurrentUser | null, task: { department: import("@prisma/client").DepartmentCode | null }) {
  return canCloseTask(user?.roleKey ?? null, task.department);
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new PermissionError("Нужно войти: выберите свою роль на странице входа.");
  return user;
}

export async function requireRight(action: RightAction): Promise<CurrentUser> {
  const user = await requireUser();
  if (!userCan(user, action)) throw new PermissionError(RIGHT_ERRORS[action]);
  return user;
}

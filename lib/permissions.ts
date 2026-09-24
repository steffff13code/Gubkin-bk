import type { Role } from "@prisma/client";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

const ROLE_RANK: Record<Role, number> = { READER: 0, MEMBER: 1, LEAD: 2, ADMIN: 3 };

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function isAdmin(user: CurrentUser | null): boolean {
  return user?.role === "ADMIN";
}

export function isLeadOrAdmin(user: CurrentUser | null): boolean {
  return !!user && roleAtLeast(user.role, "LEAD");
}

export function isMember(user: CurrentUser | null): boolean {
  return !!user && roleAtLeast(user.role, "MEMBER");
}

export function canManageEvent(
  user: CurrentUser | null,
  event: { leadId: string | null; createdById: string }
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "LEAD" && (event.leadId === user.id || event.createdById === user.id);
}

export class PermissionError extends Error {}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new PermissionError("Нужно войти: выберите себя на странице «Войти» и введите пароль роли.");
  return user;
}

export async function requireRole(min: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roleAtLeast(user.role, min)) {
    throw new PermissionError("Недостаточно прав для этого действия.");
  }
  return user;
}

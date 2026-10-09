import { cookies } from "next/headers";
import type { DepartmentCode, DepartmentPosition, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/session";
import { ROLE_BY_KEY, roleKeyOf, type RoleKey } from "@/lib/roles";

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  role: Role;
  departments: { code: DepartmentCode; position: DepartmentPosition }[];
  /** Роль клуба, под которой вошли. */
  roleKey: RoleKey | null;
  roleTitle: string;
  /** Подпись «как подписать вас в истории» — имя человека за ролью, если указал. */
  signer: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = verifySessionCookie(cookies().get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { departments: true }
  });
  if (!user || !user.isActive) return null;

  const departments = user.departments.map((d) => ({ code: d.departmentCode, position: d.position }));
  const roleKey = roleKeyOf({ role: user.role, departments });
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    photoUrl: user.photoUrl,
    role: user.role,
    departments,
    roleKey,
    roleTitle: roleKey ? ROLE_BY_KEY[roleKey].title : user.firstName,
    signer: session.signer
  };
}

export function displayName(u: { firstName: string; lastName: string | null }): string {
  return u.lastName ? `${u.firstName} ${u.lastName}` : u.firstName;
}

/** «Роль · имя» для истории: имя — подпись с устройства, если была. */
export function actorName(roleName: string, signer: string | null | undefined): string {
  return signer ? `${roleName} · ${signer}` : roleName;
}

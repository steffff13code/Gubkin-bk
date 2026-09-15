import { cookies } from "next/headers";
import type { DepartmentCode, DepartmentPosition, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/session";

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  role: Role;
  botStarted: boolean;
  departments: { code: DepartmentCode; position: DepartmentPosition }[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const userId = verifySessionCookie(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { departments: true }
  });
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    photoUrl: user.photoUrl,
    role: user.role,
    botStarted: user.botStarted,
    departments: user.departments.map((d) => ({ code: d.departmentCode, position: d.position }))
  };
}

export function displayName(u: { firstName: string; lastName: string | null }): string {
  return u.lastName ? `${u.firstName} ${u.lastName}` : u.firstName;
}

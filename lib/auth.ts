// Заглушка на время шага 1. Полная реализация — в lib/auth.ts шага 2
// (проверка Telegram Login Widget, подписанная cookie сессии).
import type { Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  role: Role;
  botStarted: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return null;
}

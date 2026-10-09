import { prisma } from "@/lib/db";
import { ROLES, type RoleKey } from "@/lib/roles";
import { getRoleAccount } from "@/lib/role-accounts";

export async function getAllTaskTemplates() {
  return prisma.taskTemplate.findMany({
    orderBy: [{ eventType: "asc" }, { group: "asc" }, { sortOrder: "asc" }]
  });
}

/** Сколько телеграм-подписчиков у каждой роли. */
export async function getRoleSubscriptionCounts(): Promise<Record<RoleKey, number>> {
  const counts = {} as Record<RoleKey, number>;
  for (const r of ROLES) {
    const account = await getRoleAccount(r.key);
    counts[r.key] = account ? await prisma.telegramSubscription.count({ where: { userId: account.id } }) : 0;
  }
  return counts;
}

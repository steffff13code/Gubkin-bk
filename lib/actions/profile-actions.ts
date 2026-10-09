"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/permissions";

/** Отключить подписку Telegram на уведомления этой роли. */
export async function removeSubscriptionAction(subscriptionId: string): Promise<void> {
  const user = await requireUser();
  await prisma.telegramSubscription.deleteMany({ where: { id: subscriptionId, userId: user.id } });
  redirect("/profile");
}

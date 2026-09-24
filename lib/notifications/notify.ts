import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/bot";
import { calendarDay } from "@/lib/time";

// Правила «тишины» — раздел 8, п. 8 ТЗ.
export const DAILY_EVENT_MESSAGE_CAP = 3;

export const NOTIFICATION_KIND = {
  DIGEST: "DIGEST",
  TASK_OVERDUE: "TASK_OVERDUE",
  EVENT_STUCK_LEAD: "EVENT_STUCK_LEAD",
  EVENT_STUCK_ADMIN: "EVENT_STUCK_ADMIN",
  STOPLIST: "STOPLIST",
  APPROVAL_NEEDED: "APPROVAL_NEEDED",
  STAGE_DECISION: "STAGE_DECISION"
} as const;

export type NotificationKind = (typeof NOTIFICATION_KIND)[keyof typeof NOTIFICATION_KIND];

async function countEventMessagesToday(userId: string, now: Date): Promise<number> {
  return prisma.notificationLog.count({
    where: {
      userId,
      kind: { not: NOTIFICATION_KIND.DIGEST },
      sentAt: { gte: calendarDay(now) }
    }
  });
}

export type NotifyResult = "sent" | "duplicate" | "capped" | "no_bot" | "failed";

/** Запись о попытке отправки — возвращается правилами, чтобы тик можно было проверить без Telegram. */
export type Delivery = {
  userId: string;
  kind: NotificationKind;
  dedupeKey: string;
  text: string;
  result: NotifyResult;
};

/**
 * Отправляет сообщение не более одного раза на dedupeKey, с учётом дневного
 * лимита в 3 событийных сообщения на человека (дайджест в лимит не входит).
 * В NotificationLog пишем только фактически доставленное: если бот ещё не
 * настроен или Telegram недоступен, сообщение уйдёт при следующем тике.
 */
export async function notifyOnce(
  userId: string,
  kind: NotificationKind,
  dedupeKey: string,
  text: string,
  now: Date = new Date()
): Promise<Delivery> {
  const delivery: Delivery = { userId, kind, dedupeKey, text, result: "failed" };

  const existing = await prisma.notificationLog.findUnique({ where: { dedupeKey } });
  if (existing) return { ...delivery, result: "duplicate" };

  if (kind !== NOTIFICATION_KIND.DIGEST) {
    const count = await countEventMessagesToday(userId, now);
    if (count >= DAILY_EVENT_MESSAGE_CAP) return { ...delivery, result: "capped" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.botStarted) return { ...delivery, result: "no_bot" };

  const sent = await sendTelegramMessage(user.telegramId, text);
  if (!sent) return delivery;

  await prisma.notificationLog.create({ data: { userId, kind, dedupeKey, sentAt: now } });
  return { ...delivery, result: "sent" };
}

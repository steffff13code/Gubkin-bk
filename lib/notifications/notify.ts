import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/bot";
import { calendarDay } from "@/lib/time";

// Правила «тишины» — не больше 3 событийных сообщений в день на подписчика (дайджест не считается).
export const DAILY_EVENT_MESSAGE_CAP = 3;

export const NOTIFICATION_KIND = {
  DIGEST: "DIGEST",
  TASK_OVERDUE: "TASK_OVERDUE",
  EVENT_STUCK_LEAD: "EVENT_STUCK_LEAD",
  EVENT_STUCK_ADMIN: "EVENT_STUCK_ADMIN",
  STOPLIST: "STOPLIST",
  STAGE_STEP: "STAGE_STEP"
} as const;

export type NotificationKind = (typeof NOTIFICATION_KIND)[keyof typeof NOTIFICATION_KIND];

export type NotifyResult = "sent" | "duplicate" | "capped" | "no_bot" | "failed";

/** Запись о попытке отправки — возвращается правилами, чтобы тик можно было проверить без Telegram. */
export type Delivery = {
  userId: string;
  kind: NotificationKind;
  dedupeKey: string;
  text: string;
  result: NotifyResult;
  /** Итог по каждому подписчику роли. */
  subscribers?: { subscriptionId: string; result: NotifyResult }[];
};

/** Итог по роли: «отправлено», если ушло хоть одному; иначе самый понятный из исходов. */
export function combineResults(results: NotifyResult[]): NotifyResult {
  if (results.length === 0) return "no_bot";
  for (const r of ["sent", "failed", "capped", "duplicate"] as NotifyResult[]) if (results.includes(r)) return r;
  return "no_bot";
}

async function sendToSubscription(
  sub: { id: string; telegramId: string },
  userId: string,
  kind: NotificationKind,
  dedupeKey: string,
  text: string,
  now: Date
): Promise<NotifyResult> {
  const key = `${dedupeKey}#${sub.id}`;
  if (await prisma.notificationLog.findUnique({ where: { dedupeKey: key } })) return "duplicate";
  if (kind !== NOTIFICATION_KIND.DIGEST) {
    const today = await prisma.notificationLog.count({
      where: { subscriptionId: sub.id, kind: { not: NOTIFICATION_KIND.DIGEST }, sentAt: { gte: calendarDay(now) } }
    });
    if (today >= DAILY_EVENT_MESSAGE_CAP) return "capped";
  }
  if (!(await sendTelegramMessage(sub.telegramId, text))) return "failed";
  await prisma.notificationLog.create({ data: { userId, subscriptionId: sub.id, kind, dedupeKey: key, sentAt: now } });
  return "sent";
}

/**
 * Отправляет сообщение роли (её служебному аккаунту) — всем, кто подписался на неё в Telegram.
 * Не чаще одного раза на dedupeKey для каждого подписчика. В журнал пишется только доставленное:
 * если бот не настроен или Telegram недоступен, сообщение уйдёт при следующем тике.
 */
export async function notifyOnce(
  userId: string,
  kind: NotificationKind,
  dedupeKey: string,
  text: string,
  now: Date = new Date()
): Promise<Delivery> {
  const subs = await prisma.telegramSubscription.findMany({ where: { userId } });
  const subscribers = [];
  for (const sub of subs) {
    subscribers.push({ subscriptionId: sub.id, result: await sendToSubscription(sub, userId, kind, dedupeKey, text, now) });
  }
  return { userId, kind, dedupeKey, text, result: combineResults(subscribers.map((s) => s.result)), subscribers };
}

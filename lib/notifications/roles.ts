import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/app-url";
import { formatDate } from "@/lib/time";
import { getRoleAccountId } from "@/lib/role-accounts";
import type { RoleKey } from "@/lib/roles";
import { notifyOnce, NOTIFICATION_KIND, type Delivery } from "@/lib/notifications/notify";

export type StepNotice = "CREATED" | "OPTIONS_READY" | "DATE_FIXED" | "PASS_READY" | "PASS_REJECTED";

/** Кому уходит уведомление о шаге регламента. */
export const STEP_RECIPIENTS: Record<StepNotice, RoleKey[]> = {
  CREATED: ["BOARD", "PR"],
  OPTIONS_READY: ["GUESTS"],
  DATE_FIXED: ["PR"],
  PASS_READY: ["STAGE", "CONTENT"],
  PASS_REJECTED: ["GUESTS", "BOARD"]
};

export async function notifyRole(role: RoleKey, dedupeKey: string, text: string): Promise<Delivery | null> {
  const userId = await getRoleAccountId(role);
  if (!userId) return null;
  return notifyOnce(userId, NOTIFICATION_KIND.STAGE_STEP, dedupeKey, text);
}

/** Уведомление о шаге регламента: текст строится по мероприятию, получатели — по шагу. */
export async function notifyStep(eventId: string, step: StepNotice, extra?: string): Promise<void> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;
  const link = appUrl() ? `\n${appUrl()}/events/${eventId}` : "";
  const date = event.targetDate ? `${formatDate(event.targetDate)}${event.timeSlot ? `, ${event.timeSlot}` : ""}` : "";
  const text = {
    CREATED: `Новый спикер: ${event.guestName ?? event.title}. Нужно подобрать 3–4 варианта даты, времени и аудитории.`,
    OPTIONS_READY: `Варианты дат для «${event.title}» готовы — согласуйте один со спикером.`,
    DATE_FIXED: `Дата «${event.title}» зафиксирована: ${date}${event.venue ? `, ${event.venue}` : ""}. Нужен пропуск на спикера в течение 2 дней.`,
    PASS_READY: `Пропуск на спикера «${event.title}» готов. Начинаем план проведения и съёмки.`,
    PASS_REJECTED: `Пропуск на спикера «${event.title}» не одобрен${extra ? `: ${extra}` : ""}. Сообщите спикеру.`
  }[step];
  for (const role of STEP_RECIPIENTS[step]) {
    try {
      await notifyRole(role, `step:${step}:${eventId}:${event.stageChangedAt.getTime()}:${role}`, text + link);
    } catch (e) {
      console.error("[notify] не удалось отправить уведомление о шаге", step, e);
    }
  }
}

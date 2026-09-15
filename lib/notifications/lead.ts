import { prisma } from "@/lib/db";
import { notifyOnce, NOTIFICATION_KIND } from "@/lib/notifications/notify";

/** Сообщение лиду мероприятия о решении администратора — push вместо ожидания, что лид сам зайдёт. */
export async function notifyLeadOfDecision(eventId: string, decision: "APPROVED" | "RETURNED" | "REJECTED", comment: string | null) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  if (!event.leadId) return;

  const appUrl = process.env.APP_URL || "";
  const wording = {
    APPROVED: "согласовано — можно фиксировать дату",
    RETURNED: "возвращено на доработку",
    REJECTED: "отклонено"
  }[decision];
  const text = `Мероприятие «${event.title}» ${wording}.${comment ? `\nКомментарий: ${comment}` : ""}\n${appUrl}/events/${eventId}`;

  await notifyOnce(
    event.leadId,
    NOTIFICATION_KIND.STAGE_DECISION,
    `decision:${eventId}:${decision}:${event.stageChangedAt.getTime()}`,
    text
  );
}

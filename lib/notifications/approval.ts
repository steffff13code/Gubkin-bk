import { appUrl as getAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { notifyOnce, NOTIFICATION_KIND } from "@/lib/notifications/notify";

/** Раздел 8, п. 5: переход в APPROVAL → администраторам, со ссылкой на карточку. */
export async function notifyAdminsOfApproval(eventId: string): Promise<void> {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true } });
  const appUrl = getAppUrl();
  const text = `Мероприятие «${event.title}» отправлено на согласование.\n${appUrl}/events/${eventId}`;

  for (const admin of admins) {
    await notifyOnce(
      admin.id,
      NOTIFICATION_KIND.APPROVAL_NEEDED,
      `approval:${eventId}:${event.stageChangedAt.getTime()}`,
      text
    );
  }
}

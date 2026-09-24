import type { EventStage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, daysBetween } from "@/lib/time";
import { EVENT_STAGE_LABELS } from "@/lib/labels";
import { notifyOnce, NOTIFICATION_KIND, type Delivery } from "@/lib/notifications/notify";

const STUCK_STAGES: EventStage[] = ["APPROVAL", "PLANNING", "IN_PROGRESS"];

/** Раздел 8, п. 3: «застряло» — 7 дней без движения → лиду, 14 дней → администраторам. */
export async function runStuckCheck(now: Date = new Date()): Promise<Delivery[]> {
  const events = await prisma.event.findMany({ where: { stage: { in: STUCK_STAGES } } });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true } });
  const deliveries: Delivery[] = [];

  for (const event of events) {
    const ageDays = daysBetween(event.stageChangedAt, now);
    if (ageDays < 7) continue;

    const recentDone = await prisma.task.count({
      where: { eventId: event.id, status: "DONE", completedAt: { gte: addDays(now, -7) } }
    });
    if (recentDone > 0) continue;

    const stageLabel = EVENT_STAGE_LABELS[event.stage];

    if (ageDays >= 14) {
      const text = `Мероприятие «${event.title}» стоит на стадии «${stageLabel}» больше 14 дней без движения.`;
      for (const admin of admins) {
        deliveries.push(
          await notifyOnce(admin.id, NOTIFICATION_KIND.EVENT_STUCK_ADMIN, `stuck-admin:${event.id}:${event.stageChangedAt.getTime()}`, text, now)
        );
      }
    } else if (event.leadId) {
      const text = `Мероприятие «${event.title}» стоит на стадии «${stageLabel}» больше недели без закрытых задач.`;
      deliveries.push(
        await notifyOnce(event.leadId, NOTIFICATION_KIND.EVENT_STUCK_LEAD, `stuck-lead:${event.id}:${event.stageChangedAt.getTime()}`, text, now)
      );
    }
  }
  return deliveries;
}

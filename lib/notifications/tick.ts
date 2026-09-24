import { runOverdueCheck } from "@/lib/notifications/overdue";
import { runStuckCheck } from "@/lib/notifications/stuck";
import { runStoplistCheck } from "@/lib/notifications/stoplist";
import { runDigest } from "@/lib/notifications/digest";
import type { Delivery } from "@/lib/notifications/notify";

function currentMoscowHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Moscow", hour: "2-digit", hourCycle: "h23" }).format(now)
  );
}

export type TickReport = {
  at: string;
  ranDigest: boolean;
  deliveries: Delivery[];
  summary: Record<string, number>;
};

/** Один тик автоматизации — раз в час джобой либо вручную из /api/cron/run (forceDigest — для проверки). */
export async function runAutomationTick(now: Date = new Date(), forceDigest = false): Promise<TickReport> {
  const deliveries: Delivery[] = [];
  deliveries.push(...(await runOverdueCheck(now)));
  deliveries.push(...(await runStuckCheck(now)));
  deliveries.push(...(await runStoplistCheck(now)));

  const ranDigest = forceDigest || currentMoscowHour(now) === 9;
  if (ranDigest) deliveries.push(...(await runDigest(now)));

  const summary: Record<string, number> = {};
  for (const d of deliveries) summary[`${d.kind}:${d.result}`] = (summary[`${d.kind}:${d.result}`] ?? 0) + 1;

  return { at: now.toISOString(), ranDigest, deliveries, summary };
}

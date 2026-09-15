import { runOverdueCheck } from "@/lib/notifications/overdue";
import { runStuckCheck } from "@/lib/notifications/stuck";
import { runStoplistCheck } from "@/lib/notifications/stoplist";
import { runDigest } from "@/lib/notifications/digest";

function currentMoscowHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Moscow", hour: "2-digit", hourCycle: "h23" }).format(now)
  );
}

/** Один тик автоматизации — запускается раз в час джобой, либо вручную из /api/cron/run. */
export async function runAutomationTick(now: Date = new Date()) {
  await runOverdueCheck(now);
  await runStuckCheck(now);
  await runStoplistCheck(now);

  const ranDigest = currentMoscowHour(now) === 9;
  if (ranDigest) {
    await runDigest(now);
  }

  return { at: now.toISOString(), ranDigest };
}

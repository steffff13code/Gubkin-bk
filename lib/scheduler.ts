import cron from "node-cron";
import { runAutomationTick } from "@/lib/notifications/tick";

declare global {
  // eslint-disable-next-line no-var
  var __gbcSchedulerStarted: boolean | undefined;
}

/** Регистрирует часовую джобу автоматизации. Защищено от повторной регистрации при hot-reload. */
export function startScheduler(): void {
  if (globalThis.__gbcSchedulerStarted) return;
  globalThis.__gbcSchedulerStarted = true;

  cron.schedule(
    "0 * * * *",
    () => {
      runAutomationTick().catch((e) => console.error("[scheduler] тик автоматизации завершился ошибкой", e));
    },
    { timezone: "Europe/Moscow" }
  );

  console.log("[scheduler] джоба автоматизации зарегистрирована (раз в час, Europe/Moscow)");
}

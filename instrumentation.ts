// Next.js instrumentation hook — выполняется один раз при старте серверного процесса.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_SCHEDULER !== "true") return;

  const { startScheduler } = await import("@/lib/scheduler");
  const { startBotPolling } = await import("@/lib/bot");

  startScheduler();
  startBotPolling();
}

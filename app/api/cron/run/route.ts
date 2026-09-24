import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { runAutomationTick } from "@/lib/notifications/tick";

// Ручной запуск джобы автоматизации — для проверки уведомлений (раздел 14 ТЗ).
// Только администратор. ?digest=1 — сформировать дайджест вне 09:00.
// В ответе — что именно и кому система пыталась отправить, с результатом:
// sent / duplicate / capped (лимит 3 в день) / no_bot (человек не нажал /start) / failed.
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
  } catch {
    return NextResponse.json({ error: "Требуются права администратора." }, { status: 403 });
  }

  const forceDigest = req.nextUrl.searchParams.get("digest") === "1";
  const report = await runAutomationTick(new Date(), forceDigest);
  return NextResponse.json({ ok: true, ...report });
}

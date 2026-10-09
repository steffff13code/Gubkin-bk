import { NextRequest, NextResponse } from "next/server";
import { requireRight } from "@/lib/permissions";
import { runAutomationTick } from "@/lib/notifications/tick";

// Ручной запуск джобы автоматизации — для проверки уведомлений (раздел 14 ТЗ).
// Только администратор. ?digest=1 — сформировать дайджест вне 09:00.
// В ответе — что именно и кому система пыталась отправить, с результатом:
// sent / duplicate / capped (лимит 3 в день на подписчика) / no_bot (на роль никто не подписан) / failed.
export async function POST(req: NextRequest) {
  try {
    await requireRight("SETTINGS");
  } catch {
    return NextResponse.json({ error: "Нужны права администратора клуба." }, { status: 403 });
  }

  const forceDigest = req.nextUrl.searchParams.get("digest") === "1";
  const report = await runAutomationTick(new Date(), forceDigest);
  return NextResponse.json({ ok: true, ...report });
}

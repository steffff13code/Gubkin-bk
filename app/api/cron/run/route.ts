import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { runAutomationTick } from "@/lib/notifications/tick";

// Ручной запуск джобы автоматизации — для проверки уведомлений (раздел 14 ТЗ).
// Доступен только администратору.
export async function POST() {
  try {
    await requireRole("ADMIN");
  } catch {
    return NextResponse.json({ error: "Требуются права администратора." }, { status: 403 });
  }

  const result = await runAutomationTick();
  return NextResponse.json({ ok: true, result });
}

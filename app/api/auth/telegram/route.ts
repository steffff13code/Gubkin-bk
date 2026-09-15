import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTelegramAuth } from "@/lib/telegram-verify";
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken || !verifyTelegramAuth(url.searchParams, botToken)) {
    return NextResponse.redirect(new URL("/login?error=1", url));
  }

  const telegramId = url.searchParams.get("id")!;
  const firstName = url.searchParams.get("first_name") || "Без имени";
  const lastName = url.searchParams.get("last_name");
  const username = url.searchParams.get("username");
  const photoUrl = url.searchParams.get("photo_url");

  const adminIds = (process.env.ADMIN_TELEGRAM_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isAdminId = adminIds.includes(telegramId);

  const existing = await prisma.user.findUnique({ where: { telegramId } });

  const user = await prisma.user.upsert({
    where: { telegramId },
    create: {
      telegramId,
      firstName,
      lastName,
      username,
      photoUrl,
      role: isAdminId ? "ADMIN" : "MEMBER"
    },
    update: {
      firstName,
      lastName,
      username,
      photoUrl,
      ...(isAdminId && existing?.role !== "ADMIN" ? { role: "ADMIN" as const } : {})
    }
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: "LOGIN" }
  });

  const res = NextResponse.redirect(new URL("/", url));
  res.cookies.set(SESSION_COOKIE_NAME, createSessionCookie(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });
  return res;
}

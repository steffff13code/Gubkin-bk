import crypto from "node:crypto";

// Простая подписанная cookie-сессия: base64url(payload) + "." + HMAC-SHA256(payload).
// Без внешних JWT-библиотек — нам нужен только userId и срок действия.

export const SESSION_COOKIE_NAME = "gbc_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 дней

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error("SESSION_SECRET не задан — заполните .env");
  }
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionCookie(userId: string): string {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + SESSION_MAX_AGE * 1000 });
  const b64 = Buffer.from(payload).toString("base64url");
  return `${b64}.${sign(b64)}`;
}

export function verifySessionCookie(token: string | undefined | null): string | null {
  if (!token) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;

  const expected = sign(b64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf-8")) as {
      uid: string;
      exp: number;
    };
    if (payload.exp < Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

/**
 * Код для привязки Telegram к аккаунту: t.me/<бот>?start=<код>. Telegram разрешает
 * в payload до 64 символов [A-Za-z0-9_-]; cuid (~25) + "_" + 16 символов подписи.
 */
export function createTelegramLinkToken(userId: string): string {
  return `${userId}_${sign(`tg-link:${userId}`).replace(/[^A-Za-z0-9]/g, "").slice(0, 16)}`;
}

export function verifyTelegramLinkToken(token: string): string | null {
  const idx = token.lastIndexOf("_");
  if (idx <= 0) return null;
  const userId = token.slice(0, idx);
  const expected = createTelegramLinkToken(userId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? userId : null;
}

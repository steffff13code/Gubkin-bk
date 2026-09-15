import crypto from "node:crypto";

// Проверка подписи Telegram Login Widget.
// https://core.telegram.org/widgets/login#checking-authorization

const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24; // сутки — защита от повторной подстановки старых данных

export function verifyTelegramAuth(params: URLSearchParams, botToken: string): boolean {
  const hash = params.get("hash");
  if (!hash) return false;

  const data: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key !== "hash") data[key] = value;
  });
  if (!data.id || !data.auth_date) return false;

  const checkString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  const a = Buffer.from(computedHash);
  const b = Buffer.from(hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const authDate = Number(data.auth_date);
  const ageSeconds = Date.now() / 1000 - authDate;
  return ageSeconds >= 0 && ageSeconds < MAX_AUTH_AGE_SECONDS;
}

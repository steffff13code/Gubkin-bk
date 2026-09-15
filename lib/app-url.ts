/** Публичный адрес приложения: APP_URL из .env, иначе адрес, который выдаёт Render. */
export function appUrl(): string {
  return (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
}

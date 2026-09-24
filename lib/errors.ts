/** Технические ошибки базы людям не показываем — только понятный текст. */
export function friendlyError(e: unknown, fallback = "Не удалось выполнить действие."): string {
  if (!(e instanceof Error)) return fallback;
  if (e.name.startsWith("PrismaClient") || e.message.includes("prisma.")) {
    return "Не удалось сохранить: проверьте заполненные поля и попробуйте ещё раз.";
  }
  return e.message;
}

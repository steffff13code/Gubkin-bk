import { Bot } from "grammy";
import { prisma } from "@/lib/db";
import { verifyTelegramLinkToken } from "@/lib/session";

let botInstance: Bot | null = null;

/** Единый инстанс grammY-бота на процесс. Возвращает null, если токен не задан. */
export function getBot(): Bot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  if (botInstance) return botInstance;

  botInstance = new Bot(token);

  botInstance.command("start", async (ctx) => {
    const telegramId = ctx.from?.id ? String(ctx.from.id) : null;
    if (!telegramId) return;
    const username = ctx.from?.username ?? null;
    const payload = typeof ctx.match === "string" ? ctx.match.trim() : "";

    // Привязка по персональной ссылке из профиля на сайте.
    const userId = payload ? verifyTelegramLinkToken(payload) : null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        await ctx.reply("Не нашёл ваш аккаунт. Откройте профиль на сайте и нажмите «Подключить Telegram» ещё раз.");
        return;
      }
      // Один Telegram — один человек: отвязываем от прежнего аккаунта, если был.
      await prisma.user.updateMany({ where: { telegramId, NOT: { id: userId } }, data: { telegramId: null, botStarted: false } });
      await prisma.user.update({ where: { id: userId }, data: { telegramId, username, botStarted: true } });
      await ctx.reply(
        `Готово, ${user.firstName}! Теперь сюда будут приходить напоминания о ваших задачах и мероприятиях Бизнес-клуба Губкина.`
      );
      return;
    }

    // Уже привязан — просто включаем уведомления.
    const linked = await prisma.user.findUnique({ where: { telegramId } });
    if (linked) {
      await prisma.user.update({ where: { id: linked.id }, data: { botStarted: true, username } });
      await ctx.reply(`Уведомления включены, ${linked.firstName}.`);
      return;
    }

    await ctx.reply(
      "Чтобы получать напоминания, войдите на сайт платформы, откройте «Профиль» и нажмите «Подключить Telegram»."
    );
  });

  return botInstance;
}

/** true — доставлено; false — бот не настроен или Telegram отказал (запись в лог не делаем, попробуем в следующий тик). */
export async function sendTelegramMessage(telegramId: string, text: string): Promise<boolean> {
  // Сухой прогон для локальной проверки правил без бота: считаем доставленным, печатаем в консоль.
  if (process.env.TELEGRAM_DRY_RUN === "1") {
    console.log(`[telegram dry-run] → ${telegramId}: ${text.replace(/\n/g, " | ")}`);
    return true;
  }
  const bot = getBot();
  if (!bot) return false;
  try {
    await bot.api.sendMessage(telegramId, text);
    return true;
  } catch (e) {
    console.error(`Не удалось отправить сообщение в Telegram (${telegramId}):`, e);
    return false;
  }
}

export function startBotPolling(): void {
  const bot = getBot();
  if (!bot) {
    console.warn("[bot] TELEGRAM_BOT_TOKEN не задан — бот не запущен.");
    return;
  }
  bot.start({ onStart: () => console.log("[bot] запущен (long polling)") });
}

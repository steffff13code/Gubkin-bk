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
    const label = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name ?? null;
    const payload = typeof ctx.match === "string" ? ctx.match.trim() : "";

    // Подписка на уведомления роли по ссылке из профиля на сайте. На одну роль — сколько угодно человек;
    // один Telegram подписан на одну роль (переподключение переносит подписку).
    const userId = payload ? verifyTelegramLinkToken(payload) : null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isActive) {
        await ctx.reply("Не нашёл роль. Откройте профиль на сайте и нажмите «Подключить Telegram» ещё раз.");
        return;
      }
      await prisma.telegramSubscription.upsert({
        where: { telegramId },
        create: { userId, telegramId, label },
        update: { userId, label }
      });
      await ctx.reply(`Готово! Теперь сюда будут приходить уведомления роли «${user.firstName}». Отключить — команда /stop.`);
      return;
    }

    const sub = await prisma.telegramSubscription.findUnique({ where: { telegramId }, include: { user: true } });
    if (sub) {
      await ctx.reply(`Вы получаете уведомления роли «${sub.user.firstName}». Отключить — команда /stop.`);
      return;
    }
    await ctx.reply("Чтобы получать уведомления, войдите на сайт под своей ролью, откройте «Профиль» и нажмите «Подключить Telegram».");
  });

  botInstance.command("stop", async (ctx) => {
    const telegramId = ctx.from?.id ? String(ctx.from.id) : null;
    if (!telegramId) return;
    const removed = await prisma.telegramSubscription.deleteMany({ where: { telegramId } });
    await ctx.reply(removed.count ? "Уведомления отключены." : "Вы и так не подписаны.");
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

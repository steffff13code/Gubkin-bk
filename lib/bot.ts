import { Bot } from "grammy";
import { prisma } from "@/lib/db";

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

    const firstName = ctx.from?.first_name || "Без имени";
    const lastName = ctx.from?.last_name ?? null;
    const username = ctx.from?.username ?? null;

    await prisma.user.upsert({
      where: { telegramId },
      create: { telegramId, firstName, lastName, username, role: "MEMBER", botStarted: true },
      update: { botStarted: true, firstName, lastName, username }
    });

    await ctx.reply(
      "Готово! Теперь вы будете получать напоминания о задачах и мероприятиях Бизнес-клуба Губкина."
    );
  });

  return botInstance;
}

export async function sendTelegramMessage(telegramId: string, text: string): Promise<void> {
  const bot = getBot();
  if (!bot) return;
  try {
    await bot.api.sendMessage(telegramId, text);
  } catch (e) {
    console.error(`Не удалось отправить сообщение в Telegram (${telegramId}):`, e);
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

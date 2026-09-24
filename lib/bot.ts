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

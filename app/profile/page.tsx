import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createTelegramLinkToken } from "@/lib/session";
import { ROLE_BY_KEY } from "@/lib/roles";
import { removeSubscriptionAction } from "@/lib/actions/profile-actions";
import { logoutAction } from "@/lib/actions/auth-actions";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");
  const subs = await prisma.telegramSubscription.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const linkUrl = botUsername ? `https://t.me/${botUsername}?start=${createTelegramLinkToken(user.id)}` : null;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{user.roleTitle}</h1>
        <p className="mt-1 text-sm text-muted">
          {user.roleKey ? ROLE_BY_KEY[user.roleKey].does : ""}
          {user.signer && ` · подписываетесь как «${user.signer}»`}
        </p>
      </div>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-bold text-ink">Уведомления роли в Telegram</h2>
        <p className="mb-3 text-sm text-muted">
          Подключиться могут несколько человек — уведомления роли приходят каждому. Утром в 9:00 — сводка задач,
          в течение дня — шаги регламента и просрочки.
        </p>
        <p className="mb-3 text-sm text-ink">
          Подключено: <strong>{subs.length}</strong>
        </p>
        {subs.length > 0 && (
          <ul className="mb-4 divide-y divide-line rounded-lg border border-line">
            {subs.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-ink">{s.label ?? "без ника"}</span>
                <form action={removeSubscriptionAction.bind(null, s.id)}>
                  <button type="submit" className="text-xs text-muted underline hover:text-danger">
                    Отключить
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {linkUrl ? (
          <div className="space-y-2">
            <a
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-bg hover:bg-gold/90"
            >
              Подключить Telegram
            </a>
            <p className="text-xs text-muted">Откроется бот — нажмите «Запустить» (Start). Отключить себя — команда /stop в боте.</p>
          </div>
        ) : (
          <p className="text-sm text-muted">Бот ещё не подключён к платформе: нужен токен бота в настройках сервера.</p>
        )}
      </section>

      <form action={logoutAction}>
        <button type="submit" className="w-full rounded-lg border border-line px-4 py-3 text-sm font-bold text-ink hover:border-gold">
          Сменить роль
        </button>
      </form>
    </div>
  );
}

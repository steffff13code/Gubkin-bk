import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, displayName } from "@/lib/auth";
import { createTelegramLinkToken } from "@/lib/session";
import { DEPARTMENT_LABELS, DEPARTMENT_POSITION_LABELS, ROLE_LABELS } from "@/lib/labels";
import { disconnectTelegramAction, updateProfileAction } from "@/lib/actions/profile-actions";
import { Avatar } from "@/components/avatar";

export default async function ProfilePage({ searchParams }: { searchParams: { error?: string; saved?: string } }) {
  const current = await getCurrentUser();
  if (!current) redirect("/login?next=/profile");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: current.id }, include: { departments: true } });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const linkUrl = botUsername ? `https://t.me/${botUsername}?start=${createTelegramLinkToken(user.id)}` : null;
  const input = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={displayName(user)} size={56} />
        <div>
          <h1 className="text-2xl font-bold text-ink">{displayName(user)}</h1>
          <p className="text-sm text-muted">
            {ROLE_LABELS[user.role]}
            {user.departments.length > 0 &&
              " · " +
                user.departments
                  .map((d) => `${DEPARTMENT_LABELS[d.departmentCode]} (${DEPARTMENT_POSITION_LABELS[d.position].toLowerCase()})`)
                  .join(", ")}
          </p>
        </div>
      </div>

      {searchParams.error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
      )}
      {searchParams.saved && (
        <p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">Сохранено.</p>
      )}

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-bold text-ink">Уведомления в Telegram</h2>
        <p className="mb-3 text-sm text-muted">
          Бот присылает утренний дайджест в 9:00, напоминания о просроченных задачах и решения по вашим мероприятиям.
        </p>
        {user.botStarted && user.telegramId ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-bold text-success">
              Подключено{user.username ? ` · @${user.username}` : ""}
            </span>
            <form action={disconnectTelegramAction}>
              <button type="submit" className="text-sm text-muted underline hover:text-danger">
                Отключить
              </button>
            </form>
          </div>
        ) : linkUrl ? (
          <div className="space-y-2">
            <a
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg hover:bg-gold/90"
            >
              Подключить Telegram
            </a>
            <p className="text-xs text-muted">
              Откроется бот — нажмите в нём «Запустить» (Start). После этого обновите эту страницу.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Бот ещё не подключён к платформе — его подключает руководитель клуба (токен бота в настройках сервера).</p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold text-ink">Как вас зовут</h2>
        <form action={updateProfileAction} className="grid gap-3 sm:grid-cols-2">
          <input name="firstName" defaultValue={user.firstName} placeholder="Имя" required className={input} />
          <input name="lastName" defaultValue={user.lastName ?? ""} placeholder="Фамилия" className={input} />
          <button type="submit" className="rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink hover:border-gold sm:col-span-2 sm:justify-self-start">
            Сохранить
          </button>
        </form>
      </section>

      <p className="text-sm text-muted">
        Роль и отделы меняет руководитель клуба в{" "}
        {current.role === "ADMIN" ? (
          <Link href="/settings" className="underline hover:text-ink">
            настройках
          </Link>
        ) : (
          "настройках"
        )}
        .
      </p>
    </div>
  );
}

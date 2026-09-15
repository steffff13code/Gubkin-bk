import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { displayName } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";

const NAV = [
  { href: "/", label: "Поток" },
  { href: "/my", label: "Мой день" },
  { href: "/regulations", label: "Регламенты" },
  { href: "/ideas", label: "Идеи" }
];

export function SiteHeader({ user }: { user: CurrentUser | null }) {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold text-ink">
            Бизнес-клуб Губкина
          </Link>
          <nav className="hidden gap-5 sm:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-muted hover:text-ink">
                {item.label}
              </Link>
            ))}
            {user?.role === "ADMIN" && (
              <Link href="/settings" className="text-sm text-muted hover:text-ink">
                Настройки
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-ink">{displayName(user)}</span>
                <form action={logoutAction}>
                  <button type="submit" className="text-sm text-muted hover:text-ink">
                    Выйти
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded border border-line px-3 py-1.5 text-sm text-ink hover:border-gold"
              >
                Войти через Telegram
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-4 border-t border-line px-4 py-2 text-sm sm:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted hover:text-ink">
              {item.label}
            </Link>
          ))}
        </div>
      </header>
      {user && !user.botStarted && botUsername && (
        <div className="bg-gold/15 px-4 py-2 text-center text-sm text-ink">
          Чтобы получать напоминания, нажмите{" "}
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noreferrer"
            className="font-bold underline"
          >
            /start у бота
          </a>
          .
        </div>
      )}
    </>
  );
}

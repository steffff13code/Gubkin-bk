import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { displayName } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Avatar } from "@/components/avatar";
import { BellIcon, ChevronDownIcon, SearchIcon } from "@/components/icons";

export function Topbar({ user }: { user: CurrentUser | null }) {
  return (
    <div className="flex items-center gap-3 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur sm:px-6">
      <div className="relative flex-1 max-w-xl">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Поиск по мероприятиям, людям, тегам..."
          disabled
          className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted disabled:cursor-default"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {user ? (
          <>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted hover:text-ink"
            >
              <BellIcon className="h-5 w-5" />
              {!user.botStarted && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold" />}
            </button>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2">
                <Avatar name={displayName(user)} size={32} />
                <span className="hidden text-sm text-ink sm:inline">{user.firstName}</span>
                <ChevronDownIcon className="h-3.5 w-3.5 text-muted" />
              </summary>
              <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-line bg-surface p-2 shadow-glow">
                {!user.botStarted && (
                  <p className="mb-2 rounded bg-gold/10 px-2 py-1.5 text-xs text-ink">
                    Нажмите{" "}
                    <a
                      href={`https://t.me/${process.env.TELEGRAM_BOT_USERNAME ?? ""}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline"
                    >
                      /start у бота
                    </a>
                    , чтобы получать напоминания.
                  </p>
                )}
                <form action={logoutAction}>
                  <button type="submit" className="w-full rounded px-2 py-1.5 text-left text-sm text-muted hover:bg-surface2 hover:text-ink">
                    Выйти
                  </button>
                </form>
              </div>
            </details>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-ink hover:border-gold"
          >
            Войти через Telegram
          </Link>
        )}
      </div>
    </div>
  );
}

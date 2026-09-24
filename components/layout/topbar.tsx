import Link from "next/link";
import Image from "next/image";
import type { CurrentUser } from "@/lib/auth";
import { displayName } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth-actions";
import { ROLE_LABELS } from "@/lib/labels";
import { Avatar } from "@/components/avatar";
import { ChevronDownIcon } from "@/components/icons";
import { NavTabs } from "@/components/layout/nav-tabs";

/** Шапка: логотип, два раздела, профиль. Одна строка и на телефоне, и на компьютере. */
export function Topbar({
  user,
  overdueCount,
  defaultPasswordRoles
}: {
  user: CurrentUser | null;
  overdueCount: number;
  defaultPasswordRoles: string[];
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" title="Бизнес-клуб Губкина">
          <Image src="/logo.jpg" alt="" width={32} height={32} className="rounded-full" />
          <span className="hidden text-sm font-bold uppercase leading-tight tracking-wide text-ink md:block">
            Бизнес-клуб
            <br />
            Губкина
          </span>
        </Link>

        {user && <NavTabs overdueCount={overdueCount} showPeople={user.role === "ADMIN"} />}

        <div className="ml-auto flex items-center">
          {user ? (
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-1.5">
                <Avatar name={displayName(user)} size={32} />
                <ChevronDownIcon className="h-3.5 w-3.5 text-muted" />
              </summary>
              <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-lg border border-line bg-surface p-2 shadow-glow">
                <p className="px-2 pt-1 text-sm font-bold text-ink">{displayName(user)}</p>
                <p className="px-2 pb-2 text-xs text-muted">{ROLE_LABELS[user.role]}</p>
                <Link href="/profile" className="block rounded px-2 py-2 text-sm text-ink hover:bg-surface2">
                  Профиль и Telegram
                </Link>
                <form action={logoutAction}>
                  <button type="submit" className="w-full rounded px-2 py-2 text-left text-sm text-ink hover:bg-surface2">
                    Выйти
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <Link href="/login" className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg hover:bg-gold/90">
              Войти
            </Link>
          )}
        </div>
      </div>

      {user?.role === "ADMIN" && defaultPasswordRoles.length > 0 && (
        <div className="border-t border-danger/30 bg-danger/10 px-4 py-2 text-center text-sm text-ink">
          Пароли ролей стоят по умолчанию.{" "}
          <Link href="/settings?tab=access" className="font-bold underline">
            Смените их
          </Link>{" "}
          перед тем, как раздавать доступ.
        </div>
      )}
    </header>
  );
}

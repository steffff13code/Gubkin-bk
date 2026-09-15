import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Поток" },
  { href: "/my", label: "Мой день" },
  { href: "/regulations", label: "Регламенты" },
  { href: "/ideas", label: "Идеи" }
];

export function SiteHeader({ user }: { user: CurrentUser | null }) {
  return (
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
        <div>
          {user ? (
            <span className="text-sm text-ink">{user.firstName}</span>
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
    </header>
  );
}

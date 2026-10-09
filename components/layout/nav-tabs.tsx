"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

/** Главное меню. Счётчик на «Мои задачи» — сколько просрочено у роли. */
export function NavTabs({ overdueCount, showSettings }: { overdueCount: number; showSettings: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Мероприятия", short: "События", active: pathname === "/" || pathname.startsWith("/events") },
    { href: "/my", label: "Мои задачи", short: "Задачи", active: pathname.startsWith("/my"), badge: overdueCount },
    { href: "/regulation", label: "Регламент", short: "Регламент", active: pathname.startsWith("/regulation") },
    ...(showSettings ? [{ href: "/settings", label: "Настройки", short: "Настр.", active: pathname.startsWith("/settings") }] : [])
  ];
  return (
    <nav className="flex min-w-0 gap-0.5 overflow-x-auto sm:gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            "relative flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-sm font-bold sm:px-3",
            item.active ? "bg-surface2 text-ink" : "text-muted hover:text-ink"
          )}
        >
          <span className="sm:hidden">{item.short}</span>
          <span className="hidden sm:inline">{item.label}</span>
          {!!item.badge && (
            <span
              title={`Просрочено: ${item.badge}`}
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white"
            >
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

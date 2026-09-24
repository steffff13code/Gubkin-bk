"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

/** Главное меню — всего два раздела. Счётчик на «Мои задачи» — сколько просрочено. */
export function NavTabs({ overdueCount, showPeople }: { overdueCount: number; showPeople: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Мероприятия", active: pathname === "/" || pathname.startsWith("/events") },
    { href: "/my", label: "Мои задачи", active: pathname.startsWith("/my"), badge: overdueCount },
    ...(showPeople ? [{ href: "/settings", label: "Люди", active: pathname.startsWith("/settings") }] : [])
  ];
  return (
    <nav className="flex gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold sm:px-4",
            item.active ? "bg-surface2 text-ink" : "text-muted hover:text-ink"
          )}
        >
          {item.label}
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

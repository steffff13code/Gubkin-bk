"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Поток" },
  { href: "/my", label: "Мой день" },
  { href: "/regulations", label: "Регламенты" },
  { href: "/ideas", label: "Идеи" }
];

export function MobileNav({ showSettings }: { showSettings: boolean }) {
  const pathname = usePathname();
  const items = showSettings ? [...NAV, { href: "/settings", label: "Настройки" }] : NAV;
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line bg-surface/60 px-3 py-2 text-sm lg:hidden">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "shrink-0 rounded-lg px-3 py-1.5",
              active ? "bg-accent/15 font-bold text-ink" : "text-muted hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

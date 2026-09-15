"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarIcon, DocIcon, GearIcon, GridIcon, LightbulbIcon } from "@/components/icons";

const NAV = [
  { href: "/", label: "Поток", icon: GridIcon },
  { href: "/my", label: "Мой день", icon: CalendarIcon },
  { href: "/regulations", label: "Регламенты", icon: DocIcon },
  { href: "/ideas", label: "Идеи", icon: LightbulbIcon }
];

export function Sidebar({ showSettings }: { showSettings: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface/60 px-4 py-5 lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <Image src="/logo.jpg" alt="" width={40} height={40} className="rounded-full" />
        <span className="text-sm font-bold uppercase leading-tight tracking-wide text-ink">
          Губкинский
          <br />
          бизнес
          <br />
          клуб
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                active ? "bg-accent/15 font-bold text-ink" : "text-muted hover:bg-surface2 hover:text-ink"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        {showSettings && (
          <Link
            href="/settings"
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
              pathname.startsWith("/settings") ? "bg-accent/15 font-bold text-ink" : "text-muted hover:bg-surface2 hover:text-ink"
            )}
          >
            <GearIcon className="h-5 w-5" />
            Настройки
          </Link>
        )}
      </nav>

      <div className="mt-auto space-y-2 border-t border-line pt-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted/60">
          Люди
          <br />
          Проекты
          <br />
          Возможности
        </p>
      </div>
    </aside>
  );
}

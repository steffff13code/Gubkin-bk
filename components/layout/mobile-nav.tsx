import Link from "next/link";

const NAV = [
  { href: "/", label: "Поток" },
  { href: "/my", label: "Мой день" },
  { href: "/regulations", label: "Регламенты" },
  { href: "/ideas", label: "Идеи" }
];

export function MobileNav({ showSettings }: { showSettings: boolean }) {
  return (
    <div className="flex gap-4 overflow-x-auto border-b border-line bg-surface/60 px-4 py-2 text-sm lg:hidden">
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} className="shrink-0 text-muted hover:text-ink">
          {item.label}
        </Link>
      ))}
      {showSettings && (
        <Link href="/settings" className="shrink-0 text-muted hover:text-ink">
          Настройки
        </Link>
      )}
    </div>
  );
}

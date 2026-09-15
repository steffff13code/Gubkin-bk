import type { Metadata } from "next";
import { Golos_Text } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-golos"
});

export const metadata: Metadata = {
  title: "Бизнес-клуб Губкина — платформа организаторов",
  description: "Рабочее место организатора мероприятий Бизнес-клуба"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const admin = isAdmin(user);

  return (
    <html lang="ru" className={golos.variable}>
      <body className="relative min-h-screen bg-bg font-sans text-ink">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 bg-radial-accent bg-radial-accent-2 bg-bg"
        />
        <div className="relative z-10 flex min-h-screen">
          <Sidebar showSettings={admin} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar user={user} />
            <MobileNav showSettings={admin} />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

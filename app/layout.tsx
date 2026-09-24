import type { Metadata } from "next";
import { Golos_Text } from "next/font/google";
import "./globals.css";
import { Topbar } from "@/components/layout/topbar";
import { NavProgress } from "@/components/layout/nav-progress";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { countMyOverdueTasks } from "@/lib/queries/my-day";
import { rolesWithDefaultPassword } from "@/lib/role-passwords";

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
  const overdueCount = user ? await countMyOverdueTasks(user.id) : 0;
  const defaultPasswordRoles = admin ? await rolesWithDefaultPassword() : [];

  return (
    <html lang="ru" className={golos.variable}>
      <body className="relative min-h-screen bg-bg font-sans text-ink">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 bg-radial-accent bg-radial-accent-2 bg-bg"
        />
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <div className="relative z-10 flex min-h-screen flex-col">
          <Topbar user={user} overdueCount={overdueCount} defaultPasswordRoles={defaultPasswordRoles} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

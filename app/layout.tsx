import type { Metadata } from "next";
import { Golos_Text } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

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

  return (
    <html lang="ru" className={golos.variable}>
      <body className="font-sans min-h-screen bg-bg text-ink">
        <SiteHeader user={user} />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

import { NextResponse, type NextRequest } from "next/server";

// Без входа видна только страница входа. Подпись сессии проверяют страницы на сервере
// (здесь Edge-рантайм без node:crypto) — middleware только не пускает без cookie сессии.
const PUBLIC = ["/login", "/robots.txt", "/logo.jpg", "/favicon.ico", "/api/cron"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isPublic && !req.cookies.get("gbc_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" || pathname === "/my" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    const res = NextResponse.redirect(url);
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};

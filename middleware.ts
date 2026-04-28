import { NextResponse, type NextRequest } from "next/server";

/**
 * Protects /admin/* routes. Authentication itself is handled by
 * `app/admin/layout.tsx` (which has access to Node crypto).
 *
 * Here we only redirect obvious direct-access attempts without ANY cookie
 * to /admin/login. The actual signature verification happens server-side
 * in the admin layout with node:crypto (not available in Edge middleware).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (pathname.startsWith("/api/admin")) return NextResponse.next();

  const cookie = req.cookies.get("gbc_admin")?.value;
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};

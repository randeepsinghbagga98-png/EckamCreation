import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STAFF_COOKIE = "eckam_staff_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const token = request.cookies.get(STAFF_COOKIE)?.value;
    if (!token) {
      const login = new URL("/admin/login", request.url);
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isAuthenticated } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/calculate/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (
      (pathname === "/login" || pathname === "/register") &&
      (await isAuthenticated(cookieValue))
    ) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/";
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (await isAuthenticated(cookieValue)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

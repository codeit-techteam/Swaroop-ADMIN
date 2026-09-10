import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_COOKIE } from "@/lib/constants";

const PUBLIC_PATHS = new Set(["/login"]);
const PUBLIC_PREFIXES = ["/api/grades", "/api/push-notifications"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get(AUTH_COOKIE)?.value === "1";
  const isPublic =
    PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

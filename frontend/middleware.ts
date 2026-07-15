import { NextRequest, NextResponse } from "next/server";

// Basic route gating by presence of auth cookie. Fine-grained role checks
// happen client-side (AuthProvider) since the JWT payload isn't parsed here.
const PROTECTED_PREFIXES = ["/admin", "/worker", "/it-admin"];

export function middleware(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  const isProtected = PROTECTED_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/worker/:path*", "/it-admin/:path*"],
};

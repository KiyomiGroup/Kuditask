import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/auth";

// This is a coarse gate (redirect unauthenticated/wrong-role users away from
// whole route trees). It is NOT the authorization layer — every server
// action/API route still calls lib/rbac.ts itself, because middleware can't
// see per-resource ownership.
const TASKER_PREFIX = "/app";
const ADMIN_PREFIX = "/admin";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsTasker = pathname.startsWith(TASKER_PREFIX);
  const needsAdmin = pathname.startsWith(ADMIN_PREFIX);
  if (!needsTasker && !needsAdmin) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (needsAdmin && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/app", req.url));
  }
  if (needsTasker && session.role !== "TASKER") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};

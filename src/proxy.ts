import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { env } from "@/lib/env";

const ADMIN_ROLES = ["STAFF", "MANAGER", "SUPER_ADMIN"];

/**
 * Optimistic gate only (cheap JWT check). Real authorization — including
 * revocation and per-permission RBAC — is re-enforced in server code via
 * getAdminUser()/getCurrentUser(), never trusted from here alone.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("ripzy_session")?.value;

  let role: string | null = null;
  if (token) {
    try {
      role = (jwt.verify(token, env.jwtSecret) as { role?: string }).role ?? null;
    } catch {
      role = null;
    }
  }

  if (pathname.startsWith("/admin") && !(role && ADMIN_ROLES.includes(role))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if ((pathname.startsWith("/account")) && !role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/api/admin/:path*"],
};

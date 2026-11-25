import { NextResponse } from "next/server";
import { COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out successfully" });
  res.cookies.set(COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
  return res;
}

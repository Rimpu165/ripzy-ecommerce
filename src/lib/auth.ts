import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "ripzy-secret-encryption-key-2026-production";
const COOKIE_NAME = "ripzy_session";

export interface SessionPayload {
  userId: string;
  email: string;
  role: "CUSTOMER" | "STAFF" | "MANAGER" | "SUPER_ADMIN";
  name: string;
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    });

    if (!user || user.isBlocked) return null;
    return user;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: Response, token: string) {
  // Can be used in API routes
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
}

export function clearSessionCookie(response: Response) {
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

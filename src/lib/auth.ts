import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { env } from "./env";
import { can, isAdminRole, type Permission, type Role } from "./rbac";

export const COOKIE_NAME = "ripzy_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  tv?: number; // token version — bumping User.tokenVersion revokes the session
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: SESSION_SECONDS });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret) as SessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: "lax" as const,
  maxAge: SESSION_SECONDS,
  path: "/",
};

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
        deletedAt: true,
        tokenVersion: true,
        createdAt: true,
      },
    });

    if (!user || user.isBlocked || user.deletedAt) return null;
    if ((payload.tv ?? 0) !== user.tokenVersion) return null; // revoked
    return user;
  } catch {
    return null;
  }
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Returns the user if they hold `permission`, otherwise null. */
export async function getAdminUser(permission: Permission): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !can(user.role, permission)) return null;
  return user;
}

export function setSessionCookie(response: Response, token: string) {
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${
      env.isProd ? "; Secure" : ""
    }`
  );
}

export function clearSessionCookie(response: Response) {
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${env.isProd ? "; Secure" : ""}`
  );
}

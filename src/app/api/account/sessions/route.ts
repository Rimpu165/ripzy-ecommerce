import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler } from "@/lib/api";
import { COOKIE_NAME, sessionCookieOptions, signToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { Role } from "@/lib/rbac";

/** Sign out of all devices: bump tokenVersion, then re-issue the cookie for this device. */
export const DELETE = handler({ auth: true }, async ({ user, req }) => {
  const updated = await prisma.user.update({
    where: { id: user!.id },
    data: { tokenVersion: { increment: 1 } },
  });
  await audit({ userId: user!.id, action: "SECURITY", entityType: "User", entityId: user!.id, newValues: { event: "signout_all_devices" }, req });
  const res = NextResponse.json({ success: true, message: "Signed out of all other devices." });
  res.cookies.set(
    COOKIE_NAME,
    signToken({ userId: updated.id, email: updated.email, name: updated.name, role: updated.role as Role, tv: updated.tokenVersion }),
    sessionCookieOptions
  );
  return res;
});

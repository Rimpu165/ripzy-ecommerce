import { z } from "zod";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, fail } from "@/lib/api";
import { COOKIE_NAME, sessionCookieOptions, signToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { Role } from "@/lib/rbac";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required.").max(128),
  newPassword: z
    .string()
    .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, "Password must be at least 8 characters long and contain at least 1 letter and 1 number.")
    .max(128),
});

export const POST = handler(
  { auth: true, limit: { max: 10, windowMs: 15 * 60 * 1000, key: "change-password" } },
  async ({ user, req }) => {
    const { currentPassword, newPassword } = await parseJson(req, schema);
    const record = await prisma.user.findUnique({ where: { id: user!.id } });
    if (!record?.passwordHash) return fail(400, "This account has no password set.");
    if (!(await bcrypt.compare(currentPassword, record.passwordHash))) return fail(400, "Current password is incorrect.");
    if (currentPassword === newPassword) return fail(400, "New password must be different from the current one.");

    const updated = await prisma.user.update({
      where: { id: record.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12), tokenVersion: { increment: 1 } },
    });
    await audit({ userId: record.id, action: "SECURITY", entityType: "User", entityId: record.id, newValues: { event: "password_changed" }, req });

    // Other devices are revoked; keep this one signed in.
    const res = NextResponse.json({ success: true, message: "Password updated. Other devices have been signed out." });
    res.cookies.set(
      COOKIE_NAME,
      signToken({ userId: updated.id, email: updated.email, name: updated.name, role: updated.role as Role, tv: updated.tokenVersion }),
      sessionCookieOptions
    );
    return res;
  }
);

import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z
    .string()
    .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, "Password must be at least 8 characters long and contain at least 1 letter and 1 number.")
    .max(128),
});

export const POST = handler(
  { limit: { max: 10, windowMs: 15 * 60 * 1000, key: "reset-password" } },
  async ({ req }) => {
    const { token, password } = await parseJson(req, schema);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return fail(400, "This reset link is invalid or has expired. Please request a new one.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const claimed = await prisma.$transaction(async (tx) => {
      // Atomic single-use claim.
      const c = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (c.count !== 1) return false;
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      return true;
    });
    if (!claimed) return fail(400, "This reset link is invalid or has expired. Please request a new one.");

    await audit({ userId: record.userId, action: "SECURITY", entityType: "User", entityId: record.userId, newValues: { event: "password_reset" }, req });
    return ok({ success: true, message: "Password updated. Please sign in with your new password." });
  }
);

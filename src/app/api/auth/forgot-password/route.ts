import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok } from "@/lib/api";
import { notify } from "@/lib/notify";
import { env } from "@/lib/env";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address.") });

const GENERIC = {
  success: true,
  message: "If an account exists for that email, a password reset link has been sent.",
};

export const POST = handler(
  { limit: { max: 5, windowMs: 15 * 60 * 1000, key: "forgot-password" } },
  async ({ req }) => {
    const { email } = await parseJson(req, schema);

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.isBlocked && !user.deletedAt) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      // Invalidate older unused tokens, store only the hash of the new one.
      await prisma.$transaction([
        prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        }),
        prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
        }),
      ]);

      const base = env.siteUrl.replace(/[/]$/, "");
      const link = `${base}/reset-password?token=${token}`;
      await notify({
        userId: user.id,
        to: user.email,
        type: "RESET",
        subject: "Reset your Ripzy password",
        content: `Hi ${user.name}, use this link to reset your password (valid for 30 minutes): ${link}\nIf you did not request this, you can ignore this email.`,
      });
    }
    return ok(GENERIC);
  }
);

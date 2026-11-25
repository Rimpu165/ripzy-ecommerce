import { z } from "zod";
import bcrypt from "bcryptjs";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

import { staffPassword } from "@/components/admin/insight/staff-schema";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  role: z.enum(["STAFF", "MANAGER", "SUPER_ADMIN"]),
  password: staffPassword,
});

export const POST = handler({ permission: "staff.manage", limit: { max: 20, windowMs: 60_000 } }, async ({ user, req }) => {
  const body = await parseJson(req, createSchema);
  const exists = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (exists) return fail(409, "An account with this email already exists.");
  const passwordHash = await bcrypt.hash(body.password, 12);
  const created = await prisma.user.create({
    data: { name: body.name, email: body.email, role: body.role, passwordHash, emailVerifiedAt: new Date() },
    select: { id: true, name: true, email: true, role: true },
  });
  await audit({ userId: user!.id, action: "CREATE", entityType: "USER", entityId: created.id, newValues: { email: created.email, role: created.role, staff: true }, req });
  return ok({ success: true, user: created }, { status: 201 });
});

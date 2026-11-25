import { z } from "zod";
import bcrypt from "bcryptjs";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { staffPassword } from "@/components/admin/insight/staff-schema";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("change_role"), role: z.enum(["STAFF", "MANAGER", "SUPER_ADMIN"]) }),
  z.object({ action: z.literal("deactivate") }),
  z.object({ action: z.literal("reactivate") }),
  z.object({ action: z.literal("reset_password"), password: staffPassword }),
]);

export const PATCH = handler<{ id: string }>({ permission: "staff.manage", limit: { max: 30, windowMs: 60_000 } }, async ({ user, req, params }) => {
  const body = await parseJson(req, schema);
  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, role: true, isBlocked: true, deletedAt: true },
  });
  if (!target || target.deletedAt || target.role === "CUSTOMER") return fail(404, "Staff member not found.");

  const isSelf = target.id === user!.id;
  const losesSuper =
    target.role === "SUPER_ADMIN" && !target.isBlocked &&
    ((body.action === "change_role" && body.role !== "SUPER_ADMIN") || body.action === "deactivate");

  if (isSelf && (body.action === "change_role" || body.action === "deactivate")) {
    return fail(400, "You cannot change your own role or deactivate yourself.");
  }
  if (losesSuper) {
    const activeSupers = await prisma.user.count({ where: { role: "SUPER_ADMIN", isBlocked: false, deletedAt: null } });
    if (activeSupers <= 1) return fail(400, "At least one active Super Admin must remain.");
  }

  let data: Record<string, unknown>;
  let newValues: Record<string, unknown>;
  switch (body.action) {
    case "change_role":
      data = { role: body.role, tokenVersion: { increment: 1 } };
      newValues = { role: body.role };
      break;
    case "deactivate":
      data = { isBlocked: true, tokenVersion: { increment: 1 } };
      newValues = { isBlocked: true };
      break;
    case "reactivate":
      data = { isBlocked: false, failedLoginAttempts: 0, lockedUntil: null };
      newValues = { isBlocked: false };
      break;
    case "reset_password":
      data = { passwordHash: await bcrypt.hash(body.password, 12), tokenVersion: { increment: 1 }, failedLoginAttempts: 0, lockedUntil: null };
      newValues = { passwordReset: true };
      break;
  }
  // Changing own password would sign the caller out; allowed, they just log in again.
  await prisma.user.update({ where: { id: target.id }, data });
  await audit({
    userId: user!.id,
    action: body.action === "reset_password" || body.action === "deactivate" ? "SECURITY" : "UPDATE",
    entityType: "USER",
    entityId: target.id,
    oldValues: { role: target.role, isBlocked: target.isBlocked },
    newValues: { ...newValues, action: body.action, email: target.email },
    req,
  });
  return ok({ success: true });
});

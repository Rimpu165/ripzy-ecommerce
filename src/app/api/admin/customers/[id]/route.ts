import { z } from "zod";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({ action: z.enum(["block", "unblock", "force_logout", "delete"]) });

export const PATCH = handler<{ id: string }>({ permission: "customers.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req, params }) => {
  const { action } = await parseJson(req, schema);
  if (params.id === user!.id) return fail(400, "You cannot perform this action on your own account.");

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, isBlocked: true, deletedAt: true, tokenVersion: true, email: true },
  });
  if (!target || target.deletedAt) return fail(404, "Customer not found.");
  if (target.role === "SUPER_ADMIN") return fail(403, "Super admins cannot be modified here.");
  if (target.role !== "CUSTOMER") return fail(403, "Use Staff & Roles to manage staff accounts.");

  let data: { isBlocked?: boolean; deletedAt?: Date; tokenVersion?: { increment: number } };
  switch (action) {
    case "block":
      data = { isBlocked: true, tokenVersion: { increment: 1 } };
      break;
    case "unblock":
      data = { isBlocked: false };
      break;
    case "force_logout":
      data = { tokenVersion: { increment: 1 } };
      break;
    case "delete":
      data = { deletedAt: new Date(), tokenVersion: { increment: 1 } };
      break;
  }
  await prisma.user.update({ where: { id: target.id }, data });
  await audit({
    userId: user!.id,
    action: action === "delete" ? "DELETE" : "SECURITY",
    entityType: "USER",
    entityId: target.id,
    oldValues: { isBlocked: target.isBlocked, deleted: false },
    newValues: { action, email: target.email },
    req,
  });
  return ok({ success: true });
});

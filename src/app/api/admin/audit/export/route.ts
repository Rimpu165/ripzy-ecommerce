import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { buildAuditWhere } from "@/components/admin/insight/audit-filter";
import { csvResponse } from "@/components/admin/insight/csv";

export const GET = handler({ permission: "audit.view", limit: { max: 10, windowMs: 60_000 } }, async ({ user, req }) => {
  const sp = new URL(req.url).searchParams;
  const filters = {
    entityType: sp.get("entityType") || undefined,
    action: sp.get("action") || undefined,
    user: sp.get("user") || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
  };
  const rows = await prisma.auditLog.findMany({
    where: buildAuditWhere(filters),
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: { user: { select: { email: true } } },
  });
  await audit({ userId: user!.id, action: "EXPORT", entityType: "AUDIT_LOG", newValues: { filters, rows: rows.length }, req });
  return csvResponse(
    "ripzy_audit_log",
    ["Time", "User", "Action", "Entity", "Entity ID", "IP", "Old values", "New values"],
    rows.map((r) => [r.createdAt.toISOString(), r.user?.email ?? "system", r.action, r.entityType, r.entityId, r.ipAddress, r.oldValues, r.newValues])
  );
});

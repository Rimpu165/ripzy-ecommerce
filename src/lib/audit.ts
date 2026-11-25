import { prisma } from "./prisma";

interface AuditInput {
  userId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "STATUS_CHANGE" | "REFUND" | "EXPORT" | "SECURITY";
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  req?: Request;
}

/** Fire-and-forget safe: audit failures must never break the business operation. */
export async function audit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        oldValues: input.oldValues === undefined ? null : JSON.stringify(input.oldValues),
        newValues: input.newValues === undefined ? null : JSON.stringify(input.newValues),
        ipAddress: input.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: input.req?.headers.get("user-agent")?.slice(0, 250) ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}

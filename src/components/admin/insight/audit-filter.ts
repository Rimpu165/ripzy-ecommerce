import type { Prisma } from "@prisma/client";

export interface AuditFilters {
  entityType?: string;
  action?: string;
  user?: string;
  from?: string;
  to?: string;
}

const isoDay = /^\d{4}-\d{2}-\d{2}$/;

export function buildAuditWhere(f: AuditFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (f.entityType) where.entityType = f.entityType;
  if (f.action) where.action = f.action;
  if (f.user) where.user = { OR: [{ email: { contains: f.user } }, { name: { contains: f.user } }] };
  const range: { gte?: Date; lte?: Date } = {};
  if (f.from && isoDay.test(f.from)) range.gte = new Date(`${f.from}T00:00:00.000Z`);
  if (f.to && isoDay.test(f.to)) range.lte = new Date(`${f.to}T23:59:59.999Z`);
  if (range.gte || range.lte) where.createdAt = range;
  return where;
}

import React from "react";
import { redirect } from "next/navigation";
import { Download, ScrollText } from "lucide-react";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAuditWhere } from "@/components/admin/insight/audit-filter";
import { Chip } from "@/components/admin/ui/StatusBadge";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/ui/DataTable";
import { FilterBar, FilterInput, FilterSelect } from "@/components/admin/ui/FilterBar";
import { Pagination } from "@/components/admin/ui/Pagination";

import { EmptyState } from "@/components/admin/ui/EmptyState";
import { btnSecondary, fmtDateTime, one, pageParam, qs, thCls, tdCls } from "@/components/admin/ui/tokens";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;
const ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "STATUS_CHANGE", "REFUND", "EXPORT", "SECURITY"];

function pretty(s: string | null) {
  if (!s) return null;
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await getAdminUser("audit.view");
  if (!me) redirect("/admin");
  const sp = await searchParams;
  const f = { entityType: one(sp.entityType), action: one(sp.action), user: one(sp.user)?.trim(), from: one(sp.from), to: one(sp.to) };
  const page = pageParam(sp.page);
  const where = buildAuditWhere(f);

  const [total, rows, types] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.groupBy({ by: ["entityType"], _count: true }),
  ]);

  const hasFilters = !!(f.entityType || f.action || f.user || f.from || f.to);
  return (
    <div>
      <PageHeader title="Audit log" description="Every admin change, with before and after values." />
      <FilterBar
        action="/admin/audit"
        clearHref={hasFilters ? "/admin/audit" : undefined}
        extra={
          <a href={qs("/api/admin/audit/export", f)} className={btnSecondary}>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      >
        <FilterSelect label="Entity" name="entityType" defaultValue={f.entityType} options={types.map((t) => t.entityType)} />
        <FilterSelect label="Action" name="action" defaultValue={f.action} options={ACTIONS} />
        <FilterInput label="User" name="user" defaultValue={f.user} placeholder="Name or email" />
        <FilterInput label="From" name="from" type="date" defaultValue={f.from} />
        <FilterInput label="To" name="to" type="date" defaultValue={f.to} />
      </FilterBar>

      <DataTable minWidth={820} label="Audit log">
        <thead>
          <tr>
            <th className={thCls}>Time</th>
            <th className={thCls}>User</th>
            <th className={thCls}>Action</th>
            <th className={thCls}>Entity</th>
            <th className={thCls}>Changes</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5}>
                <EmptyState icon={ScrollText} title="No audit entries match" description="Adjust the filters to see more activity." />
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const o = pretty(r.oldValues),
              n = pretty(r.newValues);
            return (
              <tr key={r.id} className="align-top">
                <td className={`${tdCls} whitespace-nowrap text-slate-500`}>{fmtDateTime(r.createdAt)}</td>
                <td className={tdCls}>
                  <p className="font-medium text-slate-800">{r.user?.name ?? "System"}</p>
                  <p className="text-xs text-slate-500">{r.user?.email}</p>
                </td>
                <td className={tdCls}>
                  <Chip tone="indigo">{r.action}</Chip>
                </td>
                <td className={tdCls}>
                  <p className="font-medium text-slate-800">{r.entityType}</p>
                  <p className="max-w-[160px] truncate text-xs text-slate-500">{r.entityId}</p>
                </td>
                <td className={tdCls}>
                  {o || n ? (
                    <details>
                      <summary className="cursor-pointer rounded text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40">View diff</summary>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <pre className="max-h-60 overflow-auto rounded-lg bg-rose-50 p-2 text-xs text-rose-900">{o ?? "—"}</pre>
                        <pre className="max-h-60 overflow-auto rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">{n ?? "—"}</pre>
                      </div>
                    </details>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
      <Pagination base="/admin/audit" params={f} page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}

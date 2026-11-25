import Link from "next/link";
import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Chip } from "@/components/admin/ui/StatusBadge";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/ui/DataTable";
import { FilterBar, SearchInput } from "@/components/admin/ui/FilterBar";
import { Pagination } from "@/components/admin/ui/Pagination";

import { EmptyState } from "@/components/admin/ui/EmptyState";
import { fmtDate, inr, one, pageParam, thCls, tdCls } from "@/components/admin/ui/tokens";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;
const SPEND_STATUSES = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await getAdminUser("customers.view");
  if (!me) redirect("/login?next=/admin/customers");
  const sp = await searchParams;
  const q = one(sp.q)?.trim();
  const page = pageParam(sp.page);

  const where = {
    role: "CUSTOMER",
    deletedAt: null,
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {}),
  };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, phone: true, isBlocked: true, createdAt: true, lastLoginAt: true },
    }),
  ]);
  const ids = users.map((u) => u.id);
  const [counts, spend] = await Promise.all([
    prisma.order.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: { in: SPEND_STATUSES } }, _sum: { grandTotal: true } }),
  ]);
  const countMap = new Map(counts.map((c) => [c.userId, c._count._all]));
  const spendMap = new Map(spend.map((c) => [c.userId, c._sum.grandTotal ?? 0]));

  return (
    <div>
      <PageHeader title="Customers" description="Search, review and manage customer accounts." />
      <FilterBar action="/admin/customers" clearHref={q ? "/admin/customers" : undefined}>
        <SearchInput defaultValue={q} placeholder="Name, email or phone" label="Search customers" />
      </FilterBar>
      <DataTable minWidth={820} label="Customers">
        <thead>
          <tr>
            <th className={thCls}>Customer</th>
            <th className={thCls}>Phone</th>
            <th className={`${thCls} text-right`}>Orders</th>
            <th className={`${thCls} text-right`}>Lifetime spend</th>
            <th className={thCls}>Joined</th>
            <th className={thCls}>Last login</th>
            <th className={thCls}>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={7}>
                <EmptyState icon={Users} title="No customers found" description={q ? "Try a different search term." : "Customers appear here after they register."} />
              </td>
            </tr>
          )}
          {users.map((u) => (
            <tr key={u.id}>
              <td className={tdCls}>
                <Link href={`/admin/customers/${u.id}`} className="font-medium text-indigo-600 hover:underline">
                  {u.name}
                </Link>
                <p className="text-xs text-slate-500">{u.email}</p>
              </td>
              <td className={tdCls}>{u.phone || "—"}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{countMap.get(u.id) ?? 0}</td>
              <td className={`${tdCls} text-right font-medium tabular-nums text-slate-900`}>{inr(spendMap.get(u.id) ?? 0)}</td>
              <td className={`${tdCls} whitespace-nowrap text-slate-500`}>{fmtDate(u.createdAt)}</td>
              <td className={`${tdCls} whitespace-nowrap text-slate-500`}>{fmtDate(u.lastLoginAt)}</td>
              <td className={tdCls}>{u.isBlocked ? <Chip tone="rose" dot>Blocked</Chip> : <Chip tone="green" dot>Active</Chip>}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <Pagination base="/admin/customers" params={{ q }} page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}

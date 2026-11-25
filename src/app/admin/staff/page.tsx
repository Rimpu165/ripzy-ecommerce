import { redirect } from "next/navigation";
import { Check, Minus } from "lucide-react";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, type Permission } from "@/lib/rbac";
import StaffClient from "@/components/admin/insight/StaffClient";

import { PageHeader } from "@/components/admin/ui/PageHeader";

import { SectionCard } from "@/components/admin/ui/Form";

import { thCls, tdCls } from "@/components/admin/ui/tokens";

export const dynamic = "force-dynamic";

// Record<Permission, true> forces this list to stay complete when rbac.ts changes.
const PERMS: Record<Permission, true> = {
  "dashboard.view": true, "orders.view": true, "orders.update": true, "orders.refund": true, "returns.manage": true,
  "inventory.view": true, "inventory.adjust": true, "products.manage": true, "catalog.manage": true, "reviews.moderate": true,
  "coupons.manage": true, "banners.manage": true, "pages.manage": true, "customers.view": true, "customers.manage": true,
  "staff.manage": true, "reports.view": true, "settings.manage": true, "audit.view": true, "notifications.view": true,
};
const ROLES = ["STAFF", "MANAGER", "SUPER_ADMIN"];

export default async function StaffPage() {
  const me = await getAdminUser("staff.manage");
  if (!me) redirect("/admin");

  const staff = await prisma.user.findMany({
    where: { role: { in: ROLES }, deletedAt: null },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, email: true, role: true, isBlocked: true, lastLoginAt: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Staff & Roles" description="Manage admin accounts and review what each role can do." />
      <StaffClient meId={me.id} rows={staff.map((s) => ({ ...s, lastLoginAt: s.lastLoginAt?.toISOString() ?? null }))} />
      <SectionCard title="Permission matrix" description="What each role is allowed to do." padded={false}>
        <div className="overflow-auto">
          <table className="w-full min-w-[520px] text-left text-sm [&_tbody]:divide-y [&_tbody]:divide-slate-100 [&_tbody_tr:hover]:bg-slate-50/70">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className={thCls}>Permission</th>
                {ROLES.map((r) => (
                  <th key={r} className={`${thCls} text-center`}>
                    {r.charAt(0) + r.slice(1).toLowerCase().replace("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(PERMS) as Permission[]).map((p) => (
                <tr key={p}>
                  <td className={`${tdCls} font-mono text-xs`}>{p}</td>
                  {ROLES.map((r) => (
                    <td key={r} className={`${tdCls} text-center`}>
                      {can(r, p) ? <Check aria-label="Allowed" className="mx-auto h-4 w-4 text-emerald-600" /> : <Minus aria-label="Not allowed" className="mx-auto h-4 w-4 text-slate-300" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

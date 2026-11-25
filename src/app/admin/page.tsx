import React from "react";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { one } from "@/components/admin/insight/ui";
import { getDashboardData, parseRange } from "@/components/admin/dashboard/data";
import {
  ActionCentre, ActivityPanel, CategoryPanel, CouponPanel, DashboardHeader, GeoPanel, HeatPanel, InventoryPanel,
  KpiRow, NewStoreBanner, PaymentPanel, PipelinePanel, RecentOrdersPanel, ReviewPanel, TopCustomersPanel,
  TopProductsPanel, TrendPanel,
} from "@/components/admin/dashboard/widgets";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getAdminUser("dashboard.view");
  if (!user) redirect("/login?next=/admin");
  const sp = await searchParams;
  const data = await getDashboardData(user.role, parseRange(one(sp.range)));

  return (
    <div className="space-y-6">
      <DashboardHeader data={data} name={user.name} />
      <NewStoreBanner data={data} />
      <KpiRow data={data} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <TrendPanel data={data} />
          <PipelinePanel data={data} />
          <HeatPanel data={data} />
        </div>
        <div className="space-y-6">
          <ActionCentre data={data} />
          <ActivityPanel data={data} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <CategoryPanel data={data} />
        <PaymentPanel data={data} />
        <GeoPanel data={data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><TopProductsPanel data={data} /></div>
        <TopCustomersPanel data={data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><InventoryPanel data={data} /></div>
        <div className="space-y-6">
          <CouponPanel data={data} />
          <ReviewPanel data={data} />
        </div>
      </div>

      <RecentOrdersPanel data={data} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ResendButton from "@/components/admin/insight/ResendButton";
import { Chip, StatusBadge } from "@/components/admin/ui/StatusBadge";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { DataTable } from "@/components/admin/ui/DataTable";
import { FilterBar, FilterInput, FilterSelect } from "@/components/admin/ui/FilterBar";
import { Pagination } from "@/components/admin/ui/Pagination";

import { EmptyState } from "@/components/admin/ui/EmptyState";
import { fmtDateTime, one, pageParam, thCls, tdCls } from "@/components/admin/ui/tokens";
import { resendNotification } from "./actions";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;
const TYPES = ["WELCOME", "VERIFY", "RESET", "ORDER_CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUND", "RETURN", "ABANDONED_CART", "BACK_IN_STOCK"];
const STATUSES = ["PENDING", "SENT", "FAILED"];

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await getAdminUser("notifications.view");
  if (!me) redirect("/admin");
  const sp = await searchParams;
  const f = { type: one(sp.type), status: one(sp.status), recipient: one(sp.recipient)?.trim() };
  const page = pageParam(sp.page);
  const where = {
    ...(f.type ? { type: f.type } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.recipient ? { recipientEmail: { contains: f.recipient } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  const hasFilters = !!(f.type || f.status || f.recipient);
  return (
    <div>
      <PageHeader title="Notifications" description="Outbound email log. Failed messages can be resent." />
      <FilterBar action="/admin/notifications" clearHref={hasFilters ? "/admin/notifications" : undefined}>
        <FilterSelect label="Type" name="type" defaultValue={f.type} options={TYPES} allLabel="All types" />
        <FilterSelect label="Status" name="status" defaultValue={f.status} options={STATUSES} allLabel="All statuses" />
        <FilterInput label="Recipient" name="recipient" defaultValue={f.recipient} placeholder="Recipient email" />
      </FilterBar>
      <DataTable minWidth={820} label="Notifications">
        <thead>
          <tr>
            <th className={thCls}>Sent</th>
            <th className={thCls}>Type</th>
            <th className={thCls}>Recipient</th>
            <th className={thCls}>Subject</th>
            <th className={thCls}>Status</th>
            <th className={`${thCls} text-right`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6}>
                <EmptyState icon={Mail} title="No notifications" description={hasFilters ? "No messages match these filters." : "Emails sent by the store will be logged here."} />
              </td>
            </tr>
          )}
          {rows.map((n) => (
            <tr key={n.id} className="align-top">
              <td className={`${tdCls} whitespace-nowrap text-slate-500`}>{fmtDateTime(n.sentAt)}</td>
              <td className={tdCls}>
                <Chip tone="indigo">{n.type}</Chip>
              </td>
              <td className={tdCls}>{n.recipientEmail}</td>
              <td className={tdCls}>
                <details>
                  <summary className="cursor-pointer rounded font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40">{n.subject}</summary>
                  <pre className="mt-2 max-h-60 max-w-md overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{n.content}</pre>
                  {n.error && <p className="mt-1 text-rose-600">{n.error}</p>}
                </details>
              </td>
              <td className={tdCls}>
                <StatusBadge status={n.status} />
              </td>
              <td className={`${tdCls} text-right`}>
                <ResendButton id={n.id} action={resendNotification} />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <Pagination base="/admin/notifications" params={f} page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}

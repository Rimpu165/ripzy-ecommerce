import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import CustomerActions from "@/components/admin/insight/CustomerActions";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { SectionCard } from "@/components/admin/ui/Form";
import { Chip, StatusBadge } from "@/components/admin/ui/StatusBadge";
import { fmtDate, fmtDateTime, inr } from "@/components/admin/ui/tokens";

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <SectionCard title={title} className={className}>
      {children}
    </SectionCard>
  );
}
const Badge = ({ tone, children }: { tone?: "red" | "green" | "indigo"; children: React.ReactNode }) => (
  <Chip tone={tone === "red" ? "rose" : tone === "green" ? "green" : tone === "indigo" ? "indigo" : "slate"}>{children}</Chip>
);

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getAdminUser("customers.view");
  if (!me) redirect("/login?next=/admin/customers");
  const { id } = await params;

  const c = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER", deletedAt: null },
    include: {
      addresses: { orderBy: { isDefault: "desc" } },
      orders: { orderBy: { createdAt: "desc" }, take: 25, select: { id: true, orderNumber: true, status: true, grandTotal: true, createdAt: true, notes: true } },
      reviews: { orderBy: { createdAt: "desc" }, take: 20, include: { product: { select: { name: true } } } },
    },
  });
  if (!c) notFound();
  const activity = await prisma.auditLog.findMany({ where: { entityType: "USER", entityId: c.id }, orderBy: { createdAt: "desc" }, take: 10 });
  const manage = can(me.role, "customers.manage");
  const canAct = manage && c.id !== me.id;
  const orderNotes = c.orders.filter((o) => o.notes);

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.name}
        description={`${c.email}${c.phone ? " · " + c.phone : ""}`}
        breadcrumbs={[{ label: "Customers", href: "/admin/customers" }, { label: c.name }]}
        actions={canAct ? <CustomerActions id={c.id} isBlocked={c.isBlocked} /> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Profile">
          <dl className="space-y-2 text-sm">
            <Row k="Status">{c.isBlocked ? <Badge tone="red">Blocked</Badge> : <Badge tone="green">Active</Badge>}</Row>
            <Row k="Joined">{fmtDate(c.createdAt)}</Row>
            <Row k="Last login">{fmtDateTime(c.lastLoginAt)}</Row>
            <Row k="Email verified">{c.emailVerifiedAt ? fmtDate(c.emailVerifiedAt) : "No"}</Row>
            <Row k="Orders">{c.orders.length}</Row>
          </dl>
        </Card>
        <Card title="Addresses" className="lg:col-span-2">
          {c.addresses.length === 0 ? <p className="text-sm text-slate-500">No saved addresses.</p> : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {c.addresses.map((a) => (
                <li key={a.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">{a.fullName} {a.isDefault && <Badge tone="indigo">Default</Badge>}</p>
                  <p className="text-slate-600">{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ""}, {a.city}, {a.state} {a.postalCode}</p>
                  <p className="text-slate-500">{a.phone}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Orders">
        {c.orders.length === 0 ? <p className="text-sm text-slate-500">No orders.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {c.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2.5">
                <Link href={`/admin/orders?q=${o.orderNumber}`} className="font-medium text-indigo-600 hover:underline">{o.orderNumber}</Link>
                <span className="text-slate-500">{fmtDate(o.createdAt)}</span>
                <StatusBadge status={o.status} />
                <span className="font-bold tabular-nums">{inr(o.grandTotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Reviews">
          {c.reviews.length === 0 ? <p className="text-sm text-slate-500">No reviews.</p> : (
            <ul className="space-y-3 text-sm">
              {c.reviews.map((r) => (
                <li key={r.id}>
                  <p className="font-medium text-slate-900">{r.product.name} · {r.rating}/5 <StatusBadge status={r.status} /></p>
                  <p className="text-slate-600">{r.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Notes & activity">
          <ul className="space-y-2 text-sm text-slate-600">
            {orderNotes.map((o) => <li key={o.id}><span className="font-bold">{o.orderNumber}:</span> {o.notes}</li>)}
            {activity.map((a) => <li key={a.id}><span className="font-bold">{a.action}</span> · {fmtDateTime(a.createdAt)}</li>)}
            {orderNotes.length + activity.length === 0 && <li className="text-slate-500">Nothing recorded.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-800">{children}</dd></div>;
}

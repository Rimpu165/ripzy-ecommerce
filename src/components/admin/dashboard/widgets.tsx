import React from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Download, Inbox, Minus, Package, PlusCircle,
  ShoppingBag, Star, Ticket, Truck, Undo2, Wallet, CreditCard, MessageSquare, type LucideIcon,
} from "lucide-react";
import { Sparkline } from "./Sparkline";
import TrendChart from "./TrendChart";
import { RANGE_OPTIONS, type DashboardData } from "./data";
import { STATUS_CHIP, STATUS_LABEL, inrCompact, inrFull, numCompact, pct, timeAgo } from "./format";

/* ---------- primitives ---------- */

export function Panel({ title, subtitle, action, children, className = "" }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`card flex flex-col p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="shrink-0 rounded text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{children}</Link>;
}

function Empty({ icon: Icon = Inbox, text, hint }: { icon?: LucideIcon; text: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Icon className="h-4 w-4" /></span>
      <p className="text-xs font-medium text-slate-600">{text}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Chip({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

function Bar({ value, max, tone = "bg-indigo-500" }: { value: number; max: number; tone?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="presentation">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(value > 0 ? 3 : 0, Math.min(100, (value / Math.max(1, max)) * 100))}%` }} />
    </div>
  );
}

/* ---------- 1. header ---------- */

export function DashboardHeader({ data, name }: { data: DashboardData; name: string }) {
  const ist = new Date(data.nowMs + 19800000);
  const h = ist.getUTCHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = name.trim().split(/\s+/)[0] || "there";
  const date = new Date(data.nowMs).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const p = data.perms;
  const actions = [
    p.products && { href: "/admin/products/new", label: "New product", icon: PlusCircle, primary: true },
    p.orders && { href: "/admin/orders", label: "View orders", icon: ShoppingBag },
    p.coupons && { href: "/admin/coupons", label: "Add coupon", icon: Ticket },
    p.reports && { href: "/admin/reports", label: "Export report", icon: Download },
  ].filter(Boolean) as { href: string; label: string; icon: LucideIcon; primary?: boolean }[];

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{greet}, {first}</h1>
          <p className="mt-1 text-sm text-slate-500">{date} · {data.range.title} vs {data.range.prevTitle}</p>
        </div>
        <nav className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-medium shadow-subtle" aria-label="Date range">
          {RANGE_OPTIONS.map((r) => (
            <Link
              key={r.key}
              href={`/admin?range=${r.key}`}
              aria-current={r.key === data.range.key ? "true" : undefined}
              className={`rounded-lg px-3 py-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${r.key === data.range.key ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${a.primary ? "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              <a.icon className="h-3.5 w-3.5" /> {a.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

export function NewStoreBanner({ data }: { data: DashboardData }) {
  if (data.storeHasOrders || !data.perms.orders) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-900">
      <p><span className="font-semibold">Your store is ready for its first order.</span> <span className="text-indigo-700/80">Charts will fill in as soon as customers start buying.</span></p>
      <div className="flex gap-2 text-xs font-medium">
        {data.perms.products && <Link href="/admin/products/new" className="rounded-lg bg-white px-3 py-1.5 text-indigo-700 shadow-subtle hover:bg-indigo-50">Add a product</Link>}
        <Link href="/" className="rounded-lg bg-white px-3 py-1.5 text-indigo-700 shadow-subtle hover:bg-indigo-50">Preview storefront</Link>
      </div>
    </div>
  );
}

/* ---------- 2. KPI row ---------- */

function Delta({ cur, prev, invert }: { cur: number; prev: number; invert?: boolean }) {
  if (prev === 0 && cur === 0) return <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Minus className="h-3 w-3" /> No change</span>;
  if (prev === 0) return <span className="text-[11px] font-medium text-slate-500">New this period</span>;
  const d = ((cur - prev) / prev) * 100;
  const up = d >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-[11px]">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${Math.abs(d) < 0.05 ? "bg-slate-100 text-slate-600" : good ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
        <Icon className="h-3 w-3" /> {Math.abs(d).toFixed(1)}%
      </span>
      <span className="text-slate-400">vs prev</span>
    </span>
  );
}

function Kpi({ label, value, hint, cur, prev, spark, icon: Icon, invert, tone = "text-indigo-500" }: {
  label: string; value: string; hint?: string; cur: number; prev: number; spark: number[]; icon: LucideIcon; invert?: boolean; tone?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-400"><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold tabular-nums text-slate-900" title={value}>{value}</p>
          {hint && <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>}
        </div>
        <Sparkline data={spark} className={tone} />
      </div>
      <div className="mt-2"><Delta cur={cur} prev={prev} invert={invert} /></div>
    </div>
  );
}

export function KpiRow({ data }: { data: DashboardData }) {
  const { kpis: k, perms: p } = data;
  const cards: React.ReactNode[] = [];
  if (p.money) cards.push(<Kpi key="rev" label="Revenue" icon={Wallet} value={inrCompact(k.revenue.cur)} hint={inrFull(k.revenue.cur)} {...k.revenue} />);
  if (p.orders) cards.push(<Kpi key="ord" label="Orders" icon={ShoppingBag} value={k.orders.cur.toLocaleString("en-IN")} hint="Paid orders" {...k.orders} />);
  if (p.money) cards.push(<Kpi key="aov" label="Avg order value" icon={Package} value={inrCompact(k.aov.cur)} hint={inrFull(k.aov.cur)} {...k.aov} tone="text-indigo-400" />);
  if (p.customers) cards.push(<Kpi key="cust" label="New customers" icon={Star} value={k.customers.cur.toLocaleString("en-IN")} hint="Sign-ups" {...k.customers} tone="text-emerald-600" />);
  if (p.orders) cards.push(<Kpi key="conv" label="Conversion" icon={CheckCircle2} value={pct(k.conversion.cur)} hint={`${k.orders.cur} paid of ${k.conversion.created} created`} cur={k.conversion.cur} prev={k.conversion.prev} spark={k.conversion.spark} />);
  if (p.money) cards.push(<Kpi key="ref" label="Refunds & returns" icon={Undo2} value={inrCompact(k.refunds.cur)} hint={`${k.refunds.returns} return request${k.refunds.returns === 1 ? "" : "s"}`} cur={k.refunds.cur} prev={k.refunds.prev} spark={k.refunds.spark} invert tone="text-rose-400" />);
  if (!cards.length) return null;
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{cards}</div>;
}

/* ---------- 3. trend ---------- */

export function TrendPanel({ data }: { data: DashboardData }) {
  if (!data.perms.orders) return null;
  const showRevenue = data.perms.money;
  return (
    <Panel title={showRevenue ? "Revenue & orders" : "Orders over time"} subtitle={`${data.range.title}, compared with ${data.range.prevTitle}`}>
      <TrendChart data={data.trend} showRevenue={showRevenue} prevTitle={data.range.prevTitle} />
    </Panel>
  );
}

/* ---------- 4. pipeline ---------- */

const STAGES = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

export function PipelinePanel({ data }: { data: DashboardData }) {
  if (!data.perms.orders) return null;
  const c = data.pipeline;
  const max = Math.max(1, ...STAGES.map((s) => c[s] ?? 0));
  const first = c.PENDING_PAYMENT ?? 0;
  return (
    <Panel title="Order pipeline" subtitle={`Orders created ${data.range.title.toLowerCase()} by current stage`}
      action={<PanelLink href="/admin/orders">All orders</PanelLink>}>
      {data.totalCreated === 0 ? (
        <Empty icon={ShoppingBag} text="No orders in this period" hint="New orders will flow through these stages." />
      ) : (
        <>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {STAGES.map((s, i) => {
              const n = c[s] ?? 0;
              return (
                <li key={s}>
                  <Link href={`/admin/orders?status=${s}`} className="group block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-indigo-200 hover:bg-indigo-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                    <p className="text-[11px] text-slate-500">{i + 1}. {STATUS_LABEL[s]}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{n.toLocaleString("en-IN")}</p>
                    <div className="mt-2"><Bar value={n} max={max} tone={s === "PENDING_PAYMENT" ? "bg-amber-400" : s === "DELIVERED" ? "bg-emerald-500" : "bg-indigo-500"} /></div>
                    <p className="mt-1.5 text-[11px] text-slate-400">{data.totalCreated ? pct((n / data.totalCreated) * 100, 0) : "0%"} of created</p>
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link href="/admin/orders?status=CANCELLED"><Chip cls={`${STATUS_CHIP.CANCELLED} hover:opacity-80`}>Cancelled · {c.CANCELLED ?? 0}</Chip></Link>
            <Link href="/admin/orders?status=REFUNDED"><Chip cls={`${STATUS_CHIP.REFUNDED} hover:opacity-80`}>Refunded · {c.REFUNDED ?? 0}</Chip></Link>
            {first > 0 && <span className="self-center text-[11px] text-slate-400">{first} awaiting payment</span>}
          </div>
        </>
      )}
    </Panel>
  );
}

/* ---------- 5. breakdowns ---------- */

function HBarList({ rows, format, tone }: { rows: { label: string; value: number }[]; format: (n: number) => string; tone?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="text-xs" title={`${r.label}: ${format(r.value)}`}>
          <div className="mb-1 flex justify-between gap-2 text-slate-700">
            <span className="truncate">{r.label}</span>
            <span className="font-medium tabular-nums text-slate-900">{format(r.value)}</span>
          </div>
          <Bar value={r.value} max={max} tone={tone} />
        </li>
      ))}
    </ul>
  );
}

export function CategoryPanel({ data }: { data: DashboardData }) {
  if (!data.perms.money) return null;
  return (
    <Panel title="Sales by category" subtitle="Revenue from paid orders">
      {data.categories.length ? <HBarList rows={data.categories} format={inrCompact} /> : <Empty text="No data in this period" />}
    </Panel>
  );
}

export function PaymentPanel({ data }: { data: DashboardData }) {
  if (!data.perms.money) return null;
  const { cod, online } = data.payment;
  const total = cod + online;
  const R = 42, C = 2 * Math.PI * R;
  const onlineLen = total ? (online / total) * C : 0;
  const codLen = total ? (cod / total) * C : 0;
  const gap = total && online && cod ? 3 : 0;
  return (
    <Panel title="Payment methods" subtitle="Paid orders: COD vs online">
      {total === 0 ? (
        <Empty icon={CreditCard} text="No data in this period" />
      ) : (
        <div className="flex items-center gap-5">
          <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label={`Online ${online} orders, COD ${cod} orders`}>
            <circle cx="50" cy="50" r={R} fill="none" className="stroke-slate-100" strokeWidth="12" />
            {online > 0 && <circle cx="50" cy="50" r={R} fill="none" className="stroke-indigo-500" strokeWidth="12" strokeDasharray={`${Math.max(0, onlineLen - gap)} ${C}`} />}
            {cod > 0 && <circle cx="50" cy="50" r={R} fill="none" className="stroke-sky-300" strokeWidth="12" strokeDasharray={`${Math.max(0, codLen - gap)} ${C}`} strokeDashoffset={-onlineLen} />}
            <text x="50" y="54" textAnchor="middle" className="rotate-90 fill-slate-900 text-[16px] font-semibold" style={{ transformOrigin: "50px 50px" }}>{total}</text>
          </svg>
          <ul className="flex-1 space-y-2.5 text-xs">
            {[{ l: "Online", v: online, c: "bg-indigo-500" }, { l: "Cash on delivery", v: cod, c: "bg-sky-300" }].map((x) => (
              <li key={x.l} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 rounded-sm ${x.c}`} />{x.l}</span>
                <span className="tabular-nums text-slate-900"><span className="font-medium">{x.v}</span> <span className="text-slate-400">· {pct((x.v / total) * 100, 0)}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export function GeoPanel({ data }: { data: DashboardData }) {
  if (!data.perms.money) return null;
  const rows = data.states.length ? data.states : data.cities;
  const heading = data.states.length ? "Top states" : "Top cities";
  return (
    <Panel title="Where orders ship" subtitle={`${heading} by paid orders`}>
      {rows.length ? (
        <div className="space-y-5">
          <HBarList rows={rows} format={(n) => `${n} order${n === 1 ? "" : "s"}`} tone="bg-sky-400" />
          {data.states.length > 0 && data.cities.length > 0 && (
            <p className="text-[11px] text-slate-400">Top cities: {data.cities.slice(0, 3).map((c) => `${c.label} (${c.value})`).join(" · ")}</p>
          )}
        </div>
      ) : <Empty text="No data in this period" />}
    </Panel>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HEAT = ["bg-slate-100", "bg-indigo-100", "bg-indigo-200", "bg-indigo-300", "bg-indigo-500"];

export function HeatPanel({ data }: { data: DashboardData }) {
  if (!data.perms.orders) return null;
  const max = Math.max(0, ...data.heat.flat());
  const level = (v: number) => (v === 0 || max === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
  const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
  return (
    <Panel title="When customers order" subtitle="Orders by weekday and hour (IST)">
      {max === 0 ? <Empty text="No data in this period" /> : (
        <div className="overflow-x-auto">
          <div className="min-w-[420px]">
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "28px repeat(24, minmax(0, 1fr))" }} role="table" aria-label="Orders by weekday and hour">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <React.Fragment key={d}>
                  <span className="pr-1 text-right text-[10px] leading-4 text-slate-400">{DAYS[d]}</span>
                  {data.heat[d].map((v, h) => (
                    <span key={h} className={`h-4 rounded-[3px] ${HEAT[level(v)]}`} title={`${DAYS[d]} ${hourLabel(h)}: ${v} order${v === 1 ? "" : "s"}`} />
                  ))}
                </React.Fragment>
              ))}
              <span />
              {Array.from({ length: 24 }).map((_, h) => (
                <span key={h} className="text-center text-[9px] text-slate-400">{h % 6 === 0 ? hourLabel(h) : ""}</span>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-400">
            Less {HEAT.map((c) => <span key={c} className={`h-2.5 w-2.5 rounded-sm ${c}`} />)} More
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ---------- 6. top products / customers ---------- */

export function TopProductsPanel({ data }: { data: DashboardData }) {
  if (!data.perms.money) return null;
  const rows = data.topProducts;
  return (
    <Panel title="Top selling products" subtitle="By units sold in this period" action={<PanelLink href="/admin/products">Products</PanelLink>}>
      {rows.length === 0 ? <Empty icon={Package} text="No sales in this period" hint="Your best sellers will rank here." /> : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[380px] text-left text-xs">
            <thead>
              <tr className="text-[11px] text-slate-400">
                <th className="px-1 pb-2 font-medium">Product</th>
                <th className="px-1 pb-2 text-right font-medium">Units</th>
                <th className="px-1 pb-2 text-right font-medium">Revenue</th>
                <th className="px-1 pb-2 text-right font-medium">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p, i) => (
                <tr key={`${p.name}-${i}`}>
                  <td className="max-w-[220px] truncate px-1 py-2.5 font-medium text-slate-800"><span className="mr-2 text-slate-400">{i + 1}</span>{p.name}</td>
                  <td className="px-1 py-2.5 text-right tabular-nums text-slate-700">{p.units}</td>
                  <td className="px-1 py-2.5 text-right tabular-nums text-slate-900">{inrCompact(p.revenue)}</td>
                  <td className="px-1 py-2.5 text-right">
                    {p.stockLeft === null ? <span className="text-slate-300">-</span> : (
                      <Chip cls={p.stockLeft <= 0 ? "bg-rose-50 text-rose-700" : p.stockLeft <= 10 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}>{p.stockLeft}</Chip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function TopCustomersPanel({ data }: { data: DashboardData }) {
  if (!data.perms.money || !data.perms.customers) return null;
  const rows = data.topCustomers;
  const max = Math.max(1, ...rows.map((r) => r.spend));
  return (
    <Panel title="Top customers" subtitle="By spend in this period" action={<PanelLink href="/admin/customers">Customers</PanelLink>}>
      {rows.length === 0 ? <Empty text="No customer spend in this period" /> : (
        <ul className="space-y-3.5">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center gap-3 text-xs">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-700">
                {c.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <span className="truncate font-medium text-slate-800">{c.name}</span>
                  <span className="font-medium tabular-nums text-slate-900">{inrCompact(c.spend)}</span>
                </div>
                <div className="mt-1"><Bar value={c.spend} max={max} /></div>
                <p className="mt-1 text-[11px] text-slate-400">{c.orders} order{c.orders === 1 ? "" : "s"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- 7. inventory ---------- */

export function InventoryPanel({ data }: { data: DashboardData }) {
  if (!data.perms.stock) return null;
  const inv = data.inventory;
  const rows = [...inv.out.slice(0, 3).map((v) => ({ ...v, out: true })), ...inv.low.map((v) => ({ ...v, out: false }))].slice(0, 7);
  return (
    <Panel title="Inventory health" subtitle="Stock versus each variant's low-stock threshold" action={<PanelLink href="/admin/products">Manage stock</PanelLink>}>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { l: "Variants", v: inv.totalVariants.toLocaleString("en-IN"), c: "text-slate-900" },
          { l: "Low stock", v: String(inv.lowCount), c: inv.lowCount ? "text-amber-700" : "text-slate-900" },
          { l: "Out of stock", v: String(inv.outCount), c: inv.outCount ? "text-rose-700" : "text-slate-900" },
          { l: "Stock value", v: data.perms.money ? inrCompact(inv.value) : `${numCompact(inv.units)} units`, c: "text-slate-900" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] text-slate-500">{s.l}</p>
            <p className={`text-base font-semibold tabular-nums ${s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty icon={CheckCircle2} text={inv.totalVariants ? "All variants are healthy" : "No products yet"} hint={inv.totalVariants ? "Nothing at or below its threshold." : "Add products to track stock here."} />
      ) : (
        <ul className="space-y-3">
          {rows.map((v) => (
            <li key={v.id} className="text-xs">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-slate-800"><span className="font-medium">{v.product.name}</span> <span className="text-slate-400">{v.title}</span></span>
                <span className="shrink-0">{v.out ? <Chip cls="bg-rose-50 text-rose-700">Out of stock</Chip> : <span className="tabular-nums text-slate-600">{v.stock} <span className="text-slate-400">/ {v.lowStockThreshold}</span></span>}</span>
              </div>
              <Bar value={v.stock} max={v.lowStockThreshold} tone={v.out ? "bg-rose-400" : "bg-amber-400"} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- 8. action centre ---------- */

export function ActionCentre({ data }: { data: DashboardData }) {
  const a = data.actions, p = data.perms;
  const items = [
    p.orders && { href: "/admin/orders?status=CONFIRMED", label: "Orders to ship", n: a.toShip, icon: Truck },
    p.orders && { href: "/admin/orders?status=PENDING_PAYMENT", label: "Pending payment over 30 min", n: a.pendingOld, icon: Wallet },
    p.returns && { href: "/admin/returns?status=REQUESTED", label: "Return requests", n: a.returnsOpen, icon: Undo2 },
    p.reviews && { href: "/admin/reviews", label: "Reviews to moderate", n: a.reviewsPending, icon: MessageSquare },
    p.money && { href: "/admin/orders", label: "Failed payments (7d)", n: a.failedPayments, icon: CreditCard },
    p.money && { href: "/admin/orders?status=REFUNDED", label: "Refunds in progress", n: a.refundsInitiated, icon: AlertTriangle },
  ].filter(Boolean) as { href: string; label: string; n: number; icon: LucideIcon }[];
  if (!items.length) return null;
  const open = items.reduce((s, i) => s + i.n, 0);
  return (
    <Panel title="Needs attention" subtitle={open ? `${open} item${open === 1 ? "" : "s"} waiting on you` : "Nothing waiting on you"}>
      {open === 0 && <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> You are all caught up.</p>}
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${i.n ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"}`}><i.icon className="h-4 w-4" /></span>
              <span className="flex-1 text-slate-700">{i.label}</span>
              <span className={`min-w-[1.75rem] rounded-full px-2 py-0.5 text-center font-semibold tabular-nums ${i.n ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-400"}`}>{i.n}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ---------- 9. recent orders + activity ---------- */

export function RecentOrdersPanel({ data }: { data: DashboardData }) {
  if (!data.perms.orders) return null;
  return (
    <Panel title="Recent orders" action={<PanelLink href="/admin/orders">View all</PanelLink>}>
      {data.recent.length === 0 ? <Empty icon={ShoppingBag} text="No orders yet" hint="Orders appear here the moment they are placed." /> : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-xs">
            <thead>
              <tr className="text-[11px] text-slate-400">
                <th className="px-1 pb-2 font-medium">Order</th>
                <th className="px-1 pb-2 font-medium">Customer</th>
                <th className="px-1 pb-2 font-medium">Status</th>
                {data.perms.money && <th className="px-1 pb-2 text-right font-medium">Total</th>}
                <th className="px-1 pb-2 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recent.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="px-1 py-2.5 font-medium"><Link href={`/admin/orders/${o.id}`} className="text-indigo-600 hover:underline">{o.orderNumber}</Link></td>
                  <td className="max-w-[140px] truncate px-1 py-2.5 text-slate-700">{o.user?.name || "Guest"}</td>
                  <td className="px-1 py-2.5"><Chip cls={STATUS_CHIP[o.status] ?? "bg-slate-100 text-slate-600"}>{STATUS_LABEL[o.status] ?? o.status}</Chip></td>
                  {data.perms.money && <td className="px-1 py-2.5 text-right font-medium tabular-nums text-slate-900">{inrFull(o.grandTotal)}</td>}
                  <td className="whitespace-nowrap px-1 py-2.5 text-right text-slate-400">{timeAgo(o.createdAt, data.nowMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const VERB: Record<string, string> = { CREATE: "created", UPDATE: "updated", DELETE: "deleted", LOGIN: "signed in", STATUS_CHANGE: "changed status of" };

export function ActivityPanel({ data }: { data: DashboardData }) {
  if (!data.perms.audit) return null;
  return (
    <Panel title="Live activity" subtitle="Latest audit events" action={<PanelLink href="/admin/audit">Audit log</PanelLink>}>
      {data.audit.length === 0 ? <Empty text="No activity recorded yet" /> : (
        <ol className="relative space-y-3.5 border-l border-slate-200 pl-4">
          {data.audit.map((e) => (
            <li key={e.id} className="relative text-xs">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-300" />
              <p className="text-slate-700">
                <span className="font-medium text-slate-900">{e.user?.name ?? "System"}</span>{" "}
                {VERB[e.action] ?? e.action.toLowerCase().replace(/_/g, " ")}{" "}
                <span className="lowercase">{e.entityType.replace(/_/g, " ")}</span>
                {e.entityId ? <span className="text-slate-400"> · {e.entityId.slice(-6)}</span> : null}
              </p>
              <p className="text-[11px] text-slate-400">{timeAgo(e.createdAt, data.nowMs)}</p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/* ---------- 10. coupons + reviews ---------- */

export function CouponPanel({ data }: { data: DashboardData }) {
  if (!data.perms.coupons) return null;
  const max = Math.max(1, ...data.coupons.map((c) => c.uses));
  return (
    <Panel title="Coupon performance" subtitle={data.couponTotals.uses ? `${data.couponTotals.uses} redemptions · ${inrCompact(data.couponTotals.discount)} given` : "Redemptions in this period"} action={<PanelLink href="/admin/coupons">Coupons</PanelLink>}>
      {data.coupons.length === 0 ? <Empty icon={Ticket} text="No coupons redeemed in this period" /> : (
        <ul className="space-y-3">
          {data.coupons.map((c) => (
            <li key={c.code} className="text-xs">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700">{c.code}</span>
                <span className="tabular-nums text-slate-600"><span className="font-medium text-slate-900">{c.uses}</span> uses · {inrCompact(c.discount)} off</span>
              </div>
              <Bar value={c.uses} max={max} tone="bg-sky-400" />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function ReviewPanel({ data }: { data: DashboardData }) {
  if (!data.perms.reviews) return null;
  const rv = data.reviews;
  const max = Math.max(1, ...rv.dist.map((d) => d.count));
  return (
    <Panel title="Customer reviews" subtitle="Approved reviews, all time" action={<PanelLink href="/admin/reviews">Moderate</PanelLink>}>
      {rv.count === 0 ? <Empty icon={Star} text="No approved reviews yet" /> : (
        <div className="flex items-center gap-5">
          <div className="shrink-0 text-center">
            <p className="text-3xl font-semibold tabular-nums text-slate-900">{rv.avg.toFixed(1)}</p>
            <div className="mt-1 flex justify-center gap-0.5" aria-label={`${rv.avg.toFixed(1)} out of 5`}>
              {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`h-3 w-3 ${s <= Math.round(rv.avg) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">{rv.count} review{rv.count === 1 ? "" : "s"}</p>
          </div>
          <ul className="flex-1 space-y-1.5">
            {rv.dist.map((d) => (
              <li key={d.star} className="flex items-center gap-2 text-[11px] text-slate-500" title={`${d.star} star: ${d.count}`}>
                <span className="w-3 text-right tabular-nums">{d.star}</span>
                <div className="flex-1"><Bar value={d.count} max={max} tone="bg-amber-400" /></div>
                <span className="w-6 text-right tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

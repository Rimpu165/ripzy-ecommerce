"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Minus, Search, Pencil, Archive, CheckCircle2, Trash2, RotateCcw, Download, Star, ImageOff } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "./ConfirmDialog";
import { api, btnGhost, inputCls } from "./util";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Chip } from "@/components/admin/ui/StatusBadge";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { Pagination } from "@/components/admin/ui/Pagination";
import { FilterField } from "@/components/admin/ui/FilterBar";
import { thCls, tdCls } from "@/components/admin/ui/tokens";
import { Package } from "lucide-react";

interface Variant {
  id: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  reservedStock: number;
  lowStockThreshold: number;
}
interface Product {
  id: string;
  name: string;
  slug: string;
  status: string;
  isFeatured: boolean;
  deleted: boolean;
  brand: string | null;
  category: string | null;
  image: string | null;
  variants: Variant[];
}
interface Filters {
  q: string;
  status: string;
  categoryId: string;
  brandId: string;
  low: boolean;
  deleted: boolean;
  page: number;
}
interface Props {
  products: Product[];
  total: number;
  page: number;
  pages: number;
  filters: Filters;
  categories: { id: string; name: string; level: number }[];
  brands: { id: string; name: string }[];
  canManage: boolean;
  canAdjust: boolean;
}

type BulkAction = "archive" | "activate" | "delete" | "restore";

const statusTone: Record<string, "green" | "slate" | "amber"> = {
  ACTIVE: "green",
  DRAFT: "slate",
  ARCHIVED: "amber",
};

export default function ProductListClient(props: Props) {
  const { total, page, pages, filters, categories, brands, canManage, canAdjust } = props;
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [products, setProducts] = useState<Product[]>(props.products);
  const [q, setQ] = useState(filters.q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: BulkAction; ids: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setProducts(props.products);
    setSelected(new Set());
  }, [props.products]);

  function navigate(next: Partial<Filters>) {
    const f = { ...filters, page: 1, ...next };
    const sp = new URLSearchParams();
    if (f.q) sp.set("q", f.q);
    if (f.status) sp.set("status", f.status);
    if (f.categoryId) sp.set("categoryId", f.categoryId);
    if (f.brandId) sp.set("brandId", f.brandId);
    if (f.low) sp.set("low", "1");
    if (f.deleted) sp.set("deleted", "1");
    if (f.page > 1) sp.set("page", String(f.page));
    const qs = sp.toString();
    startTransition(() => router.push(qs ? `/admin/products?${qs}` : "/admin/products"));
  }

  async function adjust(variantId: string, changeQty: number) {
    setAdjusting(variantId);
    const r = await api<{ newStock: number }>("/api/admin/inventory/adjust", "POST", {
      variantId,
      changeQty,
      reason: changeQty > 0 ? "RESTOCK" : "MANUAL_ADJUSTMENT",
    });
    setAdjusting(null);
    if (!r.ok) return toast.error(r.data.error || "Failed to adjust stock");
    setProducts((prev) =>
      prev.map((p) => ({ ...p, variants: p.variants.map((v) => (v.id === variantId ? { ...v, stock: r.data.newStock } : v)) }))
    );
    toast.success(`Stock updated to ${r.data.newStock}`);
  }

  async function runBulk() {
    if (!confirm) return;
    setBusy(true);
    const r = await api<{ updated: number }>("/api/admin/products/bulk", "POST", confirm);
    setBusy(false);
    if (!r.ok) return toast.error(r.data.error || "Action failed");
    const label = { archive: "archived", activate: "activated", delete: "deleted", restore: "restored (as drafts)" }[confirm.action];
    toast.success(`${r.data.updated} product(s) ${label}`);
    setConfirm(null);
    router.refresh();
  }

  function exportCsv() {
    const sp = new URLSearchParams({ format: "csv" });
    if (filters.q) sp.set("q", filters.q);
    if (filters.status) sp.set("status", filters.status);
    if (filters.categoryId) sp.set("categoryId", filters.categoryId);
    if (filters.brandId) sp.set("brandId", filters.brandId);
    if (filters.low) sp.set("low", "1");
    if (filters.deleted) sp.set("deleted", "1");
    window.location.href = `/api/admin/products?${sp.toString()}`;
  }

  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const confirmCopy: Record<BulkAction, { title: string; msg: string; label: string; danger?: boolean }> = {
    archive: { title: "Archive products", msg: "Archived products are hidden from the storefront but keep their order history.", label: "Archive" },
    activate: { title: "Activate products", msg: "Active products become visible on the storefront.", label: "Activate" },
    delete: { title: "Delete products", msg: "Products are soft-deleted (order history is preserved) and can be restored later.", label: "Delete", danger: true },
    restore: { title: "Restore products", msg: "Restored products come back as drafts so you can review them before activating.", label: "Restore" },
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ q: q.trim() });
        }}
        className="card grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-6 lg:items-end"
      >
        <FilterField label="Search" className="lg:col-span-2">
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, slug or SKU" className={`${inputCls} pl-9`} />
          </span>
        </FilterField>
        <FilterField label="Status"><select value={filters.status} onChange={(e) => navigate({ status: e.target.value })} className={inputCls}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select></FilterField>
        <FilterField label="Category"><select value={filters.categoryId} onChange={(e) => navigate({ categoryId: e.target.value })} className={inputCls}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {"— ".repeat(c.level - 1)}
              {c.name}
            </option>
          ))}
        </select></FilterField>
        <FilterField label="Brand"><select value={filters.brandId} onChange={(e) => navigate({ brandId: e.target.value })} className={inputCls}>
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select></FilterField>
        <div className="flex items-center gap-4 pb-2 text-sm text-slate-600">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={filters.low} onChange={(e) => navigate({ low: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> Low stock
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={filters.deleted} onChange={(e) => navigate({ deleted: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> Deleted
          </label>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className={btnGhost}>
            <Search className="h-4 w-4" /> Search
          </button>
          <button type="button" onClick={exportCsv} className={btnGhost}>
            <Download className="h-4 w-4" /> Export CSV
          </button>
          {(filters.q || filters.status || filters.categoryId || filters.brandId || filters.low || filters.deleted) && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                startTransition(() => router.push("/admin/products"));
              }}
              className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </form>

      {/* Bulk bar */}
      {canManage && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-sm">
          <span className="font-medium text-indigo-900">{selected.size} selected</span>
          {filters.deleted ? (
            <button onClick={() => setConfirm({ action: "restore", ids: [...selected] })} className={btnGhost}>
              <RotateCcw className="h-4 w-4" /> Restore
            </button>
          ) : (
            <>
              <button onClick={() => setConfirm({ action: "activate", ids: [...selected] })} className={btnGhost}>
                <CheckCircle2 className="h-4 w-4" /> Activate
              </button>
              <button onClick={() => setConfirm({ action: "archive", ids: [...selected] })} className={btnGhost}>
                <Archive className="h-4 w-4" /> Archive
              </button>
              <button onClick={() => setConfirm({ action: "delete", ids: [...selected] })} className={`${btnGhost} !text-rose-600`}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <DataTable minWidth={900} label="Products">
            <thead>
              <tr>
                {canManage && (
                  <th className={`${thCls} w-10`}>
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)))}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                )}
                <th className={thCls}>Product</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Variant &amp; SKU</th>
                <th className={thCls}>Price</th>
                <th className={thCls}>Stock</th>
                {canAdjust && <th className={`${thCls} text-right`}>Quick adjust</th>}
                {canManage && <th className={`${thCls} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={Package} title="No products match these filters" description="Try changing or clearing the filters, or add a new product." />
                  </td>
                </tr>
              )}
              {products.map((p) =>
                p.variants.map((v, i) => {
                  const available = v.stock - v.reservedStock;
                  const first = i === 0;
                  return (
                    <tr key={v.id}>
                      {canManage && (
                        <td className={`${tdCls} align-top`}>
                          {first && <input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 rounded" />}
                        </td>
                      )}
                      <td className={`${tdCls} align-top`}>
                        {first ? (
                          <div className="flex items-center gap-3">
                            {p.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                <ImageOff className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="flex items-center gap-1 font-medium text-slate-900">
                                {p.name}
                                {p.isFeatured && <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-label="Featured" />}
                              </p>
                              <p className="text-xs text-slate-500">
                                {[p.brand, p.category].filter(Boolean).join(" · ") || "Uncategorised"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="pl-1 text-[11px] text-slate-400">↳</span>
                        )}
                      </td>
                      <td className={`${tdCls} align-top`}>
                        {first &&
                          (p.deleted ? <Chip tone="rose" dot>Deleted</Chip> : <Chip tone={statusTone[p.status] ?? "slate"} dot>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</Chip>)}
                      </td>
                      <td className={tdCls}>
                        <p className="font-medium text-slate-800">{v.title}</p>
                        <p className="font-mono text-xs text-slate-400">{v.sku}</p>
                      </td>
                      <td className={`${tdCls} font-medium tabular-nums text-slate-900`}>
                        ₹{v.price.toLocaleString("en-IN")}
                        {v.compareAtPrice ? <span className="ml-1 text-xs font-normal text-slate-400 line-through">₹{v.compareAtPrice.toLocaleString("en-IN")}</span> : null}
                      </td>
                      <td className={tdCls}>
                        <Chip tone={available <= 0 ? "rose" : available <= v.lowStockThreshold ? "amber" : "green"}>{v.stock} units</Chip>
                        {v.reservedStock > 0 && <span className="ml-1 text-xs text-slate-400">({v.reservedStock} reserved)</span>}
                      </td>
                      {canAdjust && (
                        <td className={`${tdCls} text-right`}>
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
                            <button onClick={() => adjust(v.id, -5)} disabled={adjusting === v.id || v.stock < 5 || v.stock - 5 < v.reservedStock} className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40" title="Deduct 5">
                              -5
                            </button>
                            <button onClick={() => adjust(v.id, -1)} disabled={adjusting === v.id || v.stock < 1 || v.stock - 1 < v.reservedStock} className="rounded-lg bg-white p-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40" title="Deduct 1" aria-label="Deduct 1">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => adjust(v.id, 1)} disabled={adjusting === v.id} className="rounded-lg bg-white p-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40" title="Add 1" aria-label="Add 1">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => adjust(v.id, 10)} disabled={adjusting === v.id} className="rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-40" title="Restock +10">
                              +10
                            </button>
                          </div>
                        </td>
                      )}
                      {canManage && (
                        <td className={`${tdCls} text-right align-top`}>
                          {first && (
                            <div className="inline-flex items-center gap-1">
                              {p.deleted ? (
                                <button onClick={() => setConfirm({ action: "restore", ids: [p.id] })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600" title="Restore" aria-label={`Restore ${p.name}`}>
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              ) : (
                                <>
                                  <Link href={`/admin/products/${p.id}/edit`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600" title="Edit" aria-label={`Edit ${p.name}`}>
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                  {p.status !== "ARCHIVED" && (
                                    <button onClick={() => setConfirm({ action: "archive", ids: [p.id] })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600" title="Archive" aria-label={`Archive ${p.name}`}>
                                      <Archive className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button onClick={() => setConfirm({ action: "delete", ids: [p.id] })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600" title="Delete" aria-label={`Delete ${p.name}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
      </DataTable>

      {/* Pagination */}
      <Pagination
        page={page}
        pages={pages}
        total={total}
        pageSize={20}
        hrefFor={(p) => {
          const sp = new URLSearchParams();
          if (filters.q) sp.set("q", filters.q);
          if (filters.status) sp.set("status", filters.status);
          if (filters.categoryId) sp.set("categoryId", filters.categoryId);
          if (filters.brandId) sp.set("brandId", filters.brandId);
          if (filters.low) sp.set("low", "1");
          if (filters.deleted) sp.set("deleted", "1");
          if (p > 1) sp.set("page", String(p));
          const qs = sp.toString();
          return qs ? `/admin/products?${qs}` : "/admin/products";
        }}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm ? confirmCopy[confirm.action].title : ""}
        message={confirm ? `${confirmCopy[confirm.action].msg} (${confirm.ids.length} product${confirm.ids.length === 1 ? "" : "s"})` : ""}
        confirmLabel={confirm ? confirmCopy[confirm.action].label : "Confirm"}
        danger={confirm ? confirmCopy[confirm.action].danger : false}
        busy={busy}
        onConfirm={runBulk}
        onCancel={() => !busy && setConfirm(null)}
      />
    </div>
  );
}

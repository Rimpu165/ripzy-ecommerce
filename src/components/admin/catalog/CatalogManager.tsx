"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "./ConfirmDialog";
import { api, btnGhost, btnPrimary, cardCls, inputCls, labelCls } from "./util";
import { DataTable, EmptyRow } from "@/components/admin/ui/DataTable";
import { Chip } from "@/components/admin/ui/StatusBadge";
import { thCls, tdCls } from "@/components/admin/ui/tokens";

interface Cat {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  products: number;
  children: number;
}
interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  isActive: boolean;
  products: number;
}
interface Attr {
  id: string;
  name: string;
  slug: string;
  values: string[];
}

type Tab = "categories" | "brands" | "attributes";

export default function CatalogManager(props: { categories: Cat[]; brands: BrandRow[]; attributes: Attr[] }) {
  const [tab, setTab] = useState<Tab>("categories");
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "categories", label: "Categories", count: props.categories.length },
    { id: "brands", label: "Brands", count: props.brands.length },
    { id: "attributes", label: "Attributes", count: props.attributes.length },
  ];
  return (
    <div className="space-y-5">
      <div role="tablist" className="inline-flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
              tab === t.id ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label} <span className="opacity-70">({t.count})</span>
          </button>
        ))}
      </div>
      {tab === "categories" && <CategoriesTab rows={props.categories} />}
      {tab === "brands" && <BrandsTab rows={props.brands} />}
      {tab === "attributes" && <AttributesTab rows={props.attributes} />}
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return <Chip tone={active ? "green" : "slate"} dot>{active ? "Active" : "Inactive"}</Chip>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1 ${checked ? "bg-indigo-600" : "bg-slate-300"}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function RowActions({ onEdit, onDelete, name }: { onEdit: () => void; onDelete: () => void; name: string }) {
  return (
    <div className="inline-flex items-center gap-1">
      <button onClick={onEdit} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600" aria-label={`Edit ${name}`} title="Edit">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={onDelete} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600" aria-label={`Delete ${name}`} title="Delete">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function EditorShell({ title, onClose, onSubmit, saving, children }: { title: string; onClose: () => void; onSubmit: (e: React.FormEvent) => void; saving: boolean; children: React.ReactNode }) {
  return (
    <form onSubmit={onSubmit} className={`${cardCls} space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-700" aria-label="Close editor">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
        <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save"}</button>
      </div>
    </form>
  );
}

const th = thCls;
const td = tdCls;

/* ------------------------------------------------------------------ Categories */

interface CatForm { id?: string; name: string; slug: string; description: string; image: string; parentId: string; sortOrder: string; isActive: boolean }
const blankCat: CatForm = { name: "", slug: "", description: "", image: "", parentId: "", sortOrder: "0", isActive: true };

function CategoriesTab({ rows }: { rows: Cat[] }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<CatForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<Cat | null>(null);
  const [items, setItems] = useState(rows);
  useEffect(() => setItems(rows), [rows]);

  // Depth-first ordered tree
  const tree = useMemo(() => {
    const out: Cat[] = [];
    const walk = (parent: string | null) => {
      items
        .filter((c) => c.parentId === parent)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .forEach((c) => {
          out.push(c);
          walk(c.id);
        });
    };
    walk(null);
    // orphans safety net
    items.forEach((c) => !out.includes(c) && out.push(c));
    return out;
  }, [items]);

  const descendantsOf = (id: string) => {
    const set = new Set<string>();
    const walk = (p: string) => items.filter((c) => c.parentId === p).forEach((c) => { set.add(c.id); walk(c.id); });
    walk(id);
    return set;
  };
  const parentOptions = form
    ? tree.filter((c) => c.level < 3 && c.id !== form.id && !(form.id && descendantsOf(form.id).has(c.id)))
    : [];

  const bodyOf = (f: CatForm) => ({
    name: f.name,
    slug: f.slug.trim(),
    description: f.description.trim() || null,
    image: f.image.trim() || null,
    parentId: f.parentId || null,
    sortOrder: Number(f.sortOrder) || 0,
    isActive: f.isActive,
  });
  const formOf = (c: Cat): CatForm => ({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", image: c.image ?? "", parentId: c.parentId ?? "", sortOrder: String(c.sortOrder), isActive: c.isActive });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const r = form.id ? await api(`/api/admin/categories/${form.id}`, "PUT", bodyOf(form)) : await api("/api/admin/categories", "POST", bodyOf(form));
    setSaving(false);
    if (!r.ok) return toast.error(r.data.error || "Could not save category");
    toast.success(form.id ? "Category updated" : "Category created");
    setForm(null);
    router.refresh();
  }

  async function toggleActive(c: Cat) {
    setItems((l) => l.map((x) => (x.id === c.id ? { ...x, isActive: !x.isActive } : x)));
    const r = await api(`/api/admin/categories/${c.id}`, "PUT", bodyOf({ ...formOf(c), isActive: !c.isActive }));
    if (!r.ok) {
      setItems(rows);
      return toast.error(r.data.error || "Could not update category");
    }
    toast.success(c.isActive ? "Category deactivated" : "Category activated");
    router.refresh();
  }

  async function remove() {
    if (!del) return;
    setSaving(true);
    const r = await api(`/api/admin/categories/${del.id}`, "DELETE");
    setSaving(false);
    setDel(null);
    if (!r.ok) return toast.error(r.data.error || "Could not delete category");
    toast.success("Category deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setForm({ ...blankCat })} className={btnPrimary}><Plus className="h-4 w-4" /> New category</button>
      </div>

      {form && (
        <EditorShell title={form.id ? "Edit category" : "New category"} onClose={() => setForm(null)} onSubmit={save} saving={saving}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="c-name">Name *</label>
              <input id="c-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-slug">Slug (auto if empty)</label>
              <input id="c-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-parent">Parent category</label>
              <select id="c-parent" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={inputCls}>
                <option value="">None (top level)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>{"— ".repeat(c.level - 1)}{c.name} (L{c.level})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="c-sort">Sort order</label>
              <input id="c-sort" type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="c-img">Image URL</label>
              <input id="c-img" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="c-desc">Description</label>
              <textarea id="c-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> Active
          </label>
        </EditorShell>
      )}

      <DataTable minWidth={560}>
            <thead>
              <tr>
                <th className={th}>Category</th><th className={th}>Level</th><th className={th}>Sort</th><th className={th}>Products</th><th className={th}>Active</th><th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tree.length === 0 && <EmptyRow colSpan={6}>No categories yet. Use the button above to add one.</EmptyRow>}
              {tree.map((c) => (
                <tr key={c.id}>
                  <td className={td}>
                    <div className="flex items-center gap-2" style={{ paddingLeft: (c.level - 1) * 20 }}>
                      {c.level > 1 && <span className="text-slate-300">└</span>}
                      {c.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt="" className="h-7 w-7 rounded-md object-cover" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{c.name}</p>
                        <p className="font-mono text-xs text-slate-400">{c.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>L{c.level}</td>
                  <td className={td}>{c.sortOrder}</td>
                  <td className={td}>{c.products}</td>
                  <td className={td}><Toggle checked={c.isActive} onChange={() => toggleActive(c)} label={`Toggle ${c.name} active`} /></td>
                  <td className={`${td} text-right`}><RowActions name={c.name} onEdit={() => setForm(formOf(c))} onDelete={() => setDel(c)} /></td>
                </tr>
              ))}
            </tbody>
          </DataTable>

      <ConfirmDialog
        open={!!del}
        title="Delete category"
        message={
          del && (del.products > 0 || del.children > 0)
            ? `"${del.name}" has ${del.products} product(s) and ${del.children} sub-categor${del.children === 1 ? "y" : "ies"} and cannot be deleted. Deactivate it instead using the Active switch.`
            : `Permanently delete "${del?.name}"? This cannot be undone.`
        }
        confirmLabel="Delete"
        danger
        busy={saving}
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Brands */

interface BrandForm { id?: string; name: string; slug: string; logo: string; description: string; isActive: boolean }
const blankBrand: BrandForm = { name: "", slug: "", logo: "", description: "", isActive: true };

function BrandsTab({ rows }: { rows: BrandRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<BrandForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<BrandRow | null>(null);

  const bodyOf = (f: BrandForm) => ({ name: f.name, slug: f.slug.trim(), logo: f.logo.trim() || null, description: f.description.trim() || null, isActive: f.isActive });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const r = form.id ? await api(`/api/admin/brands/${form.id}`, "PUT", bodyOf(form)) : await api("/api/admin/brands", "POST", bodyOf(form));
    setSaving(false);
    if (!r.ok) return toast.error(r.data.error || "Could not save brand");
    toast.success(form.id ? "Brand updated" : "Brand created");
    setForm(null);
    router.refresh();
  }
  async function toggleActive(b: BrandRow) {
    const r = await api(`/api/admin/brands/${b.id}`, "PUT", bodyOf({ id: b.id, name: b.name, slug: b.slug, logo: b.logo ?? "", description: b.description ?? "", isActive: !b.isActive }));
    if (!r.ok) return toast.error(r.data.error || "Could not update brand");
    toast.success(b.isActive ? "Brand deactivated" : "Brand activated");
    router.refresh();
  }
  async function remove() {
    if (!del) return;
    setSaving(true);
    const r = await api(`/api/admin/brands/${del.id}`, "DELETE");
    setSaving(false);
    setDel(null);
    if (!r.ok) return toast.error(r.data.error || "Could not delete brand");
    toast.success("Brand deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setForm({ ...blankBrand })} className={btnPrimary}><Plus className="h-4 w-4" /> New brand</button>
      </div>
      {form && (
        <EditorShell title={form.id ? "Edit brand" : "New brand"} onClose={() => setForm(null)} onSubmit={save} saving={saving}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="b-name">Name *</label>
              <input id="b-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="b-slug">Slug (auto if empty)</label>
              <input id="b-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={`${inputCls} font-mono`} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="b-logo">Logo URL</label>
              <input id="b-logo" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="https://..." className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="b-desc">Description</label>
              <textarea id="b-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> Active
          </label>
        </EditorShell>
      )}
      <DataTable minWidth={560}>
            <thead>
              <tr><th className={th}>Brand</th><th className={th}>Products</th><th className={th}>Status</th><th className={th}>Active</th><th className={`${th} text-right`}>Actions</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={5}>No brands yet. Use the button above to add one.</EmptyRow>}
              {rows.map((b) => (
                <tr key={b.id}>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      {b.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.logo} alt="" className="h-7 w-7 rounded-md object-contain" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{b.name}</p>
                        <p className="font-mono text-xs text-slate-400">{b.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>{b.products}</td>
                  <td className={td}><ActiveBadge active={b.isActive} /></td>
                  <td className={td}><Toggle checked={b.isActive} onChange={() => toggleActive(b)} label={`Toggle ${b.name} active`} /></td>
                  <td className={`${td} text-right`}><RowActions name={b.name} onEdit={() => setForm({ id: b.id, name: b.name, slug: b.slug, logo: b.logo ?? "", description: b.description ?? "", isActive: b.isActive })} onDelete={() => setDel(b)} /></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
      <ConfirmDialog
        open={!!del}
        title="Delete brand"
        message={del && del.products > 0 ? `"${del.name}" is used by ${del.products} product(s) and cannot be deleted. Deactivate it instead.` : `Permanently delete "${del?.name}"?`}
        confirmLabel="Delete"
        danger
        busy={saving}
        onConfirm={remove}
        onCancel={() => setDel(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Attributes */

interface AttrForm { id?: string; name: string; slug: string; values: string[]; draft: string }

function AttributesTab({ rows }: { rows: Attr[] }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<AttrForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<Attr | null>(null);

  function addValues(f: AttrForm): AttrForm {
    const parts = f.draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return f;
    const have = new Set(f.values.map((v) => v.toLowerCase()));
    const merged = [...f.values];
    parts.forEach((p) => { if (!have.has(p.toLowerCase())) { have.add(p.toLowerCase()); merged.push(p); } });
    return { ...f, values: merged, draft: "" };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const f = addValues(form);
    setSaving(true);
    const body = { name: f.name, slug: f.slug.trim(), values: f.values };
    const r = f.id ? await api(`/api/admin/attributes/${f.id}`, "PUT", body) : await api("/api/admin/attributes", "POST", body);
    setSaving(false);
    if (!r.ok) return toast.error(r.data.error || "Could not save attribute");
    toast.success(f.id ? "Attribute updated" : "Attribute created");
    setForm(null);
    router.refresh();
  }
  async function remove() {
    if (!del) return;
    setSaving(true);
    const r = await api(`/api/admin/attributes/${del.id}`, "DELETE");
    setSaving(false);
    setDel(null);
    if (!r.ok) return toast.error(r.data.error || "Could not delete attribute");
    toast.success("Attribute deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setForm({ name: "", slug: "", values: [], draft: "" })} className={btnPrimary}><Plus className="h-4 w-4" /> New attribute</button>
      </div>
      {form && (
        <EditorShell title={form.id ? "Edit attribute" : "New attribute"} onClose={() => setForm(null)} onSubmit={save} saving={saving}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="a-name">Name *</label>
              <input id="a-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Color" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="a-slug">Slug (auto if empty)</label>
              <input id="a-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={`${inputCls} font-mono`} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="a-val">Values (press Enter or comma to add)</label>
            <input
              id="a-val"
              value={form.draft}
              onChange={(e) => setForm({ ...form, draft: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  setForm(addValues(form));
                }
              }}
              placeholder="Black, White, Blue"
              className={inputCls}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.values.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  {v}
                  <button type="button" aria-label={`Remove ${v}`} onClick={() => setForm({ ...form, values: form.values.filter((x) => x !== v) })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </EditorShell>
      )}
      <DataTable minWidth={560}>
            <thead>
              <tr><th className={th}>Attribute</th><th className={th}>Values</th><th className={`${th} text-right`}>Actions</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={3}>No attributes yet. Use the button above to add one.</EmptyRow>}
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className={td}>
                    <p className="font-medium text-slate-900">{a.name}</p>
                    <p className="font-mono text-xs text-slate-400">{a.slug}</p>
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      {a.values.length === 0 && <span className="text-slate-400">No values</span>}
                      {a.values.map((v) => (
                        <span key={v} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{v}</span>
                      ))}
                    </div>
                  </td>
                  <td className={`${td} text-right`}><RowActions name={a.name} onEdit={() => setForm({ id: a.id, name: a.name, slug: a.slug, values: a.values, draft: "" })} onDelete={() => setDel(a)} /></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
      <ConfirmDialog open={!!del} title="Delete attribute" message={`Delete "${del?.name}"? Existing variants keep their stored attribute values.`} confirmLabel="Delete" danger busy={saving} onConfirm={remove} onCancel={() => setDel(null)} />
    </div>
  );
}

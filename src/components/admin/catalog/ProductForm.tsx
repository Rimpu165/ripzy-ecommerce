"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImageOff, Plus, Star, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "./ConfirmDialog";
import { api, btnGhost, btnPrimary, inputCls, labelCls, slugify } from "./util";
import { btnDanger } from "@/components/admin/ui/tokens";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { SectionCard, FormField, StickySaveBar, InlineAlert } from "@/components/admin/ui/Form";
import { EmptyState } from "@/components/admin/ui/EmptyState";

export interface ProductFormInitial {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  brandId: string | null;
  categoryId: string | null;
  taxRate: number;
  status: string;
  isFeatured: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  variants: {
    id: string;
    sku: string;
    title: string;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    reservedStock: number;
    lowStockThreshold: number;
    attributes: string | null;
    orderRefs: number;
  }[];
  images: { url: string; altText: string | null; isPrimary: boolean }[];
}

interface VariantState {
  key: string;
  id?: string;
  sku: string;
  title: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  lowStockThreshold: string;
  reserved: number;
  orderRefs: number;
  attrs: { k: string; v: string }[];
}
interface ImageState {
  url: string;
  altText: string;
  isPrimary: boolean;
}

interface Props {
  initial?: ProductFormInitial;
  categories: { id: string; name: string; level: number }[];
  brands: { id: string; name: string }[];
  attributes: { id: string; name: string; values: string[] }[];
}

let keySeq = 0;
const nextKey = () => `v${++keySeq}`;

function parseAttrs(raw: string | null): { k: string; v: string }[] {
  if (!raw) return [];
  try {
    const o = JSON.parse(raw);
    return Object.entries(o).map(([k, v]) => ({ k, v: String(v) }));
  } catch {
    return [];
  }
}

const blankVariant = (): VariantState => ({
  key: nextKey(),
  sku: "",
  title: "Default",
  price: "",
  compareAtPrice: "",
  stock: "0",
  lowStockThreshold: "5",
  reserved: 0,
  orderRefs: 0,
  attrs: [],
});

export default function ProductForm({ initial, categories, brands, attributes }: Props) {
  const router = useRouter();
  const toast = useToast();
  const editing = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? "");
  const [brandId, setBrandId] = useState(initial?.brandId ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [taxRate, setTaxRate] = useState(String(initial?.taxRate ?? 18));
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [variants, setVariants] = useState<VariantState[]>(
    initial?.variants.length
      ? initial.variants.map((v) => ({
          key: nextKey(),
          id: v.id,
          sku: v.sku,
          title: v.title,
          price: String(v.price),
          compareAtPrice: v.compareAtPrice != null ? String(v.compareAtPrice) : "",
          stock: String(v.stock),
          lowStockThreshold: String(v.lowStockThreshold),
          reserved: v.reservedStock,
          orderRefs: v.orderRefs,
          attrs: parseAttrs(v.attributes),
        }))
      : [blankVariant()]
  );
  const [images, setImages] = useState<ImageState[]>(
    (initial?.images ?? []).map((i) => ({ url: i.url, altText: i.altText ?? "", isPrimary: i.isPrimary }))
  );
  const [newImage, setNewImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorCount = Object.keys(errors).length;
  const clearErr = (k: string) =>
    setErrors((e) => {
      if (!e[k]) return e;
      const n = { ...e };
      delete n[k];
      return n;
    });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const patchVariant = (key: string, patch: Partial<VariantState>) =>
    setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));

  function removeVariant(key: string) {
    const v = variants.find((x) => x.key === key);
    if (v && v.orderRefs > 0) {
      toast.error(`"${v.sku}" is referenced by ${v.orderRefs} order line(s) and cannot be removed. Set its stock to 0 instead.`);
      return;
    }
    if (v?.id) setConfirmRemove(key);
    else setVariants((vs) => vs.filter((x) => x.key !== key));
  }

  function addImage() {
    const url = newImage.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) return toast.error("Image URL must start with http(s):// or /");
    if (images.length >= 20) return toast.error("Maximum 20 images");
    setImages((im) => [...im, { url, altText: "", isPrimary: im.length === 0 }]);
    setNewImage("");
  }
  const moveImage = (i: number, d: -1 | 1) =>
    setImages((im) => {
      const j = i + d;
      if (j < 0 || j >= im.length) return im;
      const c = [...im];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const removeImage = (i: number) =>
    setImages((im) => {
      const c = im.filter((_, x) => x !== i);
      if (c.length && !c.some((x) => x.isPrimary)) c[0].isPrimary = true;
      return c;
    });
  const setPrimary = (i: number) => setImages((im) => im.map((x, idx) => ({ ...x, isPrimary: idx === i })));

  async function save(e: React.FormEvent) {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Product name is required";
    if (!description.trim()) errs.description = "Description is required";
    const tax = Number(taxRate);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) errs.taxRate = "GST rate must be between 0 and 100";

    const payloadVariants = [];
    const skus = new Set<string>();
    for (const v of variants) {
      const price = Number(v.price);
      const mrp = v.compareAtPrice.trim() === "" ? null : Number(v.compareAtPrice);
      const stock = Number(v.stock);
      const low = Number(v.lowStockThreshold);
      const k = (f: string) => `${v.key}.${f}`;
      if (!v.sku.trim()) errs[k("sku")] = "SKU is required";
      else if (skus.has(v.sku.trim().toLowerCase())) errs[k("sku")] = `Duplicate SKU "${v.sku}"`;
      skus.add(v.sku.trim().toLowerCase());
      if (!v.title.trim()) errs[k("title")] = "Title is required";
      if (!Number.isFinite(price) || price <= 0) errs[k("price")] = "Must be greater than 0";
      if (mrp !== null && (!Number.isFinite(mrp) || mrp < price)) errs[k("mrp")] = "MRP must be at least the selling price";
      if (!Number.isInteger(stock) || stock < 0) errs[k("stock")] = "Whole number, 0 or more";
      else if (stock < v.reserved) errs[k("stock")] = `Cannot be below ${v.reserved} reserved units`;
      if (!Number.isInteger(low) || low < 0) errs[k("low")] = "Whole number, 0 or more";
      const attributes: Record<string, string> = {};
      for (const a of v.attrs) {
        if (!a.k.trim() && !a.v.trim()) continue;
        if (!a.k.trim() || !a.v.trim()) {
          errs[k("attrs")] = "Each attribute needs a name and a value";
          break;
        }
        attributes[a.k.trim()] = a.v.trim();
      }
      payloadVariants.push({ id: v.id, sku: v.sku.trim(), title: v.title.trim(), price, compareAtPrice: mrp, stock, lowStockThreshold: low, attributes });
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Please fix the highlighted fields");
      const firstKey = Object.keys(errs)[0];
      const id = firstKey === "name" ? "p-name" : firstKey === "description" ? "p-desc" : firstKey === "taxRate" ? "p-tax" : null;
      if (id) document.getElementById(id)?.focus();
      return;
    }

    setSaving(true);
    const body = {
      name,
      slug: slug.trim(),
      description,
      shortDescription: shortDescription.trim() || null,
      brandId: brandId || null,
      categoryId: categoryId || null,
      taxRate: tax,
      status,
      isFeatured,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      variants: payloadVariants,
      images: images.map((i) => ({ url: i.url, altText: i.altText.trim() || null, isPrimary: i.isPrimary })),
    };
    const r = editing
      ? await api(`/api/admin/products/${initial!.id}`, "PUT", body)
      : await api<{ id: string }>("/api/admin/products", "POST", body);
    setSaving(false);
    if (!r.ok) return toast.error(r.data.error || "Could not save product");
    toast.success(editing ? "Product updated" : "Product created");
    router.push("/admin/products");
    router.refresh();
  }

  async function softDelete() {
    setSaving(true);
    const r = await api(`/api/admin/products/${initial!.id}`, "DELETE");
    setSaving(false);
    if (!r.ok) return toast.error(r.data.error || "Could not delete product");
    toast.success("Product deleted (can be restored from the Deleted filter)");
    router.push("/admin/products");
    router.refresh();
  }

  const cls = (key: string) => `${inputCls} ${errors[key] ? "!border-rose-400 !ring-rose-500/10" : ""}`;

  return (
    <form onSubmit={save} className="pb-2" noValidate>
      <PageHeader
        title={editing ? "Edit product" : "New product"}
        description={editing ? initial!.name : "Add a product with its variants, pricing and images."}
        breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: editing ? "Edit" : "New" }]}
        actions={
          editing ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className={btnDanger}>
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          ) : undefined
        }
      />

      {errorCount > 0 && (
        <div className="mb-4">
          <InlineAlert>Please fix {errorCount} highlighted field{errorCount === 1 ? "" : "s"} before saving.</InlineAlert>
        </div>
      )}

      <div className="space-y-6">
        {/* Basics */}
        <SectionCard title="Basic information" description="Name, description and catalog placement.">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Name" htmlFor="p-name" required error={errors.name}>
                <input
                  id="p-name"
                  value={name}
                  maxLength={200}
                  aria-invalid={!!errors.name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearErr("name");
                    if (!slugTouched) setSlug(slugify(e.target.value));
                  }}
                  className={cls("name")}
                />
              </FormField>
              <FormField label="Slug" htmlFor="p-slug" hint={editing ? "Changing the slug changes the product URL." : "Auto-generated from the name; must be unique."}>
                <input
                  id="p-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="auto-generated from name"
                  className={`${inputCls} font-mono`}
                />
              </FormField>
            </div>
            <FormField label="Short description" htmlFor="p-short" hint="One line shown in listings.">
              <input id="p-short" value={shortDescription} maxLength={500} onChange={(e) => setShortDescription(e.target.value)} className={inputCls} />
            </FormField>
            <FormField label="Description" htmlFor="p-desc" required error={errors.description}>
              <textarea
                id="p-desc"
                rows={6}
                value={description}
                aria-invalid={!!errors.description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clearErr("description");
                }}
                className={cls("description")}
              />
            </FormField>
            <div className="grid gap-4 md:grid-cols-4">
              <FormField label="Brand" htmlFor="p-brand">
                <select id="p-brand" value={brandId} onChange={(e) => setBrandId(e.target.value)} className={inputCls}>
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Category" htmlFor="p-cat">
                <select id="p-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                  <option value="">Uncategorised</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {"— ".repeat(c.level - 1)}
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="GST rate (%)" htmlFor="p-tax" error={errors.taxRate}>
                <input
                  id="p-tax"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={taxRate}
                  aria-invalid={!!errors.taxRate}
                  onChange={(e) => {
                    setTaxRate(e.target.value);
                    clearErr("taxRate");
                  }}
                  className={cls("taxRate")}
                />
              </FormField>
              <FormField label="Status" htmlFor="p-status" hint="Only active products show on the storefront.">
                <select id="p-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Featured on homepage
            </label>
          </div>
        </SectionCard>

        {/* Variants */}
        <SectionCard
          title="Variants"
          description="Each variant has its own SKU, price and stock."
          actions={
            <button type="button" onClick={() => setVariants((v) => [...v, blankVariant()])} className={btnGhost}>
              <Plus className="h-4 w-4" /> Add variant
            </button>
          }
        >
          <div className="space-y-4">
            {variants.map((v, vi) => (
              <div key={v.key} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    Variant {vi + 1}
                    {v.orderRefs > 0 ? ` · used in ${v.orderRefs} order line(s)` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeVariant(v.key)}
                    disabled={variants.length === 1}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 disabled:opacity-30"
                    aria-label={`Remove variant ${vi + 1}`}
                    title={variants.length === 1 ? "A product needs at least one variant" : "Remove variant"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <FormField label="SKU" htmlFor={`sku-${v.key}`} required error={errors[`${v.key}.sku`]}>
                    <input id={`sku-${v.key}`} value={v.sku} onChange={(e) => { patchVariant(v.key, { sku: e.target.value }); clearErr(`${v.key}.sku`); }} className={`${cls(`${v.key}.sku`)} font-mono`} />
                  </FormField>
                  <FormField className="md:col-span-2" label="Title" htmlFor={`title-${v.key}`} required error={errors[`${v.key}.title`]}>
                    <input id={`title-${v.key}`} value={v.title} onChange={(e) => { patchVariant(v.key, { title: e.target.value }); clearErr(`${v.key}.title`); }} placeholder="e.g. Space Black / 256GB" className={cls(`${v.key}.title`)} />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <FormField label="Price (₹)" htmlFor={`price-${v.key}`} required error={errors[`${v.key}.price`]}>
                    <input id={`price-${v.key}`} type="number" min={0} step="0.01" value={v.price} onChange={(e) => { patchVariant(v.key, { price: e.target.value }); clearErr(`${v.key}.price`); }} className={cls(`${v.key}.price`)} />
                  </FormField>
                  <FormField label="MRP (₹)" htmlFor={`mrp-${v.key}`} error={errors[`${v.key}.mrp`]} hint="Struck-through compare price.">
                    <input id={`mrp-${v.key}`} type="number" min={0} step="0.01" value={v.compareAtPrice} onChange={(e) => { patchVariant(v.key, { compareAtPrice: e.target.value }); clearErr(`${v.key}.mrp`); }} className={cls(`${v.key}.mrp`)} />
                  </FormField>
                  <FormField label={`Stock${v.reserved > 0 ? ` (${v.reserved} reserved)` : ""}`} htmlFor={`stock-${v.key}`} error={errors[`${v.key}.stock`]}>
                    <input id={`stock-${v.key}`} type="number" min={0} step="1" value={v.stock} onChange={(e) => { patchVariant(v.key, { stock: e.target.value }); clearErr(`${v.key}.stock`); }} className={cls(`${v.key}.stock`)} />
                  </FormField>
                  <FormField label="Low-stock alert at" htmlFor={`low-${v.key}`} error={errors[`${v.key}.low`]}>
                    <input id={`low-${v.key}`} type="number" min={0} step="1" value={v.lowStockThreshold} onChange={(e) => { patchVariant(v.key, { lowStockThreshold: e.target.value }); clearErr(`${v.key}.low`); }} className={cls(`${v.key}.low`)} />
                  </FormField>
                </div>
                <div>
                  <p className={labelCls}>Attributes</p>
                  {errors[`${v.key}.attrs`] && <p role="alert" className="mb-1 text-xs text-rose-600">{errors[`${v.key}.attrs`]}</p>}
                  <div className="space-y-2">
                    {v.attrs.map((a, ai) => {
                      const known = attributes.find((x) => x.name.toLowerCase() === a.k.trim().toLowerCase());
                      const listId = `vals-${v.key}-${ai}`;
                      return (
                        <div key={ai} className="flex items-center gap-2">
                          <input
                            aria-label="Attribute name"
                            list="attr-names"
                            value={a.k}
                            onChange={(e) => patchVariant(v.key, { attrs: v.attrs.map((x, i) => (i === ai ? { ...x, k: e.target.value } : x)) })}
                            placeholder="name (e.g. color)"
                            className={inputCls}
                          />
                          <input
                            aria-label="Attribute value"
                            list={listId}
                            value={a.v}
                            onChange={(e) => patchVariant(v.key, { attrs: v.attrs.map((x, i) => (i === ai ? { ...x, v: e.target.value } : x)) })}
                            placeholder="value (e.g. Black)"
                            className={inputCls}
                          />
                          {known && (
                            <datalist id={listId}>
                              {known.values.map((val) => (
                                <option key={val} value={val} />
                              ))}
                            </datalist>
                          )}
                          <button type="button" onClick={() => patchVariant(v.key, { attrs: v.attrs.filter((_, i) => i !== ai) })} className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40" aria-label="Remove attribute">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                    <button type="button" onClick={() => patchVariant(v.key, { attrs: [...v.attrs, { k: "", v: "" }] })} className="rounded text-xs font-medium text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40">
                      + Add attribute
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <datalist id="attr-names">
            {attributes.map((a) => (
              <option key={a.id} value={a.name} />
            ))}
          </datalist>
          {editing && <p className="mt-3 text-xs text-slate-500">Changing a variant&apos;s stock here writes a MANUAL_ADJUSTMENT row to the inventory ledger.</p>}
        </SectionCard>

        {/* Images */}
        <SectionCard title="Image gallery" description="The first image, or the one marked primary, is used in listings.">
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                aria-label="Image URL"
                value={newImage}
                onChange={(e) => setNewImage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImage();
                  }
                }}
                placeholder="https://... image URL"
                className={inputCls}
              />
              <button type="button" onClick={addImage} className={btnGhost}>
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {images.length === 0 ? (
              <EmptyState compact icon={ImageOff} title="No images yet" description="The first image added becomes the primary image." />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((img, i) => (
                  <li key={`${img.url}-${i}`} className={`space-y-2 rounded-lg border p-3 ${img.isPrimary ? "border-indigo-300 bg-indigo-50/30" : "border-slate-200"}`}>
                    <ImagePreview url={img.url} />
                    <input
                      aria-label="Alt text"
                      value={img.altText}
                      onChange={(e) => setImages((im) => im.map((x, idx) => (idx === i ? { ...x, altText: e.target.value } : x)))}
                      placeholder="Alt text (defaults to product name)"
                      className={`${inputCls} !py-1.5 !text-xs`}
                    />
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => setPrimary(i)} className={`inline-flex items-center gap-1 rounded text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${img.isPrimary ? "text-indigo-600" : "text-slate-500 hover:text-indigo-600"}`}>
                        <Star className={`h-3.5 w-3.5 ${img.isPrimary ? "fill-current" : ""}`} /> {img.isPrimary ? "Primary" : "Make primary"}
                      </button>
                      <div className="flex items-center">
                        <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down">
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => removeImage(i)} className="rounded p-1 text-slate-500 hover:text-rose-600" aria-label="Remove image">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>

        {/* SEO */}
        <SectionCard title="Search engine listing" description="Optional. Defaults to the product name and short description.">
          <div className="space-y-4">
            <FormField label={`Meta title (${metaTitle.length}/120)`} htmlFor="p-mt">
              <input id="p-mt" value={metaTitle} maxLength={120} onChange={(e) => setMetaTitle(e.target.value)} className={inputCls} />
            </FormField>
            <FormField label={`Meta description (${metaDescription.length}/320)`} htmlFor="p-md">
              <textarea id="p-md" rows={2} value={metaDescription} maxLength={320} onChange={(e) => setMetaDescription(e.target.value)} className={inputCls} />
            </FormField>
          </div>
        </SectionCard>
      </div>

      <StickySaveBar note={editing ? "Saving updates the live product." : "New products are saved as drafts unless set to Active."}>
        <Link href="/admin/products" className={btnGhost}>Cancel</Link>
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? "Saving..." : editing ? "Save changes" : "Create product"}
        </button>
      </StickySaveBar>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete product"
        message="The product is soft-deleted: hidden from the storefront but order history is preserved. You can restore it later."
        confirmLabel="Delete"
        danger
        busy={saving}
        onConfirm={softDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove variant"
        message="This variant will be deleted when you save (its carts entries and ledger history are removed). Variants referenced by orders cannot be deleted."
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          setVariants((vs) => vs.filter((x) => x.key !== confirmRemove));
          setConfirmRemove(null);
        }}
        onCancel={() => setConfirmRemove(null)}
      />
    </form>
  );
}

function ImagePreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-slate-100">
      {failed ? (
        <div className="flex flex-col items-center gap-1 text-xs text-slate-400">
          <ImageOff className="h-6 w-6" /> Cannot load image
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Preview" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

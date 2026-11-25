"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/admin/ui/Modal";
import { EmptyCard } from "@/components/admin/ui/EmptyState";
import { ImageIcon } from "lucide-react";
import {
  Badge, Field, Modal, PageTitle, Toggle, btnDanger, btnGhost, btnPrimary, callApi, fmtDate, fromLocalInput,
  inputCls, toLocalInput,
} from "./ui";

export interface BannerRow {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
}

interface FormState {
  id?: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  badge: string;
  sortOrder: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

const emptyForm = (): FormState => ({
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "/products",
  badge: "",
  sortOrder: "0",
  isActive: true,
  startsAt: toLocalInput(new Date().toISOString()),
  endsAt: "",
});

function liveState(b: BannerRow): { label: string; tone: "green" | "slate" | "amber" | "rose" } {
  const now = Date.now();
  if (!b.isActive) return { label: "Inactive", tone: "slate" };
  if (new Date(b.startsAt).getTime() > now) return { label: "Scheduled", tone: "amber" };
  if (b.endsAt && new Date(b.endsAt).getTime() <= now) return { label: "Ended", tone: "rose" };
  return { label: "Live", tone: "green" };
}

export default function BannersClient({ banners }: { banners: BannerRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [toDelete, setToDelete] = useState<BannerRow | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    if (k === "imageUrl") setImgError(false);
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  const openEdit = (b: BannerRow) => {
    setImgError(false);
    setForm({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle ?? "",
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl ?? "",
      badge: b.badge ?? "",
      sortOrder: String(b.sortOrder),
      isActive: b.isActive,
      startsAt: toLocalInput(b.startsAt),
      endsAt: toLocalInput(b.endsAt),
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const body = {
      title: form.title,
      subtitle: form.subtitle || null,
      imageUrl: form.imageUrl.trim(),
      linkUrl: form.linkUrl.trim() || null,
      badge: form.badge || null,
      sortOrder: Number(form.sortOrder || 0),
      isActive: form.isActive,
      startsAt: fromLocalInput(form.startsAt) ?? new Date().toISOString(),
      endsAt: fromLocalInput(form.endsAt),
    };
    setSaving(true);
    const res = await callApi(form.id ? `/api/admin/banners/${form.id}` : "/api/admin/banners", form.id ? "PATCH" : "POST", body);
    setSaving(false);
    if (!res.ok) return toast.error(res.data.error || "Could not save banner");
    toast.success(form.id ? "Banner updated" : "Banner created");
    setForm(null);
    router.refresh();
  };

  const toggle = async (b: BannerRow) => {
    setBusyId(b.id);
    const res = await callApi(`/api/admin/banners/${b.id}`, "PATCH", { isActive: !b.isActive });
    setBusyId(null);
    if (!res.ok) return toast.error(res.data.error || "Failed");
    toast.success(b.isActive ? "Banner hidden" : "Banner activated");
    router.refresh();
  };

  const remove = async (b: BannerRow) => {
    setBusyId(b.id);
    const res = await callApi(`/api/admin/banners/${b.id}`, "DELETE");
    setBusyId(null);
    setToDelete(null);
    if (!res.ok) return toast.error(res.data.error || "Failed");
    toast.success("Banner deleted");
    router.refresh();
  };

  return (
    <div>
      <PageTitle
        title="Homepage banners"
        subtitle="Live banners rotate in the homepage hero carousel, ordered by sort order."
        action={
          <button className={btnPrimary} onClick={() => { setImgError(false); setForm(emptyForm()); }}>
            <Plus className="h-4 w-4" /> New banner
          </button>
        }
      />

      {banners.length === 0 ? (
        <EmptyCard
          icon={ImageIcon}
          title="No banners yet"
          description="The storefront shows its default hero until you add one."
          action={<button className={btnPrimary} onClick={() => { setImgError(false); setForm(emptyForm()); }}><Plus className="h-4 w-4" /> New banner</button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {banners.map((b) => {
            const st = liveState(b);
            return (
              <div key={b.id} className="card overflow-hidden">
                <div className="relative aspect-[16/7] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute left-3 top-3 flex gap-2">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <Badge tone="indigo">#{b.sortOrder}</Badge>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div>
                    <h3 className="truncate text-sm font-semibold text-slate-900">{b.title}</h3>
                    {b.subtitle && <p className="line-clamp-2 text-xs text-slate-500">{b.subtitle}</p>}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {fmtDate(b.startsAt)} → {b.endsAt ? fmtDate(b.endsAt) : "no end"}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button className={btnGhost} onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button className={btnGhost} disabled={busyId === b.id} onClick={() => toggle(b)}>
                      {b.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {b.isActive ? "Hide" : "Show"}
                    </button>
                    <button className={btnDanger} disabled={busyId === b.id} onClick={() => setToDelete(b)} aria-label={`Delete ${b.title}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Delete banner?"
        message={`"${toDelete?.title ?? ""}" will be removed from the homepage carousel. This cannot be undone.`}
        confirmLabel="Delete"
        busy={!!toDelete && busyId === toDelete.id}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove(toDelete)}
      />

      {form && (
        <Modal title={form.id ? "Edit banner" : "New banner"} onClose={() => setForm(null)} wide>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title *" htmlFor="b-title">
                <input id="b-title" required maxLength={120} className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="Badge" htmlFor="b-badge" hint="Small label above the title, e.g. NEW ARRIVALS">
                <input id="b-badge" maxLength={40} className={inputCls} value={form.badge} onChange={(e) => set("badge", e.target.value)} />
              </Field>
            </div>
            <Field label="Subtitle" htmlFor="b-sub">
              <textarea id="b-sub" rows={2} maxLength={300} className={inputCls} value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </Field>
            <Field label="Image URL *" htmlFor="b-img" hint="https://… or a /path inside this site">
              <input id="b-img" required className={inputCls} value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://images.unsplash.com/…" />
            </Field>
            {form.imageUrl && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {imgError ? (
                  <p className="p-6 text-center text-xs text-rose-500">Image could not be loaded - check the URL.</p>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="Banner preview" className="aspect-[16/6] w-full object-cover" onError={() => setImgError(true)} />
                )}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Link" htmlFor="b-link" hint="Where the button goes (optional)">
                <input id="b-link" className={inputCls} value={form.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} placeholder="/products" />
              </Field>
              <Field label="Sort order" htmlFor="b-sort" hint="Lower numbers appear first">
                <input id="b-sort" type="number" step={1} className={inputCls} value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
              </Field>
              <Field label="Starts" htmlFor="b-start">
                <input id="b-start" type="datetime-local" className={inputCls} value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </Field>
              <Field label="Ends" htmlFor="b-end" hint="Leave empty to run indefinitely">
                <input id="b-end" type="datetime-local" className={inputCls} value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <Toggle checked={form.isActive} onChange={(v) => set("isActive", v)} label="Active" />
              <span className="text-sm font-medium text-slate-700">{form.isActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save banner"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

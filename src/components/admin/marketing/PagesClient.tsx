"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import SafeMarkdown from "./SafeMarkdown";
import { DataTable } from "@/components/admin/ui/DataTable";
import { ConfirmDialog } from "@/components/admin/ui/Modal";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { thCls, tdCls } from "@/components/admin/ui/tokens";
import { FileText } from "lucide-react";
import { Badge, Field, Modal, PageTitle, Toggle, btnDanger, btnGhost, btnPrimary, callApi, fmtDate, inputCls } from "./ui";

export interface PageRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  updatedAt: string;
}

interface FormState {
  id?: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  slugTouched: boolean;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export default function PagesClient({ pages }: { pages: PageRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [toDelete, setToDelete] = useState<PageRow | null>(null);

  const openNew = () => {
    setPreview(false);
    setForm({ title: "", slug: "", content: "", isPublished: true, slugTouched: false });
  };
  const openEdit = (p: PageRow) => {
    setPreview(false);
    setForm({ id: p.id, title: p.title, slug: p.slug, content: p.content, isPublished: p.isPublished, slugTouched: true });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const res = await callApi(form.id ? `/api/admin/pages/${form.id}` : "/api/admin/pages", form.id ? "PATCH" : "POST", {
      title: form.title,
      slug: form.slug,
      content: form.content,
      isPublished: form.isPublished,
    });
    setSaving(false);
    if (!res.ok) return toast.error(res.data.error || "Could not save page");
    toast.success(form.id ? "Page updated" : "Page created");
    setForm(null);
    router.refresh();
  };

  const toggle = async (p: PageRow) => {
    setBusyId(p.id);
    const res = await callApi(`/api/admin/pages/${p.id}`, "PATCH", { isPublished: !p.isPublished });
    setBusyId(null);
    if (!res.ok) return toast.error(res.data.error || "Failed");
    toast.success(p.isPublished ? "Page unpublished" : "Page published");
    router.refresh();
  };

  const remove = async (p: PageRow) => {
    setBusyId(p.id);
    const res = await callApi(`/api/admin/pages/${p.id}`, "DELETE");
    setBusyId(null);
    setToDelete(null);
    if (!res.ok) return toast.error(res.data.error || "Failed");
    toast.success("Page deleted");
    router.refresh();
  };

  return (
    <div>
      <PageTitle
        title="CMS pages"
        subtitle="Static pages served at /pages/<slug>. Published pages are linked from the storefront footer."
        action={
          <button className={btnPrimary} onClick={openNew}>
            <Plus className="h-4 w-4" /> New page
          </button>
        }
      />

      <DataTable minWidth={640} label="CMS pages">
          <thead>
            <tr>
              <th className={`${thCls}`}>Title</th>
              <th className={`${thCls}`}>URL</th>
              <th className={`${thCls}`}>Updated</th>
              <th className={`${thCls}`}>Status</th>
              <th className={`${thCls} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 && (
              <tr><td colSpan={5}><EmptyState icon={FileText} title="No pages yet" description="Create static pages like About or Shipping policy." action={<button className={btnPrimary} onClick={openNew}><Plus className="h-4 w-4" /> New page</button>} /></td></tr>
            )}
            {pages.map((p) => (
              <tr key={p.id}>
                <td className={`${tdCls} font-medium text-slate-900`}>{p.title}</td>
                <td className={`${tdCls} font-mono text-xs`}>/pages/{p.slug}</td>
                <td className={`${tdCls} text-xs text-slate-500`}>{fmtDate(p.updatedAt)}</td>
                <td className={tdCls}>
                  <Badge tone={p.isPublished ? "green" : "slate"}>{p.isPublished ? "Published" : "Draft"}</Badge>
                </td>
                <td className={tdCls}>
                  <div className="flex justify-end gap-2">
                    {p.isPublished && (
                      <a className={btnGhost} href={`/pages/${p.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${p.title}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button className={btnGhost} onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button className={btnGhost} disabled={busyId === p.id} onClick={() => toggle(p)}>
                      {p.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {p.isPublished ? "Unpublish" : "Publish"}
                    </button>
                    <button className={btnDanger} disabled={busyId === p.id} onClick={() => setToDelete(p)} aria-label={`Delete ${p.title}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
      </DataTable>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Delete page?"
        message={`"${toDelete?.title ?? ""}" will no longer be available on the storefront. This cannot be undone.`}
        confirmLabel="Delete"
        busy={!!toDelete && busyId === toDelete.id}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove(toDelete)}
      />

      {form && (
        <Modal title={form.id ? "Edit page" : "New page"} onClose={() => setForm(null)} wide>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title *" htmlFor="p-title">
                <input
                  id="p-title"
                  required
                  maxLength={150}
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => (f ? { ...f, title, slug: f.slugTouched ? f.slug : slugify(title) } : f));
                  }}
                />
              </Field>
              <Field label="Slug *" htmlFor="p-slug" hint="Lowercase letters, numbers, hyphens">
                <input
                  id="p-slug"
                  required
                  maxLength={80}
                  className={`${inputCls} font-mono`}
                  value={form.slug}
                  onChange={(e) => setForm((f) => (f ? { ...f, slug: e.target.value.toLowerCase(), slugTouched: true } : f))}
                />
              </Field>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="p-content" className="text-xs font-medium text-slate-700">
                  Content (simple markdown)
                </label>
                <div className="flex gap-1 text-xs font-bold">
                  <button type="button" onClick={() => setPreview(false)} className={`rounded-lg px-2.5 py-1 ${!preview ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-100"}`}>Write</button>
                  <button type="button" onClick={() => setPreview(true)} className={`rounded-lg px-2.5 py-1 ${preview ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-100"}`}>Preview</button>
                </div>
              </div>
              {preview ? (
                <div className="min-h-[260px] rounded-lg border border-slate-200 p-4">
                  <SafeMarkdown source={form.content || "Nothing to preview"} />
                </div>
              ) : (
                <textarea
                  id="p-content"
                  rows={12}
                  className={`${inputCls} font-mono text-xs`}
                  value={form.content}
                  onChange={(e) => setForm((f) => (f ? { ...f, content: e.target.value } : f))}
                  placeholder={"# Heading\n\nA paragraph with **bold** text and a [link](/products).\n\n- List item\n- Another item"}
                />
              )}
              <p className="mt-1 text-[11px] text-slate-500">
                Supports # headings, paragraphs, - lists, 1. numbered lists, **bold**, *italic* and [links](url). HTML is not rendered.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Toggle checked={form.isPublished} onChange={(v) => setForm((f) => (f ? { ...f, isPublished: v } : f))} label="Published" />
              <span className="text-sm font-medium text-slate-700">{form.isPublished ? "Published" : "Draft"}</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save page"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

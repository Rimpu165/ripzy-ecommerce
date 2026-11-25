"use client";

import React, { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

/**
 * Wraps the (server-rendered) filter panel. On lg+ it renders inline as a sidebar;
 * below lg it becomes a slide-in drawer opened by a "Filters" button.
 * The button and the aside are separate exports so the page can place the button in the toolbar.
 */
export default function FilterDrawer({ children, activeCount = 0 }: { children: React.ReactNode; activeCount?: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary mb-4 w-full lg:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="rounded-full bg-indigo-600 px-1.5 text-[11px] font-semibold text-white">{activeCount}</span>
        )}
      </button>

      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Product filters"
        className={
          open
            ? "fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm overflow-y-auto bg-slate-50 p-4 shadow-pop lg:static lg:z-auto lg:w-auto lg:max-w-none lg:overflow-visible lg:bg-transparent lg:p-0 lg:shadow-none"
            : "hidden lg:block"
        }
      >
        <div className="mb-3 flex items-center justify-between lg:hidden">
          <span className="text-base font-semibold text-slate-900">Filters</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close filters"
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

import React from "react";

/**
 * Table wrapper: rounded card, horizontally scrollable on small screens,
 * sticky header (when `maxHeight` is set the body scrolls under it), hover rows, no zebra.
 */
export function DataTable({
  children,
  minWidth = 720,
  maxHeight,
  label,
}: {
  children: React.ReactNode;
  minWidth?: number;
  maxHeight?: string;
  label?: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined} tabIndex={0} role="region" aria-label={label ?? "Data table"}>
        <table
          className="w-full text-left text-sm [&_tbody]:divide-y [&_tbody]:divide-slate-100 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-slate-50/70 [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[1] [&_thead_th]:border-b [&_thead_th]:border-slate-200 [&_thead_th]:bg-slate-50"
          style={{ minWidth }}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

/** Row shown when a table has no data. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-500">
        {children}
      </td>
    </tr>
  );
}

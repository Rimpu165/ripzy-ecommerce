/** CSV cell escaping with spreadsheet formula-injection neutralisation. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}
export function csvResponse(name: string, header: string[], rows: unknown[][]): Response {
  const body = "﻿" + [csvRow(header), ...rows.map(csvRow)].join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}_${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

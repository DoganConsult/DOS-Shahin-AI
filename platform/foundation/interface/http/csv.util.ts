import type { Response } from 'express';

// W6.F6.4 — small CSV serializer used by Foundation list /export endpoints.
// Escapes RFC-4180 specials and streams the result with Content-Disposition.
export function escapeCsv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string'
    ? v
    : (typeof v === 'object' ? JSON.stringify(v) : String(v));
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function sendCsv(res: Response, filename: string, columns: string[], rows: any[]): void {
  const header = columns.join(',') + '\n';
  const body = rows.map(r => columns.map(c => escapeCsv(r[c])).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.csv"`);
  res.send(header + body + '\n');
}

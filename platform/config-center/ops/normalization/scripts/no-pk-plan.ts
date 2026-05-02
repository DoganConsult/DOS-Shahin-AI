#!/usr/bin/env tsx
/**
 * Primary-key reconciler.
 *
 * Catalog smell `no-primary-key` fires on tables that have neither a
 * PRIMARY KEY constraint nor an `id` column — both the inline form
 * (`id UUID PRIMARY KEY ...`) and the explicit constraint form are
 * recognized, so surviving hits are real gaps.
 *
 * For each such table, propose a PK by this cascade:
 *   1. a UNIQUE constraint on a single column → adopt it as the PK
 *   2. a column whose name matches the singular-of-table + `_id`
 *      (e.g. workspace_id on workspaces) → propose it
 *   3. no sensible candidate → flag REVIEW with a suggestion to add a
 *      surrogate `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
 *
 * Output:
 *   ops/normalization/proposals/no-pk/decisions.md
 *   ops/normalization/proposals/no-pk/add-pk-template.sql
 *     (commented templates; uncomment after review)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const CATALOG_PATH = join(REPO_ROOT, 'ops/normalization/catalog.yml');
const OUT_DIR = join(REPO_ROOT, 'ops/normalization/proposals/no-pk');

if (!existsSync(CATALOG_PATH)) { console.error('catalog.yml not found. Run catalog-build.ts first.'); process.exit(2); }

interface TableRow {
  name: string; layer: string; columns: string[]; uniqueSingles: string[]; smellFound: boolean;
}

function parse(): TableRow[] {
  const text = readFileSync(CATALOG_PATH, 'utf-8');
  const out: TableRow[] = [];
  let cur: TableRow | null = null;
  let mode: 'columns' | 'constraints' | 'smells' | null = null;
  for (const line of text.split('\n')) {
    const nm = line.match(/^  - name:\s*(.+)$/);
    if (nm) { if (cur) out.push(cur); cur = { name: nm[1].trim(), layer: 'unknown', columns: [], uniqueSingles: [], smellFound: false }; mode = null; continue; }
    if (!cur) continue;
    const lm = line.match(/^    layer:\s*(\S+)/);
    if (lm) { cur.layer = lm[1]; continue; }
    if (line === '    columns:') { mode = 'columns'; continue; }
    if (line === '    constraints:') { mode = 'constraints'; continue; }
    if (line === '    smells:') { mode = 'smells'; continue; }
    if (line.startsWith('    sources:') || line.startsWith('    alter_sites:') || line.startsWith('    monolith_ref:')) { mode = null; continue; }
    if (mode === 'columns') {
      const cm = line.match(/^      - \{ name:\s*([^,]+),/);
      if (cm) cur.columns.push(cm[1].trim());
    } else if (mode === 'constraints') {
      const km = line.match(/^      - \{ kind:\s*UNIQUE,\s*columns:\s*\[([^\]]*)\]/);
      if (km) {
        const cols = km[1].split(',').map((s) => s.trim()).filter(Boolean);
        if (cols.length === 1) cur.uniqueSingles.push(cols[0]);
      }
    } else if (mode === 'smells') {
      if (line.trim() === '- no-primary-key') cur.smellFound = true;
    }
  }
  if (cur) out.push(cur);
  return out.filter((r) => r.smellFound);
}

function singularize(s: string): string {
  if (s.endsWith('ies')) return `${s.slice(0, -3)}y`;
  if (s.endsWith('ses') || s.endsWith('xes')) return s.slice(0, -2);
  if (s.endsWith('s')) return s.slice(0, -1);
  return s;
}

function propose(r: TableRow): { candidate: string | null; strategy: 'unique' | 'table-id-column' | 'surrogate'; confidence: 'high' | 'medium' | 'low' } {
  if (r.uniqueSingles.length > 0) return { candidate: r.uniqueSingles[0], strategy: 'unique', confidence: 'high' };
  const tableIdCol = `${singularize(r.name)}_id`;
  if (r.columns.includes(tableIdCol)) return { candidate: tableIdCol, strategy: 'table-id-column', confidence: 'medium' };
  return { candidate: null, strategy: 'surrogate', confidence: 'low' };
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const rows = parse();
  console.error(`no-pk-plan: ${rows.length} tables with no primary key`);

  const md: string[] = [];
  md.push('# Missing-PK Reconciler — Decision Matrix');
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Total: **${rows.length}** tables`);
  md.push('');
  md.push('| Table | Layer | Columns | Candidate | Strategy | Confidence | Decision | Notes |');
  md.push('|---|---|---|---|---|---|---|---|');

  const sql: string[] = [
    '-- Missing-PK reconciliation templates',
    '-- All statements COMMENTED OUT. Review each before uncommenting.',
    '-- Adding a PK acquires ACCESS EXCLUSIVE briefly; on large tables,',
    '-- consider ADD CONSTRAINT ... USING INDEX <concurrent-index>.',
    '',
  ];

  for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = propose(r);
    md.push(`| ${r.name} | ${r.layer} | ${r.columns.length} | ${p.candidate ?? '_(add surrogate id)_'} | ${p.strategy} | ${p.confidence} |  |  |`);
    const q = r.layer === 'tenant' ? '__TENANT_SCHEMA__' : 'public';
    if (p.strategy === 'surrogate') {
      sql.push(`-- ALTER TABLE ${q}.${r.name} ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();`);
    } else if (p.candidate && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p.candidate)) {
      sql.push(`-- ALTER TABLE ${q}.${r.name} ADD CONSTRAINT pk_${r.name} PRIMARY KEY (${p.candidate});`);
    }
  }
  writeFileSync(join(OUT_DIR, 'decisions.md'), md.join('\n') + '\n');
  writeFileSync(join(OUT_DIR, 'add-pk-template.sql'), sql.join('\n') + '\n');
  console.error(`Wrote: ${OUT_DIR}/`);
}

main();

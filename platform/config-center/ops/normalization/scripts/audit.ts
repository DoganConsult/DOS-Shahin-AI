#!/usr/bin/env tsx
/**
 * Catalog auditor.
 *
 * Reads catalog.yml and produces a single prioritized issue list for
 * the categories that aren't addressed by the other planners:
 *
 *   layer-conflict:           table defined in both `public` migrations
 *                             AND in per-tenant migrations — ownership
 *                             is ambiguous and one is likely stale.
 *
 *   altered-without-create:   ALTER TABLE references a table no CREATE
 *                             TABLE in the scanned sources defines.
 *                             Either the CREATE lives in a place the
 *                             scanner missed, or the migration ships
 *                             an ALTER against a non-existent table
 *                             (would fail at runtime).
 *
 *   orphan-constraint:        CONSTRAINT referencing a column that
 *                             doesn't appear in the table's columns.
 *
 * Output:
 *   ops/normalization/audit.md       — human-readable issue list
 *   ops/normalization/audit.json     — machine-readable for CI
 *
 * Usage:
 *   tsx ops/normalization/scripts/audit.ts
 *   tsx ops/normalization/scripts/audit.ts --fail-on-errors
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const CATALOG_PATH = join(REPO_ROOT, 'ops/normalization/catalog.yml');
const OUT_DIR = join(REPO_ROOT, 'ops/normalization');

if (!existsSync(CATALOG_PATH)) { console.error('catalog.yml not found. Run catalog-build.ts first.'); process.exit(2); }

interface Issue { kind: string; table: string; detail: string; severity: 'error' | 'warn' }

interface Tbl { name: string; layer: string; sources: string[]; alterSites: string[]; columns: string[]; constraints: Array<{ kind: string; columns: string[] }>; smells: string[] }

function parse(): Tbl[] {
  const text = readFileSync(CATALOG_PATH, 'utf-8');
  const out: Tbl[] = [];
  let cur: Tbl | null = null;
  let mode: 'columns' | 'constraints' | 'smells' | 'sources' | 'alter' | null = null;
  for (const line of text.split('\n')) {
    const nm = line.match(/^  - name:\s*(.+)$/);
    if (nm) { if (cur) out.push(cur); cur = { name: nm[1].trim(), layer: 'unknown', sources: [], alterSites: [], columns: [], constraints: [], smells: [] }; mode = null; continue; }
    if (!cur) continue;
    const lm = line.match(/^    layer:\s*(\S+)/); if (lm) { cur.layer = lm[1]; continue; }
    if (line === '    sources:') { mode = 'sources'; continue; }
    if (line === '    alter_sites:') { mode = 'alter'; continue; }
    if (line === '    columns:') { mode = 'columns'; continue; }
    if (line === '    constraints:') { mode = 'constraints'; continue; }
    if (line === '    smells:') { mode = 'smells'; continue; }
    if (line.startsWith('    monolith_ref:')) { mode = null; continue; }
    if (mode === 'sources') { const m = line.match(/^      - (.+)$/); if (m) cur.sources.push(m[1]); }
    else if (mode === 'alter') { const m = line.match(/^      - (.+)$/); if (m) cur.alterSites.push(m[1]); }
    else if (mode === 'columns') { const m = line.match(/^      - \{ name:\s*([^,]+),/); if (m) cur.columns.push(m[1].trim()); }
    else if (mode === 'constraints') {
      const km = line.match(/^      - \{ kind:\s*([^,]+),\s*columns:\s*\[([^\]]*)\]/);
      if (km) cur.constraints.push({ kind: km[1].trim(), columns: km[2].split(',').map((s) => s.trim()).filter(Boolean) });
    } else if (mode === 'smells') { const m = line.match(/^      - (.+)$/); if (m) cur.smells.push(m[1]); }
  }
  if (cur) out.push(cur);
  return out;
}

function audit(tables: Tbl[]): Issue[] {
  const issues: Issue[] = [];
  for (const t of tables) {
    // ERROR: true search_path hazard (public.* + tenant copy fallback).
    if (t.smells.some((s) => s.startsWith('layer-conflict:public-vs-tenant'))) {
      issues.push({ kind: 'layer-conflict', table: t.name, severity: 'error',
        detail: `defined in sources: ${t.sources.join(', ')}` });
    }
    // WARN: same table name in two different (non-search-path-colliding) schemas.
    // Historically mislabeled as "layer-conflict" when the public-layer file
    // actually creates in `dos.*`. Kept visible but non-blocking so the
    // operator can still reason about cross-schema design.
    const crossSchemaSmell = t.smells.find((s) => s.startsWith('cross-schema-duplicate:'));
    if (crossSchemaSmell) {
      issues.push({ kind: 'cross-schema-duplicate', table: t.name, severity: 'warn',
        detail: crossSchemaSmell.replace('cross-schema-duplicate:', 'schemas: ') });
    }
    // WARN: same schema defined in 2+ files — shape drift risk if not byte-identical.
    for (const s of t.smells.filter((x) => x.startsWith('intra-schema-duplicate:'))) {
      issues.push({ kind: 'intra-schema-duplicate', table: t.name, severity: 'warn', detail: s.replace('intra-schema-duplicate:', '') });
    }
    if (t.smells.includes('altered-without-create-found')) {
      issues.push({ kind: 'altered-without-create', table: t.name, severity: 'warn',
        detail: `only ALTER sites: ${t.alterSites.join(', ')}` });
    }
    // orphan-constraint is now emitted directly by catalog-build post-ADD-COLUMN-folding.
    // Surface each instance as a warning.
    for (const s of t.smells.filter((x) => x.startsWith('orphan-constraint:'))) {
      const [, kind, col] = s.split(':');
      issues.push({ kind: 'orphan-constraint', table: t.name, severity: 'warn',
        detail: `constraint ${kind} references column ${col} not present in table` });
    }
  }
  return issues;
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const failOnErrors = process.argv.includes('--fail-on-errors');
  const tables = parse();
  const issues = audit(tables);
  const byKind = new Map<string, Issue[]>();
  for (const i of issues) {
    if (!byKind.has(i.kind)) byKind.set(i.kind, []);
    byKind.get(i.kind)!.push(i);
  }

  const md: string[] = [];
  md.push('# Catalog Audit');
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Total issues: **${issues.length}** (${issues.filter((i) => i.severity === 'error').length} errors, ${issues.filter((i) => i.severity === 'warn').length} warnings)`);
  md.push('');
  for (const [kind, list] of [...byKind.entries()].sort()) {
    md.push(`## ${kind} (${list.length})`);
    md.push('');
    for (const i of list.sort((a, b) => a.table.localeCompare(b.table))) {
      md.push(`- **${i.table}** — ${i.detail}`);
    }
    md.push('');
  }
  writeFileSync(join(OUT_DIR, 'audit.md'), md.join('\n') + '\n');
  writeFileSync(join(OUT_DIR, 'audit.json'), JSON.stringify({ generatedAt: new Date().toISOString(), issues }, null, 2));

  const errors = issues.filter((i) => i.severity === 'error').length;
  console.error(`audit: ${issues.length} issues (${errors} errors)`);
  console.error(`Wrote: ${join(OUT_DIR, 'audit.md')}`);
  if (failOnErrors && errors > 0) process.exit(1);
}

main();

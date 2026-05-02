#!/usr/bin/env tsx
/**
 * Redundant tenant_id column planner.
 *
 * A table living inside a `tenant_<id>` schema is already scoped by
 * search_path — a `tenant_id TEXT` column on it is logically redundant
 * and carries three risks:
 *
 *   1. Footgun: queries that add `WHERE tenant_id = $1` feel protective
 *      but don't add safety; developers confuse it with real RLS.
 *   2. Drift: different tenant schemas' copies of the same table can
 *      diverge on what value they stamp (NULL vs the tenant id vs a
 *      stale legacy id).
 *   3. Wasted space + an index that never discriminates.
 *
 * BUT: many application queries reference tenant_id in SELECT (for API
 * responses) or WHERE clauses. Dropping the column is a breaking change
 * for the service. This planner therefore NEVER auto-emits a DROP —
 * it produces a per-table decision matrix that the operator + service
 * owners fill in.
 *
 * Policy options in the matrix:
 *   DROP     — confirmed no callers reference the column
 *   KEEP     — explicit decision to keep (document reason)
 *   REPLACE  — swap for a trigger that stamps current_setting('app.current_tenant_id')
 *   DEFERRED — revisit later
 *
 * Output:
 *   ops/normalization/proposals/redundant-tenant-id/decisions.md
 *
 * Usage:
 *   tsx ops/normalization/scripts/redundant-tenant-id-plan.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const CATALOG_PATH = join(REPO_ROOT, 'ops/normalization/catalog.yml');
const OUT_DIR = join(REPO_ROOT, 'ops/normalization/proposals/redundant-tenant-id');

if (!existsSync(CATALOG_PATH)) {
  console.error('catalog.yml not found. Run catalog-build.ts first.');
  process.exit(2);
}

interface TableRow {
  name: string;
  layer: string;
  tenantIdCol: { nullable: boolean; type: string; default: string | null } | null;
  indexedOnTenantId: boolean;
  hasFkOnTenantId: boolean;
  smellFound: boolean;
}

function parse(): TableRow[] {
  const text = readFileSync(CATALOG_PATH, 'utf-8');
  const rows: TableRow[] = [];
  let cur: TableRow | null = null;
  let mode: 'columns' | 'constraints' | 'smells' | null = null;
  for (const line of text.split('\n')) {
    const nm = line.match(/^  - name:\s*(.+)$/);
    if (nm) {
      if (cur) rows.push(cur);
      cur = { name: nm[1].trim(), layer: 'unknown', tenantIdCol: null, indexedOnTenantId: false, hasFkOnTenantId: false, smellFound: false };
      mode = null;
      continue;
    }
    if (!cur) continue;
    const lm = line.match(/^    layer:\s*(\S+)/);
    if (lm) { cur.layer = lm[1]; continue; }
    if (line === '    columns:') { mode = 'columns'; continue; }
    if (line === '    constraints:') { mode = 'constraints'; continue; }
    if (line === '    smells:') { mode = 'smells'; continue; }
    if (line.startsWith('    sources:') || line.startsWith('    alter_sites:') || line.startsWith('    monolith_ref:')) {
      mode = null; continue;
    }
    if (mode === 'columns') {
      const cm = line.match(/^      - \{ name:\s*([^,]+),\s*type:\s*([^,]+),\s*nullable:\s*([^,]+),\s*default:\s*(.+)\s*\}$/);
      if (cm && cm[1].trim() === 'tenant_id') {
        cur.tenantIdCol = {
          type: cm[2].trim(),
          nullable: cm[3].trim() === 'true',
          default: cm[4].trim() === 'null' ? null : cm[4].trim(),
        };
      }
    } else if (mode === 'constraints') {
      const km = line.match(/^      - \{ kind:\s*([^,]+),\s*columns:\s*\[([^\]]*)\]/);
      if (km) {
        const kind = km[1].trim();
        const cols = km[2].split(',').map((s) => s.trim()).filter(Boolean);
        if (cols.includes('tenant_id')) {
          if (kind === 'UNIQUE' || kind === 'PRIMARY KEY') cur.indexedOnTenantId = true;
          if (kind === 'FOREIGN KEY') cur.hasFkOnTenantId = true;
        }
      }
    } else if (mode === 'smells') {
      if (line.trim() === '- redundant-tenant-id-in-tenant-schema') cur.smellFound = true;
    }
  }
  if (cur) rows.push(cur);
  return rows.filter((r) => r.smellFound);
}

function heuristicRecommendation(r: TableRow): 'DROP-candidate' | 'KEEP-candidate' | 'REVIEW' {
  if (!r.tenantIdCol) return 'REVIEW';
  // Strong signal to keep: column participates in a UNIQUE/PK or an FK.
  if (r.indexedOnTenantId || r.hasFkOnTenantId) return 'KEEP-candidate';
  // Column is nullable + no default + not constrained → likely vestigial.
  if (r.tenantIdCol.nullable && !r.tenantIdCol.default) return 'DROP-candidate';
  return 'REVIEW';
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const rows = parse();
  console.error(`redundant-tenant-id-plan: ${rows.length} tables with the smell`);

  const md: string[] = [];
  md.push('# Redundant tenant_id Columns — Decision Matrix');
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Total: **${rows.length}** tenant-schema tables with a tenant_id column.`);
  md.push('');
  md.push('Policy codes: DROP | KEEP | REPLACE (with trigger-on-insert stamping current_setting) | DEFERRED | REVIEW');
  md.push('');
  md.push('| Table | Layer | Nullable | Default | Indexed (tenant_id) | FK (tenant_id) | Heuristic | Decision | Code-audit done? | Notes |');
  md.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    md.push(
      `| ${r.name} | ${r.layer} | ${r.tenantIdCol?.nullable ?? '—'} | ${r.tenantIdCol?.default ?? '—'} ` +
      `| ${r.indexedOnTenantId} | ${r.hasFkOnTenantId} | ${heuristicRecommendation(r)} |  |  |  |`,
    );
  }
  writeFileSync(join(OUT_DIR, 'decisions.md'), md.join('\n') + '\n');

  // Emit a template ALTER DROP file per table (commented-out, operator uncomments after code audit).
  const sqlHeader = [
    `-- redundant_tenant_id DROP templates`,
    `-- Every statement is COMMENTED OUT. The operator uncomments after confirming`,
    `-- no application code references the column for this table.`,
    `-- Quick grep: git grep -l "\\.tenant_id" services/ modules/ packages/ | xargs grep -l "<table_name>"`,
    ``,
  ].join('\n');
  const sqlLines: string[] = [sqlHeader];
  for (const r of rows) {
    if (r.indexedOnTenantId || r.hasFkOnTenantId) continue;
    const q = r.layer === 'tenant' ? '__TENANT_SCHEMA__' : 'public';
    sqlLines.push(`-- ALTER TABLE ${q}.${r.name} DROP COLUMN IF EXISTS tenant_id;`);
  }
  writeFileSync(join(OUT_DIR, 'drop-template.sql'), sqlLines.join('\n') + '\n');
  console.error(`Wrote: ${OUT_DIR}/decisions.md`);
  console.error(`Wrote: ${OUT_DIR}/drop-template.sql (all statements commented out)`);
}

main();

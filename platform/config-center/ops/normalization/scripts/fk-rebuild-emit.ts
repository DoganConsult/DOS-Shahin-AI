#!/usr/bin/env tsx
/**
 * FK rebuild emitter (Phase 3 — auto-merge step).
 *
 * Reads ops/normalization/proposals/fk-rebuild/decisions.md and emits
 * real per-tenant migration files into ops/migrations/tenant/ for every
 * proposal whose Decision column is `✓ apply` or whose confidence is
 * `high` and Decision is empty (auto-accept HIGH).
 *
 * Each emitted file is a self-contained ALTER ... NOT VALID block,
 * wrapped in a PL/pgSQL DO ... EXCEPTION WHEN duplicate_object so the
 * runner can re-apply it idempotently across retries. Validation is
 * deliberately NOT included — operators run VALIDATE separately during
 * a low-traffic window via:
 *
 *   tsx ops/normalization/scripts/fk-validate.ts --migration <file>
 *
 * Defaults applied automatically (override via decisions.md):
 *   ON DELETE = NO ACTION  — safest; no surprise cascades.
 *   ON UPDATE = NO ACTION
 *
 * Usage:
 *   tsx ops/normalization/scripts/fk-rebuild-emit.ts                 # auto-accept HIGH only
 *   tsx ops/normalization/scripts/fk-rebuild-emit.ts --include-medium
 *   tsx ops/normalization/scripts/fk-rebuild-emit.ts --dry-run
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const DECISIONS = join(REPO_ROOT, 'ops/normalization/proposals/fk-rebuild/decisions.md');
const TENANT_MIG = join(REPO_ROOT, 'ops/migrations/tenant');

if (!existsSync(DECISIONS)) {
  console.error('decisions.md not found. Run fk-rebuild-generate.ts first.');
  process.exit(2);
}

interface Row {
  ownerTable: string;
  column: string;
  layer: string;
  targetTable: string;
  targetColumn: string;
  confidence: 'high' | 'medium' | 'low';
  decision: string;
  onDelete: string;
  onUpdate: string;
}

function parseDecisions(): Row[] {
  const rows: Row[] = [];
  const text = readFileSync(DECISIONS, 'utf-8');
  for (const raw of text.split('\n')) {
    if (!raw.startsWith('| ')) continue;
    if (raw.startsWith('| Owner') || raw.startsWith('|---')) continue;
    const cells = raw.split('|').map((c) => c.trim()).slice(1, -1);
    if (cells.length < 9) continue;
    rows.push({
      ownerTable: cells[0],
      column: cells[1],
      layer: cells[2],
      targetTable: cells[3].replace(/^_|_$/g, '').replace(/^\(unknown\)$/, ''),
      targetColumn: cells[4].replace(/^_|_$/g, '').replace(/^\(unknown\)$/, ''),
      confidence: cells[5] as 'high' | 'medium' | 'low',
      decision: cells[6],
      onDelete: cells[7] || 'NO ACTION',
      onUpdate: cells[8] || 'NO ACTION',
    });
  }
  return rows;
}

function shouldEmit(r: Row, includeMedium: boolean): boolean {
  if (r.decision === '✗ skip' || r.decision === '? deferred') return false;
  if (r.decision === '✓ apply') return true;
  // auto-accept HIGH (and MEDIUM when --include-medium)
  if (r.decision === '' && r.confidence === 'high') return true;
  if (r.decision === '' && r.confidence === 'medium' && includeMedium) return true;
  return false;
}

function ensureValid(s: string): boolean { return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s); }

function emitMigration(rows: Row[], filename: string, dryRun: boolean): { path: string; emitted: number } {
  const layer = rows[0].layer;
  const schemaQ = layer === 'tenant' ? '__TENANT_SCHEMA__' : 'public';
  const lines: string[] = [];
  lines.push(`-- ${filename}`);
  lines.push(`-- Auto-emitted by ops/normalization/scripts/fk-rebuild-emit.ts`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- ${rows.length} foreign keys, layer=${layer}`);
  lines.push(`-- All constraints emitted as NOT VALID. Run fk-validate.ts to validate.`);
  lines.push('');
  let emitted = 0;
  for (const r of rows) {
    if (!r.targetTable || !r.targetColumn) continue;
    if (![r.ownerTable, r.column, r.targetTable, r.targetColumn].every(ensureValid)) {
      lines.push(`-- SKIPPED ${r.ownerTable}.${r.column} -> ${r.targetTable}.${r.targetColumn} (unsafe identifier)`);
      lines.push('');
      continue;
    }
    const onDel = /^(NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)$/i.test(r.onDelete) ? r.onDelete.toUpperCase() : 'NO ACTION';
    const onUpd = /^(NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)$/i.test(r.onUpdate) ? r.onUpdate.toUpperCase() : 'NO ACTION';
    const fkName = `fk_${r.ownerTable}_${r.column}`.toLowerCase().slice(0, 63);
    lines.push(`DO $$`);
    lines.push(`BEGIN`);
    lines.push(`  ALTER TABLE ${schemaQ}.${r.ownerTable}`);
    lines.push(`    ADD CONSTRAINT ${fkName}`);
    lines.push(`    FOREIGN KEY (${r.column})`);
    lines.push(`    REFERENCES ${schemaQ}.${r.targetTable}(${r.targetColumn})`);
    lines.push(`    ON DELETE ${onDel} ON UPDATE ${onUpd}`);
    lines.push(`    NOT VALID;`);
    lines.push(`EXCEPTION`);
    lines.push(`  WHEN duplicate_object THEN NULL;`);
    lines.push(`  WHEN undefined_table  THEN NULL;`);
    lines.push(`  WHEN undefined_column THEN NULL;`);
    lines.push(`END $$;`);
    lines.push('');
    emitted++;
  }
  const out = join(TENANT_MIG, filename);
  if (!dryRun) writeFileSync(out, lines.join('\n'));
  return { path: out, emitted };
}

function main(): void {
  const includeMedium = process.argv.includes('--include-medium');
  const dryRun = process.argv.includes('--dry-run');
  const allRows = parseDecisions();
  const accepted = allRows.filter((r) => shouldEmit(r, includeMedium));
  if (accepted.length === 0) {
    console.error('fk-rebuild-emit: no rows accepted. Either no HIGH-confidence rows or all decisions opted out.');
    return;
  }

  // Group by (owner table layer) to keep migration files focused.
  const tenantRows = accepted.filter((r) => r.layer === 'tenant');
  const publicRows = accepted.filter((r) => r.layer === 'public');

  mkdirSync(TENANT_MIG, { recursive: true });

  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = '100'; // FK-rebuild family numbered 100+
  const reports: Array<{ path: string; emitted: number }> = [];

  if (tenantRows.length > 0) {
    reports.push(emitMigration(tenantRows, `${seq}_fk_rebuild_${ts}_tenant.sql`, dryRun));
  }
  if (publicRows.length > 0) {
    // public migrations live in ops/migrations/, not ops/migrations/tenant/
    const path = join(REPO_ROOT, 'ops/migrations', `060_fk_rebuild_${ts}_public.sql`);
    if (!dryRun) writeFileSync(path, ''); // placeholder
    const lines: string[] = [];
    lines.push(`-- 060_fk_rebuild_${ts}_public.sql`);
    lines.push(`-- Auto-emitted by ops/normalization/scripts/fk-rebuild-emit.ts`);
    lines.push(`-- ${publicRows.length} public-schema FKs`);
    lines.push('');
    let emitted = 0;
    for (const r of publicRows) {
      if (!r.targetTable || !r.targetColumn) continue;
      if (![r.ownerTable, r.column, r.targetTable, r.targetColumn].every(ensureValid)) continue;
      const fkName = `fk_${r.ownerTable}_${r.column}`.toLowerCase().slice(0, 63);
      lines.push(`DO $$ BEGIN`);
      lines.push(`  ALTER TABLE public.${r.ownerTable}`);
      lines.push(`    ADD CONSTRAINT ${fkName}`);
      lines.push(`    FOREIGN KEY (${r.column}) REFERENCES public.${r.targetTable}(${r.targetColumn})`);
      lines.push(`    ON DELETE NO ACTION ON UPDATE NO ACTION NOT VALID;`);
      lines.push(`EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;`);
      lines.push('');
      emitted++;
    }
    if (!dryRun) writeFileSync(path, lines.join('\n'));
    reports.push({ path, emitted });
  }

  for (const r of reports) console.error(`fk-rebuild-emit: ${dryRun ? '[DRY-RUN] would write' : 'wrote'} ${r.emitted} FKs -> ${r.path}`);
  console.error(`fk-rebuild-emit: ${accepted.length} rows accepted (HIGH${includeMedium ? '+MEDIUM' : ''})`);
}

main();

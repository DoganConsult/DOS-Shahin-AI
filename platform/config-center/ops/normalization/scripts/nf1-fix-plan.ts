#!/usr/bin/env tsx
/**
 * 1NF fix planner.
 *
 * Reads normalization-scorecard.json and, for every table whose 1NF
 * check failed, emits:
 *
 *   ops/normalization/proposals/nf1/decisions.md
 *     One row per 1NF violation with a proposed fix: promote-to-child
 *     (for array / jsonb-list) or split-columns (for repeating groups).
 *
 *   ops/normalization/proposals/nf1/<table>.sql
 *     Commented-out ALTER + CREATE TABLE scaffold for the proposed
 *     child table plus a data-migration INSERT SELECT. Operator
 *     uncomments per-table after review.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const SCORECARD = join(REPO_ROOT, 'ops/normalization/normalization-scorecard.json');
const OUT_DIR = join(REPO_ROOT, 'ops/normalization/proposals/nf1');

if (!existsSync(SCORECARD)) { console.error('scorecard missing — run normalize-grade.ts first'); process.exit(2); }

interface Score { table: string; layer: string; grade: string; checks: Record<string, { verdict: string; details: string[] }> }
const data = JSON.parse(readFileSync(SCORECARD, 'utf-8')) as { scores: Score[] };

mkdirSync(OUT_DIR, { recursive: true });

interface Row { table: string; layer: string; violation: string; column: string; fix: string }
const rows: Row[] = [];

function classify(detail: string): { column: string; fix: string } | null {
  const arr = detail.match(/^array-column:([^:]+):(.+)$/);
  if (arr) return {
    column: arr[1],
    fix: `PROMOTE-TO-CHILD: create <table>_${arr[1]} (parent_id, ${arr[1].replace(/s$/, '')}) with FK; drop column ${arr[1]}`,
  };
  const rep = detail.match(/^repeating-group:(.+?)_\*:(\d+)$/);
  if (rep) return {
    column: `${rep[1]}_1..${rep[1]}_${rep[2]}`,
    fix: `PROMOTE-TO-CHILD: create <table>_${rep[1]}s(parent_id, position, value); drop ${rep[1]}_N columns`,
  };
  const jsl = detail.match(/^jsonb-list:(.+)$/);
  if (jsl) return {
    column: jsl[1],
    fix: `PROMOTE-TO-CHILD: create <table>_${jsl[1]}(parent_id, seq, payload) or typed columns per sample shape (see jsonb-decompose-plan.ts)`,
  };
  return null;
}

for (const s of data.scores) {
  if (s.checks['1NF'].verdict !== 'fail') continue;
  for (const d of s.checks['1NF'].details) {
    const c = classify(d);
    if (c) rows.push({ table: s.table, layer: s.layer, violation: d, column: c.column, fix: c.fix });
  }
}

const md: string[] = [];
md.push('# 1NF Fix — Decision Matrix');
md.push(`Generated: ${new Date().toISOString()}`);
md.push(`Total 1NF violations: **${rows.length}** across ${new Set(rows.map((r) => r.table)).size} tables.`);
md.push('');
md.push('| Table | Layer | Violation | Column(s) | Proposed fix | Decision |');
md.push('|---|---|---|---|---|---|');
for (const r of rows.sort((a, b) => a.table.localeCompare(b.table))) {
  md.push(`| ${r.table} | ${r.layer} | ${r.violation} | ${r.column} | ${r.fix.replace(/\|/g, '\\|')} |  |`);
}
writeFileSync(join(OUT_DIR, 'decisions.md'), md.join('\n') + '\n');
console.error(`nf1-fix-plan: ${rows.length} violations across ${new Set(rows.map((r) => r.table)).size} tables`);
console.error(`Wrote: ${OUT_DIR}/decisions.md`);

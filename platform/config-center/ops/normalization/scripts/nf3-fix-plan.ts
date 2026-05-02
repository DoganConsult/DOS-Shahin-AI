#!/usr/bin/env tsx
/**
 * 3NF fix planner.
 *
 * Targets two concrete 3NF violations the grader auto-detects:
 *
 *   1. transitive-id-name-pair: <x>_id AND <x>_name (or _label/_code/_title)
 *      on the same row. The name is determined by the id, which is in
 *      turn determined by the row's PK — so the name depends transitively
 *      on the PK via the id. Remove <x>_name; fetch it via JOIN instead.
 *
 *   2. denorm-counter: *_count integer alongside a child table.
 *      Already covered by counter-cleanup-plan.ts — this planner
 *      cross-references and marks as "see counter-cleanup-plan".
 *
 * Emits:
 *   ops/normalization/proposals/nf3/decisions.md
 *   ops/normalization/proposals/nf3/<table>.sql    (commented DROP COLUMN template)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const SCORECARD = join(REPO_ROOT, 'ops/normalization/normalization-scorecard.json');
const OUT_DIR = join(REPO_ROOT, 'ops/normalization/proposals/nf3');

if (!existsSync(SCORECARD)) { console.error('scorecard missing — run normalize-grade.ts first'); process.exit(2); }
const data = JSON.parse(readFileSync(SCORECARD, 'utf-8')) as { scores: Array<{ table: string; layer: string; checks: Record<string, { verdict: string; details: string[] }> }> };

mkdirSync(OUT_DIR, { recursive: true });

interface Row { table: string; layer: string; kind: string; detail: string; fix: string }
const rows: Row[] = [];

for (const s of data.scores) {
  if (s.checks['3NF'].verdict !== 'fail') continue;
  for (const d of s.checks['3NF'].details) {
    if (d.startsWith('transitive:')) {
      const [, pair] = d.split(':');
      const [idCol, nameCol] = pair.split('+');
      rows.push({
        table: s.table, layer: s.layer, kind: 'transitive-id-name-pair', detail: d,
        fix: `drop ${nameCol}; fetch via JOIN on ${idCol}`,
      });
    } else if (d.startsWith('denorm-counter:')) {
      rows.push({ table: s.table, layer: s.layer, kind: 'denorm-counter', detail: d,
        fix: 'see counter-cleanup-plan.ts (DROP / TRIGGER / NIGHTLY)' });
    }
  }
}

const md: string[] = [];
md.push('# 3NF Fix — Decision Matrix');
md.push(`Generated: ${new Date().toISOString()}`);
md.push(`Total violations: **${rows.length}** across ${new Set(rows.map((r) => r.table)).size} tables.`);
md.push('');
md.push('| Table | Layer | Kind | Detail | Proposed fix | Decision |');
md.push('|---|---|---|---|---|---|');
for (const r of rows.sort((a, b) => a.table.localeCompare(b.table))) {
  md.push(`| ${r.table} | ${r.layer} | ${r.kind} | ${r.detail} | ${r.fix.replace(/\|/g, '\\|')} |  |`);
}
writeFileSync(join(OUT_DIR, 'decisions.md'), md.join('\n') + '\n');
console.error(`nf3-fix-plan: ${rows.length} 3NF violations across ${new Set(rows.map((r) => r.table)).size} tables`);
console.error(`Wrote: ${OUT_DIR}/decisions.md`);

#!/usr/bin/env tsx
/**
 * Drift CI gate.
 *
 * Compares the current catalog (run catalog-build.ts first) against a
 * checked-in baseline at ops/normalization/drift-baseline.json. Fails
 * the build if any quality metric regresses:
 *
 *   - tables with smells:        must not increase
 *   - jsonb-column smells:       must not increase
 *   - missing-fk-on smells:      must not increase
 *   - denorm-counter smells:     must not increase
 *   - layer-conflict smells:     must not increase
 *   - no-primary-key smells:     must not increase
 *
 * The baseline is updated explicitly via --update — this is the gate
 * that forces a conscious "yes I am accepting more drift" decision
 * before the build can pass.
 *
 * Usage:
 *   make catalog && tsx ops/normalization/scripts/drift-ci.ts          # check
 *   tsx ops/normalization/scripts/drift-ci.ts --update                  # accept current as new baseline
 *   tsx ops/normalization/scripts/drift-ci.ts --report                  # show counts, exit 0 always
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const CATALOG_PATH = join(REPO_ROOT, 'ops/normalization/catalog.yml');
const BASELINE_PATH = join(REPO_ROOT, 'ops/normalization/drift-baseline.json');

const SMELL_CATEGORIES = [
  'jsonb-column',
  'denorm-counter',
  'missing-fk-on',
  'layer-conflict',
  'cross-schema-duplicate',
  'intra-schema-duplicate',
  'orphan-constraint',
  'no-primary-key',
  'redundant-tenant-id-in-tenant-schema',
  'altered-without-create-found',
] as const;
type Category = typeof SMELL_CATEGORIES[number];

interface Counts {
  tablesTotal: number;
  tablesWithSmells: number;
  bySmellCategory: Record<Category, number>;
}

function readCatalog(): string {
  if (!existsSync(CATALOG_PATH)) {
    console.error('drift-ci: catalog.yml not found. Run `make catalog` first.');
    process.exit(2);
  }
  return readFileSync(CATALOG_PATH, 'utf-8');
}

function countSmells(text: string): Counts {
  const counts: Counts = {
    tablesTotal: 0,
    tablesWithSmells: 0,
    bySmellCategory: Object.fromEntries(SMELL_CATEGORIES.map((c) => [c, 0])) as Record<Category, number>,
  };
  let inTable = false;
  let tableHadSmell = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('  - name:')) {
      if (inTable && tableHadSmell) counts.tablesWithSmells++;
      inTable = true;
      tableHadSmell = false;
      counts.tablesTotal++;
      continue;
    }
    const sm = line.match(/^      - ([a-z-]+(?:-[a-z-]+)*)(?::|$)/);
    if (sm && inTable) {
      tableHadSmell = true;
      const cat = sm[1] as Category;
      // Special: split 'layer-conflict:public-vs-tenant' into the bare category.
      // Any 'layer-conflict:*' value counts under 'layer-conflict'.
      if (SMELL_CATEGORIES.includes(cat)) counts.bySmellCategory[cat]++;
    }
  }
  if (inTable && tableHadSmell) counts.tablesWithSmells++;
  return counts;
}

function loadBaseline(): Counts | null {
  if (!existsSync(BASELINE_PATH)) return null;
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf-8')) as Counts;
}

function diff(label: string, current: number, baseline: number): { ok: boolean; line: string } {
  const delta = current - baseline;
  const sign = delta > 0 ? '+' : (delta < 0 ? '' : '±');
  const status = delta > 0 ? 'REGRESSED' : (delta < 0 ? 'IMPROVED  ' : 'unchanged ');
  return { ok: delta <= 0, line: `  [${status}] ${label.padEnd(38)} baseline=${baseline} current=${current} (${sign}${delta})` };
}

function main(): void {
  const update = process.argv.includes('--update');
  const reportOnly = process.argv.includes('--report');

  const counts = countSmells(readCatalog());

  if (update) {
    writeFileSync(BASELINE_PATH, JSON.stringify(counts, null, 2) + '\n');
    console.error(`drift-ci: baseline updated to ${BASELINE_PATH}`);
    console.error(JSON.stringify(counts, null, 2));
    return;
  }

  const baseline = loadBaseline();
  if (!baseline) {
    if (reportOnly) {
      console.error('drift-ci: no baseline; reporting current counts only');
      console.error(JSON.stringify(counts, null, 2));
      return;
    }
    console.error('drift-ci: no baseline yet. Run with --update to record the current state.');
    process.exit(2);
  }

  const lines: string[] = [];
  let ok = true;
  const checks = [
    diff('tablesWithSmells', counts.tablesWithSmells, baseline.tablesWithSmells),
    ...SMELL_CATEGORIES.map((c) => diff(`smells: ${c}`, counts.bySmellCategory[c], baseline.bySmellCategory[c] ?? 0)),
  ];
  for (const c of checks) { lines.push(c.line); if (!c.ok) ok = false; }

  console.error(`drift-ci: ${ok ? 'PASS' : 'FAIL'} (baseline ${BASELINE_PATH})`);
  for (const line of lines) console.error(line);
  if (reportOnly) return;
  if (!ok) {
    console.error('\ndrift-ci: a metric regressed. Either fix it or run `tsx ops/normalization/scripts/drift-ci.ts --update` to accept the new baseline.');
    process.exit(1);
  }
}

main();

#!/usr/bin/env tsx
/**
 * Per-module normalization report.
 *
 * Usage:
 *   MODULE=<name> npx tsx ops/normalization/scripts/module-report.ts
 *
 * Filters catalog.yml to the tables owned by MODULE (per module-prefixes.yml
 * rules) and prints a scorecard + smell summary. Writes
 *   modules/<MODULE>/db/normalization-scorecard.json
 *
 * Invoked via the Makefile target: make module-report MODULE=<name>.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const CATALOG = join(REPO_ROOT, 'ops/normalization/catalog.yml');
const PREFIXES_YML = join(REPO_ROOT, 'ops/normalization/module-prefixes.yml');

interface ModuleRule {
  name: string;
  primary: string[];
  explicit_prefix: string[];
  explicit: string[];
  explicit_exclude: string[];
}

function parseRules(yaml: string): ModuleRule[] {
  const rules: ModuleRule[] = [];
  const lines = yaml.split('\n');
  let section: 'modules' | null = null;
  let cur: ModuleRule | null = null;
  const push = () => { if (cur) rules.push(cur); };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (/^modules:\s*$/.test(line)) { push(); cur = null; section = 'modules'; continue; }
    if (/^[a-z]/.test(line) && !/^  /.test(line)) { push(); cur = null; section = null; continue; }
    if (section !== 'modules') continue;
    const m = line.match(/^  -\s+name:\s+(.+?)\s*$/);
    if (m) { push(); cur = { name: m[1], primary: [], explicit_prefix: [], explicit: [], explicit_exclude: [] }; continue; }
    if (!cur) continue;
    const inl = line.match(/^    ([a-z_]+):\s*\[(.*)\]\s*$/);
    if (inl) {
      const vals = inl[2].split(',').map(s => s.trim()).filter(Boolean);
      if (inl[1] === 'primary') cur.primary = vals;
      else if (inl[1] === 'explicit_prefix') cur.explicit_prefix = vals;
      else if (inl[1] === 'explicit') cur.explicit = vals;
      else if (inl[1] === 'explicit_exclude') cur.explicit_exclude = vals;
    }
  }
  push();
  return rules;
}

interface CatalogTable { name: string; layer: string; schemas: string[]; smells: string[] }

function parseCatalog(yaml: string): CatalogTable[] {
  const out: CatalogTable[] = [];
  const lines = yaml.split('\n');
  let inTables = false;
  let cur: CatalogTable | null = null;
  let inSmells = false;
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (/^tables:\s*$/.test(line)) { inTables = true; continue; }
    if (!inTables) continue;
    const m = line.match(/^  -\s+name:\s+(.+?)\s*$/);
    if (m) {
      if (cur) out.push(cur);
      cur = { name: m[1], layer: 'unknown', schemas: [], smells: [] };
      inSmells = false;
      continue;
    }
    if (!cur) continue;
    const layer = line.match(/^    layer:\s+(.+?)\s*$/);
    if (layer) cur.layer = layer[1].trim();
    const sch = line.match(/^    schemas:\s*\[(.*)\]\s*$/);
    if (sch) cur.schemas = sch[1].split(',').map(s => s.trim()).filter(Boolean);
    if (/^    smells:\s*$/.test(line)) { inSmells = true; continue; }
    if (inSmells) {
      if (/^    [a-z_]+:/.test(line) || /^  -/.test(line)) { inSmells = false; }
      else {
        const item = line.match(/^      -\s+(.+?)\s*$/);
        if (item) cur.smells.push(item[1]);
      }
    }
  }
  if (cur) out.push(cur);
  return out;
}

function tableMatchesRule(table: string, rule: ModuleRule): number {
  if (rule.explicit_exclude.includes(table)) return 0;
  if (rule.explicit.includes(table)) return 3;
  for (const ep of rule.explicit_prefix) if (table === ep || table.startsWith(ep + '_')) return 2;
  for (const p of rule.primary) if (table === p || table.startsWith(p + '_')) return 1;
  return 0;
}

function tablesForModule(moduleName: string, rules: ModuleRule[], tables: CatalogTable[]): CatalogTable[] {
  return tables.filter(t => {
    let bestScore = 0;
    let bestName: string | null = null;
    for (const r of rules) {
      const s = tableMatchesRule(t.name, r);
      if (s > bestScore) { bestScore = s; bestName = r.name; }
    }
    return bestName === moduleName;
  });
}

function main(): void {
  const moduleName = process.env.MODULE;
  if (!moduleName) {
    console.error('MODULE=<name> required');
    process.exit(2);
  }
  const rules = parseRules(readFileSync(PREFIXES_YML, 'utf8'));
  const tables = parseCatalog(readFileSync(CATALOG, 'utf8'));
  const owned = tablesForModule(moduleName, rules, tables);

  const smellCounts: Record<string, number> = {};
  const tablesWithSmells = new Set<string>();
  for (const t of owned) {
    for (const s of t.smells) {
      const kind = s.split(':')[0];
      smellCounts[kind] = (smellCounts[kind] ?? 0) + 1;
    }
    if (t.smells.length > 0) tablesWithSmells.add(t.name);
  }
  const byLayer = owned.reduce((a, t) => { a[t.layer] = (a[t.layer] ?? 0) + 1; return a; }, {} as Record<string, number>);

  console.log(`─── ${moduleName} normalization report ───`);
  console.log(`  tables owned:       ${owned.length}`);
  console.log(`  tables with smells: ${tablesWithSmells.size}`);
  console.log(`  by layer:           ${JSON.stringify(byLayer)}`);
  console.log(`  smell categories:`);
  for (const [k, v] of Object.entries(smellCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(30)} ${v}`);
  }

  const outPath = join(REPO_ROOT, 'modules', moduleName, 'db', 'normalization-scorecard.json');
  mkdirSync(join(REPO_ROOT, 'modules', moduleName, 'db'), { recursive: true });
  const report = {
    module: moduleName,
    generated_at: new Date().toISOString(),
    tables_owned: owned.length,
    tables_with_smells: tablesWithSmells.size,
    by_layer: byLayer,
    smell_counts: smellCounts,
    tables: owned.map(t => ({ name: t.name, layer: t.layer, smells: t.smells })),
  };
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Wrote: ${outPath}`);
}

main();

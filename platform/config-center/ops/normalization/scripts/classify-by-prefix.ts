#!/usr/bin/env tsx
/**
 * Phase B: classify every SQL file by owning module.
 *
 * Inputs:
 *   ops/normalization/reports/file-to-table.json  (from file-to-table.ts)
 *   ops/normalization/module-prefixes.yml         (primary + explicit rules)
 *
 * Output:
 *   ops/normalization/reports/classification.json
 *
 * Classification precedence (highest wins):
 *   1. path_wins    — file under modules/{X}/... → owner = X
 *   2. explicit_prefix or explicit (compound or exact table)
 *   3. all tables schema ∈ {dos} and no better match → platform-core
 *   4. all tables match one module's primary prefix → that module
 *   5. mixed prefixes → conflict; confidence=low; candidates listed
 *
 * Read-only. No DB connection.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const FILE_TO_TABLE = join(REPO_ROOT, 'ops/normalization/reports/file-to-table.json');
const PREFIXES_YML = join(REPO_ROOT, 'ops/normalization/module-prefixes.yml');
const OUT_DIR = join(REPO_ROOT, 'ops/normalization/reports');
const OUT = join(OUT_DIR, 'classification.json');

interface FileEntry {
  file_layer: string;
  creates: string[];
  alters: string[];
  mentions: string[];
  schemas: string[];
}
interface ModuleRule {
  name: string;
  primary: string[];
  explicit_prefix: string[];
  explicit: string[];
  explicit_exclude: string[];
}

interface RulesetShape {
  rules: ModuleRule[];
  fileOverrides: Map<string, string>;
}

// ─── prefix YAML parser (minimal, schema-aware) ───
function parseRules(yaml: string): RulesetShape {
  const rules: ModuleRule[] = [];
  const fileOverrides = new Map<string, string>();
  const lines = yaml.split('\n');
  let section: 'modules' | 'file_overrides' | null = null;
  let current: ModuleRule | null = null;
  let currentListKey: keyof ModuleRule | null = null;
  const pushCurrent = () => { if (current) rules.push(current); };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (/^modules:\s*$/.test(line)) { pushCurrent(); current = null; section = 'modules'; continue; }
    if (/^file_overrides:\s*$/.test(line)) { pushCurrent(); current = null; section = 'file_overrides'; continue; }
    if (/^[a-z]/.test(line) && !/^  /.test(line)) {
      // top-level key that's not modules/file_overrides — e.g. tiebreakers:
      if (line.startsWith('modules:') || line.startsWith('file_overrides:')) {
        // already handled above
      } else {
        pushCurrent(); current = null; section = null;
      }
      continue;
    }
    if (section === 'file_overrides') {
      const m = line.match(/^  ([^:]+):\s+(\S+)\s*$/);
      if (m) fileOverrides.set(m[1].trim(), m[2].trim());
      continue;
    }
    if (section !== 'modules') continue;
    const itemStart = line.match(/^  -\s+name:\s+(.+?)\s*$/);
    if (itemStart) {
      pushCurrent();
      current = { name: itemStart[1], primary: [], explicit_prefix: [], explicit: [], explicit_exclude: [] };
      currentListKey = null;
      continue;
    }
    if (!current) continue;
    const inlineList = line.match(/^    ([a-z_]+):\s*\[(.*)\]\s*$/);
    if (inlineList) {
      const key = inlineList[1];
      const vals = inlineList[2].split(',').map(s => s.trim()).filter(Boolean);
      if (key === 'primary') current.primary = vals;
      else if (key === 'explicit_prefix') current.explicit_prefix = vals;
      else if (key === 'explicit') current.explicit = vals;
      else if (key === 'explicit_exclude') current.explicit_exclude = vals;
      currentListKey = null;
      continue;
    }
    const listKey = line.match(/^    ([a-z_]+):\s*$/);
    if (listKey) {
      const key = listKey[1];
      if (['primary','explicit_prefix','explicit','explicit_exclude'].includes(key)) {
        currentListKey = key as keyof ModuleRule;
      } else {
        currentListKey = null;
      }
      continue;
    }
    const listItem = line.match(/^      -\s+(.+?)\s*$/);
    if (listItem && currentListKey) {
      (current as any)[currentListKey].push(listItem[1]);
      continue;
    }
  }
  pushCurrent();
  return { rules, fileOverrides };
}

function tableMatchesModule(table: string, rule: ModuleRule): 'explicit' | 'explicit_prefix' | 'primary' | null {
  if (rule.explicit_exclude.includes(table)) return null;
  if (rule.explicit.includes(table)) return 'explicit';
  for (const ep of rule.explicit_prefix) {
    if (table === ep || table.startsWith(ep + '_')) return 'explicit_prefix';
  }
  for (const p of rule.primary) {
    if (table === p || table.startsWith(p + '_')) return 'primary';
  }
  return null;
}

function classifyTable(table: string, rules: ModuleRule[]): string[] {
  // Returns ordered list of candidate modules, highest-precedence first.
  const explicitHits: string[] = [];
  const explicitPrefixHits: string[] = [];
  const primaryHits: string[] = [];
  for (const r of rules) {
    const m = tableMatchesModule(table, r);
    if (m === 'explicit') explicitHits.push(r.name);
    else if (m === 'explicit_prefix') explicitPrefixHits.push(r.name);
    else if (m === 'primary') primaryHits.push(r.name);
  }
  // explicit > explicit_prefix > primary
  if (explicitHits.length > 0) return explicitHits;
  if (explicitPrefixHits.length > 0) return explicitPrefixHits;
  return primaryHits;
}

interface Classification {
  file: string;
  proposed_module: string | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  tables_total: number;
  candidates?: Record<string, number>;   // module -> table count (for conflicts)
  schemas: string[];
  unmapped_tables?: string[];
}

function main(): void {
  const files: Record<string, FileEntry> = JSON.parse(readFileSync(FILE_TO_TABLE, 'utf8'));
  const { rules, fileOverrides } = parseRules(readFileSync(PREFIXES_YML, 'utf8'));
  const ruleByName = new Map(rules.map(r => [r.name, r]));

  const classifications: Classification[] = [];

  for (const [file, entry] of Object.entries(files)) {
    const tables = Array.from(new Set([...entry.creates, ...entry.alters]));

    // Rule 0 (highest precedence): file-level override
    const override = fileOverrides.get(file);
    if (override) {
      if (override === 'EXCLUDE') continue;
      classifications.push({
        file, proposed_module: override, confidence: 'high',
        reason: 'file_override in module-prefixes.yml',
        tables_total: tables.length, schemas: entry.schemas,
      });
      continue;
    }

    // Rule 1: path_wins
    const pathMatch = file.match(/^modules\/([^\/]+)\//);
    if (pathMatch && ruleByName.has(pathMatch[1])) {
      classifications.push({
        file, proposed_module: pathMatch[1], confidence: 'high',
        reason: 'path: modules/' + pathMatch[1] + '/',
        tables_total: tables.length, schemas: entry.schemas,
      });
      continue;
    }

    // For ops/migrations/** and others, classify by table prefixes.
    const ownerCounts: Record<string, number> = {};
    const unmapped: string[] = [];
    for (const t of tables) {
      const candidates = classifyTable(t, rules);
      if (candidates.length === 0) unmapped.push(t);
      else {
        // first candidate wins (already highest-precedence)
        const owner = candidates[0];
        ownerCounts[owner] = (ownerCounts[owner] ?? 0) + 1;
      }
    }

    const owners = Object.entries(ownerCounts).sort((a, b) => b[1] - a[1]);
    const hasDos = entry.schemas.includes('dos');

    // Rule 3: all tables are dos.* and unmapped → platform-core
    if (owners.length === 0 && unmapped.length > 0 && hasDos) {
      classifications.push({
        file, proposed_module: 'platform-core', confidence: 'high',
        reason: 'schema=dos; no module prefix match',
        tables_total: tables.length, schemas: entry.schemas,
        unmapped_tables: unmapped,
      });
      continue;
    }

    // Rule 4: single module owns all mapped tables
    if (owners.length === 1 && unmapped.length === 0) {
      classifications.push({
        file, proposed_module: owners[0][0], confidence: 'high',
        reason: 'single-owner prefix match: ' + owners[0][0],
        tables_total: tables.length, schemas: entry.schemas,
      });
      continue;
    }

    // Mixed but one dominant owner (>= 80%)
    const total = owners.reduce((s, [,c]) => s + c, 0) + unmapped.length;
    if (owners.length > 0) {
      const [topOwner, topCount] = owners[0];
      const share = total > 0 ? topCount / total : 0;
      if (share >= 0.8 && unmapped.length === 0) {
        classifications.push({
          file, proposed_module: topOwner, confidence: 'medium',
          reason: `dominant owner ${topOwner} (${Math.round(share*100)}% of ${total} tables)`,
          tables_total: tables.length, schemas: entry.schemas,
          candidates: Object.fromEntries(owners),
        });
        continue;
      }
    }

    // Mixed / conflict
    classifications.push({
      file, proposed_module: null, confidence: 'low',
      reason: owners.length > 1 ? `conflict: ${owners.length} owner candidates` :
              unmapped.length > 0 ? `unmapped: ${unmapped.length} table(s)` :
              'no classification',
      tables_total: tables.length, schemas: entry.schemas,
      candidates: owners.length > 0 ? Object.fromEntries(owners) : undefined,
      unmapped_tables: unmapped.length > 0 ? unmapped : undefined,
    });
  }

  classifications.sort((a, b) => a.file.localeCompare(b.file));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(classifications, null, 2) + '\n');

  // Summary
  const byConfidence = { high: 0, medium: 0, low: 0 };
  const byModule: Record<string, number> = {};
  for (const c of classifications) {
    byConfidence[c.confidence]++;
    const k = c.proposed_module ?? '(unclassified)';
    byModule[k] = (byModule[k] ?? 0) + 1;
  }
  console.log(`classify-by-prefix: ${classifications.length} files classified`);
  console.log(`  confidence: high=${byConfidence.high} medium=${byConfidence.medium} low=${byConfidence.low}`);
  console.log(`Per proposed module (top 20):`);
  const sorted = Object.entries(byModule).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [m, n] of sorted) console.log(`  ${n.toString().padStart(4)}  ${m}`);
  console.log(`Wrote: ${OUT}`);
}

main();

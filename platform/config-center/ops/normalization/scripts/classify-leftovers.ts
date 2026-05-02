#!/usr/bin/env tsx
/**
 * Content-aware classification for SQL files that weren't caught by
 * classify-by-prefix.ts (files with no CREATE/ALTER TABLE — seeds, policies,
 * grants, rollback/down migrations, view-only migrations, etc.)
 *
 * Strategy per file:
 *   1. Scan body for any statement referencing a known table:
 *        INSERT INTO <table>
 *        UPDATE <table>
 *        DELETE FROM <table>
 *        CREATE POLICY ... ON <table>
 *        GRANT / REVOKE ... ON <table>
 *        CREATE [OR REPLACE] VIEW [schema.]<view>
 *        CREATE TRIGGER ... ON <table>
 *        CREATE FUNCTION ... trg<table> (best-effort)
 *   2. Map each referenced table to a module using the same prefix rules
 *      used by classify-by-prefix.ts.
 *   3. Pick the dominant owner. If 100% map to one module → high confidence.
 *      Else follow the paired forward migration (for _down.sql) or
 *      dominant owner with >=60% share.
 *   4. Files that reference no identifiable table (CREATE SCHEMA /
 *      CREATE ROLE / CREATE EXTENSION only) → platform-core.
 *   5. SPLIT source files (tenant/027, tenant/000, tenant/099, tenant/118
 *      and their _down siblings) → routed via file_overrides YAML section.
 *
 * Output: ops/normalization/reports/leftover-classification.json
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, basename, dirname } from 'path';

const REPO_ROOT = process.cwd();
const PREFIXES_YML = join(REPO_ROOT, 'ops/normalization/module-prefixes.yml');
const CLASSIFICATION = join(REPO_ROOT, 'ops/normalization/reports/classification.json');
const OUT = join(REPO_ROOT, 'ops/normalization/reports/leftover-classification.json');

interface ModuleRule {
  name: string;
  primary: string[];
  explicit_prefix: string[];
  explicit: string[];
  explicit_exclude: string[];
}

function parseRules(yaml: string): { rules: ModuleRule[]; fileOverrides: Map<string, string> } {
  const rules: ModuleRule[] = [];
  const fileOverrides = new Map<string, string>();
  const lines = yaml.split('\n');
  let section: 'modules' | 'file_overrides' | null = null;
  let current: ModuleRule | null = null;
  const push = () => { if (current) rules.push(current); };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (/^modules:\s*$/.test(line)) { push(); current = null; section = 'modules'; continue; }
    if (/^file_overrides:\s*$/.test(line)) { push(); current = null; section = 'file_overrides'; continue; }
    if (/^[a-z]/.test(line) && !/^  /.test(line)) { push(); current = null; section = null; continue; }
    if (section === 'file_overrides') {
      const m = line.match(/^  ([^:]+):\s+(\S+)\s*$/);
      if (m) fileOverrides.set(m[1].trim(), m[2].trim());
      continue;
    }
    if (section !== 'modules') continue;
    const item = line.match(/^  -\s+name:\s+(.+?)\s*$/);
    if (item) {
      push();
      current = { name: item[1], primary: [], explicit_prefix: [], explicit: [], explicit_exclude: [] };
      continue;
    }
    if (!current) continue;
    const inline = line.match(/^    ([a-z_]+):\s*\[(.*)\]\s*$/);
    if (inline) {
      const key = inline[1];
      const vals = inline[2].split(',').map(s => s.trim()).filter(Boolean);
      if (key === 'primary') current.primary = vals;
      else if (key === 'explicit_prefix') current.explicit_prefix = vals;
      else if (key === 'explicit') current.explicit = vals;
      else if (key === 'explicit_exclude') current.explicit_exclude = vals;
    }
  }
  push();
  return { rules, fileOverrides };
}

function tableMatches(table: string, rule: ModuleRule): number {
  // Returns precedence score: 3 explicit, 2 explicit_prefix, 1 primary, 0 none.
  if (rule.explicit_exclude.includes(table)) return 0;
  if (rule.explicit.includes(table)) return 3;
  for (const ep of rule.explicit_prefix) {
    if (table === ep || table.startsWith(ep + '_')) return 2;
  }
  for (const p of rule.primary) {
    if (table === p || table.startsWith(p + '_')) return 1;
  }
  return 0;
}

function classifyTable(table: string, rules: ModuleRule[]): string | null {
  let bestScore = 0;
  let bestName: string | null = null;
  for (const r of rules) {
    const s = tableMatches(table, r);
    if (s > bestScore) { bestScore = s; bestName = r.name; }
  }
  return bestScore > 0 ? bestName : null;
}

function stripIdent(id: string): string {
  const parts = id.replace(/[";]/g, '').split('.');
  return parts[parts.length - 1];
}

/** Extract every table / view name referenced by any meaningful statement. */
function extractReferencedTables(sql: string): string[] {
  const tables = new Set<string>();
  const add = (t: string) => { const s = stripIdent(t); if (s) tables.add(s); };
  const patterns: Array<[RegExp, number]> = [
    // forward DDL
    [/CREATE\s+(?:UNLOGGED\s+|TEMP(?:ORARY)?\s+)?TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z_"][\w".]*)/gi, 1],
    [/ALTER\s+TABLE(?:\s+ONLY)?(?:\s+IF\s+EXISTS)?\s+([A-Za-z_"][\w".]*)/gi, 1],
    [/DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+([A-Za-z_"][\w".]*)/gi, 1],
    [/TRUNCATE(?:\s+TABLE)?\s+([A-Za-z_"][\w".]*)/gi, 1],
    // indexes/policies/triggers
    [/CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+CONCURRENTLY)?(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:[A-Za-z_][\w]*\s+)?ON(?:\s+ONLY)?\s+([A-Za-z_"][\w".]*)/gi, 1],
    [/CREATE\s+POLICY\s+\S+\s+ON\s+([A-Za-z_"][\w".]*)/gi, 1],
    [/CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+\S+[\s\S]{0,256}?ON\s+([A-Za-z_"][\w".]*)/gi, 1],
    // DML / seeds
    [/INSERT\s+INTO\s+([A-Za-z_"][\w".]*)/gi, 1],
    [/UPDATE\s+([A-Za-z_"][\w".]*)/gi, 1],
    [/DELETE\s+FROM\s+([A-Za-z_"][\w".]*)/gi, 1],
    // grants / views
    [/(?:GRANT|REVOKE)\s+[^;]+?ON(?:\s+TABLE)?\s+([A-Za-z_"][\w".]*)/gi, 1],
    [/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW(?:\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z_"][\w".]*)/gi, 1],
    [/ALTER\s+(?:TABLE|VIEW)\s+[^\s]+\s+RENAME\s+TO\s+([A-Za-z_"][\w".]*)/gi, 1],
    [/COMMENT\s+ON\s+(?:TABLE|COLUMN|VIEW)\s+([A-Za-z_"][\w".]*)/gi, 1],
  ];
  for (const [re, g] of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql))) add(m[g]);
  }
  return Array.from(tables);
}

function listAllSqlFiles(): string[] {
  const out: string[] = [];
  const roots = ['ops/migrations', 'modules'];
  const walk = (rel: string): void => {
    const abs = join(REPO_ROOT, rel);
    if (!existsSync(abs)) return;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const sub = join(rel, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(sub);
      } else if (entry.name.endsWith('.sql')) {
        out.push(sub);
      }
    }
  };
  for (const r of roots) walk(r);
  return out;
}

interface Leftover {
  file: string;
  proposed_module: string;
  confidence: 'high' | 'medium' | 'low' | 'split-source';
  reason: string;
  top_candidates: Array<[string, number]>;
  referenced_tables: string[];
}

function main(): void {
  const { rules, fileOverrides } = parseRules(readFileSync(PREFIXES_YML, 'utf8'));
  const existingClassified = new Set<string>(
    JSON.parse(readFileSync(CLASSIFICATION, 'utf8')).map((c: any) => c.file)
  );
  const allFiles = listAllSqlFiles();

  // "Leftovers" = files not already classified AND not shards we generated
  // AND not already under modules/{X}/db/{scope}/migrations/ (those are
  // post-reorg destinations, out of scope here).
  const leftovers = allFiles.filter(f => {
    if (existingClassified.has(f)) return false;
    if (/modules\/[^/]+\/db\/(tenant|public)\/migrations\//.test(f)) return false;
    if (/modules\/[^/]+\/db\/manifest\.yml/.test(f)) return false;
    return true;
  });

  const results: Leftover[] = [];
  for (const f of leftovers) {
    // File-level override takes precedence.
    const ov = fileOverrides.get(f);
    if (ov === 'EXCLUDE') continue;
    if (ov === 'SPLIT') {
      results.push({
        file: f, proposed_module: 'platform-core/_frozen', confidence: 'split-source',
        reason: 'SPLIT source — routed to platform-core/_frozen (shards live in per-module dirs)',
        top_candidates: [], referenced_tables: [],
      });
      continue;
    }
    if (ov) {
      results.push({
        file: f, proposed_module: ov, confidence: 'high',
        reason: 'file_override in module-prefixes.yml',
        top_candidates: [], referenced_tables: [],
      });
      continue;
    }

    // Rollback/down pair: follow the forward sibling.
    const downMatch = basename(f).match(/^(.+)_down\.sql$/i);
    if (downMatch) {
      const forwardBase = downMatch[1] + '.sql';
      // Forward is in same dir, or in sibling forward dir.
      const candidates = [
        join(dirname(f), forwardBase),
        f.replace('/rollback/', '/').replace(/_down\.sql$/, '.sql'),
      ];
      const classificationArr = JSON.parse(readFileSync(CLASSIFICATION, 'utf8'));
      for (const cand of candidates) {
        const hit = classificationArr.find((c: any) => c.file === cand);
        if (hit?.proposed_module && hit.proposed_module !== 'SPLIT') {
          results.push({
            file: f, proposed_module: hit.proposed_module, confidence: 'high',
            reason: `rollback of ${cand} (owner: ${hit.proposed_module})`,
            top_candidates: [], referenced_tables: [],
          });
          continue;
        }
      }
    }

    // Content-aware table extraction
    const sql = readFileSync(join(REPO_ROOT, f), 'utf8');
    const referenced = extractReferencedTables(sql);
    const counts: Record<string, number> = {};
    for (const t of referenced) {
      const owner = classifyTable(t, rules);
      if (owner) counts[owner] = (counts[owner] ?? 0) + 1;
    }
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    let proposed = 'platform-core';
    let confidence: Leftover['confidence'] = 'low';
    let reason = 'no classifiable tables; default platform-core';
    if (ranked.length > 0) {
      const total = ranked.reduce((s, [, c]) => s + c, 0);
      const [top, topN] = ranked[0];
      const share = total > 0 ? topN / total : 0;
      proposed = top;
      if (ranked.length === 1) { confidence = 'high'; reason = `single-owner: ${top}`; }
      else if (share >= 0.6) { confidence = 'medium'; reason = `dominant owner ${top} (${Math.round(share*100)}% of ${total} refs)`; }
      else { confidence = 'low'; reason = `mixed refs; top=${top}`; }
    }
    results.push({
      file: f, proposed_module: proposed, confidence, reason,
      top_candidates: ranked.slice(0, 5), referenced_tables: referenced.slice(0, 20),
    });
  }

  results.sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(OUT, JSON.stringify(results, null, 2) + '\n');

  const byConf: Record<string, number> = {};
  const byOwner: Record<string, number> = {};
  for (const r of results) {
    byConf[r.confidence] = (byConf[r.confidence] ?? 0) + 1;
    byOwner[r.proposed_module] = (byOwner[r.proposed_module] ?? 0) + 1;
  }
  console.log(`classify-leftovers: ${results.length} leftover files`);
  for (const [k, v] of Object.entries(byConf)) console.log(`  ${k.padEnd(14)} ${v}`);
  console.log(`Top owners:`);
  for (const [k, v] of Object.entries(byOwner).sort((a, b) => b[1] - a[1])) console.log(`  ${v.toString().padStart(4)}  ${k}`);
  console.log(`Wrote: ${OUT}`);
}

main();

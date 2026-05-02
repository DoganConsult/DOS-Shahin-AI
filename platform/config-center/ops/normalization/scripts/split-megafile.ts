#!/usr/bin/env tsx
/**
 * Phase B.5 — SQL-aware splitter for genuinely multi-owner migration files.
 *
 * Input: a source migration file whose CREATE/ALTER statements span multiple
 * owning modules per `ops/normalization/module-prefixes.yml`.
 *
 * For each statement in the source:
 *   - extract the target table (CREATE TABLE, ALTER TABLE, CREATE INDEX ON,
 *     CREATE POLICY ON, CREATE TRIGGER ON, COMMENT ON TABLE/COLUMN,
 *     DROP TABLE, TRUNCATE, INSERT INTO)
 *   - look up the owning module via classify-by-prefix rules
 *   - bucket the statement by module
 *
 * Statements that don't target a known table (CREATE SCHEMA, CREATE EXTENSION,
 * CREATE FUNCTION, DO $$ blocks without parseable ALTER target, etc.) go to
 * `platform-core` by default — these are cross-cutting platform ops.
 *
 * Output: modules/{mod}/db/tenant/migrations/extracted_from_{basename}.sql
 * (or .../db/public/migrations/ if schema is dos.*)
 *
 * The source file is NOT modified — splitting produces extracts that are
 * additive. Supersession (marking the source file as replaced-by-shards) is
 * handled by the migration runner change in a later phase.
 *
 * CLI:
 *   npx tsx ops/normalization/scripts/split-megafile.ts \
 *     [--source <path>]   (default: all files marked SPLIT in classification.json)
 *     [--dry-run]         (print statement routing; write nothing)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname, basename } from 'path';

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

const REPO_ROOT = process.cwd();
const PREFIXES_YML = join(REPO_ROOT, 'ops/normalization/module-prefixes.yml');
const CLASSIFICATION = join(REPO_ROOT, 'ops/normalization/reports/classification.json');
const OUT_REPORT = join(REPO_ROOT, 'ops/normalization/reports/split-report.json');

interface ModuleRule {
  name: string;
  primary: string[];
  explicit_prefix: string[];
  explicit: string[];
  explicit_exclude: string[];
}
interface Ruleset {
  rules: ModuleRule[];
}

function parseRules(yaml: string): Ruleset {
  const rules: ModuleRule[] = [];
  const lines = yaml.split('\n');
  let section: 'modules' | null = null;
  let current: ModuleRule | null = null;
  let currentListKey: keyof ModuleRule | null = null;
  const pushCurrent = () => { if (current) rules.push(current); };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (/^modules:\s*$/.test(line)) { pushCurrent(); current = null; section = 'modules'; continue; }
    if (/^[a-z]/.test(line) && !/^  /.test(line)) {
      pushCurrent(); current = null; section = null; continue;
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
      continue;
    }
  }
  pushCurrent();
  return { rules };
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

function classifyTable(table: string, rules: ModuleRule[]): string | null {
  const explicitHits: string[] = [];
  const explicitPrefixHits: string[] = [];
  const primaryHits: string[] = [];
  for (const r of rules) {
    const m = tableMatchesModule(table, r);
    if (m === 'explicit') explicitHits.push(r.name);
    else if (m === 'explicit_prefix') explicitPrefixHits.push(r.name);
    else if (m === 'primary') primaryHits.push(r.name);
  }
  return explicitHits[0] ?? explicitPrefixHits[0] ?? primaryHits[0] ?? null;
}

// ─── SQL statement splitter (copied from migration-runner.ts; handles
// dollar-quoting, line/block comments, quoted strings) ───
function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let i = 0;
  let inSingle = false, inDouble = false, inLineComment = false, inBlockComment = false;
  let dollarTag: string | null = null;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (inLineComment) { buf += ch; if (ch === '\n') inLineComment = false; i++; continue; }
    if (inBlockComment) { buf += ch; if (ch === '*' && next === '/') { buf += next; i += 2; inBlockComment = false; continue; } i++; continue; }
    if (dollarTag) {
      buf += ch;
      if (ch === '$' && sql.startsWith(dollarTag, i)) {
        buf += sql.slice(i + 1, i + dollarTag.length);
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      i++; continue;
    }
    if (inSingle) { buf += ch; if (ch === "'" && next === "'") { buf += next; i += 2; continue; } if (ch === "'") inSingle = false; i++; continue; }
    if (inDouble) { buf += ch; if (ch === '"' && next === '"') { buf += next; i += 2; continue; } if (ch === '"') inDouble = false; i++; continue; }
    if (ch === '-' && next === '-') { buf += ch; inLineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { buf += ch; inBlockComment = true; i++; continue; }
    if (ch === "'") { inSingle = true; buf += ch; i++; continue; }
    if (ch === '"') { inDouble = true; buf += ch; i++; continue; }
    if (ch === '$') {
      const m = sql.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*?\$|^\$\$/);
      if (m) { dollarTag = m[0]; buf += m[0]; i += m[0].length; continue; }
    }
    if (ch === ';') {
      const trimmed = buf.trim();
      if (trimmed.length > 0) out.push(trimmed + ';');
      buf = '';
      i++; continue;
    }
    buf += ch; i++;
  }
  const tail = buf.trim();
  if (tail.length > 0) out.push(tail + (tail.endsWith(';') ? '' : ';'));
  return out;
}

// ─── Target-table extraction ───
function stripIdentifier(id: string): string {
  // strip schema prefix "public.", quotes, __TENANT_SCHEMA__.
  let s = id.trim();
  // Remove trailing column-list / parens parts (handled by caller)
  // Remove schema qualifier
  // Handles: "schema"."table", schema.table, "__TENANT_SCHEMA__"."table", public."table"
  const m = s.match(/^(?:["]?[A-Za-z_][A-Za-z0-9_]*["]?\.)?["]?([A-Za-z_][A-Za-z0-9_]*)["]?$/);
  if (m) return m[1];
  // Fallback: last dot-segment, dequoted
  const parts = s.split('.');
  return parts[parts.length - 1].replace(/^"|"$/g, '');
}

function targetTable(stmt: string): string | null {
  // Strip leading whitespace and comments
  const body = stmt.replace(/^(?:\s|--[^\n]*\n|\/\*[\s\S]*?\*\/)+/, '');
  const upper = body.toUpperCase();

  // CREATE TABLE [IF NOT EXISTS] [schema.]name (...
  let m = body.match(/^\s*CREATE\s+(?:UNLOGGED\s+|TEMP(?:ORARY)?\s+)?TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([^\s(]+)/i);
  if (m) return stripIdentifier(m[1]);

  // ALTER TABLE [IF EXISTS] [ONLY] [schema.]name
  m = body.match(/^\s*ALTER\s+TABLE(?:\s+IF\s+EXISTS)?(?:\s+ONLY)?\s+([^\s,]+)/i);
  if (m) return stripIdentifier(m[1]);

  // CREATE [UNIQUE] INDEX [IF NOT EXISTS] name ON [schema.]table
  m = body.match(/^\s*CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+CONCURRENTLY)?(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:[A-Za-z_][A-Za-z0-9_]*\s+)?ON(?:\s+ONLY)?\s+([^\s(]+)/i);
  if (m) return stripIdentifier(m[1]);

  // CREATE POLICY name ON [schema.]table
  m = body.match(/^\s*CREATE\s+POLICY\s+\S+\s+ON\s+([^\s]+)/i);
  if (m) return stripIdentifier(m[1]);

  // CREATE TRIGGER name ... ON [schema.]table
  m = body.match(/^\s*CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+\S+[\s\S]*?ON\s+([A-Za-z_"][\w".]*)/i);
  if (m) return stripIdentifier(m[1]);

  // COMMENT ON TABLE|COLUMN [schema.]table[.col]
  m = body.match(/^\s*COMMENT\s+ON\s+(?:TABLE|COLUMN)\s+([^\s]+)/i);
  if (m) {
    const t = m[1];
    // strip trailing .column for COMMENT ON COLUMN
    const parts = t.split('.');
    if (parts.length >= 2 && upper.startsWith('COMMENT ON COLUMN')) {
      return stripIdentifier(parts.slice(0, -1).join('.'));
    }
    return stripIdentifier(t);
  }

  // DROP TABLE [IF EXISTS] [schema.]name
  m = body.match(/^\s*DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+([^\s,;]+)/i);
  if (m) return stripIdentifier(m[1]);

  // TRUNCATE [TABLE] [schema.]name
  m = body.match(/^\s*TRUNCATE(?:\s+TABLE)?\s+([^\s,;]+)/i);
  if (m) return stripIdentifier(m[1]);

  // INSERT INTO [schema.]name
  m = body.match(/^\s*INSERT\s+INTO\s+([^\s(]+)/i);
  if (m) return stripIdentifier(m[1]);

  // UPDATE [schema.]name
  m = body.match(/^\s*UPDATE\s+([^\s]+)/i);
  if (m) return stripIdentifier(m[1]);

  // DO $$ ... $$ — look inside for CREATE INDEX / ALTER TABLE / CREATE POLICY
  if (/^\s*DO\s+\$/i.test(body)) {
    const inner = body
      .replace(/^\s*DO\s+\$[^$]*?\$/i, '')
      .replace(/\$[^$]*?\$\s*;?\s*$/i, '');
    // try each inner DDL form
    m = inner.match(/CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+CONCURRENTLY)?(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:[A-Za-z_][A-Za-z0-9_]*\s+)?ON(?:\s+ONLY)?\s+([^\s(]+)/i);
    if (m) return stripIdentifier(m[1]);
    m = inner.match(/ALTER\s+TABLE(?:\s+IF\s+EXISTS)?(?:\s+ONLY)?\s+([^\s,]+)/i);
    if (m) return stripIdentifier(m[1]);
    m = inner.match(/CREATE\s+POLICY\s+\S+\s+ON\s+([^\s]+)/i);
    if (m) return stripIdentifier(m[1]);
    m = inner.match(/CREATE\s+TRIGGER\s+\S+[\s\S]*?ON\s+([A-Za-z_"][\w".]*)/i);
    if (m) return stripIdentifier(m[1]);
    m = inner.match(/DROP\s+(?:INDEX|TABLE|POLICY)\s+(?:IF\s+EXISTS\s+)?([^\s,;]+)(?:\s+ON\s+([^\s,;]+))?/i);
    if (m) return stripIdentifier(m[2] ?? m[1]);
  }

  return null;
}

interface SplitBucket {
  module: string;
  stmts: string[];
  tables: Set<string>;
}

function splitFile(sourcePath: string, rules: ModuleRule[], dryRun: boolean): Record<string, { tables: string[]; stmt_count: number; out_path: string }> {
  const absSource = join(REPO_ROOT, sourcePath);
  const sql = readFileSync(absSource, 'utf8');
  const sourceChecksum = sha256(sql);
  const stmts = splitSqlStatements(sql);

  const buckets = new Map<string, SplitBucket>();
  const unattributed: string[] = [];
  let totalTargets = 0;

  for (const stmt of stmts) {
    const table = targetTable(stmt);
    let owner: string | null = null;
    if (table) {
      totalTargets++;
      owner = classifyTable(table, rules);
    }
    // Default: platform-core for CREATE SCHEMA / EXTENSION / FUNCTION /
    // DO blocks we couldn't parse / anything without a resolvable table.
    owner = owner ?? 'platform-core';
    if (!table) unattributed.push(stmt.slice(0, 80));

    let bucket = buckets.get(owner);
    if (!bucket) {
      bucket = { module: owner, stmts: [], tables: new Set() };
      buckets.set(owner, bucket);
    }
    bucket.stmts.push(stmt);
    if (table) bucket.tables.add(table);
  }

  const isTenant = sourcePath.includes('/tenant/');
  const result: Record<string, { tables: string[]; stmt_count: number; out_path: string }> = {};
  const srcBase = basename(sourcePath).replace(/\.sql$/i, '');
  const srcTagMatch = srcBase.match(/^(\d+)/);
  const numPrefix = srcTagMatch ? srcTagMatch[1] : '000';

  for (const [mod, bucket] of buckets) {
    const scope = isTenant ? 'tenant' : 'public';
    const outDir = join(REPO_ROOT, 'modules', mod, 'db', scope, 'migrations');
    const outFile = join(outDir, `${numPrefix}_extracted_from_${srcBase}.sql`);
    const header = [
      `-- dos:extracted-from: ${sourcePath}`,
      `-- dos:supersedes-checksum: ${sourceChecksum}`,
      `-- dos:owning-module: ${mod}`,
      `-- dos:tables: ${Array.from(bucket.tables).sort().join(', ')}`,
      `-- dos:statement-count: ${bucket.stmts.length}`,
      `-- Generated by ops/normalization/scripts/split-megafile.ts`,
      '--',
      `-- The migration runner treats this file as already applied whenever`,
      `-- the parent file's checksum is recorded in dos.platform_migrations.`,
      `-- Fresh databases re-run the parent first, then skip this shard.`,
      '',
    ].join('\n');
    const body = bucket.stmts.join('\n\n') + '\n';
    if (!dryRun) {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(outFile, header + body);
    }
    result[mod] = {
      tables: Array.from(bucket.tables).sort(),
      stmt_count: bucket.stmts.length,
      out_path: `modules/${mod}/db/${scope}/migrations/${numPrefix}_extracted_from_${srcBase}.sql`,
    };
  }

  if (unattributed.length > 0 && !dryRun) {
    console.log(`  warn: ${unattributed.length} statements had no parseable table target (routed to platform-core)`);
  }
  return result;
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const srcIdx = args.indexOf('--source');
  const singleSource = srcIdx >= 0 ? args[srcIdx + 1] : null;

  const rulesetYaml = readFileSync(PREFIXES_YML, 'utf8');
  const { rules } = parseRules(rulesetYaml);

  let targets: string[];
  if (singleSource) {
    targets = [singleSource];
  } else {
    const classification = JSON.parse(readFileSync(CLASSIFICATION, 'utf8'));
    targets = classification.filter((c: any) => c.proposed_module === 'SPLIT').map((c: any) => c.file);
  }

  console.log(`split-megafile: processing ${targets.length} file(s)` + (dryRun ? ' [DRY-RUN]' : ''));
  const report: Record<string, any> = {};
  for (const t of targets) {
    console.log(`\n== ${t}`);
    const shards = splitFile(t, rules, dryRun);
    report[t] = shards;
    const summary = Object.entries(shards).sort((a, b) => b[1].stmt_count - a[1].stmt_count).slice(0, 10);
    for (const [mod, info] of summary) {
      console.log(`  ${mod.padEnd(22)} ${info.stmt_count.toString().padStart(5)} stmts  ${info.tables.length} tables  -> ${info.out_path}`);
    }
    if (Object.keys(shards).length > summary.length) {
      console.log(`  ... (${Object.keys(shards).length - summary.length} more modules)`);
    }
    const totalStmts = Object.values(shards).reduce((s: number, v: any) => s + v.stmt_count, 0);
    const totalTables = Object.values(shards).reduce((s: number, v: any) => s + v.tables.length, 0);
    console.log(`  TOTAL: ${totalStmts} statements, ${totalTables} tables, across ${Object.keys(shards).length} module shards`);
  }
  if (!dryRun) {
    writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2) + '\n');
    console.log(`\nWrote: ${OUT_REPORT}`);
  }
}

main();

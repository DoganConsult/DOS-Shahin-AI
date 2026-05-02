#!/usr/bin/env node
// ops/scripts/inject-module-migration-backfills.mjs
//
// One-time transformer that patches every module migration under
// modules/*/source/backend/*/migrations/*.sql so its CREATE TABLE
// IF NOT EXISTS statements are paired with idempotent
// ALTER TABLE ADD COLUMN IF NOT EXISTS statements for every non-PK column.
//
// Background:
//   tenant/027_tenant_schema_tables.sql auto-generates ~1050 minimal stub
//   tables (id UUID PK, tenant_id, status, metadata, *_at, *_by) intended
//   to pre-seed every per-module domain table. The per-module migrations
//   that ship under modules/*/source/backend/*/migrations/ define the
//   CANONICAL richer shape for the same table names. Their
//   CREATE TABLE IF NOT EXISTS statements no-op against the 027 stubs,
//   then subsequent CREATE INDEX / ALTER / FK statements fail with
//   "column X does not exist".
//
//   Per Phase 3A Part 2 rules the fix must be an idempotent guard, not
//   an unsafe DROP (production tenants have already run 027 and may
//   carry data in its stubs). For each CREATE TABLE IF NOT EXISTS
//   __TENANT_SCHEMA__.<name> ( ... ), we emit an
//   ALTER TABLE __TENANT_SCHEMA__.<name> ADD COLUMN IF NOT EXISTS <col> <type>
//   for every column defined in the body except the PK — so the table
//   converges on the canonical shape whether it pre-existed as a stub
//   or not. ADD COLUMN IF NOT EXISTS is idempotent under ADD DEFAULT.
//
//   We explicitly skip table-level CHECK / UNIQUE / FOREIGN KEY /
//   PRIMARY KEY clauses (they are not column definitions), and rename
//   the PK column by detecting "PRIMARY KEY" inline.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modulesRoot = path.join(workspaceRoot, 'modules');

if (!fs.existsSync(modulesRoot)) {
  console.error('[inject-backfills] modules/ not found');
  process.exit(1);
}

function collectMigrationFiles() {
  const out = [];
  for (const m of fs.readdirSync(modulesRoot, { withFileTypes: true })) {
    if (!m.isDirectory()) continue;
    const backend = path.join(modulesRoot, m.name, 'source', 'backend');
    if (!fs.existsSync(backend)) continue;
    for (const s of fs.readdirSync(backend, { withFileTypes: true })) {
      if (!s.isDirectory()) continue;
      const migrations = path.join(backend, s.name, 'migrations');
      if (!fs.existsSync(migrations)) continue;
      for (const f of fs.readdirSync(migrations)) {
        if (!f.endsWith('.sql') || f.endsWith('_down.sql')) continue;
        out.push(path.join(migrations, f));
      }
    }
  }
  return out.sort();
}

// Parse a CREATE TABLE body and return [{ name, type }] for each column.
// Skip constraint lines (PRIMARY KEY alone, FOREIGN KEY, CONSTRAINT, UNIQUE,
// CHECK as table-level) and the inline-PK column itself (we don't want to
// ADD COLUMN a PK — PKs can't be added idempotently the same way).
function parseColumns(body) {
  // Strip line comments and block comments from the body first — commas
  // inside comments would otherwise break the split. Keep the logic simple:
  // remove // -- ... to end-of-line and /* ... */ non-greedy.
  const cleaned = body
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Split on commas that are at depth 0 of parentheses — so nested
  // NUMERIC(10,2) / CHECK(col IN ('a','b')) stay intact.
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of cleaned) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());

  const columns = [];
  for (const rawLine of parts) {
    const line = rawLine.trim();
    if (!line) continue;
    // Skip table-level constraints
    const upper = line.toUpperCase();
    if (
      upper.startsWith('CONSTRAINT ') ||
      upper.startsWith('FOREIGN KEY') ||
      upper.startsWith('PRIMARY KEY') ||
      upper.startsWith('UNIQUE(') ||
      upper.startsWith('UNIQUE (') ||
      upper.startsWith('CHECK(') ||
      upper.startsWith('CHECK (') ||
      upper.startsWith('EXCLUDE ') ||
      upper.startsWith('LIKE ')
    ) {
      continue;
    }
    // Skip column definitions that declare PRIMARY KEY inline — the stub in
    // 027 already has the PK column with the same type, so no backfill
    // needed. ADD COLUMN ... PRIMARY KEY would fail on a second run anyway.
    if (/\bPRIMARY\s+KEY\b/i.test(line)) {
      continue;
    }
    // First whitespace-separated token is the column name; the rest is type+
    // modifiers. Name may be quoted.
    const match = line.match(/^("[^"]+"|[A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/s);
    if (!match) continue;
    const name = match[1].replace(/"/g, '');
    const typeAndModifiers = match[2].trim();
    // Strip NOT NULL when emitting ADD COLUMN IF NOT EXISTS — adding a
    // NOT NULL column to an existing table without a default would fail
    // on any pre-populated stub. If the definition carries a DEFAULT we
    // keep it; otherwise drop NOT NULL so the ADD is safe.
    const hasDefault = /\bDEFAULT\b/i.test(typeAndModifiers);
    let safeType = typeAndModifiers;
    if (!hasDefault) {
      safeType = safeType.replace(/\bNOT\s+NULL\b/gi, '').replace(/\s{2,}/g, ' ').trim();
    }
    columns.push({ name, type: safeType });
  }
  return columns;
}

// Match a full CREATE TABLE [IF NOT EXISTS] __TENANT_SCHEMA__.<name> ( <body> );
// Tolerate quoted identifiers, whitespace, and an optional schema prefix.
// Use a greedy body match up to the matching close paren at depth 0 by
// walking the text; regex alone can't match balanced parens.
function findCreateTableStatements(sql) {
  const results = [];
  const pattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("?__TENANT_SCHEMA__"?\.\s*"?([A-Za-z0-9_]+)"?)\s*\(/gi;
  let match;
  while ((match = pattern.exec(sql)) !== null) {
    const headerStart = match.index;
    const openParen = match.index + match[0].length - 1;
    const tableRef = match[1];
    const tableName = match[2];
    // Walk to matching close paren
    let depth = 1;
    let i = openParen + 1;
    while (i < sql.length && depth > 0) {
      const ch = sql[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      i++;
    }
    if (depth !== 0) continue;
    const bodyEnd = i - 1; // index of matching ')'
    const body = sql.slice(openParen + 1, bodyEnd);
    // End of statement = semicolon after ')'
    let semi = sql.indexOf(';', bodyEnd);
    if (semi === -1) semi = bodyEnd;
    results.push({
      headerStart,
      statementEnd: semi + 1,
      tableRef,
      tableName,
      body,
    });
  }
  return results;
}

const BACKFILL_SENTINEL = '-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift';

function patchFile(absPath) {
  const original = fs.readFileSync(absPath, 'utf8');
  if (original.includes(BACKFILL_SENTINEL)) {
    return { status: 'skipped', reason: 'already patched' };
  }
  const statements = findCreateTableStatements(original);
  if (statements.length === 0) {
    return { status: 'skipped', reason: 'no CREATE TABLE __TENANT_SCHEMA__ found' };
  }
  // Walk statements in reverse so earlier indices are not invalidated.
  let patched = original;
  let totalColumns = 0;
  for (let i = statements.length - 1; i >= 0; i--) {
    const stmt = statements[i];
    const columns = parseColumns(stmt.body);
    if (columns.length === 0) continue;
    totalColumns += columns.length;
    const tableRef = stmt.tableRef.replace(/"/g, '');
    const lines = [`\n${BACKFILL_SENTINEL} on ${tableRef}`];
    for (const col of columns) {
      lines.push(`ALTER TABLE ${tableRef} ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
    }
    const insertAt = stmt.statementEnd;
    patched = patched.slice(0, insertAt) + lines.join('\n') + patched.slice(insertAt);
  }
  fs.writeFileSync(absPath, patched);
  return {
    status: 'patched',
    tableCount: statements.length,
    columnCount: totalColumns,
  };
}

const files = collectMigrationFiles();
console.log(`[inject-backfills] scanning ${files.length} module migration files`);
let patchedCount = 0;
let skippedCount = 0;
for (const f of files) {
  const rel = path.relative(workspaceRoot, f);
  const res = patchFile(f);
  if (res.status === 'patched') {
    patchedCount++;
    console.log(`[inject-backfills] patched ${rel}  tables=${res.tableCount} columns=${res.columnCount}`);
  } else {
    skippedCount++;
    console.log(`[inject-backfills] skipped ${rel}  reason=${res.reason}`);
  }
}
console.log(`[inject-backfills] done — patched=${patchedCount} skipped=${skippedCount}`);

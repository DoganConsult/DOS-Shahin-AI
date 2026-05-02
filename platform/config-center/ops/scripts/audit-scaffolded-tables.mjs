#!/usr/bin/env node
// ============================================================================
// audit-scaffolded-tables.mjs
// W1.6 — Read-only audit of scaffolded tenant tables.
//
// For every CREATE TABLE in:
//   - modules/<m>/source/backend/<m>/migrations/002_enterprise_expansion.sql
//   - ops/migrations/tenant/027_tenant_schema_tables.sql
//
// Classify as KEEP / RESERVE / DROP based on:
//   - KEEP    — source code references the table name anywhere outside
//               migration/*.sql, AS-BUILT.md, or module.manifest.json.
//   - RESERVE — zero code refs but the module manifest or AS-BUILT.md
//               claims ownership (drop-safe later, preserve intent now).
//   - DROP    — zero code refs AND zero ownership claim.
//
// Emits ops/reports/scaffold-triage.csv.
// Prints a summary to stdout.
//
// Usage:
//   node ops/scripts/audit-scaffolded-tables.mjs
//   node ops/scripts/audit-scaffolded-tables.mjs --verbose
// ============================================================================

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const REPORT_DIR = resolve(REPO_ROOT, 'ops', 'reports');
const REPORT_PATH = resolve(REPORT_DIR, 'scaffold-triage.csv');
const VERBOSE = process.argv.includes('--verbose');

function log(...args) {
  if (VERBOSE) console.error(...args);
}

// Match `CREATE TABLE [IF NOT EXISTS] [schema.]name (` — tolerant of placeholder prefix.
const CREATE_TABLE_RE =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?__TENANT_SCHEMA__"?\.|[A-Za-z_]\w*\.)?"?([A-Za-z_]\w*)"?\s*\(/gi;

function extractTableNames(sql) {
  const names = new Set();
  let m;
  while ((m = CREATE_TABLE_RE.exec(sql)) !== null) {
    names.add(m[1]);
  }
  return [...names];
}

async function findMigrationFiles() {
  const files = [];
  const modulesRoot = resolve(REPO_ROOT, 'modules');
  if (existsSync(modulesRoot)) {
    const modules = await readdir(modulesRoot, { withFileTypes: true });
    for (const m of modules) {
      if (!m.isDirectory()) continue;
      const migrationsDir = resolve(modulesRoot, m.name, 'source', 'backend', m.name, 'migrations');
      if (!existsSync(migrationsDir)) continue;
      const target = resolve(migrationsDir, '002_enterprise_expansion.sql');
      if (existsSync(target)) {
        files.push({
          path: target,
          scope: 'module',
          rel: relative(REPO_ROOT, target),
        });
      }
    }
  }
  const central = resolve(REPO_ROOT, 'ops/migrations/tenant/027_tenant_schema_tables.sql');
  if (existsSync(central)) {
    files.push({
      path: central,
      scope: 'central',
      rel: 'ops/migrations/tenant/027_tenant_schema_tables.sql',
    });
  }
  return files;
}

// rg with literal-string mode, excluding migration dirs and doc files.
// Falls back gracefully if rg is not available.
function countRefs(tableName) {
  const cmd = spawnSync(
    'rg',
    [
      '--count-matches',
      '--fixed-strings',
      '--no-messages',
      '--type-not', 'sql',
      '--glob', '!**/migrations/**',
      '--glob', '!**/AS-BUILT.md',
      '--glob', '!**/module.manifest.json',
      '--glob', '!**/scaffold-triage.csv',
      '--glob', '!**/ops/reports/**',
      '--glob', '!**/node_modules/**',
      '--glob', '!**/dist/**',
      '--glob', '!**/.angular/**',
      tableName,
      REPO_ROOT,
    ],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );

  if (cmd.status !== 0 && cmd.status !== 1) {
    // 0 = match, 1 = no match (expected), else treat as 0 and warn once.
    if (!countRefs.warned) {
      console.error('WARN: rg exited with status', cmd.status, cmd.stderr?.slice(0, 400));
      countRefs.warned = true;
    }
    return 0;
  }
  if (cmd.status === 1) return 0;

  // Output format: path:N per file; sum all N.
  const lines = cmd.stdout.split('\n').filter(Boolean);
  let total = 0;
  for (const ln of lines) {
    const idx = ln.lastIndexOf(':');
    if (idx === -1) continue;
    const n = parseInt(ln.slice(idx + 1), 10);
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

async function loadManifestOwnedTables(modulePath) {
  const manifestPath = resolve(modulePath, 'module.manifest.json');
  if (!existsSync(manifestPath)) return new Set();
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    return new Set(parsed.ownedTables ?? []);
  } catch (err) {
    log('manifest parse failed for', manifestPath, err.message);
    return new Set();
  }
}

async function loadAsBuiltClaims(modulePath) {
  const asBuiltPath = resolve(modulePath, 'AS-BUILT.md');
  if (!existsSync(asBuiltPath)) return new Set();
  try {
    const raw = await readFile(asBuiltPath, 'utf8');
    const claims = new Set();
    // Extract identifiers that look like table names (mention-in-prose or bullets).
    for (const m of raw.matchAll(/`([a-z][a-z0-9_]{2,})`/g)) {
      claims.add(m[1]);
    }
    return claims;
  } catch (err) {
    log('AS-BUILT parse failed for', asBuiltPath, err.message);
    return new Set();
  }
}

function moduleRootFromMigrationPath(migrationPath) {
  // modules/<m>/source/backend/<m>/migrations/002_enterprise_expansion.sql → modules/<m>
  const rel = relative(REPO_ROOT, migrationPath);
  const parts = rel.split('/');
  if (parts[0] !== 'modules' || parts.length < 2) return null;
  return resolve(REPO_ROOT, parts[0], parts[1]);
}

function csvEscape(s) {
  const str = String(s ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

async function main() {
  const files = await findMigrationFiles();
  console.error(`Scanning ${files.length} migration file(s) for scaffolded tables…`);

  const rows = [];
  const ownershipCache = new Map();

  for (const file of files) {
    const sql = await readFile(file.path, 'utf8');
    const tables = extractTableNames(sql);
    log(`  ${file.rel}: ${tables.length} tables`);

    let moduleName = '<central>';
    let ownedNames = new Set();
    let asBuiltNames = new Set();

    if (file.scope === 'module') {
      const modRoot = moduleRootFromMigrationPath(file.path);
      if (modRoot) {
        moduleName = basename(modRoot);
        if (!ownershipCache.has(moduleName)) {
          const [owned, asBuilt] = await Promise.all([
            loadManifestOwnedTables(modRoot),
            loadAsBuiltClaims(modRoot),
          ]);
          ownershipCache.set(moduleName, { owned, asBuilt });
        }
        ({ owned: ownedNames, asBuilt: asBuiltNames } = ownershipCache.get(moduleName));
      }
    }

    for (const table of tables) {
      const refCount = countRefs(table);
      const declaredOwned = ownedNames.has(table) || asBuiltNames.has(table);

      let classification;
      let rationale;
      if (refCount > 0) {
        classification = 'KEEP';
        rationale = `${refCount} code reference(s) outside migrations/docs`;
      } else if (declaredOwned) {
        classification = 'RESERVE';
        rationale = 'no code refs; manifest/AS-BUILT claims ownership';
      } else {
        classification = 'DROP';
        rationale = 'no code refs; no ownership claim';
      }

      rows.push({
        module: moduleName,
        table,
        ref_count: refCount,
        declared_owned: declaredOwned,
        classification,
        rationale,
        source_file: file.rel,
      });
    }
  }

  // Sort: DROP first, then RESERVE, then KEEP, then by module+table.
  const order = { DROP: 0, RESERVE: 1, KEEP: 2 };
  rows.sort((a, b) => {
    const d = order[a.classification] - order[b.classification];
    if (d !== 0) return d;
    if (a.module !== b.module) return a.module.localeCompare(b.module);
    return a.table.localeCompare(b.table);
  });

  await mkdir(REPORT_DIR, { recursive: true });
  const header = 'module,table,ref_count,declared_owned,classification,rationale,source_file\n';
  const body = rows
    .map((r) =>
      [
        csvEscape(r.module),
        csvEscape(r.table),
        r.ref_count,
        r.declared_owned,
        r.classification,
        csvEscape(r.rationale),
        csvEscape(r.source_file),
      ].join(','),
    )
    .join('\n');
  await writeFile(REPORT_PATH, header + body + '\n');

  const counts = rows.reduce(
    (acc, r) => {
      acc[r.classification]++;
      return acc;
    },
    { KEEP: 0, RESERVE: 0, DROP: 0 },
  );

  console.error('');
  console.error('── Scaffold triage summary ─────────────────────────');
  console.error(`  Tables scanned: ${rows.length}`);
  console.error(`  KEEP    : ${counts.KEEP}`);
  console.error(`  RESERVE : ${counts.RESERVE}`);
  console.error(`  DROP    : ${counts.DROP}`);
  console.error(`  Report  : ${relative(REPO_ROOT, REPORT_PATH)}`);
}

main().catch((err) => {
  console.error('audit-scaffolded-tables failed:', err);
  process.exit(1);
});

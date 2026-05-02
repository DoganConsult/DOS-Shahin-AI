#!/usr/bin/env node
/**
 * Migration schema verification:
 * 1. Runs all migrations on a fresh database
 * 2. Dumps the resulting schema
 * 3. Compares against committed expected-schema.sql snapshot
 *
 * Modes:
 *   --update   Regenerate the snapshot (run after intentional schema changes)
 *   (default)  Compare and fail if different
 *
 * Requires: DATABASE_URL env var pointing to a fresh test database.
 * Requires: pg_dump available on PATH.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { Client } from 'pg';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SNAPSHOT_PATH = path.join(ROOT, 'ops', 'migrations', 'expected-schema.sql');
const updateMode = process.argv.includes('--update');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[verify-schema] DATABASE_URL is required.');
  process.exit(1);
}

// Counters for startup log; reset on each top-level collection call.
const collectStats = {
  scanned: 0,
  excludedRollbackOrTenantPath: 0,
  excludedSnapshot: 0,
  excludedDown: 0,
  excludedPlaceholder: 0,
  kept: 0,
};

// `__TENANT_SCHEMA__` is the substitution token used by
// packages/dos-db/src/tenant-migrations.ts when running per-tenant templates.
// Files carrying it are never applied raw at the central layer — excluding
// them keeps the baseline honest. Scan only the first 4 KB; every template
// sampled hits the token inside its opening CREATE TABLE.
const TENANT_PLACEHOLDER = '__TENANT_SCHEMA__';
const PLACEHOLDER_PEEK_BYTES = 4096;

function containsTenantPlaceholder(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(PLACEHOLDER_PEEK_BYTES);
    const bytesRead = fs.readSync(fd, buf, 0, PLACEHOLDER_PEEK_BYTES, 0);
    return buf.slice(0, bytesRead).toString('utf8').includes(TENANT_PLACEHOLDER);
  } finally {
    fs.closeSync(fd);
  }
}

function collectSqlFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .flatMap(entry => {
      const absolutePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return collectSqlFiles(absolutePath);
      if (!entry.isFile() || !entry.name.endsWith('.sql')) return [];

      collectStats.scanned += 1;

      if (entry.name.endsWith('_down.sql')) {
        collectStats.excludedDown += 1;
        return [];
      }
      if (entry.name === 'expected-schema.sql') {
        collectStats.excludedSnapshot += 1;
        return [];
      }
      const posixPath = absolutePath.split(path.sep).join('/');
      if (posixPath.includes('/rollback/') || posixPath.includes('/tenant/')) {
        collectStats.excludedRollbackOrTenantPath += 1;
        return [];
      }
      if (containsTenantPlaceholder(absolutePath)) {
        collectStats.excludedPlaceholder += 1;
        return [];
      }

      collectStats.kept += 1;
      return [absolutePath];
    })
    .sort((a, b) => a.localeCompare(b));
}

function getServiceMigrationDirs() {
  const servicesDir = path.join(ROOT, 'services');
  return fs.readdirSync(servicesDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => path.join(servicesDir, e.name, 'migrations'));
}

function getModuleMigrationDirs() {
  const modulesDir = path.join(ROOT, 'modules');
  if (!fs.existsSync(modulesDir)) return [];
  const results = [];
  for (const mod of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (!mod.isDirectory()) continue;
    const backendDir = path.join(modulesDir, mod.name, 'source', 'backend');
    if (!fs.existsSync(backendDir)) continue;
    for (const svc of fs.readdirSync(backendDir, { withFileTypes: true })) {
      if (!svc.isDirectory()) continue;
      const migDir = path.join(backendDir, svc.name, 'migrations');
      if (fs.existsSync(migDir)) results.push(migDir);
    }
  }
  return results;
}

// Parse DB name from URL for pg_dump
const url = new URL(databaseUrl);
const dbName = url.pathname.slice(1);
const pgHost = url.hostname;
const pgPort = url.port || '5432';
const pgUser = url.username;

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();

  // Run all migrations
  const centralFiles = collectSqlFiles(path.join(ROOT, 'ops', 'migrations'));
  const serviceDirs = getServiceMigrationDirs();
  const moduleDirs = getModuleMigrationDirs();

  const allFiles = [
    ...centralFiles,
    ...serviceDirs.flatMap(d => collectSqlFiles(d)),
    ...moduleDirs.flatMap(d => collectSqlFiles(d)),
  ];

  console.log(
    `[verify-schema] File scan: scanned=${collectStats.scanned} ` +
    `kept=${collectStats.kept} ` +
    `excluded_down=${collectStats.excludedDown} ` +
    `excluded_snapshot=${collectStats.excludedSnapshot} ` +
    `excluded_rollback_or_tenant_path=${collectStats.excludedRollbackOrTenantPath} ` +
    `excluded_placeholder_content=${collectStats.excludedPlaceholder}`
  );
  console.log(`[verify-schema] Applying ${allFiles.length} migration(s)...`);
  for (const file of allFiles) {
    const sql = fs.readFileSync(file, 'utf8');
    try {
      await client.query(sql);
    } catch (err) {
      console.error(`[verify-schema] Failed on ${path.relative(ROOT, file)}: ${err.message}`);
      // Recover from aborted transaction state so downstream migrations run
      // independently. Some migrations use explicit BEGIN/COMMIT blocks; on
      // error the connection stays aborted and cascades 'current transaction
      // is aborted' into every subsequent query, masking the real first error.
      try { await client.query('ROLLBACK'); } catch { /* nothing to roll back */ }
    }
  }

  await client.end();

  // Dump schema
  console.log('[verify-schema] Dumping schema...');
  const pgEnv = { ...process.env };
  if (url.password) pgEnv.PGPASSWORD = decodeURIComponent(url.password);

  // These schemas are extension-managed / operational and are excluded from the
  // app migration schema baseline. App migrations do not own them; they are
  // created by PostgreSQL extensions, owned by the `postgres` superuser, and
  // contain no app tables. Including them would (a) require granting the
  // dos_migrator introspection role USAGE on every extension schema, and
  // (b) produce false drift signals on extension version bumps or internal
  // state churn (e.g. pgmq queue metadata). Enumerated from pg_extension +
  // pg_namespace; grep across ops/migrations/*, packages/*, services/*,
  // modules/*, frontend/* confirmed zero app references.
  const EXTENSION_SCHEMAS_EXCLUDED_FROM_APP_BASELINE = [
    'pgmq',            // pgmq (message queue)
    'pglogical',       // pglogical (logical replication)
    'squeeze',         // pg_squeeze (table bloat repack)
    'hint_plan',       // pg_hint_plan
    'topology',        // postgis_topology
    'ai',              // pgai
    'ai_admin',        // pgai admin
    'citus',           // citus coordinator metadata
    'citus_internal',  // citus internals
    'oracle',          // orafce Oracle compat
    'repack',          // pg_repack internal state
    'dbms_alert', 'dbms_assert', 'dbms_output', 'dbms_pipe',
    'dbms_random', 'dbms_sql', 'dbms_utility',             // orafce DBMS_*
    'plunit', 'plvchr', 'plvdate', 'plvlex', 'plvstr', 'plvsubst', // orafce PL/V*
    'utl_file',        // orafce UTL_FILE
  ];
  const excludeSchemaArgs = EXTENSION_SCHEMAS_EXCLUDED_FROM_APP_BASELINE
    .map(s => `--exclude-schema=${s}`)
    .join(' ');

  const schemaDump = execSync(
    `pg_dump --schema-only --no-owner --no-privileges --no-comments ${excludeSchemaArgs} -h ${pgHost} -p ${pgPort} -U ${pgUser} ${dbName}`,
    { encoding: 'utf8', env: pgEnv, maxBuffer: 50 * 1024 * 1024 },
  );

  // Normalize: strip lines that change between runs (SET statements, comments
  // with timestamps, and pg_dump 17+'s \restrict/\unrestrict safety meta-
  // commands which emit a fresh random token on every invocation)
  const normalized = schemaDump
    .split('\n')
    .filter(line =>
      !line.startsWith('--')
      && !line.startsWith('SET ')
      && !line.startsWith('SELECT pg_catalog.')
      && !line.startsWith('\\restrict')
      && !line.startsWith('\\unrestrict')
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';

  if (updateMode) {
    fs.writeFileSync(SNAPSHOT_PATH, normalized, 'utf8');
    console.log(`[verify-schema] Snapshot updated: ${path.relative(ROOT, SNAPSHOT_PATH)}`);
    process.exit(0);
  }

  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error('[verify-schema] No snapshot found. Run with --update to create one.');
    fs.writeFileSync(SNAPSHOT_PATH, normalized, 'utf8');
    console.log(`[verify-schema] Snapshot created: ${path.relative(ROOT, SNAPSHOT_PATH)}`);
    process.exit(0);
  }

  const expected = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  if (normalized === expected) {
    console.log('[verify-schema] Schema matches snapshot.');
  } else {
    console.error('[verify-schema] Schema DOES NOT match snapshot!');
    console.error('[verify-schema] Run `DATABASE_URL=... node ops/scripts/verify-migration-schema.mjs --update` to update.');

    // Show a brief diff summary
    const expectedLines = expected.split('\n');
    const actualLines = normalized.split('\n');
    let diffCount = 0;
    const maxDiff = Math.max(expectedLines.length, actualLines.length);
    for (let i = 0; i < maxDiff; i++) {
      if (expectedLines[i] !== actualLines[i]) {
        if (diffCount < 20) {
          console.error(`  Line ${i + 1}:`);
          if (expectedLines[i]) console.error(`    - ${expectedLines[i]}`);
          if (actualLines[i]) console.error(`    + ${actualLines[i]}`);
        }
        diffCount++;
      }
    }
    if (diffCount > 20) console.error(`  ... and ${diffCount - 20} more differences`);
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`[verify-schema] ${err.message}`);
  process.exitCode = 1;
}

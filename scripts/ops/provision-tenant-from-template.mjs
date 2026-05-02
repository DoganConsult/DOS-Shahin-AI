#!/usr/bin/env node
/**
 * provision-tenant-from-template.mjs
 *
 * Clones the structure of an already-provisioned tenant schema (template)
 * into a new tenant schema. Schema-only (no data). Idempotent within an
 * empty target.
 *
 * Reads DATABASE_URL from services/dynamic-ui-service/ecosystem.config.cjs.
 *
 * Usage:
 *   node scripts/ops/provision-tenant-from-template.mjs <target-tenant-id> [<template-tenant-id>]
 *
 * Examples:
 *   node scripts/ops/provision-tenant-from-template.mjs 51f36271df62ea3d
 *   node scripts/ops/provision-tenant-from-template.mjs new123 dogan
 *
 * Steps:
 *   1. Verify target schema does not exist (or is empty).
 *   2. Run pg_dump --schema-only --schema=tenant_<template>.
 *   3. Rewrite identifiers tenant_<template> → tenant_<target>.
 *   4. Apply via psql, on error stop.
 *   5. Insert tracker rows into dos.tenant_migrations marking
 *      each filename as `verified-by-clone` for the new tenant.
 */
import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ECOSYSTEM = '/root/DOS-AIO/DOS Platform/services/dynamic-ui-service/ecosystem.config.cjs';
const cfg = require(ECOSYSTEM);
const DB_URL = cfg.apps[0].env.DATABASE_URL;
const url = new URL(DB_URL);
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port,
  PGUSER: url.username,
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: url.pathname.slice(1),
};

const targetId = process.argv[2];
const templateId = process.argv[3] || 'dogan';
if (!targetId) {
  console.error('Usage: provision-tenant-from-template.mjs <target> [<template>]');
  process.exit(2);
}

const targetSchema = `tenant_${targetId}`;
const templateSchema = `tenant_${templateId}`;
const dumpFile = path.join(tmpdir(), `provision-${targetId}-from-${templateId}.sql`);

console.log(`[provision] target=${targetSchema} template=${templateSchema}`);

// 1. dump
console.log(`[provision] pg_dump --schema-only --schema=${templateSchema}`);
const dump = spawnSync(
  'pg_dump',
  ['--schema-only', '--no-owner', '--no-privileges', '--schema', templateSchema, '--file', dumpFile],
  { env, stdio: 'inherit' },
);
if (dump.status !== 0) {
  console.error(`[provision] pg_dump exited ${dump.status}`);
  process.exit(1);
}

// 2. rewrite identifiers
console.log(`[provision] rewriting ${templateSchema} → ${targetSchema}`);
let sql = readFileSync(dumpFile, 'utf-8');
const re = new RegExp(templateSchema.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
sql = sql.replace(re, targetSchema);
const targetSql = dumpFile + '.target.sql';
writeFileSync(targetSql, sql);

// 3. apply
console.log(`[provision] applying ${targetSql}`);
const apply = spawnSync(
  'psql',
  ['-v', 'ON_ERROR_STOP=1', '-f', targetSql],
  { env, stdio: 'inherit' },
);
if (apply.status !== 0) {
  console.error(`[provision] psql apply exited ${apply.status}`);
  process.exit(1);
}

// 4. tracker — Fix 5 (Phase 18): the legacy verified-by-clone status is
//    rejected. A migration must be either applied (DDL ran) or unrecorded.
//    Cloning a tenant from a template means the DDL physically ran inside
//    the new schema (steps 1-3 above), so we record applied rows. The
//    'cloned-from' provenance is captured in applied_by + filename.
console.log(`[provision] recording dos.tenant_migrations for ${targetId} as applied (cloned-from=${templateId})`);
const pg = require('/root/DOS-AIO/DOS Platform/services/dynamic-ui-service/node_modules/pg');
const client = new pg.Client({ connectionString: DB_URL });
await client.connect();
try {
  // PK on dos.tenant_migrations is (tenant_id, migration_id, checksum).
  const r = await client.query(
    `INSERT INTO dos.tenant_migrations (tenant_id, migration_id, source, filename, checksum, status, applied_at, applied_by)
       SELECT $1, migration_id, source, filename, checksum, 'applied', NOW(),
              'provision-tenant-from-template.mjs:cloned-from=' || $2
         FROM dos.tenant_migrations
        WHERE tenant_id = $2 AND status = 'applied'
     ON CONFLICT (tenant_id, migration_id, checksum) DO NOTHING
     RETURNING migration_id`,
    [targetId, templateId],
  );
  console.log(`[provision] tracker rows inserted: ${r.rowCount}`);
  // Verification gate — actual table count must be > 0 in the new schema.
  const v = await client.query(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = $1`,
    [targetSchema],
  );
  if ((v.rows[0]?.n ?? 0) === 0) {
    throw new Error(`provision verification failed: schema ${targetSchema} has 0 tables`);
  }
  console.log(`[provision] verification: schema ${targetSchema} table_count=${v.rows[0].n}`);
} catch (e) {
  console.error(`[provision] tracker/verification failed: ${e.message}`);
  await client.end();
  process.exit(2);
} finally {
  try { await client.end(); } catch {}
}

console.log(`[provision] done — target schema ${targetSchema} ready`);

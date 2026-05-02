#!/usr/bin/env node
/**
 * Verifies that baseline seed data survives after migrations are applied.
 * Run AFTER applying all migrations AND the seed data, then applying any new migrations.
 *
 * INTENDED TARGET: disposable migration-validation database only. The seed
 * fixture (ops/scripts/migration-seed-data.sql) inserts a synthetic tenant
 * (`SEED_T001`) and a synthetic user (`seed-user-001`) which must NEVER be
 * inserted into production. This script therefore refuses to run unless
 * either:
 *   (a) the env var DOS_DATA_SAFETY_VALIDATION=1 is set explicitly, or
 *   (b) the database name matches /(test|validate|validation|migration)/i.
 * The guard prevents accidental production execution.
 *
 * Usage:
 *   DOS_DATA_SAFETY_VALIDATION=1 DATABASE_URL=... node ops/scripts/verify-migration-data-safety.mjs
 */
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[data-safety] DATABASE_URL is required.');
  process.exit(1);
}

// ── Non-production guard ────────────────────────────────────────────────────
const validationOptIn = process.env.DOS_DATA_SAFETY_VALIDATION === '1';
let dbNameForGuard = '';
try {
  dbNameForGuard = new URL(databaseUrl).pathname.slice(1);
} catch {
  // fall through — guard below will fail closed
}
const dbNameLooksLikeValidation = /(test|validate|validation|migration)/i.test(dbNameForGuard);
if (!validationOptIn && !dbNameLooksLikeValidation) {
  console.error(
    `[data-safety] Refusing to run against database "${dbNameForGuard}". ` +
      `This probe seeds + verifies synthetic rows (SEED_T001 / seed-user-001) ` +
      `and is intended for disposable validation databases only. ` +
      `Set DOS_DATA_SAFETY_VALIDATION=1 to override, or point DATABASE_URL ` +
      `at a database whose name contains "test", "validate", "validation", or "migration".`,
  );
  process.exit(1);
}

const checks = [
  {
    name: 'Tenant seed row',
    query: `SELECT tenant_id FROM public.tenants WHERE tenant_id = 'SEED_T001'`,
    expectRows: 1,
  },
  {
    // Schema source-of-truth: ops/migrations/000_create_dos_schema.sql §USERS
    // (user_id PK, email UNIQUE). Older fixture queried `id` which never
    // existed on public.users — fixed in tandem with migration-seed-data.sql.
    name: 'User seed row',
    query: `SELECT user_id FROM public.users WHERE user_id = 'seed-user-001'`,
    expectRows: 1,
    optional: true, // table may not exist in all configurations
  },
  {
    name: 'Config seed row',
    query: `SELECT config_key FROM dos.config_definitions WHERE config_key = 'migration.seed.marker'`,
    expectRows: 1,
    optional: true,
  },
];

const client = new Client({ connectionString: databaseUrl });
let failures = 0;

try {
  await client.connect();

  for (const check of checks) {
    try {
      const { rows } = await client.query(check.query);
      if (rows.length >= check.expectRows) {
        console.log(`  PASS: ${check.name} (${rows.length} row(s))`);
      } else {
        console.error(`  FAIL: ${check.name} — expected >= ${check.expectRows} row(s), got ${rows.length}`);
        failures++;
      }
    } catch (err) {
      if (check.optional) {
        console.log(`  SKIP: ${check.name} — ${err.message}`);
      } else {
        console.error(`  FAIL: ${check.name} — ${err.message}`);
        failures++;
      }
    }
  }

  if (failures > 0) {
    console.error(`\n[data-safety] ${failures} check(s) FAILED — migration may have destroyed data.`);
    process.exitCode = 1;
  } else {
    console.log('\n[data-safety] All seed data survived. Migrations are data-safe.');
  }
} catch (err) {
  console.error(`[data-safety] ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}

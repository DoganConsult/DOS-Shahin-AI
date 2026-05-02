#!/usr/bin/env node
// Tenant migration reconciliation:
//  1. Insert missing tenants into dos.tenants from existing tenant_* schemas.
//  2. Per-tenant pg_advisory_lock + backfillTrackerByExistence (records
//     'verified-by-backfill' rows for migrations whose CREATE TABLEs already exist).
//  3. Then runTenantMigrationsTracked({ continueOnError: true }) for the rest.
//  4. Reports applied/skipped/failed counts per tenant and totals.
//
// Usage:
//   DATABASE_URL=postgresql://... node ops/scripts/reconcile-tenant-migrations.mjs [--dry-run]

import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const repoRoot = resolve(decodeURIComponent(new URL('../..', import.meta.url).pathname));
process.chdir(repoRoot);

const db = require(resolve(repoRoot, 'packages/dos-db/dist/index.js'));
const { safeQuery, getPool, closePool, backfillTrackerByExistence, runTenantMigrationsTracked, discoverTenantMigrations } = db;

const DRY_RUN = process.argv.includes('--dry-run');

// Stable 64-bit advisory lock key per tenant.
function lockKeyFor(tenantId) {
  let h = 0n;
  for (const ch of tenantId) {
    h = (h * 131n + BigInt(ch.charCodeAt(0))) & 0xFFFFFFFFFFFFFFFFn;
  }
  // pg advisory lock takes signed bigint
  if (h > 0x7FFFFFFFFFFFFFFFn) h -= 0x10000000000000000n;
  return h.toString();
}

async function main() {
  const schemasRes = await safeQuery(
    `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name ~ '^tenant_[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$'
       ORDER BY schema_name`,
  );
  const schemas = schemasRes.rows.map(r => r.schema_name);
  console.log(`Found ${schemas.length} live tenant schemas`);

  // 1. dos.tenants reconciliation
  let tenantsInserted = 0;
  for (const schema of schemas) {
    const tenantId = schema.replace(/^tenant_/, '');
    const existsRes = await safeQuery(`SELECT 1 FROM dos.tenants WHERE tenant_id = $1`, [tenantId]);
    if (existsRes.rows.length === 0) {
      if (!DRY_RUN) {
        await safeQuery(
          `INSERT INTO dos.tenants (tenant_id, schema_name, status)
           VALUES ($1, $2, 'active')
           ON CONFLICT (tenant_id) DO UPDATE SET schema_name = EXCLUDED.schema_name`,
          [tenantId, schema],
        ).catch(err => console.warn(`  tenant insert warn for ${tenantId}: ${err.message}`));
      }
      tenantsInserted++;
    }
  }
  console.log(`dos.tenants: ${tenantsInserted} ${DRY_RUN ? 'would be' : 'were'} inserted/upserted`);

  const discovered = discoverTenantMigrations({});
  console.log(`Discovered ${discovered.length} tenant migration files`);

  if (DRY_RUN) {
    console.log('--- DRY RUN — exiting before backfill/apply ---');
    await closePool();
    return;
  }

  // 2 + 3. Per tenant
  const totals = { backfillApplied: 0, backfillSkipped: 0, applyApplied: 0, applySkipped: 0, applyFailed: 0 };
  const perTenant = [];

  const pool = getPool();
  for (const schema of schemas) {
    const tenantId = schema.replace(/^tenant_/, '');
    const lockKey = lockKeyFor(tenantId);
    const client = await pool.connect();
    let row = { tenantId, schema };
    try {
      const lockRes = await client.query(`SELECT pg_try_advisory_lock($1::bigint) AS got`, [lockKey]);
      if (!lockRes.rows[0].got) {
        console.warn(`  ${schema}: advisory lock busy — skipping`);
        row.skippedLock = true;
        perTenant.push(row);
        continue;
      }
      try {
        const bf = await backfillTrackerByExistence(tenantId, {});
        row.backfillApplied = bf.applied;
        row.backfillSkipped = bf.skipped;
        totals.backfillApplied += bf.applied;
        totals.backfillSkipped += bf.skipped;

        const ap = await runTenantMigrationsTracked(tenantId, { continueOnError: true, appliedBy: 'reconcile-script' });
        row.applyApplied = ap.applied;
        row.applySkipped = ap.skipped;
        row.applyFailed = ap.failed;
        totals.applyApplied += ap.applied;
        totals.applySkipped += ap.skipped;
        totals.applyFailed += ap.failed;
        console.log(
          `  ${schema}: backfill applied=${bf.applied} skipped=${bf.skipped} | apply applied=${ap.applied} skipped=${ap.skipped} failed=${ap.failed}`,
        );
      } finally {
        await client.query(`SELECT pg_advisory_unlock($1::bigint)`, [lockKey]).catch(() => {});
      }
    } catch (err) {
      row.error = err.message;
      console.error(`  ${schema}: ERROR ${err.message}`);
    } finally {
      client.release();
      perTenant.push(row);
    }
  }

  const ledgerCount = await safeQuery(`SELECT count(*)::int AS n FROM dos.tenant_migrations`);
  const perTenantLedger = await safeQuery(
    `SELECT tenant_id, count(*)::int AS rows,
            count(*) FILTER (WHERE status='applied')::int AS applied,
            count(*) FILTER (WHERE status='verified-by-backfill')::int AS verified,
            count(*) FILTER (WHERE status='failed')::int AS failed
       FROM dos.tenant_migrations GROUP BY tenant_id ORDER BY tenant_id`,
  );

  console.log('\n=== TOTALS ===');
  console.log(JSON.stringify(totals, null, 2));
  console.log('\n=== dos.tenant_migrations rows per tenant ===');
  for (const r of perTenantLedger.rows) {
    console.log(`  ${r.tenant_id}: rows=${r.rows} applied=${r.applied} verified=${r.verified} failed=${r.failed}`);
  }
  console.log(`\nTotal dos.tenant_migrations rows: ${ledgerCount.rows[0].n}`);

  await closePool();
}

main().catch(err => {
  console.error('FATAL', err);
  process.exit(1);
});

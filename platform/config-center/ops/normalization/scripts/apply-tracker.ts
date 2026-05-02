#!/usr/bin/env tsx
/**
 * Apply the dos.tenant_migrations tracker DDL and backfill it for every
 * existing tenant schema.
 *
 * Two phases:
 *   1. Apply ops/migrations/050_tenant_migrations_tracker.sql on the
 *      platform/public connection.
 *   2. For every tenant_<id> schema discovered in information_schema,
 *      call backfillTrackerByExistence(tenantId) to populate the tracker
 *      with `verified-by-backfill` rows for every migration whose
 *      CREATE TABLE targets are present.
 *
 * After this runs, every later normalization migration sees an accurate
 * "what's applied where" view.
 *
 * Usage:
 *   tsx ops/normalization/scripts/apply-tracker.ts             # apply + backfill
 *   tsx ops/normalization/scripts/apply-tracker.ts --tracker-only
 *   tsx ops/normalization/scripts/apply-tracker.ts --backfill-only
 *   tsx ops/normalization/scripts/apply-tracker.ts --dry-run    # list what it would do
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool, safeQuery, backfillTrackerByExistence } from '@dos/db';

const REPO_ROOT = process.cwd();
const TRACKER_SQL = join(REPO_ROOT, 'modules/platform-core/db/public/migrations/050_tenant_migrations_tracker.sql');

async function applyTracker(): Promise<void> {
  const sql = readFileSync(TRACKER_SQL, 'utf-8');
  console.error('apply-tracker: applying 050_tenant_migrations_tracker.sql');
  await safeQuery(sql);
  console.error('apply-tracker: tracker DDL applied');
}

async function listTenantIds(): Promise<string[]> {
  const res = await getPool().query<{ schema_name: string }>(
    `SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant\\_%' ESCAPE '\\'
      ORDER BY schema_name`,
  );
  return res.rows.map((r) => r.schema_name.replace(/^tenant_/, ''));
}

async function backfillAll(dryRun: boolean): Promise<void> {
  const tenants = await listTenantIds();
  console.error(`apply-tracker: ${tenants.length} tenant schemas discovered`);
  if (tenants.length === 0) return;
  for (const tenantId of tenants) {
    if (dryRun) {
      console.error(`  [dry-run] would backfill tenant=${tenantId}`);
      continue;
    }
    try {
      const summary = await backfillTrackerByExistence(tenantId, {
        appliedBy: 'apply-tracker',
        opsTenantDir: join(REPO_ROOT, 'ops/migrations/tenant'),
        modulesDir: join(REPO_ROOT, 'modules'),
      });
      console.error(`  tenant=${tenantId}: backfilled=${summary.applied}, skipped=${summary.skipped}`);
    } catch (err) {
      console.error(`  tenant=${tenantId}: backfill failed:`, (err as Error).message);
    }
  }
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const trackerOnly = args.has('--tracker-only');
  const backfillOnly = args.has('--backfill-only');
  const dryRun = args.has('--dry-run');

  if (!backfillOnly) await applyTracker();
  if (!trackerOnly) await backfillAll(dryRun);
  await getPool().end();
}

main().catch((err) => {
  console.error('apply-tracker: fatal', err);
  process.exit(1);
});

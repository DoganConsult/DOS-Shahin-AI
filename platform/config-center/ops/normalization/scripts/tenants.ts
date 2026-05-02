#!/usr/bin/env tsx
/**
 * Tenant operations CLI.
 *
 * Subcommands (read-only by default; mutations require --apply):
 *
 *   list                           — every tenant_<id> schema with table count
 *   status [--tenant <id>]         — migration ledger summary (per tenant or all)
 *   list-failed                    — tenants with any failed migrations
 *   diff <tenantA> <tenantB>       — table-shape diff between two tenants
 *   retry <tenantId> [--apply]     — re-run failed migrations for one tenant
 *
 * Reads:
 *   - information_schema             (tenant discovery + shape diffing)
 *   - dos.tenant_migrations          (status + failed list)
 *
 * Writes (only on `retry --apply`):
 *   - re-runs failed migrations through runTenantMigrationsTracked
 *
 * Usage examples:
 *   tsx ops/normalization/scripts/tenants.ts list
 *   tsx ops/normalization/scripts/tenants.ts status
 *   tsx ops/normalization/scripts/tenants.ts status --tenant acme
 *   tsx ops/normalization/scripts/tenants.ts diff acme demo
 *   tsx ops/normalization/scripts/tenants.ts retry acme --apply
 */

import { getPool, safeQuery, runTenantMigrationsTracked } from '@dos/db';
import { join } from 'path';

const REPO_ROOT = process.cwd();

type Subcmd = 'list' | 'status' | 'list-failed' | 'diff' | 'retry';

function arg(flag: string, def?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
function has(flag: string): boolean { return process.argv.includes(flag); }

async function listTenants(): Promise<void> {
  const r = await getPool().query<{ schema_name: string; n: number }>(`
    SELECT s.schema_name,
           (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = s.schema_name) AS n
      FROM information_schema.schemata s
     WHERE s.schema_name LIKE 'tenant\\_%' ESCAPE '\\'
     ORDER BY s.schema_name`);
  console.log(`tenants: ${r.rows.length}`);
  for (const row of r.rows) console.log(`  ${row.schema_name.padEnd(40)} ${row.n} tables`);
}

async function statusAll(tenantFilter?: string): Promise<void> {
  const where = tenantFilter ? `WHERE tenant_id = $1` : '';
  const params = tenantFilter ? [tenantFilter] : [];
  const r = await safeQuery<{
    tenant_id: string; total: number; applied: number; failed: number; verified: number; skipped: number; failed_migrations: number;
  }>(`
    SELECT tenant_id,
           count(*)::int AS total,
           count(*) FILTER (WHERE status='applied')::int AS applied,
           count(*) FILTER (WHERE status='failed')::int AS failed,
           count(*) FILTER (WHERE status='verified-by-backfill')::int AS verified,
           count(*) FILTER (WHERE status='skipped')::int AS skipped,
           count(DISTINCT migration_id) FILTER (WHERE status='failed')::int AS failed_migrations
      FROM dos.tenant_migrations_latest
      ${where}
     GROUP BY tenant_id
     ORDER BY failed DESC, tenant_id`, params);
  if (r.rows.length === 0) {
    console.log('status: no tenants in dos.tenant_migrations yet (run apply-tracker first?)');
    return;
  }
  console.log('tenant_id'.padEnd(40), 'total', 'applied', 'verified', 'skipped', 'failed', 'failed_migs');
  for (const row of r.rows) {
    console.log(
      row.tenant_id.padEnd(40),
      String(row.total).padStart(5),
      String(row.applied).padStart(7),
      String(row.verified).padStart(8),
      String(row.skipped).padStart(7),
      String(row.failed).padStart(6),
      String(row.failed_migrations).padStart(11),
    );
  }
}

async function listFailed(): Promise<void> {
  const r = await safeQuery<{ tenant_id: string; migration_id: string; filename: string; error_message: string; applied_at: string }>(
    `SELECT tenant_id, migration_id, filename, error_message, applied_at
       FROM dos.tenant_migrations_failed
       ORDER BY applied_at DESC`);
  console.log(`failed migrations: ${r.rows.length}`);
  for (const row of r.rows) {
    console.log(`  [${row.applied_at}] ${row.tenant_id} :: ${row.migration_id}`);
    console.log(`    file: ${row.filename}`);
    console.log(`    err:  ${(row.error_message ?? '').slice(0, 200)}`);
  }
}

async function diffTenants(a: string, b: string): Promise<void> {
  const schemaA = `tenant_${a}`;
  const schemaB = `tenant_${b}`;
  const tables = await safeQuery<{ schema: string; table: string; cols: number }>(
    `SELECT table_schema AS schema, table_name AS table, count(*)::int AS cols
       FROM information_schema.columns
      WHERE table_schema IN ($1, $2)
      GROUP BY table_schema, table_name`,
    [schemaA, schemaB],
  );
  const aMap = new Map<string, number>();
  const bMap = new Map<string, number>();
  for (const r of tables.rows) (r.schema === schemaA ? aMap : bMap).set(r.table, r.cols);

  const allTables = new Set([...aMap.keys(), ...bMap.keys()]);
  const onlyA: string[] = [];
  const onlyB: string[] = [];
  const colDiff: Array<{ table: string; aCols: number; bCols: number }> = [];
  for (const t of allTables) {
    const ac = aMap.get(t); const bc = bMap.get(t);
    if (ac && !bc) onlyA.push(t);
    else if (bc && !ac) onlyB.push(t);
    else if (ac !== bc) colDiff.push({ table: t, aCols: ac!, bCols: bc! });
  }
  console.log(`diff ${schemaA} <-> ${schemaB}`);
  console.log(`  only in ${schemaA}: ${onlyA.length}`);
  for (const t of onlyA.slice(0, 30)) console.log(`    + ${t}`);
  if (onlyA.length > 30) console.log(`    ... +${onlyA.length - 30}`);
  console.log(`  only in ${schemaB}: ${onlyB.length}`);
  for (const t of onlyB.slice(0, 30)) console.log(`    + ${t}`);
  if (onlyB.length > 30) console.log(`    ... +${onlyB.length - 30}`);
  console.log(`  column-count delta: ${colDiff.length}`);
  for (const d of colDiff.slice(0, 30)) console.log(`    ~ ${d.table}: ${d.aCols} <-> ${d.bCols}`);
  if (colDiff.length > 30) console.log(`    ... +${colDiff.length - 30}`);
}

async function retryTenant(tenantId: string, apply: boolean): Promise<void> {
  const r = await safeQuery<{ migration_id: string }>(
    `SELECT DISTINCT migration_id FROM dos.tenant_migrations_failed WHERE tenant_id = $1`,
    [tenantId],
  );
  const ids = r.rows.map((row) => row.migration_id);
  if (ids.length === 0) { console.log(`retry: no failed migrations for tenant=${tenantId}`); return; }
  console.log(`retry: tenant=${tenantId} migrations=${ids.length} ${apply ? 'APPLY' : 'DRY-RUN'}`);
  for (const id of ids) console.log(`  - ${id}`);
  if (!apply) return;
  const summary = await runTenantMigrationsTracked(tenantId, {
    appliedBy: 'tenants-cli-retry',
    opsTenantDir: join(REPO_ROOT, 'ops/migrations/tenant'),
    modulesDir: join(REPO_ROOT, 'modules'),
    onlyMigrationIds: ids,
    continueOnError: true,
  });
  console.log(`retry done: applied=${summary.applied} skipped=${summary.skipped} failed=${summary.failed}`);
}

async function main(): Promise<void> {
  const sub = process.argv[2] as Subcmd | undefined;
  switch (sub) {
    case 'list': await listTenants(); break;
    case 'status': await statusAll(arg('--tenant')); break;
    case 'list-failed': await listFailed(); break;
    case 'diff': {
      const a = process.argv[3]; const b = process.argv[4];
      if (!a || !b) { console.error('usage: tenants diff <tenantA> <tenantB>'); process.exit(2); }
      await diffTenants(a, b);
      break;
    }
    case 'retry': {
      const t = process.argv[3];
      if (!t) { console.error('usage: tenants retry <tenantId> [--apply]'); process.exit(2); }
      await retryTenant(t, has('--apply'));
      break;
    }
    default:
      console.error('subcommands: list | status | list-failed | diff <a> <b> | retry <id> [--apply]');
      process.exit(2);
  }
  await getPool().end();
}

main().catch((err) => { console.error('tenants: fatal', err); process.exit(1); });

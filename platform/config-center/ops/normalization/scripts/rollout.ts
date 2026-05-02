#!/usr/bin/env tsx
/**
 * Multi-tenant rollout runner.
 *
 * Applies ONE migration (or a comma-separated list) across N tenant
 * schemas with concurrency control, tracker recording, and halt-on-N-
 * failures gate. This is the fan-out primitive that any production
 * normalization migration must go through.
 *
 * Safety:
 *   - Defaults to --dry-run (must be passed --apply to actually write).
 *   - Halts after --halt-after-failures (default 3) consecutive failures.
 *   - Each tenant attempt is recorded in dos.tenant_migrations regardless
 *     of success/failure — see packages/dos-db/src/tenant-migrations.ts.
 *   - Concurrency defaults to 4. Higher values risk overloading the DB.
 *   - Per-tenant log lines go to stderr; summary JSON goes to stdout.
 *
 * Usage:
 *   tsx ops/normalization/scripts/rollout.ts \
 *     --migration ops/migrations/tenant/099_bootstrap_tenant_domain_tables.sql \
 *     --apply                                 # actually run
 *
 *   tsx ops/normalization/scripts/rollout.ts \
 *     --migration <path> \
 *     --tenants tenant_acme,tenant_demo \
 *     --apply
 *
 *   tsx ops/normalization/scripts/rollout.ts \
 *     --migration <path> \
 *     --batch-size 50 \
 *     --concurrency 8 \
 *     --halt-after-failures 5 \
 *     --apply
 */

import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { basename, join, relative } from 'path';
import { createHash } from 'crypto';
import { getPool, safeQuery } from '@dos/db';

const REPO_ROOT = process.cwd();

interface Args {
  migrationPaths: string[];
  tenants: string[] | null;
  apply: boolean;
  concurrency: number;
  batchSize: number;
  haltAfterFailures: number;
  appliedBy: string;
  reportDir: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string, def?: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
  };
  const has = (flag: string): boolean => argv.includes(flag);

  const migrationArg = get('--migration');
  if (!migrationArg) {
    console.error('rollout: --migration <path[,path,...]> required');
    process.exit(2);
  }
  const migrationPaths = migrationArg.split(',').map((p) => p.trim()).filter(Boolean);
  for (const p of migrationPaths) {
    if (!existsSync(p) || !statSync(p).isFile()) {
      console.error(`rollout: migration file not found: ${p}`);
      process.exit(2);
    }
  }
  const tenantsArg = get('--tenants');
  return {
    migrationPaths,
    tenants: tenantsArg ? tenantsArg.split(',').map((t) => t.trim()).filter(Boolean) : null,
    apply: has('--apply'),
    concurrency: Math.max(1, parseInt(get('--concurrency', '4')!, 10)),
    batchSize: Math.max(1, parseInt(get('--batch-size', '50')!, 10)),
    haltAfterFailures: Math.max(1, parseInt(get('--halt-after-failures', '3')!, 10)),
    appliedBy: get('--applied-by', 'rollout-cli')!,
    reportDir: get('--report-dir', join(REPO_ROOT, 'ops/normalization/rollouts'))!,
  };
}

interface MigrationDescriptor {
  path: string;
  migrationId: string;
  filename: string;
  rawSql: string;
}

function describeMigration(p: string): MigrationDescriptor {
  const filename = basename(p);
  const rel = relative(REPO_ROOT, p);
  // Derive migration_id mirroring the tracker's convention so this rollout
  // shares a key with the standard tracked runner.
  let migrationId: string;
  if (rel.startsWith('ops/migrations/tenant/')) migrationId = `ops/tenant/${basename(filename, '.sql')}`;
  else if (rel.startsWith('modules/')) {
    const parts = rel.split('/');
    const mod = parts[1];
    migrationId = `module/${mod}/${basename(filename, '.sql')}`;
  } else migrationId = `ad-hoc/${basename(filename, '.sql')}`;
  return { path: p, migrationId, filename, rawSql: readFileSync(p, 'utf-8') };
}

async function listAllTenantIds(): Promise<string[]> {
  const r = await getPool().query<{ schema_name: string }>(
    `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name LIKE 'tenant\\_%' ESCAPE '\\'
       ORDER BY schema_name`,
  );
  return r.rows.map((row) => row.schema_name.replace(/^tenant_/, ''));
}

function checksumFor(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

interface TenantResult {
  tenantId: string;
  migrationId: string;
  status: 'applied' | 'failed' | 'skipped' | 'dry-run';
  durationMs: number;
  error?: string;
}

async function isAlreadyApplied(tenantId: string, migrationId: string, checksum: string): Promise<boolean> {
  const res = await safeQuery(
    `SELECT 1 FROM dos.tenant_migrations
      WHERE tenant_id=$1 AND migration_id=$2 AND checksum=$3 AND status IN ('applied','verified-by-backfill')
      LIMIT 1`,
    [tenantId, migrationId, checksum],
  );
  return res.rows.length > 0;
}

async function recordResult(
  tenantId: string,
  m: MigrationDescriptor,
  checksum: string,
  status: 'applied' | 'failed',
  durationMs: number,
  errorMessage: string | undefined,
  appliedBy: string,
): Promise<void> {
  const sourcePrefix = m.migrationId.split('/')[0] === 'module'
    ? `module/${m.migrationId.split('/')[1]}`
    : (m.migrationId.startsWith('ops/tenant/') ? 'ops/tenant' : 'ad-hoc');
  await safeQuery(
    `INSERT INTO dos.tenant_migrations
       (tenant_id, migration_id, source, filename, checksum, status, duration_ms, error_message, applied_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id, migration_id, checksum) DO UPDATE
       SET status=EXCLUDED.status, duration_ms=EXCLUDED.duration_ms,
           error_message=EXCLUDED.error_message, applied_at=NOW(), applied_by=EXCLUDED.applied_by`,
    [tenantId, m.migrationId, sourcePrefix, m.filename, checksum, status, durationMs, errorMessage ?? null, appliedBy],
  );
}

/**
 * Deterministic 63-bit advisory lock key from (tenant_id, migration_id,
 * checksum). Two concurrent rollouts of the same migration to the same
 * tenant will race on the ADD CONSTRAINT / INSERT tracker calls; the
 * advisory lock serializes them at the first caller. Keeping it to a
 * single bigint parameter avoids Postgres' two-int32 advisory-lock
 * variant which is easier to collide.
 */
function advisoryLockKey(tenantId: string, migrationId: string, checksum: string): bigint {
  const h = createHash('sha256').update(`${tenantId}|${migrationId}|${checksum}`, 'utf8').digest();
  // Take first 8 bytes, mask top bit off so the value fits in Postgres bigint (signed 64-bit).
  let v = 0n;
  for (let i = 0; i < 8; i++) v = (v << 8n) | BigInt(h[i]);
  return v & 0x7fffffffffffffffn;
}

async function applyToTenant(
  tenantId: string,
  m: MigrationDescriptor,
  apply: boolean,
  appliedBy: string,
): Promise<TenantResult> {
  const schema = `tenant_${tenantId}`;
  const substituted = m.rawSql.replace(/__TENANT_SCHEMA__/g, `"${schema}"`);
  const checksum = checksumFor(substituted);

  if (await isAlreadyApplied(tenantId, m.migrationId, checksum)) {
    return { tenantId, migrationId: m.migrationId, status: 'skipped', durationMs: 0 };
  }
  if (!apply) return { tenantId, migrationId: m.migrationId, status: 'dry-run', durationMs: 0 };

  const t0 = Date.now();
  const lockKey = advisoryLockKey(tenantId, m.migrationId, checksum);

  // Session-scope advisory lock. pg_try_advisory_lock returns false if held;
  // we release it in finally. If the lock is held elsewhere, treat the
  // migration as skipped — the other runner will record it.
  const lockRes = await safeQuery<{ locked: boolean }>(`SELECT pg_try_advisory_lock($1::bigint) AS locked`, [lockKey.toString()]);
  if (!lockRes.rows[0]?.locked) {
    return {
      tenantId,
      migrationId: m.migrationId,
      status: 'skipped',
      durationMs: Date.now() - t0,
      error: 'advisory-lock-held-elsewhere',
    };
  }

  try {
    // Re-check idempotency inside the lock in case the other holder finished between our checks.
    if (await isAlreadyApplied(tenantId, m.migrationId, checksum)) {
      return { tenantId, migrationId: m.migrationId, status: 'skipped', durationMs: Date.now() - t0 };
    }
    await safeQuery(substituted);
    const durationMs = Date.now() - t0;
    await recordResult(tenantId, m, checksum, 'applied', durationMs, undefined, appliedBy);
    return { tenantId, migrationId: m.migrationId, status: 'applied', durationMs };
  } catch (err) {
    const durationMs = Date.now() - t0;
    const errorMessage = (err as Error).message;
    await recordResult(tenantId, m, checksum, 'failed', durationMs, errorMessage, appliedBy);
    return { tenantId, migrationId: m.migrationId, status: 'failed', durationMs, error: errorMessage };
  } finally {
    await safeQuery(`SELECT pg_advisory_unlock($1::bigint)`, [lockKey.toString()]).catch(() => undefined);
  }
}

interface BatchSummary {
  totalTenants: number;
  totalMigrations: number;
  applied: number;
  skipped: number;
  failed: number;
  dryRun: number;
  haltedEarly: boolean;
  durationMs: number;
  results: TenantResult[];
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  shouldHalt?: () => boolean,
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      if (shouldHalt?.()) return;
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out.filter((x) => x !== undefined);
}

async function main(): Promise<void> {
  const args = parseArgs();
  mkdirSync(args.reportDir, { recursive: true });

  const allTenants = args.tenants ?? (await listAllTenantIds());
  if (allTenants.length === 0) {
    console.error('rollout: no tenants matched. Use --tenants A,B or check the database.');
    process.exit(2);
  }
  const migrations = args.migrationPaths.map(describeMigration);

  console.error(`rollout: tenants=${allTenants.length} migrations=${migrations.length} ` +
    `concurrency=${args.concurrency} batch=${args.batchSize} halt-after=${args.haltAfterFailures} ` +
    `${args.apply ? 'APPLY MODE' : 'DRY-RUN (pass --apply to write)'}`);

  const t0 = Date.now();
  let consecutiveFailures = 0;
  let haltedEarly = false;
  const results: TenantResult[] = [];

  outer: for (let off = 0; off < allTenants.length; off += args.batchSize) {
    const batch = allTenants.slice(off, off + args.batchSize);
    console.error(`\nbatch ${Math.floor(off / args.batchSize) + 1}/${Math.ceil(allTenants.length / args.batchSize)}: ${batch.length} tenants`);
    for (const m of migrations) {
      const batchResults = await runWithConcurrency(
        batch,
        args.concurrency,
        async (t) => {
          const r = await applyToTenant(t, m, args.apply, args.appliedBy);
          if (r.status === 'failed') consecutiveFailures++;
          else if (r.status === 'applied') consecutiveFailures = 0;
          const tag = r.status.padEnd(8);
          console.error(`  [${tag}] tenant=${r.tenantId} mig=${r.migrationId} (${r.durationMs}ms)${r.error ? ` ERR=${r.error.slice(0, 120)}` : ''}`);
          return r;
        },
        () => consecutiveFailures >= args.haltAfterFailures,
      );
      results.push(...batchResults);
      if (consecutiveFailures >= args.haltAfterFailures) {
        haltedEarly = true;
        console.error(`\nrollout: halted — ${consecutiveFailures} consecutive failures (>= --halt-after-failures=${args.haltAfterFailures})`);
        break outer;
      }
    }
  }

  const summary: BatchSummary = {
    totalTenants: allTenants.length,
    totalMigrations: migrations.length,
    applied: results.filter((r) => r.status === 'applied').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
    dryRun: results.filter((r) => r.status === 'dry-run').length,
    haltedEarly,
    durationMs: Date.now() - t0,
    results,
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(args.reportDir, `rollout-${ts}.json`);
  writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.error(`\nrollout summary: applied=${summary.applied} skipped=${summary.skipped} failed=${summary.failed} dry-run=${summary.dryRun} duration=${summary.durationMs}ms`);
  console.error(`Report: ${reportPath}`);
  process.stdout.write(JSON.stringify(summary) + '\n');

  await getPool().end();
  if (summary.failed > 0 || summary.haltedEarly) process.exit(1);
}

main().catch((err) => {
  console.error('rollout: fatal', err);
  process.exit(1);
});

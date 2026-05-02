/**
 * Periodic refresher for the tenant_migrations ledger gauges.
 *
 * Runs every REFRESH_MS (default 30s) and writes the current ledger state
 * into Prometheus gauges:
 *   - dos_tenant_migrations_failed{tenant_id="..."}
 *   - dos_tenant_migrations_by_status{status="..."}
 *
 * Call `startTenantMigrationLedgerRefresher()` from any long-running service
 * that has DB access (the gauges live in the in-process registry, so the
 * service that scrapes /metrics must be the one running this refresher).
 *
 * Idempotent — calling start twice is a no-op.
 */
import {
  initTenantMigrationLedgerMetrics,
  setTenantMigrationsFailed,
  setTenantMigrationsByStatus,
} from './prometheus.service';

const REFRESH_MS = Number(process.env.TENANT_MIGRATIONS_LEDGER_REFRESH_MS || 30_000);
let timer: ReturnType<typeof setInterval> | null = null;

interface QueryFn {
  (sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

async function refreshOnce(safeQuery: QueryFn): Promise<void> {
  const failedRes = await safeQuery(
    `SELECT tenant_id, count(*)::int AS n FROM dos.tenant_migrations
      WHERE status='failed' GROUP BY tenant_id`,
  );
  const perTenant: Record<string, number> = {};
  for (const r of failedRes.rows) perTenant[String(r.tenant_id)] = Number(r.n);
  setTenantMigrationsFailed(perTenant);

  const byStatusRes = await safeQuery(
    `SELECT status, count(*)::int AS n FROM dos.tenant_migrations GROUP BY status`,
  );
  const byStatus: Record<string, number> = {};
  for (const r of byStatusRes.rows) byStatus[String(r.status)] = Number(r.n);
  setTenantMigrationsByStatus(byStatus);
}

export function startTenantMigrationLedgerRefresher(safeQuery: QueryFn): void {
  if (timer) return;
  initTenantMigrationLedgerMetrics();

  // Fire one immediately so /metrics has data before first scrape
  refreshOnce(safeQuery).catch((err) =>
    console.warn('[tenant-migration-ledger-refresher] initial refresh failed', err?.message ?? err),
  );

  timer = setInterval(() => {
    refreshOnce(safeQuery).catch((err) =>
      console.warn('[tenant-migration-ledger-refresher] refresh failed', err?.message ?? err),
    );
  }, REFRESH_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

export function stopTenantMigrationLedgerRefresher(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTenantMigrationLedgerRefresher = startTenantMigrationLedgerRefresher;
exports.stopTenantMigrationLedgerRefresher = stopTenantMigrationLedgerRefresher;
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
const prometheus_service_1 = require("./prometheus.service");
const REFRESH_MS = Number(process.env.TENANT_MIGRATIONS_LEDGER_REFRESH_MS || 30_000);
let timer = null;
async function refreshOnce(safeQuery) {
    const failedRes = await safeQuery(`SELECT tenant_id, count(*)::int AS n FROM dos.tenant_migrations
      WHERE status='failed' GROUP BY tenant_id`);
    const perTenant = {};
    for (const r of failedRes.rows)
        perTenant[String(r.tenant_id)] = Number(r.n);
    (0, prometheus_service_1.setTenantMigrationsFailed)(perTenant);
    const byStatusRes = await safeQuery(`SELECT status, count(*)::int AS n FROM dos.tenant_migrations GROUP BY status`);
    const byStatus = {};
    for (const r of byStatusRes.rows)
        byStatus[String(r.status)] = Number(r.n);
    (0, prometheus_service_1.setTenantMigrationsByStatus)(byStatus);
}
function startTenantMigrationLedgerRefresher(safeQuery) {
    if (timer)
        return;
    (0, prometheus_service_1.initTenantMigrationLedgerMetrics)();
    // Fire one immediately so /metrics has data before first scrape
    refreshOnce(safeQuery).catch((err) => console.warn('[tenant-migration-ledger-refresher] initial refresh failed', err?.message ?? err));
    timer = setInterval(() => {
        refreshOnce(safeQuery).catch((err) => console.warn('[tenant-migration-ledger-refresher] refresh failed', err?.message ?? err));
    }, REFRESH_MS);
    if (typeof timer.unref === 'function')
        timer.unref();
}
function stopTenantMigrationLedgerRefresher() {
    if (timer)
        clearInterval(timer);
    timer = null;
}
//# sourceMappingURL=tenant-migration-ledger-refresher.js.map
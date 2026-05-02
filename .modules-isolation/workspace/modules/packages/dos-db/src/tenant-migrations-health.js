"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeTenantMigrationsHealth = summarizeTenantMigrationsHealth;
/**
 * Health summary for the tenant migrations ledger.
 *
 * Wire this into a /healthz or /admin/db endpoint so monitoring can
 * alert on:
 *   - any tenant in a failed state
 *   - migration that has failed across many tenants (a bad migration
 *     file shipped to prod)
 *   - tenants that have never had a tracker entry (provisioned outside
 *     the tracked path — likely drift)
 *
 * All queries are read-only and constant in cost (use the indexed
 * dos.tenant_migrations_latest view).
 */
const query_1 = require("./query");
async function summarizeTenantMigrationsHealth() {
    // 1. tenants tracked (any row at all)
    const tenants = await (0, query_1.safeQuery)(`SELECT count(DISTINCT tenant_id)::int AS n FROM dos.tenant_migrations`);
    const tenantsTracked = tenants.rows[0]?.n ?? 0;
    // 2. tenants with at least one failed migration in latest state
    const failed = await (0, query_1.safeQuery)(`
    SELECT count(DISTINCT tenant_id)::int AS n,
           count(*)::int                  AS total,
           MIN(applied_at)::text          AS oldest
      FROM dos.tenant_migrations_failed
  `);
    const tenantsWithFailures = failed.rows[0]?.n ?? 0;
    const totalFailures = failed.rows[0]?.total ?? 0;
    const oldestFailureAt = failed.rows[0]?.oldest ?? null;
    // 3. top-N migrations by failed-tenant count
    const top = await (0, query_1.safeQuery)(`
    SELECT migration_id,
           count(*)::int     AS failed_tenants,
           MAX(error_message) AS sample_error
      FROM dos.tenant_migrations_failed
     GROUP BY migration_id
     ORDER BY failed_tenants DESC
     LIMIT 10
  `);
    let status = 'ok';
    // > 5% of tenants failing → degraded; > 25% → critical
    if (tenantsTracked > 0) {
        const pct = tenantsWithFailures / tenantsTracked;
        if (pct >= 0.25)
            status = 'critical';
        else if (pct > 0.05)
            status = 'degraded';
    }
    // Any single migration failing on > 10 tenants → critical regardless of overall pct (broken migration shipped)
    if (top.rows.some((r) => r.failed_tenants > 10))
        status = 'critical';
    return {
        generatedAt: new Date().toISOString(),
        tenantsTracked,
        tenantsWithFailures,
        totalFailures,
        topFailedMigrations: top.rows.map((r) => ({
            migrationId: r.migration_id,
            failedTenants: r.failed_tenants,
            sampleError: r.sample_error,
        })),
        oldestFailureAt,
        status,
    };
}
//# sourceMappingURL=tenant-migrations-health.js.map
/**
 * RiskDiagnosticsService — production health checks (Rule 6.1)
 *
 * PRR remediation 2026-04-20: every DB call is routed through
 * `withTenantClient(tenantId, client => client.query(...))` so the
 * connection is pinned to the tenant's schema for the duration of the
 * query. No pooled safeQuery reliance on `current_schema()`, which is
 * indeterminate when the pool hands out a connection that just served
 * another tenant.
 */
import { withTenantClient } from '@dos/db';

export interface DiagnosticsReport {
  module: string;
  tenantId: string;
  checks: Array<{ name: string; status: 'ok' | 'warn' | 'fail'; details?: string }>;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  checkedAt: string;
}

export async function runRiskDiagnostics(tenantId: string): Promise<DiagnosticsReport> {
  const checks: DiagnosticsReport['checks'] = [];

  try {
    const cnt = await withTenantClient(tenantId, async (client) => {
      const tableCheck = await client.query(
        `SELECT COUNT(*)::int AS cnt
           FROM information_schema.tables
          WHERE table_schema = current_schema()
            AND table_name LIKE 'risk%'`,
      );
      return (tableCheck.rows[0] as { cnt: number })?.cnt ?? 0;
    });
    checks.push({
      name: 'database_tables',
      status: cnt > 0 ? 'ok' : 'fail',
      details: `Found ${cnt} risk tables`,
    });
  } catch (err) {
    checks.push({
      name: 'database_tables',
      status: 'fail',
      details: `DB check failed: ${(err as Error).message}`,
    });
  }

  const hasFail = checks.some((c) => c.status === 'fail');
  const hasWarn = checks.some((c) => c.status === 'warn');
  return {
    module: 'risk',
    tenantId,
    checks,
    overallStatus: hasFail ? 'critical' : hasWarn ? 'degraded' : 'healthy',
    checkedAt: new Date().toISOString(),
  };
}

// Phase 0.5: legacy-API alias.
export const runDiagnostics = runRiskDiagnostics;

/**
 * IncidentDiagnosticsService — production health checks (Rule 6.1).
 *
 * Exposed as a class so the route file's `new IncidentDiagnosticsService()`
 * pattern works. Function-style callers (`runIncidentDiagnostics`,
 * `runDiagnostics`) keep working via the trailing exports.
 */
import { safeQuery } from '@dos/db';

export interface DiagnosticsReport {
  module: string;
  tenantId: string;
  checks: Array<{ name: string; status: 'ok' | 'warn' | 'fail'; details?: string }>;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  checkedAt: string;
}

async function runChecks(tenantId: string): Promise<DiagnosticsReport> {
  const checks: DiagnosticsReport['checks'] = [];

  try {
    const tableCheck = await safeQuery(
      `SELECT COUNT(*)::int AS cnt
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name LIKE 'incident%'`,
      [],
    );
    const cnt = (tableCheck.rows[0] as { cnt: number })?.cnt ?? 0;
    checks.push({
      name: 'database_tables',
      status: cnt > 0 ? 'ok' : 'fail',
      details: `Found ${cnt} incident tables`,
    });
  } catch {
    checks.push({ name: 'database_tables', status: 'fail', details: 'DB check failed' });
  }

  // Open-incident counter — flags warning when the open queue exceeds 100.
  try {
    const openCheck = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM incidents WHERE status NOT IN ('closed','resolved') AND tenant_id = $1`,
      [tenantId],
    );
    const cnt = (openCheck.rows[0] as { cnt: number })?.cnt ?? 0;
    checks.push({
      name: 'open_incidents',
      status: cnt > 200 ? 'fail' : cnt > 100 ? 'warn' : 'ok',
      details: `${cnt} open incidents`,
    });
  } catch {
    checks.push({ name: 'open_incidents', status: 'warn', details: 'open-incident query unavailable' });
  }

  const hasFail = checks.some((c) => c.status === 'fail');
  const hasWarn = checks.some((c) => c.status === 'warn');
  return {
    module: 'incident',
    tenantId,
    checks,
    overallStatus: hasFail ? 'critical' : hasWarn ? 'degraded' : 'healthy',
    checkedAt: new Date().toISOString(),
  };
}

export class IncidentDiagnosticsService {
  async run(tenantId: string): Promise<DiagnosticsReport> {
    return runChecks(tenantId);
  }
  /** Backwards-compatible alias for callers using the function-style name. */
  async runDiagnostics(tenantId: string): Promise<DiagnosticsReport> {
    return runChecks(tenantId);
  }
}

// Function-style entry points kept as named exports + alias.
export const runIncidentDiagnostics = runChecks;
export { runIncidentDiagnostics as runDiagnostics };

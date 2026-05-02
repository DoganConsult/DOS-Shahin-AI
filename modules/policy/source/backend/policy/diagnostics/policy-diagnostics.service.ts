/**
 * PolicyDiagnosticsService — production health checks (Rule 6.1)
 */
import { safeQuery } from '@dos/db';

export interface DiagnosticsReport {
  module: string;
  tenantId: string;
  checks: Array<{ name: string; status: 'ok' | 'warn' | 'fail'; details?: string }>;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  checkedAt: string;
}

export async function runPolicyDiagnostics(tenantId: string): Promise<DiagnosticsReport> {
  const checks: DiagnosticsReport['checks'] = [];

  try {
    const tableCheck = await safeQuery(
      `SELECT COUNT(*)::int AS cnt
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name LIKE 'policy%'`,
      [],
    );
    const cnt = (tableCheck.rows[0] as { cnt: number })?.cnt ?? 0;
    checks.push({
      name: 'database_tables',
      status: cnt > 0 ? 'ok' : 'fail',
      details: `Found ${cnt} policy tables`,
    });
  } catch {
    checks.push({ name: 'database_tables', status: 'fail', details: 'DB check failed' });
  }

  const hasFail = checks.some(c => c.status === 'fail');
  const hasWarn = checks.some(c => c.status === 'warn');
  return {
    module: 'policy',
    tenantId,
    checks,
    overallStatus: hasFail ? 'critical' : hasWarn ? 'degraded' : 'healthy',
    checkedAt: new Date().toISOString(),
  };
}

// Generic alias for cross-module consumers.
export { runPolicyDiagnostics as runDiagnostics };

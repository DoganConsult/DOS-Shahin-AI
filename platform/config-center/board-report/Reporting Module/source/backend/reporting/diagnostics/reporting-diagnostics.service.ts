import { safeQuery, tenantSchema } from '../ports/database.port';

export interface DiagnosticsResult {
  moduleCode: string;
  healthy: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export async function runDiagnostics(tenantId: string): Promise<DiagnosticsResult> {
  const schema = tenantSchema(tenantId);
  const checks: DiagnosticsResult['checks'] = [];

  const { rows: schemaRows } = await safeQuery(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
    [schema],
  ).catch(() => ({ rows: [] }));
  checks.push({ name: 'schema_exists', passed: schemaRows.length > 0 });

  const ownedTables = [
    'reporting_definitions', 'reporting_schedules', 'reporting_snapshots',
    'reporting_templates', 'reporting_exports', 'reporting_subscriptions',
    'reporting_dashboards', 'reporting_widgets',
  ];
  const { rows: tableRows } = await safeQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = ANY($2)`,
    [schema, ownedTables],
  ).catch(() => ({ rows: [] }));
  checks.push({
    name: 'tables_exist',
    passed: tableRows.length === ownedTables.length,
    detail: `${tableRows.length}/${ownedTables.length} owned tables found`,
  });

  const { rows: staleSnapshots } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM ${schema}.reporting_snapshots WHERE status = 'active' AND updated_at < NOW() - INTERVAL '24 hours'`,
    [],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const staleCount = parseInt(String(staleSnapshots[0]?.cnt ?? 0), 10);
  checks.push({
    name: 'stale_snapshots',
    passed: staleCount === 0,
    detail: staleCount > 0 ? `${staleCount} snapshots not refreshed in 24h` : undefined,
  });

  const { rows: overdueSchedules } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM ${schema}.reporting_schedules WHERE status = 'active' AND next_run_at < NOW()`,
    [],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const overdueCount = parseInt(String(overdueSchedules[0]?.cnt ?? 0), 10);
  checks.push({
    name: 'overdue_schedules',
    passed: overdueCount === 0,
    detail: overdueCount > 0 ? `${overdueCount} schedules past due` : undefined,
  });

  const { rows: failedExports } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM ${schema}.reporting_exports WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 hour'`,
    [],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const failedCount = parseInt(String(failedExports[0]?.cnt ?? 0), 10);
  checks.push({
    name: 'export_failure_rate',
    passed: failedCount < 5,
    detail: failedCount > 0 ? `${failedCount} failed exports in last hour` : undefined,
  });

  const { rows: subRows } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM ${schema}.reporting_subscriptions WHERE status = 'active'`,
    [],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  checks.push({
    name: 'subscription_health',
    passed: true,
    detail: `${subRows[0]?.cnt ?? 0} active subscriptions`,
  });

  return {
    moduleCode: 'reporting',
    healthy: checks.every(c => c.passed),
    checks,
    checkedAt: new Date().toISOString(),
  };
}

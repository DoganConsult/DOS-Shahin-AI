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

  // Check schema exists
  const { rows: schemaRows } = await safeQuery(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
    [schema],
  ).catch(() => ({ rows: [] }));
  checks.push({ name: 'schema_exists', passed: schemaRows.length > 0 });

  // Check owned tables exist (replace with actual owned tables from manifest)
  const { rows: tableRows } = await safeQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
    [schema],
  ).catch(() => ({ rows: [] }));
  checks.push({ name: 'tables_exist', passed: tableRows.length > 0, detail: `${tableRows.length} tables found` });

  return {
    moduleCode: 'ksa-regulatory',
    healthy: checks.every(c => c.passed),
    checks,
    checkedAt: new Date().toISOString(),
  };
}

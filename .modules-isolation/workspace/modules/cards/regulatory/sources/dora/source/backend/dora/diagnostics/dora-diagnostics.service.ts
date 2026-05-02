/**
 * DORA Diagnostics Service — Health checks and operational diagnostics.
 *
 * MP-25 §11.3: Required diagnostics:
 *   - Schema and table existence
 *   - Obligation table health (counts, overdue check)
 *   - Resilience test table health (counts, scheduled tests)
 *   - Mapping gap diagnostics
 *   - Readiness score diagnostics
 *   - Backup verification status
 *   - Concentration risk alerts
 *
 * @owner dora
 * @module dora
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

export interface DiagnosticsCheck {
  name: string;
  passed: boolean;
  detail?: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface DiagnosticsResult {
  moduleCode: string;
  healthy: boolean;
  checks: DiagnosticsCheck[];
  checkedAt: string;
}

// ── Required DORA Tables ───────────────────────────────────────────────
const REQUIRED_TABLES = [
  'dora_ict_assets',
  'dora_resilience_tests',
  'dora_major_incidents',
  'dora_threat_intel',
  'dora_backup_configs',
  'dora_ict_third_party_register',
  'dora_obligations',
  'dora_obligation_mappings',
  'dora_framework_mappings',
  'dora_control_mappings',
  'dora_resilience_results',
];

/**
 * Run comprehensive diagnostics for the DORA module.
 * Checks schema, tables, data health, and operational readiness.
 */
export async function runDiagnostics(tenantId: string): Promise<DiagnosticsResult> {
  const schema = tenantSchema(tenantId);
  const checks: DiagnosticsCheck[] = [];

  // 1. Check schema exists
  const { rows: schemaRows } = await safeQuery(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
    [schema],
  ).catch(() => ({ rows: [] }));
  checks.push({
    name: 'schema_exists',
    passed: schemaRows.length > 0,
    detail: schemaRows.length > 0 ? `Schema "${schema}" found` : `Schema "${schema}" not found`,
    severity: schemaRows.length > 0 ? 'info' : 'critical',
  });

  // Early exit if schema doesn't exist
  if (schemaRows.length === 0) {
    return {
      moduleCode: 'dora',
      healthy: false,
      checks,
      checkedAt: new Date().toISOString(),
    };
  }

  // 2. Check required tables exist
  const { rows: tableRows } = await safeQuery(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_name LIKE 'dora_%'`,
    [schema],
  ).catch(() => ({ rows: [] }));

  const existingTables = new Set(tableRows.map(( r: Record<string, unknown>) => r.table_name));
  const missingTables = REQUIRED_TABLES.filter(t => !existingTables.has(t));

  checks.push({
    name: 'required_tables',
    passed: missingTables.length === 0,
    detail: missingTables.length === 0
      ? `All ${REQUIRED_TABLES.length} required tables found`
      : `Missing tables: ${missingTables.join(', ')}`,
    severity: missingTables.length > 0 ? 'critical' : 'info',
  });

  // 3. Obligation health check
  const oblResult = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue,
       COUNT(*) FILTER (WHERE deadline < NOW() AND status NOT IN ('expired','archived','approved'))::int AS past_deadline
     FROM "${schema}".dora_obligations
     WHERE deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ total: 0, overdue: 0, past_deadline: 0 }] }));

  const oblRow = oblResult.rows[0] || { total: 0, overdue: 0, past_deadline: 0 };
  const oblHealthy = oblRow.past_deadline === 0;
  checks.push({
    name: 'obligations_health',
    passed: oblHealthy,
    detail: `${oblRow.total} obligations, ${oblRow.overdue} overdue, ${oblRow.past_deadline} past deadline`,
    severity: oblRow.past_deadline > 5 ? 'critical' : oblRow.past_deadline > 0 ? 'warning' : 'info',
  });

  // 4. Resilience test schedule check
  const testResult = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status IN ('planned','scheduled') AND scheduled_date < NOW())::int AS overdue_tests,
       COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_tests,
       MAX(completed_at)::text AS last_completed
     FROM "${schema}".dora_resilience_tests
     WHERE deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ total: 0, overdue_tests: 0, failed_tests: 0, last_completed: null }] }));

  const testRow = testResult.rows[0] || { total: 0, overdue_tests: 0, failed_tests: 0, last_completed: null };
  checks.push({
    name: 'resilience_test_schedule',
    passed: testRow.overdue_tests === 0,
    detail: `${testRow.total} tests, ${testRow.overdue_tests} overdue, ${testRow.failed_tests} failed. Last completed: ${testRow.last_completed || 'never'}`,
    severity: testRow.overdue_tests > 3 ? 'critical' : testRow.overdue_tests > 0 ? 'warning' : 'info',
  });

  // 5. Mapping gap diagnostics
  const mappingResult = await safeQuery(
    `SELECT
       COUNT(DISTINCT dora_article)::int AS mapped_articles,
       COUNT(*) FILTER (WHERE coverage_level = 'full')::int AS full_coverage,
       COUNT(*) FILTER (WHERE coverage_level = 'partial')::int AS partial_coverage,
       COUNT(*) FILTER (WHERE coverage_level = 'none')::int AS no_coverage
     FROM "${schema}".dora_control_mappings
     WHERE deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ mapped_articles: 0, full_coverage: 0, partial_coverage: 0, no_coverage: 0 }] }));

  const mapRow = mappingResult.rows[0] || { mapped_articles: 0, full_coverage: 0, partial_coverage: 0, no_coverage: 0 };
  // DORA has ~41 articles total
  const totalArticles = 41;
  const coveragePercent = Math.round((mapRow.mapped_articles / totalArticles) * 100);
  checks.push({
    name: 'mapping_coverage',
    passed: coveragePercent >= 50,
    detail: `${mapRow.mapped_articles}/${totalArticles} articles mapped (${coveragePercent}%). Full: ${mapRow.full_coverage}, Partial: ${mapRow.partial_coverage}, None: ${mapRow.no_coverage}`,
    severity: coveragePercent < 25 ? 'critical' : coveragePercent < 50 ? 'warning' : 'info',
  });

  // 6. Major incidents check
  const incidentResult = await safeQuery(
    `SELECT
       COUNT(*)::int AS open_incidents,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_incidents
     FROM "${schema}".dora_major_incidents
     WHERE deleted_at IS NULL AND status NOT IN ('resolved', 'closed', 'archived')`,
  ).catch(() => ({ rows: [{ open_incidents: 0, critical_incidents: 0 }] }));

  const incRow = incidentResult.rows[0] || { open_incidents: 0, critical_incidents: 0 };
  checks.push({
    name: 'open_major_incidents',
    passed: incRow.critical_incidents === 0,
    detail: `${incRow.open_incidents} open incidents, ${incRow.critical_incidents} critical`,
    severity: incRow.critical_incidents > 0 ? 'critical' : incRow.open_incidents > 5 ? 'warning' : 'info',
  });

  // 7. Backup verification status
  const backupResult = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active,
       COUNT(*) FILTER (WHERE last_restore_test_result = 'fail')::int AS failed_restores
     FROM "${schema}".dora_backup_configs
     WHERE deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ total: 0, active: 0, failed_restores: 0 }] }));

  const bkpRow = backupResult.rows[0] || { total: 0, active: 0, failed_restores: 0 };
  checks.push({
    name: 'backup_verification',
    passed: bkpRow.failed_restores === 0,
    detail: `${bkpRow.total} configs, ${bkpRow.active} active, ${bkpRow.failed_restores} failed restore tests`,
    severity: bkpRow.failed_restores > 0 ? 'warning' : 'info',
  });

  // 8. Third-party concentration risk check
  const tpResult = await safeQuery(
    `SELECT
       provider_name, COUNT(*)::int AS service_count
     FROM "${schema}".dora_ict_third_party_register
     WHERE deleted_at IS NULL AND criticality IN ('high', 'critical')
     GROUP BY provider_name
     HAVING COUNT(*) > 3
     ORDER BY service_count DESC`,
  ).catch(() => ({ rows: [] }));

  checks.push({
    name: 'concentration_risk',
    passed: tpResult.rows.length === 0,
    detail: tpResult.rows.length === 0
      ? 'No concentration risk detected'
      : `Concentration risk: ${tpResult.rows.map(( r: Record<string, unknown>) => `${r.provider_name} (${r.service_count} services)`).join(', ')}`,
    severity: tpResult.rows.length > 0 ? 'warning' : 'info',
  });

  // 9. Unacknowledged threat intelligence
  const threatResult = await safeQuery(
    `SELECT
       COUNT(*)::int AS unacknowledged,
       COUNT(*) FILTER (WHERE severity IN ('high', 'critical'))::int AS high_severity
     FROM "${schema}".dora_threat_intel
     WHERE deleted_at IS NULL AND acknowledged = false`,
  ).catch(() => ({ rows: [{ unacknowledged: 0, high_severity: 0 }] }));

  const threatRow = threatResult.rows[0] || { unacknowledged: 0, high_severity: 0 };
  checks.push({
    name: 'unacknowledged_threats',
    passed: threatRow.high_severity === 0,
    detail: `${threatRow.unacknowledged} unacknowledged threats, ${threatRow.high_severity} high/critical severity`,
    severity: threatRow.high_severity > 0 ? 'warning' : 'info',
  });

  return {
    moduleCode: 'dora',
    healthy: checks.every(c => c.passed),
    checks,
    checkedAt: new Date().toISOString(),
  };
}

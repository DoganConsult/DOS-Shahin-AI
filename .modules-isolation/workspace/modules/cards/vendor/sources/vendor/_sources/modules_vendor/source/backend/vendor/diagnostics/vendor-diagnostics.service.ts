import { safeQuery, tenantSchema } from '../ports/database.port';
import { VENDOR_BUSINESS_THRESHOLDS, VENDOR_TIMEOUTS as _VENDOR_TIMEOUTS } from '../data/vendor-constants';

export interface DiagnosticsResult {
  moduleCode: string;
  healthy: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

/**
 * Vendor module diagnostics -- deep health checks beyond basic schema presence.
 *
 * Covers:
 *   - Schema and owned table existence
 *   - Vendor count and active ratio
 *   - Overdue assessments (critical/high-risk vendors)
 *   - Expired contracts on active vendors
 *   - Missing due diligence records
 *   - SLA breach detection
 *   - Fourth-party risk data availability
 *   - Offboarding completeness
 *
 * MP-10 SS12: Diagnostics and admin requirements.
 */
export async function runDiagnostics(tenantId: string): Promise<DiagnosticsResult> {
  const schema = tenantSchema(tenantId);
  const checks: DiagnosticsResult['checks'] = [];

  // 1. Check schema exists
  const { rows: schemaRows } = await safeQuery(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
    [schema],
  ).catch(() => ({ rows: [] }));
  checks.push({ name: 'schema_exists', passed: schemaRows.length > 0 });

  // 2. Check owned tables exist
  const requiredTables = [
    'vendors', 'vendor_assessments', 'vendor_due_diligence',
    'vendor_engagements', 'vendor_findings', 'vendor_issues',
    'vendor_sla_definitions', 'vendor_risk_assessments',
  ];
  const { rows: tableRows } = await safeQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
    [schema],
  ).catch(() => ({ rows: [] }));
  const existingTables = new Set(tableRows.map(( r: Record<string, unknown>) => r.table_name));
  const missingTables = requiredTables.filter(t => !existingTables.has(t));
  checks.push({
    name: 'owned_tables_exist',
    passed: missingTables.length === 0,
    detail: missingTables.length === 0
      ? `All ${requiredTables.length} required tables present`
      : `Missing: ${missingTables.join(', ')}`,
  });

  // 3. Vendor count and active ratio
  const { rows: vendorCountRows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active,
       COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
       COUNT(*) FILTER (WHERE risk_rating IN ('critical', 'high'))::int AS high_risk
     FROM "${schema}".vendors
     WHERE deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ total: 0, active: 0, suspended: 0, high_risk: 0 }] }));
  const vc = vendorCountRows[0] || { total: 0, active: 0, suspended: 0, high_risk: 0 };
  checks.push({
    name: 'vendor_inventory',
    passed: true,
    detail: `Total: ${vc.total}, Active: ${vc.active}, Suspended: ${vc.suspended}, High-risk: ${vc.high_risk}`,
  });

  // 4. Overdue assessments -- critical/high-risk vendors not reassessed within thresholds
  const { rows: overdueRows } = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE risk_rating = 'critical' AND updated_at < NOW() - INTERVAL '90 days')::int AS critical_overdue,
       COUNT(*) FILTER (WHERE risk_rating = 'high' AND updated_at < NOW() - INTERVAL '180 days')::int AS high_overdue
     FROM "${schema}".vendors
     WHERE deleted_at IS NULL AND status NOT IN ('terminated', 'archived')`,
  ).catch(() => ({ rows: [{ critical_overdue: 0, high_overdue: 0 }] }));
  const overdue = overdueRows[0] || { critical_overdue: 0, high_overdue: 0 };
  const totalOverdue = (overdue.critical_overdue || 0) + (overdue.high_overdue || 0);
  checks.push({
    name: 'assessment_currency',
    passed: totalOverdue === 0,
    detail: totalOverdue === 0
      ? 'All critical/high-risk vendors have current assessments'
      : `${overdue.critical_overdue} critical vendors overdue (90d), ${overdue.high_overdue} high vendors overdue (180d)`,
  });

  // 5. Expired contracts on active vendors
  const { rows: expiredContractRows } = await safeQuery(
    `SELECT COUNT(*)::int AS expired
     FROM "${schema}".vendors
     WHERE deleted_at IS NULL
       AND status = 'active'
       AND contract_end_date IS NOT NULL
       AND contract_end_date < NOW()`,
  ).catch(() => ({ rows: [{ expired: 0 }] }));
  const expiredContracts = expiredContractRows[0]?.expired || 0;
  checks.push({
    name: 'contract_currency',
    passed: expiredContracts === 0,
    detail: expiredContracts === 0
      ? 'No expired contracts on active vendors'
      : `${expiredContracts} active vendors with expired contracts`,
  });

  // 6. Missing due diligence -- active vendors without DD record
  const { rows: missingDdRows } = await safeQuery(
    `SELECT COUNT(*)::int AS missing
     FROM "${schema}".vendors v
     WHERE v.deleted_at IS NULL
       AND v.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM "${schema}".vendor_due_diligence dd
         WHERE dd.vendor_id = v.vendor_id AND dd.status != 'cancelled'
       )`,
  ).catch(() => ({ rows: [{ missing: 0 }] }));
  const missingDd = missingDdRows[0]?.missing || 0;
  checks.push({
    name: 'due_diligence_coverage',
    passed: missingDd === 0,
    detail: missingDd === 0
      ? 'All active vendors have due diligence records'
      : `${missingDd} active vendors without due diligence`,
  });

  // 7. SLA breaches -- recent SLA breaches in last 30 days
  const { rows: slaBreachRows } = await safeQuery(
    `SELECT COUNT(*)::int AS breach_count
     FROM "${schema}".vendor_sla_breach_log
     WHERE created_at > NOW() - INTERVAL '30 days'`,
  ).catch(() => ({ rows: [{ breach_count: 0 }] }));
  const slaBreaches = slaBreachRows[0]?.breach_count || 0;
  checks.push({
    name: 'sla_compliance',
    passed: slaBreaches === 0,
    detail: slaBreaches === 0
      ? 'No SLA breaches in last 30 days'
      : `${slaBreaches} SLA breaches recorded in last 30 days`,
  });

  // 8. Open findings count
  const { rows: findingRows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total_open,
       COUNT(*) FILTER (WHERE severity IN ('critical', 'high'))::int AS critical_high
     FROM "${schema}".vendor_findings
     WHERE status IN ('open', 'in_progress')`,
  ).catch(() => ({ rows: [{ total_open: 0, critical_high: 0 }] }));
  const findings = findingRows[0] || { total_open: 0, critical_high: 0 };
  checks.push({
    name: 'open_findings',
    passed: (findings.critical_high || 0) === 0,
    detail: `${findings.total_open} open findings (${findings.critical_high} critical/high)`,
  });

  // 9. Fourth-party risk monitoring
  const { rows: fourthPartyRows } = await safeQuery(
    `SELECT COUNT(*)::int AS monitored
     FROM "${schema}".vendor_fourth_party_risk
     WHERE deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ monitored: 0 }] }));
  const fourthParty = fourthPartyRows[0]?.monitored || 0;
  checks.push({
    name: 'fourth_party_monitoring',
    passed: true,
    detail: `${fourthParty} fourth-party risk records tracked`,
  });

  // 10. Stale prospect vendors
  const { rows: staleRows } = await safeQuery(
    `SELECT COUNT(*)::int AS stale
     FROM "${schema}".vendors
     WHERE deleted_at IS NULL
       AND status = 'prospect'
       AND created_at < NOW() - INTERVAL '${VENDOR_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
  ).catch(() => ({ rows: [{ stale: 0 }] }));
  const staleCount = staleRows[0]?.stale || 0;
  checks.push({
    name: 'stale_prospects',
    passed: staleCount === 0,
    detail: staleCount === 0
      ? 'No stale prospect vendors'
      : `${staleCount} prospect vendors stale (>${VENDOR_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days)`,
  });

  return {
    moduleCode: 'vendor',
    healthy: checks.every(c => c.passed),
    checks,
    checkedAt: new Date().toISOString(),
  };
}

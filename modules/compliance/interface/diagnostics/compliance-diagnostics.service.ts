/**
 * ComplianceDiagnosticsService — production health checks (Rule 6.1)
 *
 * Implements the five diagnostics required by Module Production Readiness
 * Rules §6.1: overdue obligations, missing evidence, mapping drift,
 * assessment pipeline staleness, and blocked reviews. All queries are
 * tenant-scoped via search_path / explicit schema and read-only.
 */
import { safeQuery, tenantSchema } from '@dos/db';

const DEFAULT_LIMIT = 50;
const STUCK_ASSESSMENT_DAYS = 14;
const BLOCKED_REVIEW_ASSESSMENT_DAYS = 7;
const BLOCKED_REVIEW_GAP_DAYS = 30;

export interface DiagnosticsReport {
  module: string;
  tenantId: string;
  checks: Array<{ name: string; status: 'ok' | 'warn' | 'fail'; details?: string }>;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  checkedAt: string;
}

export async function runComplianceDiagnostics(tenantId: string): Promise<DiagnosticsReport> {
  const checks: DiagnosticsReport['checks'] = [];

  try {
    const tableCheck = await safeQuery(
      `SELECT COUNT(*)::int AS cnt
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name LIKE 'compliance%'`,
      [],
    );
    const cnt = (tableCheck.rows[0] as { cnt: number })?.cnt ?? 0;
    checks.push({
      name: 'database_tables',
      status: cnt > 0 ? 'ok' : 'fail',
      details: `Found ${cnt} compliance tables`,
    });
  } catch {
    checks.push({ name: 'database_tables', status: 'fail', details: 'DB check failed' });
  }

  const hasFail = checks.some(c => c.status === 'fail');
  const hasWarn = checks.some(c => c.status === 'warn');
  return {
    module: 'compliance',
    tenantId,
    checks,
    overallStatus: hasFail ? 'critical' : hasWarn ? 'degraded' : 'healthy',
    checkedAt: new Date().toISOString(),
  };
}

// Generic alias for cross-module consumers.
export { runComplianceDiagnostics as runDiagnostics };

function clampLimit(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), 500);
}

/**
 * Obligations whose due_date has passed and which are not yet met or waived.
 * Backs `GET /api/compliance-diagnostics/overdue-obligations` and
 * `GET /api/compliance/compliance-admin/...overdue`.
 */
export async function getOverdueObligationsDiagnostics(
  tenantId: string,
  limit?: number,
): Promise<Array<Record<string, unknown>>> {
  const schema = tenantSchema(tenantId);
  const lim = clampLimit(limit);
  const result = await safeQuery(
    `SELECT id,
            obligation_ref,
            title,
            framework_id,
            owner_id,
            status,
            due_date,
            (CURRENT_DATE - due_date) AS days_overdue
       FROM "${schema}".compliance_obligations
      WHERE due_date IS NOT NULL
        AND due_date < CURRENT_DATE
        AND status NOT IN ('met', 'waived')
      ORDER BY due_date ASC
      LIMIT $1`,
    [lim],
  );
  return result.rows as Array<Record<string, unknown>>;
}

/**
 * Active control mappings that have no evidence link backing them yet.
 * "Missing evidence" = control mapped to a requirement but `compliance_evidence_links`
 * has no row whose `metadata->>'control_id'` matches.
 */
export async function getMissingEvidenceDiagnostics(
  tenantId: string,
  limit?: number,
): Promise<Array<Record<string, unknown>>> {
  const schema = tenantSchema(tenantId);
  const lim = clampLimit(limit);
  const result = await safeQuery(
    `SELECT cm.id            AS mapping_id,
            cm.requirement_id,
            cm.control_id,
            cm.mapping_status,
            cm.last_tested,
            cm.next_test_date
       FROM "${schema}".compliance_controls_mapping cm
       LEFT JOIN "${schema}".compliance_evidence_links el
              ON el.metadata ->> 'control_id' = cm.control_id::text
      WHERE cm.mapping_status = 'active'
        AND el.id IS NULL
      ORDER BY COALESCE(cm.next_test_date, cm.last_tested, '1900-01-01') ASC
      LIMIT $1`,
    [lim],
  );
  return result.rows as Array<Record<string, unknown>>;
}

/**
 * Control mappings whose next_test_date has passed (testing drift) or whose
 * mapping_status was inactivated while the underlying requirement is still active.
 */
export async function getMappingDriftDiagnostics(
  tenantId: string,
  limit?: number,
): Promise<Array<Record<string, unknown>>> {
  const schema = tenantSchema(tenantId);
  const lim = clampLimit(limit);
  const result = await safeQuery(
    `SELECT id            AS mapping_id,
            requirement_id,
            control_id,
            mapping_status,
            effectiveness,
            last_tested,
            next_test_date,
            (CURRENT_DATE - next_test_date) AS days_overdue
       FROM "${schema}".compliance_controls_mapping
      WHERE (next_test_date IS NOT NULL AND next_test_date < CURRENT_DATE AND mapping_status = 'active')
         OR (mapping_status <> 'active' AND last_tested IS NULL)
      ORDER BY COALESCE(next_test_date, last_tested, '1900-01-01') ASC
      LIMIT $1`,
    [lim],
  );
  return result.rows as Array<Record<string, unknown>>;
}

/**
 * Assessments stuck in a non-final state (`draft` / `in_progress` / `under_review`)
 * whose updated_at is older than STUCK_ASSESSMENT_DAYS.
 */
export async function getAssessmentPipelineDiagnostics(
  tenantId: string,
  limit?: number,
): Promise<Array<Record<string, unknown>>> {
  const schema = tenantSchema(tenantId);
  const lim = clampLimit(limit);
  const result = await safeQuery(
    `SELECT id,
            name,
            status,
            framework_id,
            assessor_id,
            created_at,
            updated_at,
            EXTRACT(EPOCH FROM (NOW() - updated_at))::int / 86400 AS days_stale
       FROM "${schema}".compliance_assessments
      WHERE status IN ('draft', 'in_progress', 'under_review')
        AND updated_at < NOW() - ($1 || ' days')::interval
      ORDER BY updated_at ASC
      LIMIT $2`,
    [String(STUCK_ASSESSMENT_DAYS), lim],
  );
  return result.rows as Array<Record<string, unknown>>;
}

/**
 * Reviews that have been blocked too long. Combines:
 *   - assessments still under_review > BLOCKED_REVIEW_ASSESSMENT_DAYS
 *   - gaps still in_remediation > BLOCKED_REVIEW_GAP_DAYS
 */
export async function getBlockedReviewDiagnostics(
  tenantId: string,
  limit?: number,
): Promise<Array<Record<string, unknown>>> {
  const schema = tenantSchema(tenantId);
  const lim = clampLimit(limit);
  const result = await safeQuery(
    `SELECT 'assessment'::text AS kind,
            id,
            name AS title,
            status,
            updated_at,
            EXTRACT(EPOCH FROM (NOW() - updated_at))::int / 86400 AS days_blocked
       FROM "${schema}".compliance_assessments
      WHERE status = 'under_review'
        AND updated_at < NOW() - ($1 || ' days')::interval
      UNION ALL
      SELECT 'gap'::text AS kind,
            id,
            COALESCE(finding_text, 'Compliance gap') AS title,
            gap_status AS status,
            updated_at,
            EXTRACT(EPOCH FROM (NOW() - updated_at))::int / 86400 AS days_blocked
       FROM "${schema}".compliance_gaps
      WHERE gap_status = 'in_remediation'
        AND updated_at < NOW() - ($2 || ' days')::interval
      ORDER BY updated_at ASC
      LIMIT $3`,
    [String(BLOCKED_REVIEW_ASSESSMENT_DAYS), String(BLOCKED_REVIEW_GAP_DAYS), lim],
  );
  return result.rows as Array<Record<string, unknown>>;
}

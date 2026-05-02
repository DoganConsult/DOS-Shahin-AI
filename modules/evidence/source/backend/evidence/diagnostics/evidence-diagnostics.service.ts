/**
 * EvidenceDiagnosticsService — production health checks (Rule 6.1)
 */
import { safeQuery } from '@dos/db';

export interface DiagnosticsReport {
  module: string;
  tenantId: string;
  checks: Array<{ name: string; status: 'ok' | 'warn' | 'fail'; details?: string }>;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  checkedAt: string;
}

export interface EvidenceHealthSummary {
  expiredEvidence: number;
  failedCollectionJobs: number;
  overdueRequests: number;
  totalEvidence: number;
  checkedAt: string;
}

export interface ExpiredEvidenceDiagnostic {
  evidenceId: string;
  title: string;
  expiredAt: string;
  controlId: string | null;
  ownerId: string | null;
}

export interface FailedCollectionDiagnostic {
  jobId: string;
  connectorId: string;
  failedAt: string;
  errorMessage: string;
  retryCount: number;
}

export async function runEvidenceDiagnostics(tenantId: string): Promise<DiagnosticsReport> {
  const checks: DiagnosticsReport['checks'] = [];

  try {
    const tableCheck = await safeQuery(
      `SELECT COUNT(*)::int AS cnt
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name LIKE 'evidence%'`,
      [],
    );
    const cnt = (tableCheck.rows[0] as { cnt: number })?.cnt ?? 0;
    checks.push({
      name: 'database_tables',
      status: cnt > 0 ? 'ok' : 'fail',
      details: `Found ${cnt} evidence tables`,
    });
  } catch {
    checks.push({ name: 'database_tables', status: 'fail', details: 'DB check failed' });
  }

  const hasFail = checks.some(c => c.status === 'fail');
  const hasWarn = checks.some(c => c.status === 'warn');
  return {
    module: 'evidence',
    tenantId,
    checks,
    overallStatus: hasFail ? 'critical' : hasWarn ? 'degraded' : 'healthy',
    checkedAt: new Date().toISOString(),
  };
}

export async function getEvidenceDiagnostics(tenantId: string): Promise<EvidenceHealthSummary> {
  try {
    const schema = `tenant_${tenantId}`;
    const [expired, failed, overdue, total] = await Promise.all([
      safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_evidences WHERE status = 'expired' AND deleted_at IS NULL`,
        [],
      ).catch(() => ({ rows: [{ cnt: 0 }] })),
      safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_collection_jobs WHERE status = 'failed'`,
        [],
      ).catch(() => ({ rows: [{ cnt: 0 }] })),
      safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_requests WHERE due_date < NOW() AND status NOT IN ('fulfilled','cancelled') AND deleted_at IS NULL`,
        [],
      ).catch(() => ({ rows: [{ cnt: 0 }] })),
      safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_evidences WHERE deleted_at IS NULL`,
        [],
      ).catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);
    return {
      expiredEvidence: (expired.rows[0] as { cnt: number })?.cnt ?? 0,
      failedCollectionJobs: (failed.rows[0] as { cnt: number })?.cnt ?? 0,
      overdueRequests: (overdue.rows[0] as { cnt: number })?.cnt ?? 0,
      totalEvidence: (total.rows[0] as { cnt: number })?.cnt ?? 0,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return { expiredEvidence: 0, failedCollectionJobs: 0, overdueRequests: 0, totalEvidence: 0, checkedAt: new Date().toISOString() };
  }
}

export async function getExpiredEvidenceDiagnostics(tenantId: string, limit = 50): Promise<ExpiredEvidenceDiagnostic[]> {
  try {
    const schema = `tenant_${tenantId}`;
    const result = await safeQuery(
      `SELECT evidence_id AS "evidenceId", title, updated_at AS "expiredAt",
              control_id AS "controlId", owner_id AS "ownerId"
       FROM "${schema}".evidence_evidences
       WHERE status = 'expired' AND deleted_at IS NULL
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit],
    ).catch(() => ({ rows: [] }));
    return result.rows as ExpiredEvidenceDiagnostic[];
  } catch {
    return [];
  }
}

export async function getFailedCollectionDiagnostics(tenantId: string, limit = 50): Promise<FailedCollectionDiagnostic[]> {
  try {
    const schema = `tenant_${tenantId}`;
    const result = await safeQuery(
      `SELECT job_id AS "jobId", connector_id AS "connectorId",
              failed_at AS "failedAt", error_message AS "errorMessage",
              retry_count AS "retryCount"
       FROM "${schema}".evidence_collection_jobs
       WHERE status = 'failed'
       ORDER BY failed_at DESC
       LIMIT $1`,
      [limit],
    ).catch(() => ({ rows: [] }));
    return result.rows as FailedCollectionDiagnostic[];
  } catch {
    return [];
  }
}

// Generic alias for cross-module consumers.
export { runEvidenceDiagnostics as runDiagnostics };

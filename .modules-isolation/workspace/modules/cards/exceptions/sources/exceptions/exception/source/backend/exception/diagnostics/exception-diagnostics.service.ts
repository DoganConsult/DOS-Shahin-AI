import { safeQuery, tenantSchema } from '../ports/database.port';

export interface ExceptionDiagnosticsReport {
  moduleCode: string;
  tenantId: string;
  generatedAt: string;
  expiryPipeline: ExpiryPipelineResult;
  approvalHealth: ApprovalHealthResult;
  compensatingControlHealth: CompensatingControlHealthResult;
  staleExceptions: StaleExceptionResult;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface ExpiryPipelineResult {
  approachingExpiry30Days: number;
  approachingExpiry7Days: number;
  expiredNotClosed: number;
  issues: string[];
}

export interface ApprovalHealthResult {
  blockedApprovals: number;
  pendingOver7Days: number;
  averageApprovalDays: number;
  issues: string[];
}

export interface CompensatingControlHealthResult {
  exceptionsWithoutCompensating: number;
  ineffectiveCompensatingControls: number;
  issues: string[];
}

export interface StaleExceptionResult {
  noUpdateIn90Days: number;
  highRiskStale: number;
  issues: string[];
}

interface CoreMetrics {
  exp30: number;
  exp7: number;
  expNotClosed: number;
  blocked: number;
  pending7: number;
  avgApprovalDays: number;
  stale90: number;
  highStale: number;
  noComp: number;
  ineffective: number;
}

export class ExceptionDiagnosticsService {
  private async fetchCoreMetrics(schema: string): Promise<CoreMetrics> {
    const [exceptionAgg, noCompResult, ineffectiveResult] = await Promise.all([
      safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'approved' AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS exp30,
           COUNT(*) FILTER (WHERE status = 'approved' AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '7 days')::int AS exp7,
           COUNT(*) FILTER (WHERE status NOT IN ('closed','revoked','archived') AND expiry_date < NOW())::int AS exp_not_closed,
           COUNT(*) FILTER (WHERE status = 'under_review' AND updated_at < NOW() - INTERVAL '7 days')::int AS blocked,
           COUNT(*) FILTER (WHERE status = 'submitted' AND created_at < NOW() - INTERVAL '7 days')::int AS pending7,
           COUNT(*) FILTER (WHERE status NOT IN ('closed','revoked','archived') AND updated_at < NOW() - INTERVAL '90 days')::int AS stale90,
           COUNT(*) FILTER (WHERE risk_level IN ('critical','high') AND status NOT IN ('closed','revoked','archived') AND updated_at < NOW() - INTERVAL '90 days')::int AS high_stale,
           COALESCE(AVG(EXTRACT(DAY FROM approved_at - created_at)) FILTER (WHERE approved_at IS NOT NULL), 0)::int AS avg_days
         FROM "${schema}".exceptions WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ exp30: 0, exp7: 0, exp_not_closed: 0, blocked: 0, pending7: 0, stale90: 0, high_stale: 0, avg_days: 0 }] })),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM "${schema}".exceptions e
         WHERE e.deleted_at IS NULL AND e.status IN ('approved','submitted','under_review')
           AND NOT EXISTS (SELECT 1 FROM "${schema}".exception_compensating_controls WHERE exception_id = e.exception_id)`,
      ).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM "${schema}".exception_compensating_controls ec
         JOIN "${schema}".exceptions e ON e.exception_id = ec.exception_id
         WHERE e.deleted_at IS NULL AND ec.effectiveness_rating = 'ineffective'`,
      ).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const r = exceptionAgg.rows[0] ?? {};
    return {
      exp30: r.exp30 ?? 0,
      exp7: r.exp7 ?? 0,
      expNotClosed: r.exp_not_closed ?? 0,
      blocked: r.blocked ?? 0,
      pending7: r.pending7 ?? 0,
      avgApprovalDays: r.avg_days ?? 0,
      stale90: r.stale90 ?? 0,
      highStale: r.high_stale ?? 0,
      noComp: noCompResult.rows[0]?.count ?? 0,
      ineffective: ineffectiveResult.rows[0]?.count ?? 0,
    };
  }

  async runDiagnostics(tenantId: string): Promise<ExceptionDiagnosticsReport> {
    const schema = tenantSchema(tenantId);
    const warnings: string[] = [];
    const errors: string[] = [];
    const m = await this.fetchCoreMetrics(schema);

    const expiryIssues: string[] = [];
    if (m.exp30 > 0) expiryIssues.push(`${m.exp30} exceptions expiring within 30 days`);
    if (m.exp7 > 0) { expiryIssues.push(`${m.exp7} exceptions expiring within 7 days`); warnings.push(`${m.exp7} exception(s) expiring within 7 days — renewal action required`); }
    if (m.expNotClosed > 0) { expiryIssues.push(`${m.expNotClosed} exceptions expired but not closed`); warnings.push(`${m.expNotClosed} expired exception(s) still open`); }

    const approvalIssues: string[] = [];
    if (m.blocked > 0) { approvalIssues.push(`${m.blocked} exceptions blocked in review for 7+ days`); warnings.push(`${m.blocked} exception approval(s) stalled`); }
    if (m.pending7 > 0) approvalIssues.push(`${m.pending7} submitted exceptions pending over 7 days`);

    const compIssues: string[] = [];
    if (m.noComp > 0) compIssues.push(`${m.noComp} active exceptions have no compensating controls`);
    if (m.ineffective > 0) { compIssues.push(`${m.ineffective} compensating controls rated ineffective`); warnings.push(`${m.ineffective} ineffective compensating control(s) on active exceptions`); }

    const staleIssues: string[] = [];
    if (m.stale90 > 0) staleIssues.push(`${m.stale90} exceptions not updated in 90+ days`);
    if (m.highStale > 0) { staleIssues.push(`${m.highStale} high/critical-risk exceptions are stale`); errors.push(`${m.highStale} high-risk exception(s) stale — immediate review required`); }

    const criticalCount = m.expNotClosed + m.highStale + (m.blocked > 3 ? 1 : 0);
    const degradedCount = m.exp7 + m.pending7 + m.noComp + m.stale90;
    const overallHealth = errors.length > 0 || criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      moduleCode: 'exception',
      tenantId,
      generatedAt: new Date().toISOString(),
      expiryPipeline: { approachingExpiry30Days: m.exp30, approachingExpiry7Days: m.exp7, expiredNotClosed: m.expNotClosed, issues: expiryIssues },
      approvalHealth: { blockedApprovals: m.blocked, pendingOver7Days: m.pending7, averageApprovalDays: m.avgApprovalDays, issues: approvalIssues },
      compensatingControlHealth: { exceptionsWithoutCompensating: m.noComp, ineffectiveCompensatingControls: m.ineffective, issues: compIssues },
      staleExceptions: { noUpdateIn90Days: m.stale90, highRiskStale: m.highStale, issues: staleIssues },
      overallHealth,
      warnings,
      errors,
    };
  }

  async getExpiryPipelineDiagnostics(tenantId: string): Promise<ExpiryPipelineResult> {
    const schema = tenantSchema(tenantId);
    const m = await this.fetchCoreMetrics(schema);
    const issues: string[] = [];
    if (m.exp30 > 0) issues.push(`${m.exp30} exceptions expiring within 30 days`);
    if (m.exp7 > 0) issues.push(`${m.exp7} exceptions expiring within 7 days`);
    if (m.expNotClosed > 0) issues.push(`${m.expNotClosed} exceptions expired but not closed`);
    return { approachingExpiry30Days: m.exp30, approachingExpiry7Days: m.exp7, expiredNotClosed: m.expNotClosed, issues };
  }

  async getApprovalHealthDiagnostics(tenantId: string): Promise<ApprovalHealthResult> {
    const schema = tenantSchema(tenantId);
    const m = await this.fetchCoreMetrics(schema);
    const issues: string[] = [];
    if (m.blocked > 0) issues.push(`${m.blocked} exceptions blocked in review for 7+ days`);
    if (m.pending7 > 0) issues.push(`${m.pending7} submitted exceptions pending over 7 days`);
    return { blockedApprovals: m.blocked, pendingOver7Days: m.pending7, averageApprovalDays: m.avgApprovalDays, issues };
  }

  async getCompensatingControlHealthDiagnostics(tenantId: string): Promise<CompensatingControlHealthResult> {
    const schema = tenantSchema(tenantId);
    const m = await this.fetchCoreMetrics(schema);
    const issues: string[] = [];
    if (m.noComp > 0) issues.push(`${m.noComp} active exceptions have no compensating controls`);
    if (m.ineffective > 0) issues.push(`${m.ineffective} compensating controls rated ineffective`);
    return { exceptionsWithoutCompensating: m.noComp, ineffectiveCompensatingControls: m.ineffective, issues };
  }
}

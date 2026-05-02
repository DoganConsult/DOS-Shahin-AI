import { safeQuery, tenantSchema } from '../ports/database.port';

export interface RemediationDiagnosticsReport {
  moduleCode: string;
  tenantId: string;
  generatedAt: string;
  overduePipeline: OverduePipelineResult;
  blockedClosure: BlockedClosureResult;
  assignmentHealth: AssignmentHealthResult;
  escalationPipeline: EscalationPipelineResult;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface OverduePipelineResult {
  overdueCount: number;
  criticalOverdue: number;
  averageDaysOverdue: number;
  issues: string[];
}

export interface BlockedClosureResult {
  blockedCount: number;
  pendingVerification: number;
  failedVerification: number;
  issues: string[];
}

export interface AssignmentHealthResult {
  unassignedCount: number;
  noOwnerCount: number;
  issues: string[];
}

export interface EscalationPipelineResult {
  activeEscalations: number;
  unresolvedEscalations: number;
  issues: string[];
}

export class RemediationDiagnosticsService {
  async runDiagnostics(tenantId: string): Promise<RemediationDiagnosticsReport> {
    const schema = tenantSchema(tenantId);
    const warnings: string[] = [];
    const errors: string[] = [];

    const [
      overdueResult, criticalOverdueResult, blockedResult,
      pendingVerifResult, failedVerifResult,
      unassignedResult, noOwnerResult,
      activeEscResult, unresolvedEscResult,
    ] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".remediations WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived') AND due_date < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".remediations WHERE deleted_at IS NULL AND priority = 'critical' AND status NOT IN ('closed', 'archived') AND due_date < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".remediations WHERE deleted_at IS NULL AND status = 'blocked'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".remediations WHERE deleted_at IS NULL AND status = 'pending_verification'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".remediation_verifications WHERE result = 'fail'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".remediations WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived', 'planned') AND (assignee IS NULL OR assignee = '')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".remediations WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived') AND (owner IS NULL OR owner = '')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".remediation_escalations WHERE resolved_at IS NULL`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".remediation_escalations WHERE resolved_at IS NULL AND escalated_at < NOW() - INTERVAL '7 days'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const overdue = overdueResult.rows[0]?.count ?? 0;
    const critOverdue = criticalOverdueResult.rows[0]?.count ?? 0;
    const blocked = blockedResult.rows[0]?.count ?? 0;
    const pendingVerif = pendingVerifResult.rows[0]?.count ?? 0;
    const failedVerif = failedVerifResult.rows[0]?.count ?? 0;
    const unassigned = unassignedResult.rows[0]?.count ?? 0;
    const noOwner = noOwnerResult.rows[0]?.count ?? 0;
    const activeEsc = activeEscResult.rows[0]?.count ?? 0;
    const unresolvedEsc = unresolvedEscResult.rows[0]?.count ?? 0;

    const overdueIssues: string[] = [];
    if (overdue > 0) { overdueIssues.push(`${overdue} remediations overdue`); warnings.push(`${overdue} remediation(s) past due date`); }
    if (critOverdue > 0) { overdueIssues.push(`${critOverdue} critical remediations overdue`); errors.push(`${critOverdue} critical remediation(s) overdue`); }

    const closureIssues: string[] = [];
    if (blocked > 0) closureIssues.push(`${blocked} remediations blocked`);
    if (pendingVerif > 0) closureIssues.push(`${pendingVerif} pending verification`);
    if (failedVerif > 0) { closureIssues.push(`${failedVerif} failed verifications`); warnings.push(`${failedVerif} remediation verification(s) failed`); }

    const assignIssues: string[] = [];
    if (unassigned > 0) assignIssues.push(`${unassigned} active remediations unassigned`);
    if (noOwner > 0) { assignIssues.push(`${noOwner} remediations without owner`); warnings.push(`${noOwner} remediation(s) have no owner`); }

    const escIssues: string[] = [];
    if (activeEsc > 0) escIssues.push(`${activeEsc} active escalations`);
    if (unresolvedEsc > 0) { escIssues.push(`${unresolvedEsc} escalations unresolved for 7+ days`); warnings.push(`${unresolvedEsc} remediation escalation(s) stale`); }

    const criticalCount = critOverdue + (errors.length > 0 ? 1 : 0);
    const degradedCount = overdue + blocked + unassigned + activeEsc;
    const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      moduleCode: 'remediation',
      tenantId,
      generatedAt: new Date().toISOString(),
      overduePipeline: { overdueCount: overdue, criticalOverdue: critOverdue, averageDaysOverdue: 0, issues: overdueIssues },
      blockedClosure: { blockedCount: blocked, pendingVerification: pendingVerif, failedVerification: failedVerif, issues: closureIssues },
      assignmentHealth: { unassignedCount: unassigned, noOwnerCount: noOwner, issues: assignIssues },
      escalationPipeline: { activeEscalations: activeEsc, unresolvedEscalations: unresolvedEsc, issues: escIssues },
      overallHealth,
      warnings,
      errors,
    };
  }
}

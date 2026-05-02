import { safeQuery, tenantSchema } from '../ports/database.port';

export interface IssuesDiagnosticsReport {
  moduleCode: string;
  tenantId: string;
  generatedAt: string;
  issueHealth: IssueHealthResult;
  assignmentHealth: AssignmentHealthResult;
  escalationHealth: EscalationHealthResult;
  closureHealth: ClosureHealthResult;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface IssueHealthResult {
  totalOpen: number;
  criticalOpen: number;
  overdueCount: number;
  staleIssues: number;
  issues: string[];
}

export interface AssignmentHealthResult {
  unassignedCount: number;
  noOwnerCount: number;
  issues: string[];
}

export interface EscalationHealthResult {
  activeEscalations: number;
  unresolvedEscalations: number;
  issues: string[];
}

export interface ClosureHealthResult {
  blockedClosures: number;
  pendingVerification: number;
  issues: string[];
}

export class IssuesDiagnosticsService {
  async runDiagnostics(tenantId: string): Promise<IssuesDiagnosticsReport> {
    const schema = tenantSchema(tenantId);
    const warnings: string[] = [];
    const errors: string[] = [];

    const [
      totalOpenResult, criticalResult, overdueResult, staleResult,
      unassignedResult, noOwnerResult,
      activeEscResult, unresolvedEscResult,
      blockedResult, pendingVerifResult,
    ] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".issues WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".issues WHERE deleted_at IS NULL AND severity = 'critical' AND status NOT IN ('closed', 'archived')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".issues WHERE deleted_at IS NULL AND status NOT IN ('resolved', 'closed', 'archived') AND due_date < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".issues WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived') AND updated_at < NOW() - INTERVAL '90 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".issues WHERE deleted_at IS NULL AND status IN ('open', 'in_progress') AND (assignee IS NULL OR assignee = '')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".issues WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived') AND (owner IS NULL OR owner = '')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".issue_escalations WHERE resolved_at IS NULL`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".issue_escalations WHERE resolved_at IS NULL AND escalated_at < NOW() - INTERVAL '7 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".issues WHERE deleted_at IS NULL AND status = 'blocked'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".issues WHERE deleted_at IS NULL AND status = 'resolved' AND updated_at < NOW() - INTERVAL '7 days'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const totalOpen = totalOpenResult.rows[0]?.count ?? 0;
    const critical = criticalResult.rows[0]?.count ?? 0;
    const overdue = overdueResult.rows[0]?.count ?? 0;
    const stale = staleResult.rows[0]?.count ?? 0;
    const unassigned = unassignedResult.rows[0]?.count ?? 0;
    const noOwner = noOwnerResult.rows[0]?.count ?? 0;
    const activeEsc = activeEscResult.rows[0]?.count ?? 0;
    const unresolvedEsc = unresolvedEscResult.rows[0]?.count ?? 0;
    const blocked = blockedResult.rows[0]?.count ?? 0;
    const pendingVerif = pendingVerifResult.rows[0]?.count ?? 0;

    const issueIssues: string[] = [];
    if (critical > 0) { issueIssues.push(`${critical} critical issues open`); errors.push(`${critical} critical issue(s) unresolved`); }
    if (overdue > 0) { issueIssues.push(`${overdue} issues overdue`); warnings.push(`${overdue} issue(s) past due date`); }
    if (stale > 0) issueIssues.push(`${stale} issues stale (90+ days)`);

    const assignIssues: string[] = [];
    if (unassigned > 0) assignIssues.push(`${unassigned} active issues unassigned`);
    if (noOwner > 0) { assignIssues.push(`${noOwner} issues without owner`); warnings.push(`${noOwner} issue(s) have no owner`); }

    const escIssues: string[] = [];
    if (activeEsc > 0) escIssues.push(`${activeEsc} active escalations`);
    if (unresolvedEsc > 0) escIssues.push(`${unresolvedEsc} escalations unresolved 7+ days`);

    const closureIssues: string[] = [];
    if (blocked > 0) closureIssues.push(`${blocked} issues blocked`);
    if (pendingVerif > 0) closureIssues.push(`${pendingVerif} resolved issues pending verification 7+ days`);

    const criticalCount = critical + (errors.length > 0 ? 1 : 0);
    const degradedCount = overdue + unassigned + stale + activeEsc + blocked;
    const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      moduleCode: 'issues',
      tenantId,
      generatedAt: new Date().toISOString(),
      issueHealth: { totalOpen, criticalOpen: critical, overdueCount: overdue, staleIssues: stale, issues: issueIssues },
      assignmentHealth: { unassignedCount: unassigned, noOwnerCount: noOwner, issues: assignIssues },
      escalationHealth: { activeEscalations: activeEsc, unresolvedEscalations: unresolvedEsc, issues: escIssues },
      closureHealth: { blockedClosures: blocked, pendingVerification: pendingVerif, issues: closureIssues },
      overallHealth,
      warnings,
      errors,
    };
  }
}

import { safeQuery, tenantSchema } from '../ports/database.port';

export interface PortalsDiagnosticsReport {
  moduleCode: string;
  tenantId: string;
  generatedAt: string;
  portalHealth: PortalHealthResult;
  accessHealth: AccessHealthResult;
  submissionHealth: SubmissionHealthResult;
  externalUserHealth: ExternalUserHealthResult;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface PortalHealthResult {
  activePortals: number;
  expiredPortals: number;
  portalsWithoutOwner: number;
  issues: string[];
}

export interface AccessHealthResult {
  expiredTokens: number;
  unauthorizedAttempts: number;
  issues: string[];
}

export interface SubmissionHealthResult {
  pendingReviewCount: number;
  overdueReviews: number;
  issues: string[];
}

export interface ExternalUserHealthResult {
  pendingApprovals: number;
  inactiveUsers90Days: number;
  issues: string[];
}

export class PortalsDiagnosticsService {
  async runDiagnostics(tenantId: string): Promise<PortalsDiagnosticsReport> {
    const schema = tenantSchema(tenantId);
    const warnings: string[] = [];
    const errors: string[] = [];

    const [
      activeResult, expiredResult, noOwnerResult,
      expiredTokenResult, unauthResult,
      pendingSubResult, overdueSubResult,
      pendingUserResult, inactiveUserResult,
    ] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".portals WHERE deleted_at IS NULL AND status = 'active'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".portals WHERE deleted_at IS NULL AND status = 'active' AND expires_at < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".portals WHERE deleted_at IS NULL AND status NOT IN ('retired', 'archived') AND (owner IS NULL OR owner = '')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".portal_access_tokens WHERE expires_at < NOW() AND revoked_at IS NULL`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".portal_access_logs WHERE success = false AND attempted_at > NOW() - INTERVAL '24 hours'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".portal_submissions WHERE status = 'received' OR status = 'under_review'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".portal_submissions WHERE status IN ('received', 'under_review') AND submitted_at < NOW() - INTERVAL '7 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".portal_external_users WHERE status = 'pending'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".portal_external_users WHERE status = 'active' AND last_login_at < NOW() - INTERVAL '90 days'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const active = activeResult.rows[0]?.count ?? 0;
    const expired = expiredResult.rows[0]?.count ?? 0;
    const noOwner = noOwnerResult.rows[0]?.count ?? 0;
    const expiredToken = expiredTokenResult.rows[0]?.count ?? 0;
    const unauth = unauthResult.rows[0]?.count ?? 0;
    const pendingSub = pendingSubResult.rows[0]?.count ?? 0;
    const overdueSub = overdueSubResult.rows[0]?.count ?? 0;
    const pendingUser = pendingUserResult.rows[0]?.count ?? 0;
    const inactiveUser = inactiveUserResult.rows[0]?.count ?? 0;

    const portalIssues: string[] = [];
    if (expired > 0) { portalIssues.push(`${expired} active portals past expiry date`); errors.push(`${expired} portal(s) expired but still active`); }
    if (noOwner > 0) portalIssues.push(`${noOwner} portals without owner`);

    const accessIssues: string[] = [];
    if (expiredToken > 0) accessIssues.push(`${expiredToken} expired tokens not revoked`);
    if (unauth > 10) { accessIssues.push(`${unauth} unauthorized access attempts in 24h`); warnings.push(`${unauth} unauthorized portal access attempt(s) in 24h`); }

    const subIssues: string[] = [];
    if (overdueSub > 0) { subIssues.push(`${overdueSub} submissions overdue for review (7+ days)`); warnings.push(`${overdueSub} portal submission(s) overdue for review`); }

    const userIssues: string[] = [];
    if (pendingUser > 0) userIssues.push(`${pendingUser} external users pending approval`);
    if (inactiveUser > 0) userIssues.push(`${inactiveUser} external users inactive 90+ days`);

    const criticalCount = expired + (unauth > 50 ? 1 : 0);
    const degradedCount = noOwner + overdueSub + pendingUser + inactiveUser;
    const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      moduleCode: 'portals',
      tenantId,
      generatedAt: new Date().toISOString(),
      portalHealth: { activePortals: active, expiredPortals: expired, portalsWithoutOwner: noOwner, issues: portalIssues },
      accessHealth: { expiredTokens: expiredToken, unauthorizedAttempts: unauth, issues: accessIssues },
      submissionHealth: { pendingReviewCount: pendingSub, overdueReviews: overdueSub, issues: subIssues },
      externalUserHealth: { pendingApprovals: pendingUser, inactiveUsers90Days: inactiveUser, issues: userIssues },
      overallHealth,
      warnings,
      errors,
    };
  }
}

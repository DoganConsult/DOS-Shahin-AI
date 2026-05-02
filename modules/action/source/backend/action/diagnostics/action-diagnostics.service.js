"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDiagnosticsService = void 0;
const database_port_1 = require("../ports/database.port");
class ActionDiagnosticsService {
    async runDiagnostics(tenantId) {
        const schema = (0, database_port_1.tenantSchema)(tenantId);
        const warnings = [];
        const errors = [];
        const [overdueResult, critOverdueResult, unassignedResult, noOwnerResult, pendingVerifResult, rejectedResult, staleDraftResult, blockedResult,] = await Promise.all([
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".actions WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled', 'archived') AND due_date < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".actions WHERE deleted_at IS NULL AND priority = 'critical' AND status NOT IN ('completed', 'cancelled', 'archived') AND due_date < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".actions WHERE deleted_at IS NULL AND status IN ('assigned', 'in_progress') AND (assignee IS NULL OR assignee = '')`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".actions WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled', 'archived') AND (owner IS NULL OR owner = '')`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".actions WHERE deleted_at IS NULL AND status = 'pending_review'`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".action_verifications WHERE verification_result = 'rejected'`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".actions WHERE deleted_at IS NULL AND status = 'draft' AND created_at < NOW() - INTERVAL '30 days'`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".actions WHERE deleted_at IS NULL AND status = 'blocked' AND updated_at < NOW() - INTERVAL '7 days'`).catch(() => ({ rows: [{ count: 0 }] })),
        ]);
        const overdue = overdueResult.rows[0]?.count ?? 0;
        const critOverdue = critOverdueResult.rows[0]?.count ?? 0;
        const unassigned = unassignedResult.rows[0]?.count ?? 0;
        const noOwner = noOwnerResult.rows[0]?.count ?? 0;
        const pendingVerif = pendingVerifResult.rows[0]?.count ?? 0;
        const rejected = rejectedResult.rows[0]?.count ?? 0;
        const staleDraft = staleDraftResult.rows[0]?.count ?? 0;
        const blocked = blockedResult.rows[0]?.count ?? 0;
        const overdueIssues = [];
        if (overdue > 0) {
            overdueIssues.push(`${overdue} actions overdue`);
            warnings.push(`${overdue} action(s) past due date`);
        }
        if (critOverdue > 0) {
            overdueIssues.push(`${critOverdue} critical actions overdue`);
            errors.push(`${critOverdue} critical action(s) overdue`);
        }
        const assignIssues = [];
        if (unassigned > 0)
            assignIssues.push(`${unassigned} active actions unassigned`);
        if (noOwner > 0) {
            assignIssues.push(`${noOwner} actions without owner`);
            warnings.push(`${noOwner} action(s) have no owner`);
        }
        const completionIssues = [];
        if (pendingVerif > 0)
            completionIssues.push(`${pendingVerif} actions pending verification`);
        if (rejected > 0)
            completionIssues.push(`${rejected} action verifications rejected`);
        const staleIssues = [];
        if (staleDraft > 0)
            staleIssues.push(`${staleDraft} drafts older than 30 days`);
        if (blocked > 0) {
            staleIssues.push(`${blocked} actions blocked for 7+ days`);
            warnings.push(`${blocked} action(s) blocked over 7 days`);
        }
        const criticalCount = critOverdue + (errors.length > 0 ? 1 : 0);
        const degradedCount = overdue + unassigned + blocked + staleDraft;
        const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';
        return {
            moduleCode: 'action',
            tenantId,
            generatedAt: new Date().toISOString(),
            overdueActions: { totalOverdue: overdue, criticalOverdue: critOverdue, issues: overdueIssues },
            assignmentHealth: { unassignedCount: unassigned, noOwnerCount: noOwner, issues: assignIssues },
            completionHealth: { pendingVerification: pendingVerif, rejectedCount: rejected, issues: completionIssues },
            staleDrafts: { draftOver30Days: staleDraft, blockedOver7Days: blocked, issues: staleIssues },
            overallHealth,
            warnings,
            errors,
        };
    }
}
exports.ActionDiagnosticsService = ActionDiagnosticsService;
//# sourceMappingURL=action-diagnostics.service.js.map
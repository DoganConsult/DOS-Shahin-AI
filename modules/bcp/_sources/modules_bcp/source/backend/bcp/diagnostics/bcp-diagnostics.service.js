"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BcpDiagnosticsService = void 0;
const database_port_1 = require("../ports/database.port");
class BcpDiagnosticsService {
    async runDiagnostics(tenantId) {
        const schema = (0, database_port_1.tenantSchema)(tenantId);
        const warnings = [];
        const errors = [];
        const [needsReviewResult, neverExercisedResult, noOwnerResult, overdueExResult, failedExResult, noEx12Result, exceedRtoResult, exceedRpoResult, untestedResult,] = await Promise.all([
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".bcp_plans WHERE deleted_at IS NULL AND status IN ('active', 'approved') AND (next_review_due < NOW() OR next_review_due IS NULL AND updated_at < NOW() - INTERVAL '365 days')`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".bcp_plans p WHERE p.deleted_at IS NULL AND p.status IN ('active', 'approved') AND NOT EXISTS (SELECT 1 FROM "${schema}".bcp_exercises WHERE plan_id = p.plan_id)`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".bcp_plans WHERE deleted_at IS NULL AND status NOT IN ('retired', 'archived') AND (owner IS NULL OR owner = '')`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".bcp_exercises WHERE status = 'planned' AND scheduled_date < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".bcp_exercises WHERE status = 'completed' AND outcome = 'fail'`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".bcp_plans p WHERE p.deleted_at IS NULL AND p.status IN ('active', 'approved') AND NOT EXISTS (SELECT 1 FROM "${schema}".bcp_exercises WHERE plan_id = p.plan_id AND status = 'completed' AND conducted_date > NOW() - INTERVAL '365 days')`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".bcp_recovery_strategies rs JOIN "${schema}".bcp_plans p ON p.plan_id = rs.plan_id WHERE p.deleted_at IS NULL AND rs.rto_achievable > p.rto_hours`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".bcp_recovery_strategies rs JOIN "${schema}".bcp_plans p ON p.plan_id = rs.plan_id WHERE p.deleted_at IS NULL AND rs.rpo_achievable > p.rpo_hours`).catch(() => ({ rows: [{ count: 0 }] })),
            (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count FROM "${schema}".bcp_recovery_strategies WHERE status != 'tested' AND last_tested_at IS NULL`).catch(() => ({ rows: [{ count: 0 }] })),
        ]);
        const needsReview = needsReviewResult.rows[0]?.count ?? 0;
        const neverExercised = neverExercisedResult.rows[0]?.count ?? 0;
        const noOwner = noOwnerResult.rows[0]?.count ?? 0;
        const overdueEx = overdueExResult.rows[0]?.count ?? 0;
        const failedEx = failedExResult.rows[0]?.count ?? 0;
        const noEx12 = noEx12Result.rows[0]?.count ?? 0;
        const exceedRto = exceedRtoResult.rows[0]?.count ?? 0;
        const exceedRpo = exceedRpoResult.rows[0]?.count ?? 0;
        const untested = untestedResult.rows[0]?.count ?? 0;
        const planIssues = [];
        if (needsReview > 0) {
            planIssues.push(`${needsReview} plans need review`);
            warnings.push(`${needsReview} BCP plan(s) overdue for review`);
        }
        if (neverExercised > 0) {
            planIssues.push(`${neverExercised} active plans never exercised`);
            errors.push(`${neverExercised} BCP plan(s) never exercised`);
        }
        if (noOwner > 0)
            planIssues.push(`${noOwner} plans without owner`);
        const exIssues = [];
        if (overdueEx > 0)
            exIssues.push(`${overdueEx} exercises overdue`);
        if (failedEx > 0) {
            exIssues.push(`${failedEx} exercises failed`);
            warnings.push(`${failedEx} BCP exercise(s) failed`);
        }
        if (noEx12 > 0)
            exIssues.push(`${noEx12} plans have no exercise in 12 months`);
        const recoveryIssues = [];
        if (exceedRto > 0) {
            recoveryIssues.push(`${exceedRto} strategies exceed plan RTO`);
            warnings.push(`${exceedRto} recovery strateg(ies) exceed target RTO`);
        }
        if (exceedRpo > 0)
            recoveryIssues.push(`${exceedRpo} strategies exceed plan RPO`);
        if (untested > 0)
            recoveryIssues.push(`${untested} recovery strategies untested`);
        const criticalCount = neverExercised + (errors.length > 0 ? 1 : 0);
        const degradedCount = needsReview + overdueEx + failedEx + exceedRto + untested;
        const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';
        return {
            moduleCode: 'bcp',
            tenantId,
            generatedAt: new Date().toISOString(),
            planHealth: { plansNeedingReview: needsReview, plansNeverExercised: neverExercised, plansWithoutOwner: noOwner, issues: planIssues },
            exerciseHealth: { overdueExercises: overdueEx, failedExercises: failedEx, noExerciseIn12Months: noEx12, issues: exIssues },
            recoveryReadiness: { plansExceedingRto: exceedRto, plansExceedingRpo: exceedRpo, untestedStrategies: untested, issues: recoveryIssues },
            overallHealth,
            warnings,
            errors,
        };
    }
}
exports.BcpDiagnosticsService = BcpDiagnosticsService;
//# sourceMappingURL=bcp-diagnostics.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDauthDiagnostics = runDauthDiagnostics;
exports.explainDecision = explainDecision;
exports.getDauthHealthSummary = getDauthHealthSummary;
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
const decision_log_service_1 = require("../audit/decision-log.service");
async function runDauthDiagnostics(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const timestamp = new Date().toISOString();
    const [expiredDelegations, orphanedSessions, sodViolations, lockedAccounts, pendingReviews, staleInvitations, usersWithoutRoles, expiredAssignments,] = await Promise.all([
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".delegations
       WHERE is_active = TRUE AND valid_to < NOW()`).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { observability_1.logger.debug('[DAuth:Diagnostics] query degraded', { error: err.message }); return 0; }),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM sessions
       WHERE tenant_id = $1 AND status = 'active'
         AND last_activity_at < NOW() - INTERVAL '48 hours'`, [tenantId]).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { observability_1.logger.debug('[DAuth:Diagnostics] query degraded', { error: err.message }); return 0; }),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".sod_conflict_resolution_history
       WHERE resolution_status = 'unresolved'`).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { observability_1.logger.debug('[DAuth:Diagnostics] query degraded', { error: err.message }); return 0; }),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM users
       WHERE tenant_id = $1 AND status = 'locked'`, [tenantId]).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { observability_1.logger.debug('[DAuth:Diagnostics] query degraded', { error: err.message }); return 0; }),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".access_reviews
       WHERE status = 'pending'`).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { observability_1.logger.debug('[DAuth:Diagnostics] query degraded', { error: err.message }); return 0; }),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM invitations
       WHERE tenant_id = $1 AND status = 'pending'
         AND created_at < NOW() - INTERVAL '72 hours'`, [tenantId]).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { observability_1.logger.debug('[DAuth:Diagnostics] query degraded', { error: err.message }); return 0; }),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM users u
       WHERE u.tenant_id = $1 AND u.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".enterprise_user_role_assignments era
           WHERE era.user_id = u.user_id AND era.is_active = TRUE
         )`, [tenantId]).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { observability_1.logger.debug('[DAuth:Diagnostics] query degraded', { error: err.message }); return 0; }),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".enterprise_user_role_assignments
       WHERE is_active = TRUE AND valid_to IS NOT NULL AND valid_to < NOW()`).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { observability_1.logger.debug('[DAuth:Diagnostics] query degraded', { error: err.message }); return 0; }),
    ]);
    const result = {
        tenantId,
        timestamp,
        expiredDelegations,
        orphanedSessions,
        staleAccessSnapshots: 0,
        sodViolationsAccumulated: sodViolations,
        lockedAccounts,
        pendingAccessReviews: pendingReviews,
        staleInvitations,
        usersWithoutRoles,
        expiredRoleAssignments: expiredAssignments,
    };
    const issues = Object.entries(result)
        .filter(([k, v]) => typeof v === 'number' && v > 0 && k !== 'tenantId')
        .map(([k, v]) => `${k}=${v}`);
    if (issues.length > 0) {
        observability_1.logger.warn('[DAuth:Diagnostics] issues detected', { tenantId, issues: issues.join(', ') });
    }
    return result;
}
async function explainDecision(input) {
    const { tenantId } = input;
    if (!input.decisionId && !input.correlationId) {
        return {
            found: false,
            tenantId,
            chain: [],
            trace: ['explainDecision: either decisionId or correlationId is required'],
        };
    }
    let primary;
    let chain = [];
    if (input.correlationId) {
        const { entries } = await (0, decision_log_service_1.queryDecisionLog)(tenantId, {
            correlationId: input.correlationId,
            limit: 100,
        });
        chain = entries;
        primary = entries[0];
    }
    else if (input.decisionId) {
        const schema = (0, db_1.tenantSchema)(tenantId);
        const row = await (0, db_1.safeQuery)(`SELECT id, user_id, permission_code, module_code, decision, reason,
              matched_role, matched_scope_type, authority_level, correlation_id,
              record_context, created_at
       FROM "${schema}".authz_decision_log
       WHERE id = $1 LIMIT 1`, [input.decisionId]);
        if (row.rows.length > 0) {
            const r = row.rows[0];
            const ctx = (r.record_context ?? {});
            primary = {
                logId: r.id,
                userId: r.user_id,
                permissionCode: r.permission_code,
                moduleCode: r.module_code,
                decision: r.decision,
                reason: r.reason,
                matchedRole: r.matched_role,
                scopeType: r.matched_scope_type,
                authorityLevel: r.authority_level,
                correlationId: r.correlation_id,
                context: ctx,
                createdAt: r.created_at,
                reasonCode: typeof ctx.reasonCode === 'string' ? ctx.reasonCode : undefined,
                policyVersion: typeof ctx.policyVersion === 'string' ? ctx.policyVersion : undefined,
                modelVersion: typeof ctx.modelVersion === 'string' ? ctx.modelVersion : undefined,
                engineResults: ctx.engineResults ?? undefined,
                obligations: ctx.obligations ?? undefined,
            };
            if (primary.correlationId) {
                const { entries } = await (0, decision_log_service_1.queryDecisionLog)(tenantId, {
                    correlationId: primary.correlationId,
                    limit: 100,
                });
                chain = entries;
            }
            else {
                chain = [primary];
            }
        }
    }
    if (!primary) {
        return { found: false, tenantId, chain: [], trace: ['No decision found'] };
    }
    const trace = [];
    trace.push(`[${primary.decision.toUpperCase()}] ${primary.permissionCode} — user=${primary.userId} @ ${primary.createdAt}`);
    if (primary.reasonCode)
        trace.push(`reason_code: ${primary.reasonCode}`);
    trace.push(`reason: ${primary.reason}`);
    if (primary.policyVersion)
        trace.push(`policy: ${primary.policyVersion}`);
    if (primary.modelVersion)
        trace.push(`model:  ${primary.modelVersion}`);
    const ctx = primary.context ?? {};
    const failedStep = ctx.failedStep;
    const failedCheck = ctx.failedCheck;
    if (typeof failedStep === 'number') {
        trace.push(`failed_step: ${failedStep}  failed_check: ${failedCheck}`);
    }
    if (primary.engineResults) {
        for (const [engine, result] of Object.entries(primary.engineResults)) {
            trace.push(`engine[${engine}]: ${JSON.stringify(result)}`);
        }
    }
    if (primary.obligations && Object.keys(primary.obligations).length > 0) {
        trace.push(`obligations: ${JSON.stringify(primary.obligations)}`);
    }
    if (chain.length > 1) {
        trace.push(`chain: ${chain.length} decisions share correlationId=${primary.correlationId}`);
    }
    return { found: true, tenantId, primary, chain, trace };
}
async function getDauthHealthSummary(tenantId) {
    const diag = await runDauthDiagnostics(tenantId);
    const issues = [];
    if (diag.expiredDelegations > 0)
        issues.push(`${diag.expiredDelegations} expired delegation(s) still active`);
    if (diag.orphanedSessions > 0)
        issues.push(`${diag.orphanedSessions} orphaned session(s) idle >48h`);
    if (diag.sodViolationsAccumulated > 0)
        issues.push(`${diag.sodViolationsAccumulated} unresolved SoD violation(s)`);
    if (diag.lockedAccounts > 0)
        issues.push(`${diag.lockedAccounts} locked account(s)`);
    if (diag.pendingAccessReviews > 0)
        issues.push(`${diag.pendingAccessReviews} pending access review(s)`);
    if (diag.staleInvitations > 0)
        issues.push(`${diag.staleInvitations} stale invitation(s) >72h`);
    if (diag.usersWithoutRoles > 0)
        issues.push(`${diag.usersWithoutRoles} active user(s) without role assignments`);
    if (diag.expiredRoleAssignments > 0)
        issues.push(`${diag.expiredRoleAssignments} expired role assignment(s) still active`);
    const maxScore = 100;
    const penalty = issues.length * 10;
    const score = Math.max(0, maxScore - penalty);
    return { healthy: issues.length === 0, score, issues };
}
//# sourceMappingURL=dauth-diagnostics.service.js.map
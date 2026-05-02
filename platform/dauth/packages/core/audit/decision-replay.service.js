"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayDecision = replayDecision;
/**
 * Decision replay — re-evaluates a historical decision against current
 * policy/model versions and produces a diff. Powers the compliance answer
 * "would this decision come out the same today?".
 *
 * Usage:
 *   const r = await replayDecision({ tenantId, decisionId });
 *   if (!r.identical) logger.warn('policy drift for', r.action);
 *
 * Implementation:
 *   1. Load the ledger row by id (or correlationId).
 *   2. Reconstruct `AccessDecisionContext` from the stored fields + record_context.
 *   3. Run `evaluateAccess` with `dryRun: true` — no ledger write.
 *   4. Diff the current verdict against the stored one.
 */
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
const decision_engine_1 = require("../access/decision-engine");
const dauth_config_1 = require("../dauth.config");
async function replayDecision(input) {
    if (!dauth_config_1.DAUTH_CONFIG.accessReplay.enabled) {
        throw new Error('[DAuth:Replay] disabled via DAUTH_ACCESS_REPLAY_ENABLED=false');
    }
    if (!input.decisionId && !input.correlationId) {
        throw new Error('[DAuth:Replay] decisionId or correlationId is required');
    }
    const schema = (0, db_1.tenantSchema)(input.tenantId);
    const row = await (0, db_1.safeQuery)(`SELECT id, user_id, permission_code, module_code, decision, reason,
            matched_role, matched_scope_type, authority_level, correlation_id,
            record_context, created_at
     FROM "${schema}".authz_decision_log
     WHERE ${input.decisionId ? 'id = $1' : 'correlation_id = $1'}
     ORDER BY created_at DESC
     LIMIT 1`, [input.decisionId ?? input.correlationId]);
    if (row.rows.length === 0) {
        return { found: false };
    }
    const r = row.rows[0];
    const ctxRec = (r.record_context ?? {});
    const ctx = {
        userId: r.user_id,
        tenantId: input.tenantId,
        role: r.matched_role ?? '',
        roles: Array.isArray(ctxRec.roles)
            ? ctxRec.roles
            : r.matched_role
                ? [r.matched_role]
                : [],
        permissionCode: r.permission_code,
        moduleCode: r.module_code ?? undefined,
        scopeType: r.matched_scope_type ?? undefined,
        authorityRequired: r.authority_level ?? undefined,
        ip: typeof ctxRec.ip === 'string' ? ctxRec.ip : undefined,
        path: typeof ctxRec.path === 'string' ? ctxRec.path : undefined,
        attributes: ctxRec.attributes ?? undefined,
        dryRun: true,
        correlationId: `replay:${r.id}`,
        isSuperAdmin: ctxRec.isSuperAdmin === true,
    };
    let replayed;
    try {
        replayed = await (0, decision_engine_1.evaluateAccess)(ctx);
    }
    catch (err) {
        observability_1.logger.warn('[DAuth:Replay] evaluateAccess threw during replay', {
            decisionId: r.id,
            error: err instanceof Error ? err.message : String(err),
        });
        return {
            found: true,
            decisionId: r.id,
            action: r.permission_code,
            originalDecision: r.decision,
        };
    }
    const delta = [];
    const originalAllowed = r.decision === 'allow';
    if (originalAllowed !== replayed.allowed)
        delta.push('decision');
    const originalReasonCode = typeof ctxRec.reasonCode === 'string' ? ctxRec.reasonCode : undefined;
    if (originalReasonCode !== replayed.reasonCode)
        delta.push('reasonCode');
    const originalPolicyVersion = typeof ctxRec.policyVersion === 'string'
        ? ctxRec.policyVersion
        : undefined;
    if (originalPolicyVersion !== replayed.policyVersion)
        delta.push('policyVersion');
    const originalModelVersion = typeof ctxRec.modelVersion === 'string'
        ? ctxRec.modelVersion
        : undefined;
    if (originalModelVersion !== replayed.modelVersion)
        delta.push('modelVersion');
    return {
        found: true,
        decisionId: r.id,
        action: r.permission_code,
        originalDecision: r.decision,
        originalReasonCode,
        originalPolicyVersion,
        originalModelVersion,
        replayedAllowed: replayed.allowed,
        replayedReasonCode: replayed.reasonCode,
        replayedPolicyVersion: replayed.policyVersion,
        replayedModelVersion: replayed.modelVersion,
        identical: delta.length === 0,
        delta,
    };
}
//# sourceMappingURL=decision-replay.service.js.map
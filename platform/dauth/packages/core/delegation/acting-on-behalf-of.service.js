"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveActingContext = resolveActingContext;
exports.evaluateDelegatedAccess = evaluateDelegatedAccess;
const db_1 = require("@dos/db");
const decision_engine_1 = require("../access/decision-engine");
const decision_log_service_1 = require("../audit/decision-log.service");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const actor_registry_1 = require("../actor/actor-registry");
const resilience_1 = require("@dos/platform-core/resilience");
async function resolveActingContext(tenantId, delegateId, grantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const delegateActor = await (0, actor_registry_1.getActor)(tenantId, delegateId);
    if (!delegateActor || !delegateActor.isActive)
        return null;
    const { rows } = await (0, db_1.safeQuery)(`SELECT grant_id, user_id, agent_id, scopes, expires_at
     FROM "${schema}".delegation_grants
     WHERE grant_id = $1 AND (agent_id = $2 OR user_id = $2)
       AND revoked_at IS NULL AND expires_at > NOW()
     LIMIT 1`, [grantId, delegateId]);
    if (!rows[0])
        return null;
    const r = rows[0];
    const principalActor = await (0, actor_registry_1.getActor)(tenantId, r.user_id);
    if (!principalActor || !principalActor.isActive)
        return null;
    return {
        delegateId,
        principalId: r.user_id,
        tenantId,
        grantId: r.grant_id,
        scopes: r.scopes ?? [],
        expiresAt: r.expires_at?.toISOString?.() ?? '',
    };
}
async function evaluateDelegatedAccess(ctx, permissionCode, moduleCode) {
    const modulePrefix = permissionCode.split('.')[0];
    const scopeMatch = ctx.scopes.some(s => modulePrefix.includes(s) || s === '*');
    if (!scopeMatch) {
        await (0, decision_log_service_1.logAuthDecision)(ctx.tenantId, {
            userId: ctx.delegateId,
            permissionCode,
            decision: 'deny',
            reason: 'delegation_scope_mismatch',
            context: { grantId: ctx.grantId, principalId: ctx.principalId },
        });
        return { allowed: false, reason: 'delegation_scope_mismatch' };
    }
    const decision = await (0, decision_engine_1.evaluateAccess)({
        userId: ctx.principalId,
        tenantId: ctx.tenantId,
        role: '',
        roles: [],
        isSuperAdmin: false,
        permissionCode,
        moduleCode,
    });
    if (!decision.allowed) {
        return { allowed: false, reason: `principal_lacks_permission:${decision.reason}` };
    }
    await (0, publish_with_dsoc_1.publish)('dauth.delegation.action_executed', ctx.tenantId, {
        grantId: ctx.grantId,
        delegateId: ctx.delegateId,
        principalId: ctx.principalId,
        permissionCode,
        executedAt: new Date().toISOString(),
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return { allowed: true, reason: 'delegated_access_granted' };
}
//# sourceMappingURL=acting-on-behalf-of.service.js.map
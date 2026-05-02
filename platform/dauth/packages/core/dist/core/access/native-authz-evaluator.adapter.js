"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeAuthzEvaluator = void 0;
exports.installNativeAuthzEvaluator = installNativeAuthzEvaluator;
const dauth_shared_1 = require("@dos/dauth-shared");
const decision_engine_1 = require("./decision-engine");
class NativeAuthzEvaluator {
    name = 'dauth-native';
    async evaluate(ctx) {
        const decisionCtx = {
            userId: ctx.userId,
            tenantId: ctx.tenantId,
            role: ctx.role,
            roles: ctx.roles,
            isSuperAdmin: ctx.isSuperAdmin,
            permissionCode: ctx.permissionCode,
            moduleCode: ctx.moduleCode,
            scopeType: ctx.scopeType,
            scopeId: ctx.scopeId,
            authorityRequired: ctx.authorityRequired,
            lifecycleFromState: ctx.lifecycleFromState,
            lifecycleToState: ctx.lifecycleToState,
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            ownershipRequired: ctx.ownershipRequired,
            ip: ctx.ip,
            path: ctx.path,
            attributes: ctx.attributes,
            correlationId: ctx.correlationId,
            dryRun: ctx.dryRun,
        };
        const decision = await (0, decision_engine_1.evaluateAccess)(decisionCtx);
        // Translate AccessDecision → AuthzDecision (narrower middleware shape).
        // The pipeline already wrote to authz_decision_log unless dryRun.
        return {
            decision: decision.allowed
                ? 'allow'
                : decision.obligations?.requireDualApproval
                    ? 'pending_approval'
                    : decision.failedCheck === 'authority_check'
                        ? 'escalated'
                        : 'deny',
            reasonCode: decision.reasonCode ?? 'DAUTH_NATIVE',
            reason: decision.reason,
            matchedRoles: decision.matchedRole ? [decision.matchedRole] : undefined,
            matchedScopes: decision.matchedScopeType ? [decision.matchedScopeType] : undefined,
            correlationId: ctx.correlationId,
            engineResults: decision.engineResults,
            source: 'dauth-native',
        };
    }
}
exports.NativeAuthzEvaluator = NativeAuthzEvaluator;
/**
 * One-shot installer — call this from each service's bootstrap (typically in
 * `service-bootstrap.ts` right after `bootstrapDauth(...)`). Idempotent;
 * subsequent calls reseat the same instance.
 */
function installNativeAuthzEvaluator() {
    const evaluator = new NativeAuthzEvaluator();
    (0, dauth_shared_1.setAuthzEvaluator)(evaluator);
    return evaluator;
}
//# sourceMappingURL=native-authz-evaluator.adapter.js.map
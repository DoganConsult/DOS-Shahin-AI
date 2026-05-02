"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateCan = simulateCan;
exports.simulateRoleGrant = simulateRoleGrant;
/**
 * Policy simulator — dry-run `can()` without touching the decision ledger
 * or emitting side-effect events. Intended for the DAuth Admin Studio to
 * answer "if I grant this user role X, what will they be able to do?".
 *
 * Two entry points:
 *   - `simulateCan(input)` — one decision, returns full trace + reasons.
 *   - `simulateRoleGrant({ userId, tenantId, roles, actions })` —
 *     N decisions, one per action, with the given role set substituted in.
 *
 * Implementation approach: reuse `evaluateAccess` with `dryRun: true`. This
 * avoids duplicating the 14-step pipeline and guarantees simulations produce
 * the same verdicts as real calls.
 */
const node_crypto_1 = require("node:crypto");
const decision_engine_1 = require("../access/decision-engine");
const dauth_config_1 = require("../dauth.config");
async function simulateCan(input) {
    if (!dauth_config_1.DAUTH_CONFIG.policySimulation.enabled) {
        throw new Error('[DAuth:Simulator] disabled via DAUTH_POLICY_SIMULATION_ENABLED=false');
    }
    const decisionId = (0, node_crypto_1.randomUUID)();
    const attributes = { ...(input.attributes ?? {}) };
    if (input.resource) {
        attributes.resource = {
            type: input.resource.type,
            id: input.resource.id,
            tenantId: input.resource.tenantId ?? input.tenantId,
            createdBy: input.resource.createdBy,
            status: input.resource.status,
            ...(input.resource.attributes ?? {}),
        };
    }
    const ctx = {
        userId: input.userId,
        tenantId: input.tenantId,
        role: input.roles?.[0] ?? '',
        roles: input.roles,
        permissionCode: input.action,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        authorityRequired: input.authorityRequired,
        lifecycleFromState: input.lifecycleFromState,
        lifecycleToState: input.lifecycleToState,
        entityType: input.resource?.type,
        entityId: input.resource?.id,
        ownershipRequired: input.ownershipRequired,
        attributes,
        dryRun: true,
        correlationId: `sim:${decisionId}`,
    };
    const decision = await (0, decision_engine_1.evaluateAccess)(ctx);
    return {
        decisionId,
        allowed: decision.allowed,
        reasonCode: decision.reasonCode,
        reason: decision.reason,
        steps: decision.steps,
        engineResults: decision.engineResults,
        obligations: decision.obligations,
        policyVersion: decision.policyVersion,
        modelVersion: decision.modelVersion,
        wroteLedger: false,
    };
}
async function simulateRoleGrant(input) {
    const perAction = [];
    let allowed = 0;
    let denied = 0;
    for (const action of input.actions) {
        const r = await simulateCan({
            tenantId: input.tenantId,
            userId: input.userId,
            action,
            roles: input.roles,
        });
        perAction.push({
            action,
            allowed: r.allowed,
            reasonCode: r.reasonCode,
            reason: r.reason,
        });
        if (r.allowed)
            allowed++;
        else
            denied++;
    }
    return {
        tenantId: input.tenantId,
        userId: input.userId,
        roles: input.roles,
        perAction,
        summary: { allowed, denied },
    };
}
//# sourceMappingURL=policy-simulator.service.js.map
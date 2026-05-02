"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.can = can;
/**
 * DAuth unified `can()` API.
 *
 * Single high-level entrypoint for authorization decisions. Wraps the 14-step
 * `evaluateAccess` pipeline so callers do not have to assemble an
 * `AccessDecisionContext` by hand, and so the shape of the decision response
 * matches what the decision ledger and frontend obligation handlers expect.
 *
 * Callers pass a natural `{ principal, action, resource, context }` envelope.
 * The service translates it into the internal pipeline context, runs
 * `evaluateAccess`, and returns a caller-friendly verdict plus a decision id
 * that can be handed to `diagnostics.explainDecision` for debugging.
 */
const node_crypto_1 = require("node:crypto");
const decision_engine_1 = require("./decision-engine");
const reason_codes_1 = require("../contracts/reason-codes");
/**
 * Evaluate whether a principal can perform an action on a resource.
 *
 * This is the single entrypoint callers should use — everything else in
 * `access/*` is either (a) a primitive the engine builds on or (b) a legacy
 * API kept for backward compatibility while existing call sites migrate.
 */
async function can(input, opts = {}) {
    const correlationId = input.correlationId ?? (0, node_crypto_1.randomUUID)();
    const decisionId = (0, node_crypto_1.randomUUID)();
    // Merge resource + free-form context into a single attributes map so
    // external PDPs (Cerbos/OPA) receive everything under one key.
    const attributes = {
        ...(input.context ?? {}),
    };
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
    const pipelineCtx = {
        userId: input.userId,
        tenantId: input.tenantId,
        role: input.role ?? (input.roles?.[0] ?? ''),
        roles: input.roles,
        isSuperAdmin: input.isSuperAdmin,
        permissionCode: input.action,
        moduleCode: deriveModule(input.action),
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        authorityRequired: input.authorityRequired,
        lifecycleFromState: input.lifecycleFromState,
        lifecycleToState: input.lifecycleToState,
        entityType: input.resource?.type,
        entityId: input.resource?.id,
        ownershipRequired: input.ownershipRequired,
        ip: pickString(input.context, 'ip'),
        path: pickString(input.context, 'path'),
        attributes,
        correlationId,
        dryRun: input.dryRun,
    };
    const decision = await (0, decision_engine_1.evaluateAccess)(pipelineCtx);
    const reasonCodes = [];
    if (decision.reasonCode)
        reasonCodes.push(decision.reasonCode);
    if (reasonCodes.length === 0) {
        reasonCodes.push(decision.allowed
            ? reason_codes_1.DAUTH_REASON_CODES.ALLOW_ALL_CHECKS_PASSED
            : reason_codes_1.DAUTH_REASON_CODES.INTERNAL_UNKNOWN);
    }
    return {
        allowed: decision.allowed,
        decisionId,
        reasonCodes,
        reason: decision.reason,
        obligations: decision.obligations ?? {},
        policyVersion: decision.policyVersion,
        modelVersion: decision.modelVersion,
        engineResults: decision.engineResults,
        ...(opts.verbose ? { steps: decision.steps } : {}),
    };
}
function deriveModule(action) {
    const dot = action.indexOf('.');
    if (dot > 0)
        return action.slice(0, dot);
    const colon = action.indexOf(':');
    if (colon > 0)
        return action.slice(0, colon);
    return action;
}
function pickString(ctx, key) {
    const v = ctx?.[key];
    return typeof v === 'string' ? v : undefined;
}
//# sourceMappingURL=can.service.js.map
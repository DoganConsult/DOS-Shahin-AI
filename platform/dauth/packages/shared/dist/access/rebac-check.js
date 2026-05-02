"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRebacAndLog = checkRebacAndLog;
const decision_ledger_1 = require("../audit/decision-ledger");
const rebac_factory_1 = require("../rebac-factory");
/** Relations whose OpenFGA semantics already include `but not owner` style
 * SoD — we still re-check at the SoD engine because OpenFGA only knows the
 * tuple graph, not waiver lifecycle, delegations, or agent-aware policies. */
const SOD_BOUND_RELATIONS = new Set([
    'can_approve',
    'can_sign_off',
    'can_publish',
    'can_close',
]);
async function checkRebacAndLog(sql, input) {
    const { primary, shadow } = (0, rebac_factory_1.getRebacAdapter)();
    const user = `user:${input.userId}`;
    const req = { user, relation: input.relation, object: input.object };
    // Run both verifiers in parallel when shadow is configured.
    const [primaryResult, shadowResult] = await Promise.all([
        primary.check(req),
        shadow ? shadow.check(req) : Promise.resolve(undefined),
    ]);
    const divergence = !!shadowResult && shadowResult.allowed !== primaryResult.allowed;
    // Compose engine_results for the ledger. Always include primary; shadow
    // sibling is optional.
    const engineResults = {};
    engineResults[primaryResult.source] = {
        allowed: primaryResult.allowed,
        modelVersion: primaryResult.modelVersion,
        latencyMs: primaryResult.latencyMs,
        trace: primaryResult.trace,
        role: 'primary',
    };
    if (shadowResult) {
        // Keyed by source (native / openfga / etc) so both can coexist when
        // primary and shadow have the same name from an odd config.
        const shadowKey = shadowResult.source === primaryResult.source
            ? `${shadowResult.source}_shadow`
            : shadowResult.source;
        engineResults[shadowKey] = {
            allowed: shadowResult.allowed,
            modelVersion: shadowResult.modelVersion,
            latencyMs: shadowResult.latencyMs,
            trace: shadowResult.trace,
            role: 'shadow',
            divergence,
        };
    }
    // ── SoD pairing for SoD-bound relations ─────────────────────────────
    // Only run when (a) caller supplied a guard AND (b) the relation is one
    // we know carries SoD semantics AND (c) OpenFGA said allow. A deny
    // already blocks; SoD can only deny further, never grant.
    let sodResult;
    let finalAllowed = primaryResult.allowed;
    let sodReason;
    let sodReasonCode;
    if (input.sodGuard && primaryResult.allowed && SOD_BOUND_RELATIONS.has(input.relation)) {
        try {
            sodResult = await input.sodGuard({
                tenantId: input.tenantId,
                userId: input.userId,
                object: input.object,
                relation: input.relation,
            });
            engineResults['sod'] = {
                allowed: sodResult.allowed,
                decision: sodResult.allowed ? 'allow' : 'deny',
                outcome: sodResult.outcome,
                ruleCode: sodResult.ruleCode,
                waiverId: sodResult.waiverId,
                reason: sodResult.reason,
                role: 'guard',
            };
            if (!sodResult.allowed) {
                finalAllowed = false;
                sodReason = sodResult.reason ?? `SoD ${sodResult.outcome}`;
                sodReasonCode =
                    sodResult.outcome === 'block'
                        ? 'DAUTH_DENY_SOD_BLOCK'
                        : 'DAUTH_DENY_SOD_ESCALATE';
            }
        }
        catch (err) {
            engineResults['sod'] = {
                decision: 'error',
                reason: err instanceof Error ? err.message : String(err),
                role: 'guard',
            };
            // Fail-closed when DAUTH_SOD_FAIL_CLOSED=true.
            const failClosed = (process.env.DAUTH_SOD_FAIL_CLOSED || '').toLowerCase();
            if (failClosed === '1' || failClosed === 'true') {
                finalAllowed = false;
                sodReasonCode = 'DAUTH_DENY_SOD_UNAVAILABLE';
                sodReason = 'SoD evaluation failed (fail-closed)';
            }
        }
    }
    const baseReasonCode = finalAllowed
        ? primaryResult.source === 'openfga'
            ? 'DAUTH_ALLOW_REBAC_OPENFGA'
            : 'DAUTH_ALLOW_REBAC_NATIVE'
        : primaryResult.source === 'openfga'
            ? 'DAUTH_DENY_REBAC_OPENFGA'
            : 'DAUTH_DENY_REBAC_NATIVE';
    const ledgerInput = {
        tenantId: input.tenantId,
        userId: input.userId,
        action: input.action ?? `rebac.${input.relation}`,
        entityType: input.object.split(':')[0] || null,
        entityId: input.object.split(':')[1] || null,
        allowed: finalAllowed,
        reason: sodReason ?? primaryResult.trace ?? (finalAllowed ? 'rebac allow' : 'rebac deny'),
        reasonCode: sodReasonCode ?? baseReasonCode,
        reasonCodes: sodReasonCode ? [baseReasonCode, sodReasonCode] : [],
        modelVersion: primaryResult.modelVersion,
        engineResults,
        correlationId: input.correlationId,
        requestPath: input.requestPath,
        requestMethod: input.requestMethod,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        sessionId: input.sessionId,
        detail: { rebac: req, divergence: !!divergence, sodApplied: !!sodResult },
    };
    const decisionId = await (0, decision_ledger_1.writeAuthDecision)(sql, ledgerInput);
    return {
        allowed: finalAllowed,
        decisionId,
        primary: primaryResult,
        shadow: shadowResult,
        divergence: divergence || undefined,
        sod: sodResult,
    };
}
//# sourceMappingURL=rebac-check.js.map
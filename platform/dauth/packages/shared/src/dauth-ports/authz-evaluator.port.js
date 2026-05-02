"use strict";
/**
 * Authorization evaluator port — single decision-point contract for
 * `requirePermission` / `requireDauth` middleware.
 *
 * Why this exists
 * ───────────────
 * Until Phase C of the 5-brain cleanup, `requirePermission` in
 * canonical-middleware.ts only inspected JWT claims (`user.permissions`,
 * `user.roles`) with wildcard match. The full 14-step DAuth pipeline at
 * `@dos/dauth-core/access/decision-engine.ts:evaluateAccess` was orphaned
 * from the request hot path — membership, ABAC, SoD, ReBAC, delegation,
 * lifecycle, and ledger writes were all bypassed.
 *
 * Direct import from dauth-shared into dauth-core is forbidden (dauth-core
 * already depends on dauth-shared). This port inverts the wiring: shared
 * declares the contract; core registers an adapter at bootstrap that
 * delegates to `evaluateAccess`. Services that load dauth-core get the
 * full pipeline; services that don't get a clearly-marked legacy fallback.
 *
 * Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyClaimAuthzEvaluator = void 0;
exports.setAuthzEvaluator = setAuthzEvaluator;
exports.getAuthzEvaluator = getAuthzEvaluator;
exports.resetAuthzEvaluator = resetAuthzEvaluator;
// ── Legacy fallback ──────────────────────────────────────────────────
/**
 * Default evaluator used when no DAuth core bootstrap has registered a
 * native evaluator. Mirrors the original JWT-claim wildcard logic from
 * canonical-middleware.ts to preserve behavior in services that don't
 * load dauth-core.
 *
 * NOTE: this evaluator does NOT enforce membership, tenant-active,
 * ABAC scope, SoD, ReBAC, delegation, or lifecycle. It does NOT write
 * to the decision ledger. Services that require those guarantees MUST
 * load dauth-core and call `bootstrapDauth({ authzEvaluator: ... })`.
 */
class LegacyClaimAuthzEvaluator {
    name = 'legacy-claim';
    async evaluate(ctx) {
        if (ctx.isSuperAdmin) {
            return {
                decision: 'allow', reasonCode: 'LEGACY_SUPER_ADMIN', source: 'legacy-claim',
                correlationId: ctx.correlationId,
            };
        }
        const claimedRoles = new Set([
            ...(ctx.roles ?? []),
            ctx.role || '',
            ...(ctx.attributes?.permissions ?? []),
        ].filter(Boolean));
        if (claimedRoles.has('*') || claimedRoles.has(ctx.permissionCode)) {
            return {
                decision: 'allow', reasonCode: 'LEGACY_CLAIM_MATCH', source: 'legacy-claim',
                correlationId: ctx.correlationId,
                matchedRoles: [...claimedRoles].filter((r) => r === ctx.permissionCode || r === '*'),
            };
        }
        for (const r of claimedRoles) {
            if (r.endsWith('.*') && ctx.permissionCode.startsWith(r.slice(0, -1))) {
                return {
                    decision: 'allow', reasonCode: 'LEGACY_CLAIM_WILDCARD', source: 'legacy-claim',
                    correlationId: ctx.correlationId, matchedRoles: [r],
                };
            }
        }
        return {
            decision: 'deny', reasonCode: 'LEGACY_NO_MATCH',
            reason: `Insufficient permissions. Required: ${ctx.permissionCode}`,
            source: 'legacy-claim', correlationId: ctx.correlationId,
        };
    }
}
exports.LegacyClaimAuthzEvaluator = LegacyClaimAuthzEvaluator;
// ── Global registry ──────────────────────────────────────────────────
// Use globalThis to survive pnpm dual-instance module resolution
// (same pattern used by setAuthMiddleware/getAuthMiddleware in middleware.ts).
const GLOBAL_AUTHZ_KEY = Symbol.for('__dos_authz_evaluator__');
let _defaultEvaluator = null;
function setAuthzEvaluator(evaluator) {
    globalThis[GLOBAL_AUTHZ_KEY] = evaluator;
}
function getAuthzEvaluator() {
    const reg = globalThis[GLOBAL_AUTHZ_KEY];
    if (reg)
        return reg;
    if (!_defaultEvaluator)
        _defaultEvaluator = new LegacyClaimAuthzEvaluator();
    return _defaultEvaluator;
}
/** Test helper — clear the registered evaluator. */
function resetAuthzEvaluator() {
    delete globalThis[GLOBAL_AUTHZ_KEY];
    _defaultEvaluator = null;
}
//# sourceMappingURL=authz-evaluator.port.js.map
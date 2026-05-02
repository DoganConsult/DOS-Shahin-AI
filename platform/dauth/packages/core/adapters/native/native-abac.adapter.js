"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nativeAbacAdapter = exports.NativeAbacAdapter = void 0;
/**
 * Native ABAC adapter — delegates to the already-internal policy checks
 * (SoD engine, lifecycle-auth, tenant security policy). Returns `abstain`
 * when nothing in the native catalog matches the request, so a shadow-mode
 * Cerbos comparison does not treat "no native rule" as "native said allow".
 *
 * This adapter is the fallback whenever Cerbos is unavailable or
 * `DAUTH_CERBOS_ENFORCE=false`. The decision engine still runs the native
 * pipeline either way — this adapter exists so we can express "native" as
 * a port implementation and compare verdicts uniformly.
 */
const sod_engine_1 = require("../../sod/sod-engine");
const lifecycle_auth_service_1 = require("../../lifecycle-auth/lifecycle-auth.service");
const reason_codes_1 = require("../../contracts/reason-codes");
const NATIVE_POLICY_VERSION = 'dauth-native@14-step';
class NativeAbacAdapter {
    name = 'native';
    async evaluate(request) {
        const started = Date.now();
        // SoD — runs for any action where multiple roles are present.
        if (request.principal.roles.length > 1) {
            const sod = await (0, sod_engine_1.evaluateModuleSod)(request.principal.tenantId, request.resource.attributes?.moduleCode ?? deriveModule(request.action), [request.action]);
            if (!sod.passed) {
                const firstViolation = sod.violations?.[0];
                const firstModuleViolation = sod.moduleViolations?.[0];
                const reason = firstViolation
                    ? `SoD: ${firstViolation.roleA} vs ${firstViolation.roleB} (${firstViolation.conflictLevel})`
                    : firstModuleViolation
                        ? `SoD: ${firstModuleViolation.actionA} vs ${firstModuleViolation.actionB} (${firstModuleViolation.conflictType})`
                        : 'SoD conflict';
                return {
                    decision: 'deny',
                    reasonCode: reason_codes_1.DAUTH_REASON_CODES.DENY_SOD_CONFLICT,
                    reason,
                    policyVersion: NATIVE_POLICY_VERSION,
                    source: 'native',
                    latencyMs: Date.now() - started,
                };
            }
        }
        // Lifecycle transition — only when the request context carries one.
        const from = request.context?.lifecycleFromState;
        const to = request.context?.lifecycleToState;
        const entityType = request.resource.type;
        const entityId = request.resource.id;
        if (from && to && entityType && entityId) {
            const lc = await (0, lifecycle_auth_service_1.evaluateLifecycleTransition)(request.principal.tenantId, request.principal.userId, {
                moduleCode: deriveModule(request.action),
                entityType,
                entityId,
                fromState: from,
                toState: to,
                permissionCode: request.action,
                userRoles: request.principal.roles,
            });
            if (!lc.allowed) {
                return {
                    decision: 'deny',
                    reasonCode: reason_codes_1.DAUTH_REASON_CODES.DENY_LIFECYCLE_TRANSITION,
                    reason: lc.reason ?? 'Lifecycle transition not allowed',
                    policyVersion: NATIVE_POLICY_VERSION,
                    source: 'native',
                    latencyMs: Date.now() - started,
                };
            }
        }
        // Nothing in the native catalog objected — abstain so the decision
        // engine's other steps stay authoritative.
        return {
            decision: 'abstain',
            reasonCode: reason_codes_1.DAUTH_REASON_CODES.ABSTAIN_NO_POLICY,
            reason: 'No native ABAC rule matched',
            policyVersion: NATIVE_POLICY_VERSION,
            source: 'native',
            latencyMs: Date.now() - started,
        };
    }
    async currentPolicyVersion() {
        return NATIVE_POLICY_VERSION;
    }
}
exports.NativeAbacAdapter = NativeAbacAdapter;
function deriveModule(action) {
    const dot = action.indexOf('.');
    if (dot > 0)
        return action.slice(0, dot);
    const colon = action.indexOf(':');
    if (colon > 0)
        return action.slice(0, colon);
    return action;
}
exports.nativeAbacAdapter = new NativeAbacAdapter();
//# sourceMappingURL=native-abac.adapter.js.map
"use strict";
/**
 * ABAC port — attribute-based policy evaluation under DAuth.
 *
 * Source: platform/core/current-source/dauth/ports/abac.port.ts (clone).
 * Why here: `@dos/auth` is the canonical workspace package; lifting the port
 * into the package makes Cerbos addressable from every service without a
 * tsconfig path shuffle to platform/core.
 *
 * Decision engine (platform/core) still owns the full native ABAC pipeline
 * (SoD + lifecycle-auth). This port exists so Cerbos can participate as
 * primary or shadow under the same uniform verdict shape.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstainAbacAdapter = void 0;
/**
 * Default pass-through native adapter. Always abstains so that a shadow
 * Cerbos verdict isn't compared against a synthetic "allow" from a stub.
 *
 * Services that want real native ABAC (SoD + lifecycle) should register
 * their own adapter via `initAbacFactory({ native: <adapter> })` — the
 * platform/core `NativeAbacAdapter` is the canonical implementation.
 */
class AbstainAbacAdapter {
    name = 'native';
    async evaluate(_request) {
        return {
            decision: 'abstain',
            reasonCode: 'DAUTH_ABSTAIN_NO_POLICY',
            reason: 'No native ABAC adapter registered',
            policyVersion: 'dauth-abstain@1',
            source: 'native',
            latencyMs: 0,
        };
    }
    async currentPolicyVersion() {
        return 'dauth-abstain@1';
    }
}
exports.AbstainAbacAdapter = AbstainAbacAdapter;
//# sourceMappingURL=abac.port.js.map
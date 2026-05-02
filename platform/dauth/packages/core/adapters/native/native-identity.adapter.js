"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nativeIdentityAdapter = exports.validateTenantMembership = exports.NativeIdentityAdapter = void 0;
/**
 * Native IdentityAdapter — the default. Treats the DAuth `users` table as
 * the source of truth. `linkPrincipal` resolves a user by email; auto-
 * provisioning is NOT the adapter's job — that flows through invitation /
 * onboarding and must create the user with a tenant and role set. If the
 * email is unknown, `linkPrincipal` returns `{ userId: '', created: false }`
 * and the caller (typically the login orchestrator) is expected to reject
 * the login or trigger an invitation flow.
 */
const identity_service_1 = require("../../identity/identity.service");
Object.defineProperty(exports, "validateTenantMembership", { enumerable: true, get: function () { return identity_service_1.validateTenantMembership; } });
class NativeIdentityAdapter {
    name = 'native';
    async linkPrincipal(principal) {
        const existing = await (0, identity_service_1.resolvePrincipalByEmail)(principal.email);
        if (!existing) {
            return { userId: '', created: false, tenantMemberships: [] };
        }
        return {
            userId: existing.userId,
            created: false,
            tenantMemberships: [],
        };
    }
    async syncAll(_tenantId) {
        return {
            usersProcessed: 0,
            created: 0,
            updated: 0,
            deactivated: 0,
            errors: [],
        };
    }
}
exports.NativeIdentityAdapter = NativeIdentityAdapter;
exports.nativeIdentityAdapter = new NativeIdentityAdapter();
//# sourceMappingURL=native-identity.adapter.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIdentityAdapters = getIdentityAdapters;
exports.resetIdentityFactory = resetIdentityFactory;
/**
 * Identity adapter factory — returns { primary, shadow } based on flags.
 * Mirrors the token-verifier factory so caller code can treat both the same.
 *
 * Default: native only. When Keycloak is shadowed/enforced, the Keycloak
 * adapter is constructed and either placed as primary (enforce) or shadow
 * (shadow-only).
 */
const observability_1 = require("@dos/platform-core/observability");
const dauth_config_1 = require("../dauth.config");
const native_identity_adapter_1 = require("./native/native-identity.adapter");
const keycloak_identity_adapter_1 = require("./keycloak/keycloak-identity.adapter");
let cached = null;
function getIdentityAdapters(opts = {}) {
    if (cached)
        return cached;
    const native = new native_identity_adapter_1.NativeIdentityAdapter();
    let keycloak = null;
    if (dauth_config_1.DAUTH_CONFIG.keycloak.shadow || dauth_config_1.DAUTH_CONFIG.keycloak.enforce) {
        try {
            if (!opts.connectionIdForTenant) {
                throw new Error('connectionIdForTenant is required when Keycloak is shadowed/enforced');
            }
            keycloak = new keycloak_identity_adapter_1.KeycloakIdentityAdapter({
                connectionIdForTenant: opts.connectionIdForTenant,
                ...opts.keycloakOptions,
            });
        }
        catch (err) {
            observability_1.logger.error('[DAuth:Identity] Keycloak adapter unavailable — falling back to native', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    if (dauth_config_1.DAUTH_CONFIG.keycloak.enforce && keycloak) {
        cached = {
            primary: keycloak,
            shadow: dauth_config_1.DAUTH_CONFIG.keycloak.shadow ? native : undefined,
        };
    }
    else if (dauth_config_1.DAUTH_CONFIG.keycloak.shadow && keycloak) {
        cached = { primary: native, shadow: keycloak };
    }
    else {
        cached = { primary: native };
    }
    return cached;
}
/** Reset factory cache — for tests and hot config reloads. */
function resetIdentityFactory() {
    cached = null;
}
//# sourceMappingURL=identity.factory.js.map
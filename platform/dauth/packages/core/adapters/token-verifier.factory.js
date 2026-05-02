"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenVerifiers = getTokenVerifiers;
exports.resetTokenVerifierFactory = resetTokenVerifierFactory;
/**
 * TokenVerifier factory — resolves the correct verifier based on
 * `DAUTH_CONFIG.keycloak.shadow` / `.enforce` flags.
 *
 * Behavior:
 * - enforce + shadow OFF:       native only
 * - enforce OFF + shadow ON:    native authoritative, keycloak runs in parallel
 * - enforce ON  + shadow ON:    keycloak authoritative, native runs in parallel
 * - enforce ON  + shadow OFF:   keycloak authoritative, no shadow comparison
 *
 * The caller invokes `primary` for the authoritative verdict. When a shadow
 * verifier is configured, the caller is expected to invoke `shadow` in
 * parallel and record the delta on the decision ledger.
 */
const observability_1 = require("@dos/platform-core/observability");
const dauth_config_1 = require("../dauth.config");
const native_token_verifier_1 = require("./native/native-token-verifier");
const keycloak_token_verifier_1 = require("./keycloak/keycloak-token-verifier");
let cachedPrimary = null;
let cachedShadow;
function getTokenVerifiers() {
    if (!cachedPrimary) {
        const native = new native_token_verifier_1.NativeTokenVerifier();
        let keycloak = null;
        if (dauth_config_1.DAUTH_CONFIG.keycloak.shadow || dauth_config_1.DAUTH_CONFIG.keycloak.enforce) {
            try {
                keycloak = new keycloak_token_verifier_1.KeycloakTokenVerifier();
            }
            catch (err) {
                // Missing config — log and leave Keycloak disabled. Callers fall back
                // to native. This keeps boot from crashing when the Keycloak config
                // is still being provisioned.
                observability_1.logger.error('[DAuth:TokenVerifier] Keycloak verifier unavailable', {
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
        if (dauth_config_1.DAUTH_CONFIG.keycloak.enforce && keycloak) {
            cachedPrimary = keycloak;
            cachedShadow = dauth_config_1.DAUTH_CONFIG.keycloak.shadow ? native : undefined;
        }
        else if (dauth_config_1.DAUTH_CONFIG.keycloak.shadow && keycloak) {
            cachedPrimary = native;
            cachedShadow = keycloak;
        }
        else {
            cachedPrimary = native;
            cachedShadow = undefined;
        }
    }
    return { primary: cachedPrimary, shadow: cachedShadow ?? undefined };
}
/** Reset factory cache — for tests and hot config reloads. */
function resetTokenVerifierFactory() {
    cachedPrimary = null;
    cachedShadow = undefined;
}
//# sourceMappingURL=token-verifier.factory.js.map
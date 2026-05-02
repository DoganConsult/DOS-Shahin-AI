"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTokenVerifierFactory = initTokenVerifierFactory;
exports.registerKeycloakVerifier = registerKeycloakVerifier;
exports.getTokenVerifier = getTokenVerifier;
exports.resetTokenVerifierFactory = resetTokenVerifierFactory;
const native_token_verifier_1 = require("./adapters/native-token-verifier");
const state = {
    native: null,
    keycloak: null,
    cached: null,
};
function initTokenVerifierFactory(opts) {
    // TS note: we store one shared state keyed on MinimalAuthPayload; a per-P
    // typed cast at the boundary is safe because the factory never inspects
    // the extra fields.
    state.native = new native_token_verifier_1.NativeTokenVerifier(opts.nativeVerify);
    state.keycloak = null;
    state.cached = null;
}
function registerKeycloakVerifier(verifier) {
    state.keycloak = verifier;
    state.cached = null;
}
function getTokenVerifier() {
    if (state.cached)
        return state.cached;
    if (!state.native) {
        throw new Error('[@dos/auth] initTokenVerifierFactory() must be called before getTokenVerifier(). ' +
            'Wire it at bootstrap with the project\'s native verify function.');
    }
    const shadow = readBool('DAUTH_KEYCLOAK_SHADOW');
    const enforce = readBool('DAUTH_KEYCLOAK_ENFORCE');
    let stack;
    if (enforce && state.keycloak) {
        stack = { primary: state.keycloak, shadow: shadow ? state.native : undefined };
    }
    else if (shadow && state.keycloak) {
        stack = { primary: state.native, shadow: state.keycloak };
    }
    else {
        // No Keycloak adapter, or flags off — native only. No external engine is
        // invoked, no JWKS fetch is attempted. This is the rollback state.
        stack = { primary: state.native };
    }
    state.cached = stack;
    return stack;
}
function resetTokenVerifierFactory() {
    state.native = null;
    state.keycloak = null;
    state.cached = null;
}
function readBool(key) {
    const v = process.env[key];
    if (!v)
        return false;
    return v === '1' || v.toLowerCase() === 'true';
}
//# sourceMappingURL=token-verifier-factory.js.map
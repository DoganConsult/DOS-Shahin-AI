"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expiresMs = exports.decodeAccessTokenClaims = exports.TENANT_SERVICE_URL = exports.verifySession = exports.sessionJwks = exports.KC_AUDIENCE = exports.KC_JWKS_URL = exports.KC_ISSUER = exports.DEFAULT_LANDING = exports.SECURE = exports.SAMESITE = exports.COOKIE_DOMAIN = exports.COOKIE_STATE = exports.COOKIE_REFRESH = exports.COOKIE_ACCESS = exports.REDIRECT_URI = exports.CLIENT_SECRET = exports.CLIENT_ID = exports.KC_REALM = exports.KC_INTERNAL = exports.KC_BASE = void 0;
const jose_1 = require("jose");
const required = (k) => {
    const v = process.env[k];
    if (!v)
        throw new Error(`Required environment variable ${k} is not set`);
    return v;
};
exports.KC_BASE = required('KEYCLOAK_BASE_URL');
exports.KC_INTERNAL = process.env.KEYCLOAK_INTERNAL_BASE_URL || exports.KC_BASE;
exports.KC_REALM = required('KEYCLOAK_REALM');
exports.CLIENT_ID = required('KEYCLOAK_OIDC_CLIENT_ID');
exports.CLIENT_SECRET = required('KEYCLOAK_OIDC_CLIENT_SECRET');
exports.REDIRECT_URI = required('KEYCLOAK_OIDC_REDIRECT_URI');
exports.COOKIE_ACCESS = process.env.COOKIE_ACCESS_NAME || 'dos_access_token';
exports.COOKIE_REFRESH = process.env.COOKIE_REFRESH_NAME || 'dauth_rt';
exports.COOKIE_STATE = process.env.COOKIE_OIDC_STATE || 'dos_oidc_state';
exports.COOKIE_DOMAIN = required('COOKIE_DOMAIN');
exports.SAMESITE = process.env.COOKIE_SAMESITE || 'lax';
exports.SECURE = (process.env.COOKIE_SECURE || 'true') === 'true';
exports.DEFAULT_LANDING = process.env.OIDC_DEFAULT_RETURN_URL || '/workspace-home';
exports.KC_ISSUER = process.env.KEYCLOAK_ISSUER || `${exports.KC_BASE}/realms/${exports.KC_REALM}`;
exports.KC_JWKS_URL = process.env.KEYCLOAK_JWKS_URL || `${exports.KC_INTERNAL}/realms/${exports.KC_REALM}/protocol/openid-connect/certs`;
exports.KC_AUDIENCE = process.env.KEYCLOAK_AUDIENCE || exports.CLIENT_ID;
exports.sessionJwks = (0, jose_1.createRemoteJWKSet)(new URL(exports.KC_JWKS_URL), {
    cooldownDuration: Number(process.env.KEYCLOAK_JWKS_CACHE_TTL_MS || 600_000),
});
async function verifySession(token) {
    const { payload } = await (0, jose_1.jwtVerify)(token, exports.sessionJwks, {
        issuer: exports.KC_ISSUER,
        audience: exports.KC_AUDIENCE,
    });
    return payload;
}
exports.verifySession = verifySession;
exports.TENANT_SERVICE_URL = process.env.TENANT_SERVICE_URL || 'http://127.0.0.1:4002';
function decodeAccessTokenClaims(token) {
    try {
        const part = token.split('.')[1];
        const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        const claims = JSON.parse(json);
        return {
            sub: typeof claims.sub === 'string' ? claims.sub : undefined,
            email: typeof claims.email === 'string' ? claims.email : undefined,
            name: typeof claims.name === 'string'
                ? claims.name
                : (typeof claims.preferred_username === 'string' ? claims.preferred_username : undefined),
        };
    }
    catch {
        return {};
    }
}
exports.decodeAccessTokenClaims = decodeAccessTokenClaims;
function expiresMs(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error(`Keycloak token response missing/invalid ${label}`);
    }
    return value * 1000;
}
exports.expiresMs = expiresMs;
//# sourceMappingURL=session.js.map
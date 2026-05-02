"use strict";
/**
 * Auth host policy — single source of truth for which hostnames may initiate
 * authentication flows, what surface they represent, and whether registration
 * is permitted from each.
 *
 * Canonical same-domain topology (factory reset):
 *   - shahin-ai.com        → product + admin login + registration + workspace
 *   - www.shahin-ai.com    → same as product (alias)
 *   - any other host       → unsupported
 *
 * Keycloak is mounted at https://shahin-ai.com/login (KC_HTTP_RELATIVE_PATH=/login).
 * The browser/user only ever sees shahin-ai.com. The realm `dogan` is a single
 * internal identity source; admin and product share it. There is no
 * auth.shahin-ai.com, no auth.dogan-ai.com, no admin.dogan-ai.com.
 *
 * Consumers (CSP, CORS, WS allowlist, OIDC /start handler) MUST import from here
 * instead of hardcoding hosts. See docs/auth-host-split.md.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_HOSTS = exports.ALL_IDP_HOSTS = exports.IDP_ISSUER_HOST = exports.ADMIN_HOST = exports.PRODUCT_HOSTS = void 0;
exports.idpHostFor = idpHostFor;
exports.idpBaseUrlFor = idpBaseUrlFor;
exports.normalizeHost = normalizeHost;
exports.getAuthSurface = getAuthSurface;
exports.isAllowedFrontendHost = isAllowedFrontendHost;
exports.isRegistrationAllowed = isRegistrationAllowed;
exports.isLoginAllowed = isLoginAllowed;
exports.productBaseUrls = productBaseUrls;
exports.adminBaseUrl = adminBaseUrl;
exports.allAuthOrigins = allAuthOrigins;
exports.corsAllowedOrigins = corsAllowedOrigins;
exports.PRODUCT_HOSTS = new Set([
    'shahin-ai.com',
    'www.shahin-ai.com',
]);
/**
 * Admin surface folds into the canonical shahin-ai.com host. Kept as a named
 * export for backwards-compatible imports; the value now equals the canonical
 * apex host. There is no separate admin subdomain.
 */
exports.ADMIN_HOST = 'shahin-ai.com';
/**
 * Historical IdP host symbol. Pinned to the canonical apex so any legacy
 * import still resolves to a host that is actually served. The IdP itself
 * lives under the /login path, not on a separate hostname.
 */
exports.IDP_ISSUER_HOST = 'shahin-ai.com';
/**
 * Per-surface IdP fronting base URL. Single canonical base for both surfaces:
 *
 *   product → https://shahin-ai.com/login
 *   admin   → https://shahin-ai.com/login   (folded into the product host)
 *
 * Authorization URLs, issuer claims, and JWKS URLs are derived from this base
 * (e.g. `${base}/realms/dogan/protocol/openid-connect/auth`). Keycloak runs
 * with KC_HTTP_RELATIVE_PATH=/login so the path on disk matches the issuer.
 *
 * Login uses Keycloak's built-in form — no SPA-side custom credential UI is
 * permitted.
 */
const SURFACE_IDP_BASE_URL = {
    product: 'https://shahin-ai.com/login',
    admin: 'https://shahin-ai.com/login',
};
const SURFACE_IDP_HOST = {
    product: 'shahin-ai.com',
    admin: 'shahin-ai.com',
};
function idpHostFor(surface) {
    return surface === 'unsupported' ? null : SURFACE_IDP_HOST[surface];
}
function idpBaseUrlFor(surface) {
    return surface === 'unsupported' ? null : SURFACE_IDP_BASE_URL[surface];
}
/**
 * All IdP hosts (used by callers that need to allow KC origin in CSP /
 * CORS / cookie scope). With the same-domain topology this collapses to the
 * single product host.
 */
exports.ALL_IDP_HOSTS = new Set([
    ...Object.values(SURFACE_IDP_HOST),
    exports.IDP_ISSUER_HOST,
]);
exports.AUTH_HOSTS = new Set([
    ...exports.PRODUCT_HOSTS,
]);
function normalizeHost(raw) {
    if (!raw)
        return '';
    const first = String(raw).split(',')[0] ?? '';
    const trimmed = first.trim().toLowerCase();
    const colonIdx = trimmed.indexOf(':');
    return colonIdx === -1 ? trimmed : trimmed.slice(0, colonIdx);
}
function getAuthSurface(host) {
    if (exports.PRODUCT_HOSTS.has(host))
        return 'product';
    return 'unsupported';
}
function isAllowedFrontendHost(host) {
    return exports.AUTH_HOSTS.has(host);
}
function isRegistrationAllowed(host) {
    return exports.PRODUCT_HOSTS.has(host);
}
function isLoginAllowed(host) {
    return getAuthSurface(host) !== 'unsupported';
}
function productBaseUrls(proto = 'https') {
    return [...exports.PRODUCT_HOSTS].map((h) => `${proto}://${h}`);
}
function adminBaseUrl(proto = 'https') {
    return `${proto}://${exports.ADMIN_HOST}`;
}
function allAuthOrigins(protos = ['https', 'wss']) {
    const out = [];
    const seen = new Set();
    for (const proto of protos) {
        for (const host of exports.AUTH_HOSTS) {
            const origin = `${proto}://${host}`;
            if (!seen.has(origin)) {
                seen.add(origin);
                out.push(origin);
            }
        }
    }
    return out;
}
function corsAllowedOrigins() {
    return [...exports.AUTH_HOSTS].map((h) => `https://${h}`);
}
//# sourceMappingURL=auth-host-policy.js.map
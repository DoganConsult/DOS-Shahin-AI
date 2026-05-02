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
export declare const PRODUCT_HOSTS: ReadonlySet<string>;
/**
 * Admin surface folds into the canonical shahin-ai.com host. Kept as a named
 * export for backwards-compatible imports; the value now equals the canonical
 * apex host. There is no separate admin subdomain.
 */
export declare const ADMIN_HOST: "shahin-ai.com";
/**
 * Historical IdP host symbol. Pinned to the canonical apex so any legacy
 * import still resolves to a host that is actually served. The IdP itself
 * lives under the /login path, not on a separate hostname.
 */
export declare const IDP_ISSUER_HOST: "shahin-ai.com";
export declare function idpHostFor(surface: AuthSurface): string | null;
export declare function idpBaseUrlFor(surface: AuthSurface): string | null;
/**
 * All IdP hosts (used by callers that need to allow KC origin in CSP /
 * CORS / cookie scope). With the same-domain topology this collapses to the
 * single product host.
 */
export declare const ALL_IDP_HOSTS: ReadonlySet<string>;
export declare const AUTH_HOSTS: ReadonlySet<string>;
export type AuthSurface = 'product' | 'admin' | 'unsupported';
export type AuthProto = 'https' | 'wss' | 'ws';
export declare function normalizeHost(raw?: string | null): string;
export declare function getAuthSurface(host: string): AuthSurface;
export declare function isAllowedFrontendHost(host: string): boolean;
export declare function isRegistrationAllowed(host: string): boolean;
export declare function isLoginAllowed(host: string): boolean;
export declare function productBaseUrls(proto?: AuthProto): string[];
export declare function adminBaseUrl(proto?: AuthProto): string;
export declare function allAuthOrigins(protos?: AuthProto[]): string[];
export declare function corsAllowedOrigins(): string[];

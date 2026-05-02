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

export const PRODUCT_HOSTS: ReadonlySet<string> = new Set([
  'shahin-ai.com',
  'www.shahin-ai.com',
]);

/**
 * Admin surface folds into the canonical shahin-ai.com host. Kept as a named
 * export for backwards-compatible imports; the value now equals the canonical
 * apex host. There is no separate admin subdomain.
 */
export const ADMIN_HOST = 'shahin-ai.com' as const;

/**
 * Historical IdP host symbol. Pinned to the canonical apex so any legacy
 * import still resolves to a host that is actually served. The IdP itself
 * lives under the /login path, not on a separate hostname.
 */
export const IDP_ISSUER_HOST = 'shahin-ai.com' as const;

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
const SURFACE_IDP_BASE_URL: Record<Exclude<AuthSurface, 'unsupported'>, string> = {
  product: 'https://shahin-ai.com/login',
  admin: 'https://shahin-ai.com/login',
};

const SURFACE_IDP_HOST: Record<Exclude<AuthSurface, 'unsupported'>, string> = {
  product: 'shahin-ai.com',
  admin: 'shahin-ai.com',
};

export function idpHostFor(surface: AuthSurface): string | null {
  return surface === 'unsupported' ? null : SURFACE_IDP_HOST[surface];
}

export function idpBaseUrlFor(surface: AuthSurface): string | null {
  return surface === 'unsupported' ? null : SURFACE_IDP_BASE_URL[surface];
}

/**
 * All IdP hosts (used by callers that need to allow KC origin in CSP /
 * CORS / cookie scope). With the same-domain topology this collapses to the
 * single product host.
 */
export const ALL_IDP_HOSTS: ReadonlySet<string> = new Set<string>([
  ...Object.values(SURFACE_IDP_HOST),
  IDP_ISSUER_HOST,
]);

export const AUTH_HOSTS: ReadonlySet<string> = new Set<string>([
  ...PRODUCT_HOSTS,
]);

export type AuthSurface = 'product' | 'admin' | 'unsupported';

export type AuthProto = 'https' | 'wss' | 'ws';

export function normalizeHost(raw?: string | null): string {
  if (!raw) return '';
  const first = String(raw).split(',')[0] ?? '';
  const trimmed = first.trim().toLowerCase();
  const colonIdx = trimmed.indexOf(':');
  return colonIdx === -1 ? trimmed : trimmed.slice(0, colonIdx);
}

export function getAuthSurface(host: string): AuthSurface {
  if (PRODUCT_HOSTS.has(host)) return 'product';
  return 'unsupported';
}

export function isAllowedFrontendHost(host: string): boolean {
  return AUTH_HOSTS.has(host);
}

export function isRegistrationAllowed(host: string): boolean {
  return PRODUCT_HOSTS.has(host);
}

export function isLoginAllowed(host: string): boolean {
  return getAuthSurface(host) !== 'unsupported';
}

export function productBaseUrls(proto: AuthProto = 'https'): string[] {
  return [...PRODUCT_HOSTS].map((h) => `${proto}://${h}`);
}

export function adminBaseUrl(proto: AuthProto = 'https'): string {
  return `${proto}://${ADMIN_HOST}`;
}

export function allAuthOrigins(protos: AuthProto[] = ['https', 'wss']): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const proto of protos) {
    for (const host of AUTH_HOSTS) {
      const origin = `${proto}://${host}`;
      if (!seen.has(origin)) {
        seen.add(origin);
        out.push(origin);
      }
    }
  }
  return out;
}

export function corsAllowedOrigins(): string[] {
  return [...AUTH_HOSTS].map((h) => `https://${h}`);
}

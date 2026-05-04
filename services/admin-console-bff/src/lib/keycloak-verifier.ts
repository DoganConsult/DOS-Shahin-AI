/**
 * DOS Master M15 D1 (B) — Keycloak `platform-ops` realm JWT verifier.
 *
 * STATUS: SCAFFOLD, DISABLED BY DEFAULT.
 *
 * Doctrine binding:
 *   - Article 4: admin trust zone uses a SEPARATE Keycloak realm
 *     (`platform-ops`) from the tenant realm (`tenants`).
 *   - Article 5 (No fake-green): this verifier MUST NOT default to ON.
 *     CI / agents that flip `KC_REQUIRE=1` without ops nod are violating
 *     Doctrine §10 (no autonomous mTLS/KC certificate provisioning).
 *   - Article 7 (PPD): the `0 → 1` flip rides ring R0..R5.
 *
 * Behaviour:
 *   - When `KC_REQUIRE=0` (default): `verifyKcToken()` returns `null` and
 *     `requireKcAdmin` is a no-op. The existing
 *     platform_admin.platform_admin_session Bearer-token path stays in
 *     force exactly as M11 shipped it.
 *   - When `KC_REQUIRE=1`: `verifyKcToken()` does a real JWKS-backed
 *     verify against `KC_ISSUER` / `KC_JWKS_URL` / `KC_REALM` and returns
 *     `{ sub, email, claims }` on success or `null` on any failure.
 *
 * Required env (only consulted when `KC_REQUIRE=1`):
 *   KC_ISSUER     e.g. https://kc.dos.platform/realms/platform-ops
 *   KC_JWKS_URL   e.g. ${KC_ISSUER}/protocol/openid-connect/certs
 *   KC_REALM      default: platform-ops
 *   KC_AUDIENCE   default: admin-console-bff
 */

export interface KcClaims {
  sub: string;
  email?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  [k: string]: unknown;
}

export interface KcVerifyResult {
  ok: true;
  sub: string;
  email: string | null;
  claims: KcClaims;
}

const FLAG = (v: string | undefined, d = '0'): boolean =>
  String(v ?? d).trim() === '1';

export function kcRequireEnabled(): boolean {
  return FLAG(process.env.KC_REQUIRE, '0');
}

export function kcConfig(): {
  issuer: string;
  jwksUrl: string;
  realm: string;
  audience: string;
} {
  return {
    issuer:    String(process.env.KC_ISSUER    ?? '').trim(),
    jwksUrl:   String(process.env.KC_JWKS_URL  ?? '').trim(),
    realm:     String(process.env.KC_REALM     ?? 'platform-ops').trim(),
    audience:  String(process.env.KC_AUDIENCE  ?? 'admin-console-bff').trim(),
  };
}

let jwksCache: { url: string; remoteJWKSet: unknown } | null = null;

/**
 * Verify a Keycloak-issued JWT against the platform-ops realm.
 * Returns null when:
 *   - KC_REQUIRE is not 1 (scaffold disabled)
 *   - KC_ISSUER / KC_JWKS_URL not configured
 *   - token is not a 3-segment JWT
 *   - signature, issuer, audience, or expiry checks fail
 *   - jose module is not resolvable in the runtime
 *
 * Never throws; failure surfaces as a `null` return so the caller can
 * fall back to the legacy Bearer-token path without panicking the BFF.
 */
export async function verifyKcToken(token: string): Promise<KcVerifyResult | null> {
  if (!kcRequireEnabled()) return null;
  if (!token || token.split('.').length !== 3) return null;
  const { issuer, jwksUrl, audience } = kcConfig();
  if (!issuer || !jwksUrl) return null;
  try {
    const jose = await import('jose');
    if (!jwksCache || jwksCache.url !== jwksUrl) {
      jwksCache = { url: jwksUrl, remoteJWKSet: jose.createRemoteJWKSet(new URL(jwksUrl)) };
    }
    const { payload } = await jose.jwtVerify(
      token,
      jwksCache.remoteJWKSet as Parameters<typeof jose.jwtVerify>[1],
      { issuer, audience: audience || undefined },
    );
    const claims = payload as unknown as KcClaims;
    if (!claims.sub) return null;
    return {
      ok: true,
      sub: String(claims.sub),
      email: claims.email ? String(claims.email) : null,
      claims,
    };
  } catch {
    return null;
  }
}

/**
 * Express middleware factory. When KC_REQUIRE=0, returns a passthrough so
 * existing `requireAdmin` (DB-session-backed) wins exactly as before. When
 * KC_REQUIRE=1, attempts KC verify first and ONLY falls back to the legacy
 * path if the token is not a JWT (3-segment) — JWT-shaped tokens that
 * fail verification are rejected with 401.
 */
export function kcVerifyMiddleware(): (
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction,
) => Promise<void> {
  return async (req, res, next) => {
    if (!kcRequireEnabled()) { next(); return; }
    const h = req.header('authorization') ?? '';
    const token = h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
    if (!token) { next(); return; }
    if (token.split('.').length !== 3) { next(); return; }
    const v = await verifyKcToken(token);
    if (!v) { res.status(401).json({ error: 'kc_token_invalid' }); return; }
    (req as unknown as { kc?: KcVerifyResult }).kc = v;
    next();
  };
}

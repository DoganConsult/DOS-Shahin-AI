import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

const required = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Required environment variable ${k} is not set`);
  return v;
};

export const KC_BASE = required('KEYCLOAK_BASE_URL');
export const KC_INTERNAL = process.env.KEYCLOAK_INTERNAL_BASE_URL || KC_BASE;
export const KC_REALM = required('KEYCLOAK_REALM');
export const CLIENT_ID = required('KEYCLOAK_OIDC_CLIENT_ID');
export const CLIENT_SECRET = required('KEYCLOAK_OIDC_CLIENT_SECRET');
export const REDIRECT_URI = required('KEYCLOAK_OIDC_REDIRECT_URI');

export const COOKIE_ACCESS = process.env.COOKIE_ACCESS_NAME || 'dos_access_token';
export const COOKIE_REFRESH = process.env.COOKIE_REFRESH_NAME || 'dauth_rt';
export const COOKIE_STATE = process.env.COOKIE_OIDC_STATE || 'dos_oidc_state';
export const COOKIE_DOMAIN = required('COOKIE_DOMAIN');
export const SAMESITE = (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || 'lax';
export const SECURE = (process.env.COOKIE_SECURE || 'true') === 'true';
// Doctrine: no static landing fallback. The OIDC callback derives the
// landing route from dos.tenant_landing_config (resolved by ui-os-service).
// If absent, the callback responds with 204/empty redirect target and
// the SPA renders empty/no-op (NO FRONTEND INVENTION).
export const DEFAULT_LANDING: string | null = process.env.OIDC_DEFAULT_RETURN_URL ?? null;

export const KC_ISSUER = process.env.KEYCLOAK_ISSUER || `${KC_BASE}/realms/${KC_REALM}`;
export const KC_JWKS_URL = process.env.KEYCLOAK_JWKS_URL || `${KC_INTERNAL}/realms/${KC_REALM}/protocol/openid-connect/certs`;
export const KC_AUDIENCE = process.env.KEYCLOAK_AUDIENCE || CLIENT_ID;

export const sessionJwks = createRemoteJWKSet(new URL(KC_JWKS_URL), {
  cooldownDuration: Number(process.env.KEYCLOAK_JWKS_CACHE_TTL_MS || 600_000),
});

export async function verifySession(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, sessionJwks, {
    issuer: KC_ISSUER,
    audience: KC_AUDIENCE,
  });
  return payload;
}

export const TENANT_SERVICE_URL = process.env.TENANT_SERVICE_URL || 'http://127.0.0.1:4002';

export function decodeAccessTokenClaims(token: string): { sub?: string; email?: string; name?: string } {
  try {
    const part = token.split('.')[1];
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const claims = JSON.parse(json) as Record<string, unknown>;
    return {
      sub: typeof claims.sub === 'string' ? claims.sub : undefined,
      email: typeof claims.email === 'string' ? claims.email : undefined,
      name: typeof claims.name === 'string'
        ? claims.name as string
        : (typeof claims.preferred_username === 'string' ? claims.preferred_username as string : undefined),
    };
  } catch {
    return {};
  }
}

export function expiresMs(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Keycloak token response missing/invalid ${label}`);
  }
  return value * 1000;
}

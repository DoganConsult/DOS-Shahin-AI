/**
 * Canonical NODE_ENV + JWT signing secret policy for all services.
 * - production: JWT_SECRET must be set, non-weak, length >= 32
 * - staging: same as production (no dev-secret)
 * - development / test: unset allowed → ephemeral per-process secret (callers must opt in)
 */
import * as crypto from 'crypto';

const WEAK_SECRETS = new Set(
  ['dev-secret', 'secret', 'changeme', 'test', 'jwt-secret', 'your-256-bit-secret', 'password', 'admin'].map((s) =>
    s.toLowerCase(),
  ),
);

/** Default per plan: unset NODE_ENV → treat as development (explicit product decision). */
export function resolveNodeEnv(): string {
  const raw = process.env.NODE_ENV?.trim();
  return raw && raw.length > 0 ? raw : 'development';
}

export function isProductionLikeEnv(): boolean {
  const e = resolveNodeEnv();
  return e === 'production' || e === 'staging';
}

/**
 * Throws if secret is missing in production, or weak/short in staging/production.
 * @param context — service name for error messages
 */
export function assertJwtSigningSecret(secret: string | undefined, context: string): string {
  const env = resolveNodeEnv();
  const s = secret?.trim();
  if (!s) {
    if (env === 'production') {
      throw new Error(`[${context}] JWT_SECRET is required in production`);
    }
    if (env === 'staging') {
      throw new Error(`[${context}] JWT_SECRET is required in staging`);
    }
    if (env === 'development' || env === 'test') {
      throw new Error(`[${context}] JWT_SECRET is required (use resolveJwtSigningSecret for ephemeral dev)`);
    }
    throw new Error(`[${context}] JWT_SECRET is required in ${env}`);
  }
  if (isProductionLikeEnv()) {
    if (s.length < 32) {
      throw new Error(`[${context}] JWT_SECRET must be at least 32 characters in ${env}`);
    }
    if (WEAK_SECRETS.has(s.toLowerCase())) {
      throw new Error(`[${context}] Refused known-weak JWT_SECRET in ${env}`);
    }
  }
  return s;
}

const _ephemeralByContext = new Map<string, string>();

/** Deterministic-enough for dev: one 48-byte hex secret per process per context label. */
export function getEphemeralDevJwtSecret(context: string): string {
  let v = _ephemeralByContext.get(context);
  if (!v) {
    v = crypto.randomBytes(48).toString('hex');
    _ephemeralByContext.set(context, v);
  }
  return v;
}

/**
 * Resolve JWT signing secret: env in prod-like; ephemeral in dev/test when unset.
 */
export function resolveJwtSigningSecret(context: string): string {
  const raw = process.env.JWT_SECRET?.trim();
  const env = resolveNodeEnv();
  if (raw) {
    return assertJwtSigningSecret(raw, context);
  }
  if (env === 'development' || env === 'test') {
    return getEphemeralDevJwtSecret(context);
  }
  return assertJwtSigningSecret(undefined, context);
}

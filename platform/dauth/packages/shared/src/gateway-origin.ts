/**
 * Gateway-origin trust mechanism (Wave 1).
 *
 * Canonical contract: the API gateway is the SOLE entry path that may
 * inject identity/tenant headers. Downstream services MUST verify a
 * cryptographic origin token before reading any identity. Without this,
 * a request that bypasses the gateway can spoof `x-user-sub` /
 * `x-tenant-id` and impersonate any tenant.
 *
 * Token shape: `<base64url(payload-json)>.<base64url(hmac-sha256)>`
 * Header:      `x-dos-gateway-token`
 *
 * - HMAC-SHA-256 over `base64url(payload-json)` using a secret pulled
 *   from `GATEWAY_ORIGIN_HMAC_SECRET` (≥ 32 bytes).
 * - Short TTL (60s by default). Replay-bounded by per-service in-memory
 *   `jti` LRU window.
 * - Downstream code reads `req.principal` populated from the verified
 *   payload. The raw `x-user-*` / `x-tenant-id` headers are advisory in
 *   dual mode and ignored entirely once `LEGACY_HEADER_TRUST=false`.
 *
 * No frontend code, no test code, and no service may import jsonwebtoken
 * here — gateway-origin uses HMAC-SHA-256 only and avoids the JWT-claim
 * complexity surface (we already verify Keycloak RS256 separately).
 */
import crypto from 'node:crypto';

// ── Token payload shape ────────────────────────────────────────────────────

export interface GatewayOriginPayload {
  /** Issued-at (epoch seconds). */
  iat: number;
  /** Expires-at (epoch seconds). */
  exp: number;
  /** Unique token id; verifier rejects duplicates within the TTL window. */
  jti: string;
  /** Verified Keycloak subject (= user id). */
  sub: string;
  /** Verified tenant id. May be empty string for tenant-less principals. */
  tenantId: string;
  /** Verified email claim. */
  email: string;
  /** Verified roles claim (Keycloak realm + resource roles, normalized). */
  roles: string[];
  /** Constant marker — readers MUST reject any other value. */
  src: 'gateway';
  /** Schema version. Bump when payload shape changes. */
  v: 1;
}

export interface GatewayOriginPrincipal {
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
}

// ── Encoding helpers ───────────────────────────────────────────────────────

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function timingSafeEq(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Signer (gateway side) ──────────────────────────────────────────────────

export interface SignGatewayOriginInput {
  sub: string;
  tenantId?: string | null;
  email: string;
  roles?: string[];
  /** TTL in seconds. Default 60. Hard-capped at 300s. */
  ttlSeconds?: number;
  /** Inject a fixed jti for tests; default = crypto.randomUUID(). */
  jti?: string;
  /** Inject a fixed `iat` (epoch seconds) for tests; default = now. */
  nowSeconds?: number;
}

export function signGatewayOrigin(
  input: SignGatewayOriginInput,
  secret: string,
): string {
  if (!secret || secret.length < 32) {
    throw new Error('[gateway-origin] secret must be ≥ 32 chars');
  }
  if (!input.sub) throw new Error('[gateway-origin] sub is required');
  if (!input.email) throw new Error('[gateway-origin] email is required');

  const ttl = Math.min(Math.max(input.ttlSeconds ?? 60, 5), 300);
  const iat = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const payload: GatewayOriginPayload = {
    iat,
    exp: iat + ttl,
    jti: input.jti ?? crypto.randomUUID(),
    sub: input.sub,
    tenantId: input.tenantId ?? '',
    email: input.email,
    roles: input.roles ?? [],
    src: 'gateway',
    v: 1,
  };
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest();
  return `${payloadB64}.${base64UrlEncode(sig)}`;
}

// ── Verifier (downstream side) ─────────────────────────────────────────────

export type VerifyFailureReason =
  | 'MISSING'
  | 'MALFORMED'
  | 'BAD_HMAC'
  | 'PAYLOAD_INVALID'
  | 'WRONG_SOURCE'
  | 'WRONG_VERSION'
  | 'EXPIRED'
  | 'NOT_YET_VALID'
  | 'REPLAYED';

export interface VerifyGatewayOriginSuccess {
  ok: true;
  payload: GatewayOriginPayload;
  principal: GatewayOriginPrincipal;
}

export interface VerifyGatewayOriginFailure {
  ok: false;
  reason: VerifyFailureReason;
  detail?: string;
}

export type VerifyGatewayOriginResult =
  | VerifyGatewayOriginSuccess
  | VerifyGatewayOriginFailure;

export interface VerifyGatewayOriginOptions {
  secret: string;
  /** Replay registry; pass the same instance per service. */
  replayRegistry: ReplayRegistry;
  /** Clock skew tolerance in seconds. Default 5. */
  clockSkewSeconds?: number;
  /** Inject a fixed `now` (epoch seconds) for tests; default = real now. */
  nowSeconds?: number;
}

export function verifyGatewayOrigin(
  rawToken: string | undefined | null,
  options: VerifyGatewayOriginOptions,
): VerifyGatewayOriginResult {
  if (!rawToken) return { ok: false, reason: 'MISSING' };
  const dot = rawToken.indexOf('.');
  if (dot <= 0 || dot === rawToken.length - 1) {
    return { ok: false, reason: 'MALFORMED' };
  }
  const payloadB64 = rawToken.slice(0, dot);
  const sigB64 = rawToken.slice(dot + 1);

  const expectedSig = crypto
    .createHmac('sha256', options.secret)
    .update(payloadB64)
    .digest();
  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }
  if (!timingSafeEq(providedSig, expectedSig)) {
    return { ok: false, reason: 'BAD_HMAC' };
  }

  let payload: GatewayOriginPayload;
  try {
    const json = base64UrlDecode(payloadB64).toString('utf8');
    payload = JSON.parse(json) as GatewayOriginPayload;
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }

  if (
    typeof payload !== 'object' || payload === null
    || typeof payload.sub !== 'string' || payload.sub.length === 0
    || typeof payload.email !== 'string'
    || typeof payload.iat !== 'number' || typeof payload.exp !== 'number'
    || typeof payload.jti !== 'string' || payload.jti.length === 0
    || !Array.isArray(payload.roles)
    || typeof payload.tenantId !== 'string'
  ) {
    return { ok: false, reason: 'PAYLOAD_INVALID' };
  }
  if (payload.src !== 'gateway') return { ok: false, reason: 'WRONG_SOURCE' };
  if (payload.v !== 1) return { ok: false, reason: 'WRONG_VERSION' };

  const skew = options.clockSkewSeconds ?? 5;
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (now > payload.exp + skew) return { ok: false, reason: 'EXPIRED' };
  if (now + skew < payload.iat) return { ok: false, reason: 'NOT_YET_VALID' };

  // Replay check — the registry guarantees that a jti seen within the
  // verifier's window is rejected. We pass the verifier's `now` so the
  // registry's GC uses the same clock as the freshness checks above —
  // critical when tests inject a fixed clock and when wall-clock skew
  // would otherwise expire entries the verifier still considers fresh.
  const seen = options.replayRegistry.seen(payload.jti, payload.exp, now);
  if (seen) return { ok: false, reason: 'REPLAYED' };

  return {
    ok: true,
    payload,
    principal: {
      sub: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      roles: payload.roles,
    },
  };
}

// ── Replay registry ────────────────────────────────────────────────────────

/**
 * In-memory replay registry. Bounded: each entry expires automatically when
 * its `expiresAt` is reached on the next `seen()` call. For multi-instance
 * deployments, replace with a Redis-backed implementation that exposes the
 * same `seen()` semantics — the verifier does not depend on the storage.
 */
export interface ReplayRegistry {
  /**
   * Returns `true` if the jti was already seen and is still within its TTL
   * window; otherwise records it and returns `false`.
   *
   * `nowSeconds` is the verifier's clock; the registry must use it (not a
   * wall-clock) so GC stays consistent with the freshness checks.
   */
  seen(jti: string, expEpochSeconds: number, nowSeconds?: number): boolean;
  /** Number of currently-tracked jti entries. Diagnostic only. */
  size(): number;
}

export function createInMemoryReplayRegistry(opts?: {
  maxEntries?: number;
  nowSeconds?: () => number;
}): ReplayRegistry {
  const max = opts?.maxEntries ?? 10_000;
  const fallbackNow = opts?.nowSeconds ?? (() => Math.floor(Date.now() / 1000));
  // Map<jti, expEpochSeconds>. Entry is replayed-rejected as long as the
  // current `now` is <= stored exp.
  const seenMap = new Map<string, number>();
  return {
    seen(jti, expEpochSeconds, nowSeconds) {
      const cutoff = nowSeconds ?? fallbackNow();
      // GC expired entries lazily — only when we are over the cap.
      if (seenMap.size > max) {
        for (const [k, v] of seenMap) {
          if (v < cutoff) seenMap.delete(k);
        }
        while (seenMap.size > max) {
          const firstKey = seenMap.keys().next().value as string | undefined;
          if (firstKey === undefined) break;
          seenMap.delete(firstKey);
        }
      }
      const prev = seenMap.get(jti);
      if (prev !== undefined && prev >= cutoff) return true;
      seenMap.set(jti, expEpochSeconds);
      return false;
    },
    size() { return seenMap.size; },
  };
}

// ── Header constants ───────────────────────────────────────────────────────

/**
 * The full set of incoming headers the gateway MUST strip before the auth
 * pass and before injecting verified identity. Any of these arriving on the
 * inbound request from the public internet is a spoof attempt.
 */
export const STRIPPED_INBOUND_HEADERS: ReadonlyArray<string> = Object.freeze([
  'x-dos-gateway-token',
  'x-user-sub',
  'x-user-id',
  'x-user-email',
  'x-user-name',
  'x-user-roles',
  'x-tenant-id',
  'x-tenant-code',
  'x-platform-super-admin',
]);

export const GATEWAY_ORIGIN_HEADER = 'x-dos-gateway-token';

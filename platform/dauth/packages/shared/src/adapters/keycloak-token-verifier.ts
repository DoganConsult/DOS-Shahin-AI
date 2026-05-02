/**
 * Keycloak TokenVerifier — verifies RS256/PS256 tokens against a Keycloak
 * realm's JWKS endpoint. Zero runtime dependency on a Keycloak client lib;
 * speaks raw JWKS + uses `jsonwebtoken` (already a transitive dep of
 * services/auth-service) to verify the signature with a PEM derived from
 * the JWK.
 *
 * JWKS is cached in-process with a configurable TTL (default 10 min). On
 * cache miss for a kid, the verifier force-refreshes once before giving
 * up — handles the common key-rotation race.
 *
 * Shadow mode caller compares the returned payload with the native
 * verifier's payload and logs divergences (see
 * `services/auth-service/src/domain/identity/token.service.ts#verifyAccessTokenViaPort`).
 */
import * as jwt from 'jsonwebtoken';
import {
  InvalidTokenError,
  type MinimalAuthPayload,
  type TokenVerifier,
  type TokenVerifyResult,
} from '../dauth-ports/token-verifier.port';

interface JwksKey {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
  x5c?: string[];
}

interface JwksCacheEntry {
  keys: Map<string, JwksKey>;
  fetchedAt: number;
}

export interface KeycloakTokenVerifierOptions {
  /** Required. The full JWKS URL for the realm. */
  jwksUrl: string;
  /**
   * Optional — validated against token `iss` if set. Accepts a single
   * issuer string or an array of accepted issuers. Multi-issuer is required
   * for per-surface auth fronting hosts (e.g. `auth.shahin-ai.com` and
   * `auth.dogan-ai.com` both fronting the same realm). The token's `iss`
   * must exactly match one of the accepted values.
   */
  issuer?: string | string[];
  /** Optional — validated against token `aud` if set. */
  audience?: string;
  /** JWKS cache TTL. Defaults to 10 minutes. */
  cacheTtlMs?: number;
  /** Inject fetch impl for tests / non-node runtimes. */
  fetchImpl?: typeof fetch;
  /** Transform the decoded JWT payload into the project's AuthPayload. */
  payloadMapper?: (raw: Record<string, unknown>) => MinimalAuthPayload;
}

export class KeycloakTokenVerifier<P extends MinimalAuthPayload = MinimalAuthPayload>
  implements TokenVerifier<P>
{
  readonly name = 'keycloak' as const;
  private cache: JwksCacheEntry | null = null;
  private readonly jwksUrl: string;
  private readonly issuer?: string | string[];
  private readonly audience?: string;
  private readonly cacheTtlMs: number;
  private readonly fetchImpl?: typeof fetch;
  private readonly payloadMapper?: (raw: Record<string, unknown>) => MinimalAuthPayload;

  constructor(options: KeycloakTokenVerifierOptions) {
    if (!options.jwksUrl) {
      throw new Error('[@dos/auth:Keycloak] jwksUrl is required');
    }
    this.jwksUrl = options.jwksUrl;
    this.issuer = options.issuer;
    this.audience = options.audience;
    this.cacheTtlMs = options.cacheTtlMs ?? 600_000;
    this.fetchImpl = options.fetchImpl;
    this.payloadMapper = options.payloadMapper;
  }

  async verify(token: string): Promise<TokenVerifyResult<P>> {
    const decoded = jwt.decode(token, { complete: true }) as unknown as
      | { header: { kid?: string; alg?: string }; payload: Record<string, unknown> }
      | null;

    if (!decoded || !decoded.header) {
      throw new InvalidTokenError('Unable to decode token header', 'MALFORMED', 'keycloak');
    }
    const kid = decoded.header.kid;
    if (!kid) {
      throw new InvalidTokenError('Token header missing kid', 'MALFORMED', 'keycloak');
    }

    let key = await this.getKey(kid);
    if (!key) {
      await this.refreshJwks();
      key = await this.getKey(kid);
    }
    if (!key) {
      throw new InvalidTokenError(`No JWK matching kid=${kid}`, 'SIGNATURE', 'keycloak');
    }

    const pem = jwkToPem(key);
    try {
      const verifyOpts: jwt.VerifyOptions = {};
      if (this.issuer) {
        // jsonwebtoken's types model multi-issuer as a non-empty tuple
        // `[string, ...string[]]` rather than `string[]`. At runtime it
        // accepts any string-array where at least one entry matches the
        // token's `iss`. Guard against an empty array (callers using
        // env-parsing collapse that to `undefined`, but belt-and-braces)
        // before casting.
        if (Array.isArray(this.issuer)) {
          if (this.issuer.length > 0) {
            verifyOpts.issuer = this.issuer as [string, ...string[]];
          }
        } else {
          verifyOpts.issuer = this.issuer;
        }
      }
      if (this.audience) verifyOpts.audience = this.audience;
      const raw = jwt.verify(token, pem, verifyOpts) as Record<string, unknown>;
      const payload = (this.payloadMapper ? this.payloadMapper(raw) : defaultMap(raw)) as P;
      return { payload, source: 'keycloak', keyId: kid };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (lower.includes('expired')) throw new InvalidTokenError(msg, 'EXPIRED', 'keycloak');
      if (lower.includes('audience')) throw new InvalidTokenError(msg, 'AUDIENCE', 'keycloak');
      if (lower.includes('issuer')) throw new InvalidTokenError(msg, 'ISSUER', 'keycloak');
      if (lower.includes('signature')) throw new InvalidTokenError(msg, 'SIGNATURE', 'keycloak');
      throw new InvalidTokenError(msg, 'UNKNOWN', 'keycloak');
    }
  }

  /**
   * Eager JWKS warmup. Called by bootstrap so a missing/unreachable JWKS
   * surfaces at startup rather than at the first verify(). Failure here
   * does NOT throw — bootstrap logs and downgrades to native-only.
   */
  async warmup(): Promise<{ ok: boolean; keyCount: number; error?: string }> {
    try {
      await this.refreshJwks();
      return { ok: true, keyCount: this.cache?.keys.size ?? 0 };
    } catch (err) {
      return {
        ok: false,
        keyCount: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async getKey(kid: string): Promise<JwksKey | null> {
    if (this.cache && Date.now() - this.cache.fetchedAt < this.cacheTtlMs) {
      return this.cache.keys.get(kid) ?? null;
    }
    await this.refreshJwks();
    return this.cache?.keys.get(kid) ?? null;
  }

  private async refreshJwks(): Promise<void> {
    const fetchFn = this.fetchImpl ?? globalThis.fetch;
    if (!fetchFn) throw new Error('[@dos/auth:Keycloak] no fetch implementation available');
    const res = await fetchFn(this.jwksUrl, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`[@dos/auth:Keycloak] JWKS fetch failed: ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as { keys?: JwksKey[] };
    const keys = new Map<string, JwksKey>();
    for (const k of body.keys ?? []) {
      if (k.kid) keys.set(k.kid, k);
    }
    this.cache = { keys, fetchedAt: Date.now() };
  }
}

/**
 * Default mapping of a Keycloak OIDC access token to MinimalAuthPayload.
 * Projects with richer payloads should inject a custom `payloadMapper`.
 *
 * Expected Keycloak claim sources:
 *   - userId   ← `sub`
 *   - email    ← `email`
 *   - tenantId ← `tenant_id` / `tenantId` / first realm role prefixed `tenant:`
 *   - role     ← first non-realm client-role fallback to `preferred_username`
 */
function defaultMap(raw: Record<string, unknown>): MinimalAuthPayload {
  const userId = String(raw.sub ?? '');
  const email = String(raw.email ?? '');
  const tenantId =
    (raw.tenant_id as string) ??
    (raw.tenantId as string) ??
    extractTenantFromRealmRoles(raw) ??
    '';
  const role =
    extractPrimaryRole(raw) ??
    (raw.preferred_username as string) ??
    'user';
  return { userId, email, tenantId, role, jti: raw.jti as string | undefined };
}

function extractTenantFromRealmRoles(raw: Record<string, unknown>): string | undefined {
  const realm = raw.realm_access as { roles?: string[] } | undefined;
  const roles = realm?.roles ?? [];
  for (const r of roles) {
    if (typeof r === 'string' && r.startsWith('tenant:')) return r.slice('tenant:'.length);
  }
  return undefined;
}

function extractPrimaryRole(raw: Record<string, unknown>): string | undefined {
  const realm = raw.realm_access as { roles?: string[] } | undefined;
  const roles = realm?.roles ?? [];
  const filtered = roles.filter(
    (r) =>
      typeof r === 'string' &&
      !r.startsWith('tenant:') &&
      !['default-roles-master', 'offline_access', 'uma_authorization'].includes(r),
  );
  return filtered[0];
}

/**
 * JWK → PEM. Supports RSA keys via x5c (cert chain) or n/e (modulus/exponent).
 */
function jwkToPem(key: JwksKey): string {
  if (key.x5c && key.x5c.length > 0) {
    return `-----BEGIN CERTIFICATE-----\n${chunk(key.x5c[0], 64)}\n-----END CERTIFICATE-----\n`;
  }
  if (key.kty !== 'RSA' || !key.n || !key.e) {
    throw new InvalidTokenError(
      `Unsupported JWK kty=${key.kty} (RSA with x5c or n/e expected)`,
      'SIGNATURE',
      'keycloak',
    );
  }
  const modulus = base64UrlToBuffer(key.n);
  const exponent = base64UrlToBuffer(key.e);
  const derBody = Buffer.concat([encodeInteger(modulus), encodeInteger(exponent)]);
  const sequence = encodeSequence(derBody);
  const bitString = Buffer.concat([Buffer.from([0x00]), sequence]);
  const algorithmIdentifier = Buffer.from([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]);
  const spki = encodeSequence(Buffer.concat([algorithmIdentifier, encodeBitString(bitString)]));
  return `-----BEGIN PUBLIC KEY-----\n${chunk(spki.toString('base64'), 64)}\n-----END PUBLIC KEY-----\n`;
}

function base64UrlToBuffer(input: string): Buffer {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, 'base64');
}

function chunk(s: string, n: number): string {
  const lines: string[] = [];
  for (let i = 0; i < s.length; i += n) lines.push(s.slice(i, i + n));
  return lines.join('\n');
}

function encodeLength(len: number): Buffer {
  if (len < 128) return Buffer.from([len]);
  const bytes: number[] = [];
  let v = len;
  while (v > 0) {
    bytes.unshift(v & 0xff);
    v >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function encodeInteger(buf: Buffer): Buffer {
  const body = buf[0] & 0x80 ? Buffer.concat([Buffer.from([0x00]), buf]) : buf;
  return Buffer.concat([Buffer.from([0x02]), encodeLength(body.length), body]);
}

function encodeSequence(body: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x30]), encodeLength(body.length), body]);
}

function encodeBitString(body: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x03]), encodeLength(body.length), body]);
}

/**
 * Keycloak TokenVerifier — verifies RS256/PS256 tokens against a Keycloak
 * realm's JWKS endpoint.
 *
 * Design notes:
 * - Zero runtime dependency on a Keycloak client library. We speak raw JWKS +
 *   use the `jsonwebtoken` package (already a transitive dep) to verify the
 *   signature with a PEM derived from the JWK. This keeps the DAuth module
 *   portable — the Keycloak admin API (used by the identity adapter) is a
 *   separate concern.
 * - JWKS is cached in-process with a configurable TTL (default 10 min). On
 *   cache miss and signature failure, we force-refresh once to handle the
 *   common key-rotation race.
 * - Shadow mode caller compares the returned payload with the native
 *   verifier's payload and logs divergences to the decision ledger under
 *   `engineResults.keycloak`.
 */
import * as jwt from 'jsonwebtoken';
import type { AuthPayload } from '../../identity/token.service';
import {
  InvalidTokenError,
  type TokenVerifier,
  type TokenVerifyResult,
} from '../../ports/token-verifier.port';
import { DAUTH_CONFIG } from '../../dauth.config';

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

export interface KeycloakVerifierOptions {
  jwksUrl?: string;
  issuer?: string;
  audience?: string;
  cacheTtlMs?: number;
  /** Allow injecting a custom fetcher for tests or non-node runtimes. */
  fetchImpl?: typeof fetch;
}

export class KeycloakTokenVerifier implements TokenVerifier {
  readonly name = 'keycloak' as const;
  private cache: JwksCacheEntry | null = null;
  private readonly options: Required<Pick<KeycloakVerifierOptions, 'jwksUrl' | 'cacheTtlMs'>> &
    Omit<KeycloakVerifierOptions, 'jwksUrl' | 'cacheTtlMs'>;

  constructor(options: KeycloakVerifierOptions = {}) {
    const jwksUrl = options.jwksUrl ?? DAUTH_CONFIG.keycloak.jwksUrl;
    if (!jwksUrl) {
      throw new Error(
        '[DAuth:Keycloak] KEYCLOAK_JWKS_URL is required to use the Keycloak token verifier',
      );
    }
    this.options = {
      jwksUrl,
      cacheTtlMs: options.cacheTtlMs ?? DAUTH_CONFIG.keycloak.jwksCacheTtlMs,
      issuer: options.issuer ?? (DAUTH_CONFIG.keycloak.issuer || undefined),
      audience: options.audience ?? (DAUTH_CONFIG.keycloak.audience || undefined),
      fetchImpl: options.fetchImpl,
    };
  }

  async verify(token: string): Promise<TokenVerifyResult> {
    const decoded = jwt.decode(token, { complete: true }) as unknown as
      | { header: { kid?: string; alg?: string }; payload: AuthPayload }
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
      // Force refresh — common when Keycloak rotates keys
      await this.refreshJwks();
      key = await this.getKey(kid);
    }
    if (!key) {
      throw new InvalidTokenError(`No JWK matching kid=${kid}`, 'SIGNATURE', 'keycloak');
    }

    const pem = jwkToPem(key);
    try {
      const verifyOpts: jwt.VerifyOptions = {};
      if (this.options.issuer) verifyOpts.issuer = this.options.issuer;
      if (this.options.audience) verifyOpts.audience = this.options.audience;
      const payload = jwt.verify(token, pem, verifyOpts) as AuthPayload;
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

  private async getKey(kid: string): Promise<JwksKey | null> {
    if (this.cache && Date.now() - this.cache.fetchedAt < this.options.cacheTtlMs) {
      return this.cache.keys.get(kid) ?? null;
    }
    await this.refreshJwks();
    return this.cache?.keys.get(kid) ?? null;
  }

  private async refreshJwks(): Promise<void> {
    const fetchFn = this.options.fetchImpl ?? globalThis.fetch;
    if (!fetchFn) {
      throw new Error('[DAuth:Keycloak] no fetch implementation available');
    }
    const res = await fetchFn(this.options.jwksUrl, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`[DAuth:Keycloak] JWKS fetch failed: ${res.status} ${res.statusText}`);
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
 * Convert a JWK (as returned by Keycloak's JWKS endpoint) to a PEM that
 * `jsonwebtoken` can verify. Handles RSA keys with n/e or x5c cert chains.
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
  // RSA public key in ASN.1 DER — minimal encoder sufficient for n/e inputs.
  const derBody = Buffer.concat([
    encodeInteger(modulus),
    encodeInteger(exponent),
  ]);
  const sequence = encodeSequence(derBody);
  const bitString = Buffer.concat([Buffer.from([0x00]), sequence]);
  const algorithmIdentifier = Buffer.from([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]);
  const subjectPublicKeyInfo = encodeSequence(
    Buffer.concat([algorithmIdentifier, encodeBitString(bitString)]),
  );
  return `-----BEGIN PUBLIC KEY-----\n${chunk(subjectPublicKeyInfo.toString('base64'), 64)}\n-----END PUBLIC KEY-----\n`;
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
  // Prepend 0x00 when high bit is set to keep it unsigned.
  const body = buf[0] & 0x80 ? Buffer.concat([Buffer.from([0x00]), buf]) : buf;
  return Buffer.concat([Buffer.from([0x02]), encodeLength(body.length), body]);
}

function encodeSequence(body: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x30]), encodeLength(body.length), body]);
}

function encodeBitString(body: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x03]), encodeLength(body.length), body]);
}

/**
 * Gateway-origin signer (Wave 1).
 *
 * MIRROR — keep this 1:1 with the canonical implementation at
 *   platform/dauth/packages/shared/src/gateway-origin.ts
 *
 * The two copies exist because:
 *   • The gateway is intentionally a minimal-dependency service (its
 *     package.json mirrors a "thin shell" — no workspace deps on the
 *     DAuth package today; adding one would pull a large dependency
 *     graph through this trust-critical entry point).
 *   • The signer is ~40 lines of pure HMAC crypto, low duplication risk.
 *   • A contract test in `__tests__/gateway-origin.contract.test.ts`
 *     produces fixed signed tokens with known inputs and asserts that
 *     the canonical verifier accepts them. If the two copies drift, the
 *     contract test fails.
 *
 * Any change to the token shape, encoding, or signing algorithm MUST be
 * applied to BOTH files in the same commit, with a passing contract test.
 */
import crypto from 'node:crypto';

export const GATEWAY_ORIGIN_HEADER = 'x-dos-gateway-token';

/** The full set of incoming headers the gateway MUST strip before auth. */
export const STRIPPED_INBOUND_HEADERS: ReadonlyArray<string> = Object.freeze([
  'x-dos-gateway-token',
  'x-user-sub',
  'x-user-id',
  'x-user-email',
  'x-user-name',
  'x-user-roles',
  'x-tenant-id',
  'x-tenant-code',
  /** Gateway-only; never trust from clients (injected after JWT verify). */
  'x-platform-super-admin',
]);

export interface GatewayOriginPayload {
  iat: number;
  exp: number;
  jti: string;
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
  src: 'gateway';
  v: 1;
}

export interface SignGatewayOriginInput {
  sub: string;
  tenantId?: string | null;
  email: string;
  roles?: string[];
  ttlSeconds?: number;
  jti?: string;
  nowSeconds?: number;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
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

/**
 * Strip every identity header listed in `STRIPPED_INBOUND_HEADERS` from the
 * raw inbound request. Called BEFORE auth verification, so a request
 * pre-populated by an attacker with `x-user-sub: evil` cannot survive into
 * `authGuard`'s response chain.
 */
export function stripInboundIdentityHeaders(req: { headers: Record<string, unknown> }): void {
  for (const h of STRIPPED_INBOUND_HEADERS) {
    delete req.headers[h];
  }
}

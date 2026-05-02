/**
 * TokenVerifier port — lets DAuth delegate JWT verification to a pluggable
 * backend (native jsonwebtoken/jose path vs. Keycloak JWKS) without
 * forcing every call site to be aware of which one is active.
 *
 * The port is **async** because Keycloak's JWKS fetch is I/O-bound. The
 * native adapter can still run synchronously under the hood — it just
 * exposes the same async surface.
 *
 * Native behavior invariant: when no external IdP is configured, the
 * NativeTokenVerifier's verify() result MUST be byte-identical to the
 * service's pre-port verifyAccessTokenAsync output.
 */

// Payload shape is intentionally loose here — the consumer project
// (services/auth-service) has its own `AuthPayload` type that extends this
// contract with project-specific fields. We deliberately do NOT include an
// index signature (`[k: string]: unknown`) because that would force all
// consumers to declare every additional field as `unknown`, conflicting
// with strongly-typed `AuthPayload` definitions that already exist.
export interface MinimalAuthPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  jti?: string;
}

export interface TokenVerifyResult<P extends MinimalAuthPayload = MinimalAuthPayload> {
  payload: P;
  source: 'native' | 'keycloak' | 'custom';
  keyId?: string;
}

export interface TokenVerifier<P extends MinimalAuthPayload = MinimalAuthPayload> {
  readonly name: 'native' | 'keycloak' | 'custom';
  verify(token: string): Promise<TokenVerifyResult<P>>;
}

export class InvalidTokenError extends Error {
  constructor(
    message: string,
    public readonly code: 'EXPIRED' | 'MALFORMED' | 'SIGNATURE' | 'AUDIENCE' | 'ISSUER' | 'UNKNOWN',
    public readonly source: TokenVerifier['name'],
  ) {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

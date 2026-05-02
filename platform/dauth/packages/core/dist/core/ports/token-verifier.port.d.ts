/**
 * TokenVerifier port — abstracts JWT verification so DAuth can delegate to
 * an external IdP (Keycloak JWKS) or fall back to local HS256 verification.
 *
 * Native adapter wraps the existing jsonwebtoken flow in identity/token.service.ts
 * Keycloak adapter fetches JWKS and verifies RS256 signatures.
 *
 * Shadow mode: both adapters run in parallel, results compared, mismatches
 * logged to the decision ledger. Final decision remains the native one until
 * DAUTH_KEYCLOAK_ENFORCE=true.
 */
import type { AuthPayload } from '../identity/token.service';
export interface TokenVerifyResult {
    /** Decoded payload when verification succeeds. */
    payload: AuthPayload;
    /** Adapter that produced this result — stamped onto the decision ledger. */
    source: 'native' | 'keycloak' | 'custom';
    /** Optional key identifier (kid) — relevant for JWKS rotation diagnostics. */
    keyId?: string;
}
export interface TokenVerifier {
    readonly name: 'native' | 'keycloak' | 'custom';
    /**
     * Verify a JWT access token. Throws `InvalidTokenError` on failure.
     * Never returns a partial or "soft-deny" — authentication is a hard gate.
     */
    verify(token: string): Promise<TokenVerifyResult>;
}
export declare class InvalidTokenError extends Error {
    readonly code: 'EXPIRED' | 'MALFORMED' | 'SIGNATURE' | 'AUDIENCE' | 'ISSUER' | 'UNKNOWN';
    readonly source: TokenVerifier['name'];
    constructor(message: string, code: 'EXPIRED' | 'MALFORMED' | 'SIGNATURE' | 'AUDIENCE' | 'ISSUER' | 'UNKNOWN', source: TokenVerifier['name']);
}

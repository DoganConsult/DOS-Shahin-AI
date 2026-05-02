/**
 * Canonical JWT issuance for DOS platform services.
 *
 * Single source of truth for access + refresh token signing. Services that
 * need to mint tokens (auth-service login, onboarding-service register,
 * invitation accept, etc.) MUST import from here — no service-local JWT
 * signing is permitted.
 *
 * Secret resolution is delegated to @dos/platform-core's
 * `resolveJwtSigningSecret`, which enforces production-mode fail-closed
 * semantics and rejects weak dev sentinels.
 */
export interface AccessTokenClaims {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
    role_code: string;
    is_super_admin: boolean;
    /** Optional — platform-wide role (e.g. 'platform_admin'). */
    platformRole?: string;
    /** Optional — onboarding session id to bind to this access token. */
    sessionId?: string;
    /** Optional — tenant schema name, useful for downstream `search_path` pinning. */
    schemaName?: string;
}
export interface IssueAccessTokenOptions {
    jti?: string;
    /** Override default expiry ("1h"). Seconds number OR zeit string. */
    expiresIn?: string | number;
    /** Context label surfaced in JWT-secret policy errors. */
    context?: string;
}
export interface IssueRefreshTokenOptions {
    jti?: string;
    familyId?: string;
    /** Override default expiry ("7d"). Seconds number OR zeit string. */
    expiresIn?: string | number;
    /** Context label surfaced in JWT-secret policy errors. */
    context?: string;
}
export interface RefreshTokenResult {
    token: string;
    jti: string;
    familyId: string;
    expiresAt: Date;
}
export declare function issueAccessToken(claims: AccessTokenClaims, options?: IssueAccessTokenOptions): string;
/**
 * Mint a refresh token. The caller is responsible for persisting the
 * family row via `refresh_token_families` (see @dos/auth session
 * domain helpers) — this function only signs the JWT.
 */
export declare function issueRefreshToken(userId: string, tenantId: string, options?: IssueRefreshTokenOptions): RefreshTokenResult;

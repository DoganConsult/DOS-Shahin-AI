/**
 * Keycloak ROPC (Resource Owner Password Credentials) client — used by
 * auth-service `/api/auth/login` to authenticate a user's email + password
 * against Keycloak's token endpoint and receive an RS256 access token
 * signed by the realm's JWKS.
 *
 * Why a separate client from `KeycloakAdminClient`:
 * - The admin client uses `client_credentials` grant for service-account
 *   access. This client uses `password` grant (ROPC) for end-user login.
 * - Different Keycloak client id/secret: the backend login path MUST use a
 *   dedicated confidential client (`dauth-login`) with
 *   `directAccessGrantsEnabled=true`, whereas `dauth-write` is scoped to
 *   admin writes.
 * - Never exposed to the browser. The ROPC grant is acceptable only when
 *   the calling tier is a trusted confidential client.
 *
 * MFA behaviour: Keycloak's direct-access-grant accepts an optional `totp`
 * form parameter. If the user has OTP enrolled and `totp` is missing or
 * wrong, Keycloak returns HTTP 401 with `error=invalid_grant` and an
 * `error_description` that mentions "Invalid user credentials" (generic
 * for security). The caller distinguishes "needs MFA" from "bad password"
 * by inspecting the user's credentials via the Admin API before retry —
 * see `services/auth-service/src/routes/auth.routes.ts`.
 *
 * Required actions: when Keycloak user has pending required actions
 * (VERIFY_EMAIL, UPDATE_PASSWORD, CONFIGURE_TOTP) the grant fails with
 * `error=invalid_grant` + `error_description="Account is not fully set up"`.
 * The caller surfaces this distinctly so the client can redirect the user
 * to the reset flow.
 */
export interface KeycloakLoginClientOptions {
    /**
     * Public-facing Keycloak base URL. Used as the apparent origin Keycloak
     * sees (via `X-Forwarded-Host`) so its hostname-v2 provider keeps emitting
     * the public issuer and the minted tokens carry the expected `iss` claim.
     */
    baseUrl: string;
    /**
     * Optional internal backchannel base URL. When set (typically
     * `http://127.0.0.1:8180`), token/logout requests are fetched from this
     * origin instead of `baseUrl`, while `Host` / `X-Forwarded-Host` /
     * `X-Forwarded-Proto` are forged to match `baseUrl`. This mirrors
     * `kcInternalFetch` in auth-service (commit 2c0b3129e) and avoids the
     * Cloudflare-fronted public host being loopback-blocked from the
     * platform VM. Only the host portion of `baseUrl` is matched — when
     * absent or unparseable, the fetch falls back to `baseUrl` unchanged.
     */
    internalBaseUrl?: string;
    realm: string;
    clientId: string;
    clientSecret: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
}
export interface PasswordGrantRequest {
    username: string;
    password: string;
    /** TOTP code when MFA is enrolled. */
    totp?: string;
    /** Space-separated scopes. Defaults to `openid profile email`. */
    scope?: string;
}
export interface TokenGrantResponse {
    accessToken: string;
    refreshToken: string;
    idToken?: string;
    expiresIn: number;
    refreshExpiresIn: number;
    scope?: string;
    tokenType: string;
}
export type KeycloakGrantErrorCode = 'invalid_grant' | 'invalid_client' | 'invalid_request' | 'unauthorized_client' | 'unsupported_grant_type' | 'invalid_scope' | 'network_error' | 'timeout' | 'unknown';
export declare class KeycloakGrantError extends Error {
    readonly code: KeycloakGrantErrorCode;
    readonly httpStatus: number;
    readonly errorDescription?: string;
    constructor(message: string, code: KeycloakGrantErrorCode, httpStatus: number, errorDescription?: string);
    /**
     * Best-effort classification: does this error correspond to "MFA / required
     * action / account-not-set-up" rather than "bad password"? Keycloak uses
     * the same `invalid_grant` code for both, but the error_description
     * differs. The caller is expected to fall back to an Admin-API check on
     * the user's credentials when this returns `true`, to distinguish
     * MFA-required from credentials-invalid authoritatively.
     */
    isPossiblyMfaOrRequiredAction(): boolean;
}
export declare class KeycloakLoginClient {
    private readonly baseUrl;
    private readonly internalBaseUrl;
    private readonly publicHost;
    private readonly realm;
    private readonly clientId;
    private readonly clientSecret;
    private readonly timeoutMs;
    private readonly fetchImpl;
    constructor(opts: KeycloakLoginClientOptions);
    /**
     * Resolve the actual fetch target + forged headers for a backchannel call.
     * When `internalBaseUrl` is configured, the TCP target becomes the internal
     * loopback origin while Keycloak still sees the public host via
     * `Host` / `X-Forwarded-*`, preserving the public issuer in minted tokens.
     */
    private resolveBackchannel;
    /**
     * Exchange username + password (+ optional totp) for Keycloak tokens.
     * RS256 access token, signed by the realm, audience per the realm's
     * audience mapper (expected to be `shahin-bff` or the configured
     * KEYCLOAK_AUDIENCE).
     */
    passwordGrant(req: PasswordGrantRequest): Promise<TokenGrantResponse>;
    /** Exchange a refresh token for a new access + refresh token pair. */
    refreshGrant(refreshToken: string): Promise<TokenGrantResponse>;
    /**
     * Revoke a Keycloak session using its refresh token. Calls the realm
     * logout endpoint. Idempotent — Keycloak returns 204 whether or not the
     * token was active. Does not throw on network failure so the calling
     * `/logout` route can still respond to the user.
     */
    logout(refreshToken: string): Promise<{
        ok: boolean;
        httpStatus: number;
    }>;
    private tokenRequest;
}
/**
 * Factory — returns a client instance when env config is present, else null.
 * Consumers treat null as "Keycloak ROPC not configured" and fall back to
 * the native credential path (unless ENFORCE=true, in which case they must
 * reject login with 503 until config is complete).
 *
 * Env priority for client id/secret:
 *   KEYCLOAK_LOGIN_CLIENT_ID / _SECRET (new; preferred)
 *   falls back to KEYCLOAK_ADMIN_WRITE_CLIENT_* only if admin client happens
 *   to have directAccessGrantsEnabled (not recommended).
 */
export declare function buildDefaultKeycloakLoginClient(): KeycloakLoginClient | null;

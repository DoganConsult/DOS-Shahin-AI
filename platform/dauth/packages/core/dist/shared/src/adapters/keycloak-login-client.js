"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakLoginClient = exports.KeycloakGrantError = void 0;
exports.buildDefaultKeycloakLoginClient = buildDefaultKeycloakLoginClient;
class KeycloakGrantError extends Error {
    code;
    httpStatus;
    errorDescription;
    constructor(message, code, httpStatus, errorDescription) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        this.errorDescription = errorDescription;
        this.name = 'KeycloakGrantError';
    }
    /**
     * Best-effort classification: does this error correspond to "MFA / required
     * action / account-not-set-up" rather than "bad password"? Keycloak uses
     * the same `invalid_grant` code for both, but the error_description
     * differs. The caller is expected to fall back to an Admin-API check on
     * the user's credentials when this returns `true`, to distinguish
     * MFA-required from credentials-invalid authoritatively.
     */
    isPossiblyMfaOrRequiredAction() {
        if (this.code !== 'invalid_grant')
            return false;
        const d = (this.errorDescription ?? '').toLowerCase();
        return (d.includes('account is not fully set up') ||
            d.includes('account disabled') ||
            d.includes('required action') ||
            d.includes('invalid otp') ||
            d.includes('invalid totp'));
    }
}
exports.KeycloakGrantError = KeycloakGrantError;
class KeycloakLoginClient {
    baseUrl;
    internalBaseUrl;
    publicHost;
    realm;
    clientId;
    clientSecret;
    timeoutMs;
    fetchImpl;
    constructor(opts) {
        if (!opts.baseUrl)
            throw new Error('[DAuth:KeycloakLogin] baseUrl is required');
        if (!opts.realm)
            throw new Error('[DAuth:KeycloakLogin] realm is required');
        if (!opts.clientId)
            throw new Error('[DAuth:KeycloakLogin] clientId is required');
        if (!opts.clientSecret)
            throw new Error('[DAuth:KeycloakLogin] clientSecret is required');
        this.baseUrl = opts.baseUrl.replace(/\/$/, '');
        this.internalBaseUrl = opts.internalBaseUrl ? opts.internalBaseUrl.replace(/\/$/, '') : null;
        let publicHost = null;
        try {
            publicHost = new URL(this.baseUrl).host;
        }
        catch { /* ignore */ }
        this.publicHost = publicHost;
        this.realm = opts.realm;
        this.clientId = opts.clientId;
        this.clientSecret = opts.clientSecret;
        this.timeoutMs = opts.timeoutMs ?? 5_000;
        const f = opts.fetchImpl ?? globalThis.fetch;
        if (!f)
            throw new Error('[DAuth:KeycloakLogin] no fetch impl available');
        this.fetchImpl = f;
    }
    /**
     * Resolve the actual fetch target + forged headers for a backchannel call.
     * When `internalBaseUrl` is configured, the TCP target becomes the internal
     * loopback origin while Keycloak still sees the public host via
     * `Host` / `X-Forwarded-*`, preserving the public issuer in minted tokens.
     */
    resolveBackchannel(publicUrl, extraHeaders) {
        const headers = { ...extraHeaders };
        if (!this.internalBaseUrl)
            return { url: publicUrl, headers };
        let parsed;
        try {
            parsed = new URL(publicUrl);
        }
        catch {
            return { url: publicUrl, headers };
        }
        if (this.publicHost && parsed.host !== this.publicHost)
            return { url: publicUrl, headers };
        const url = `${this.internalBaseUrl}${parsed.pathname}${parsed.search}`;
        if (!('host' in headers) && !('Host' in headers))
            headers.host = parsed.host;
        if (!('x-forwarded-host' in headers))
            headers['x-forwarded-host'] = parsed.host;
        if (!('x-forwarded-proto' in headers))
            headers['x-forwarded-proto'] = parsed.protocol.replace(':', '') || 'https';
        if (!('x-forwarded-port' in headers))
            headers['x-forwarded-port'] = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
        return { url, headers };
    }
    /**
     * Exchange username + password (+ optional totp) for Keycloak tokens.
     * RS256 access token, signed by the realm, audience per the realm's
     * audience mapper (expected to be `shahin-bff` or the configured
     * KEYCLOAK_AUDIENCE).
     */
    async passwordGrant(req) {
        const body = new URLSearchParams({
            grant_type: 'password',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            username: req.username,
            password: req.password,
            scope: req.scope ?? 'openid profile email',
        });
        if (req.totp)
            body.set('totp', req.totp);
        return this.tokenRequest(body);
    }
    /** Exchange a refresh token for a new access + refresh token pair. */
    async refreshGrant(refreshToken) {
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: refreshToken,
        });
        return this.tokenRequest(body);
    }
    /**
     * Revoke a Keycloak session using its refresh token. Calls the realm
     * logout endpoint. Idempotent — Keycloak returns 204 whether or not the
     * token was active. Does not throw on network failure so the calling
     * `/logout` route can still respond to the user.
     */
    async logout(refreshToken) {
        const body = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: refreshToken,
        });
        const publicUrl = `${this.baseUrl}/realms/${encodeURIComponent(this.realm)}/protocol/openid-connect/logout`;
        const { url, headers } = this.resolveBackchannel(publicUrl, { 'Content-Type': 'application/x-www-form-urlencoded' });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const res = await this.fetchImpl(url, {
                method: 'POST',
                headers,
                body: body.toString(),
                signal: controller.signal,
            });
            return { ok: res.ok, httpStatus: res.status };
        }
        catch {
            return { ok: false, httpStatus: 0 };
        }
        finally {
            clearTimeout(timer);
        }
    }
    async tokenRequest(body) {
        const publicUrl = `${this.baseUrl}/realms/${encodeURIComponent(this.realm)}/protocol/openid-connect/token`;
        const { url, headers } = this.resolveBackchannel(publicUrl, {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        let res;
        try {
            res = await this.fetchImpl(url, {
                method: 'POST',
                headers,
                body: body.toString(),
                signal: controller.signal,
            });
        }
        catch (err) {
            clearTimeout(timer);
            const isAbort = err?.name === 'AbortError';
            throw new KeycloakGrantError(`Keycloak token endpoint unreachable: ${String(err?.message ?? err)}`, isAbort ? 'timeout' : 'network_error', 0);
        }
        clearTimeout(timer);
        if (!res.ok) {
            let errBody = {};
            try {
                errBody = (await res.json());
            }
            catch {
                // non-json body — leave blank
            }
            const code = normalizeErrorCode(errBody.error, res.status);
            throw new KeycloakGrantError(errBody.error_description ?? `Keycloak token request failed: ${res.status}`, code, res.status, errBody.error_description);
        }
        const payload = (await res.json());
        return {
            accessToken: payload.access_token,
            refreshToken: payload.refresh_token,
            idToken: payload.id_token,
            expiresIn: payload.expires_in,
            refreshExpiresIn: payload.refresh_expires_in,
            tokenType: payload.token_type,
            scope: payload.scope,
        };
    }
}
exports.KeycloakLoginClient = KeycloakLoginClient;
function normalizeErrorCode(raw, httpStatus) {
    switch (raw) {
        case 'invalid_grant':
        case 'invalid_client':
        case 'invalid_request':
        case 'unauthorized_client':
        case 'unsupported_grant_type':
        case 'invalid_scope':
            return raw;
        default:
            return httpStatus >= 500 ? 'unknown' : 'unknown';
    }
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
function buildDefaultKeycloakLoginClient() {
    const baseUrl = process.env.KEYCLOAK_BASE_URL;
    const internalBaseUrl = process.env.KEYCLOAK_INTERNAL_BASE_URL;
    const realm = process.env.KEYCLOAK_REALM;
    const clientId = process.env.KEYCLOAK_LOGIN_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_LOGIN_CLIENT_SECRET;
    if (!baseUrl || !realm || !clientId || !clientSecret)
        return null;
    return new KeycloakLoginClient({ baseUrl, internalBaseUrl, realm, clientId, clientSecret });
}
//# sourceMappingURL=keycloak-login-client.js.map
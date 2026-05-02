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

export type KeycloakGrantErrorCode =
  | 'invalid_grant'
  | 'invalid_client'
  | 'invalid_request'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'invalid_scope'
  | 'network_error'
  | 'timeout'
  | 'unknown';

export class KeycloakGrantError extends Error {
  constructor(
    message: string,
    public readonly code: KeycloakGrantErrorCode,
    public readonly httpStatus: number,
    public readonly errorDescription?: string,
  ) {
    super(message);
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
  isPossiblyMfaOrRequiredAction(): boolean {
    if (this.code !== 'invalid_grant') return false;
    const d = (this.errorDescription ?? '').toLowerCase();
    return (
      d.includes('account is not fully set up') ||
      d.includes('account disabled') ||
      d.includes('required action') ||
      d.includes('invalid otp') ||
      d.includes('invalid totp')
    );
  }
}

export class KeycloakLoginClient {
  private readonly baseUrl: string;
  private readonly internalBaseUrl: string | null;
  private readonly publicHost: string | null;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: KeycloakLoginClientOptions) {
    if (!opts.baseUrl) throw new Error('[DAuth:KeycloakLogin] baseUrl is required');
    if (!opts.realm) throw new Error('[DAuth:KeycloakLogin] realm is required');
    if (!opts.clientId) throw new Error('[DAuth:KeycloakLogin] clientId is required');
    if (!opts.clientSecret) throw new Error('[DAuth:KeycloakLogin] clientSecret is required');
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.internalBaseUrl = opts.internalBaseUrl ? opts.internalBaseUrl.replace(/\/$/, '') : null;
    let publicHost: string | null = null;
    try { publicHost = new URL(this.baseUrl).host; } catch { /* ignore */ }
    this.publicHost = publicHost;
    this.realm = opts.realm;
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.timeoutMs = opts.timeoutMs ?? 5_000;
    const f = opts.fetchImpl ?? globalThis.fetch;
    if (!f) throw new Error('[DAuth:KeycloakLogin] no fetch impl available');
    this.fetchImpl = f;
  }

  /**
   * Resolve the actual fetch target + forged headers for a backchannel call.
   * When `internalBaseUrl` is configured, the TCP target becomes the internal
   * loopback origin while Keycloak still sees the public host via
   * `Host` / `X-Forwarded-*`, preserving the public issuer in minted tokens.
   */
  private resolveBackchannel(publicUrl: string, extraHeaders: Record<string, string>): { url: string; headers: Record<string, string> } {
    const headers: Record<string, string> = { ...extraHeaders };
    if (!this.internalBaseUrl) return { url: publicUrl, headers };
    let parsed: URL;
    try { parsed = new URL(publicUrl); } catch { return { url: publicUrl, headers }; }
    if (this.publicHost && parsed.host !== this.publicHost) return { url: publicUrl, headers };
    const url = `${this.internalBaseUrl}${parsed.pathname}${parsed.search}`;
    if (!('host' in headers) && !('Host' in headers)) headers.host = parsed.host;
    if (!('x-forwarded-host' in headers)) headers['x-forwarded-host'] = parsed.host;
    if (!('x-forwarded-proto' in headers)) headers['x-forwarded-proto'] = parsed.protocol.replace(':', '') || 'https';
    if (!('x-forwarded-port' in headers)) headers['x-forwarded-port'] = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    return { url, headers };
  }

  /**
   * Exchange username + password (+ optional totp) for Keycloak tokens.
   * RS256 access token, signed by the realm, audience per the realm's
   * audience mapper (expected to be `shahin-bff` or the configured
   * KEYCLOAK_AUDIENCE).
   */
  async passwordGrant(req: PasswordGrantRequest): Promise<TokenGrantResponse> {
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: req.username,
      password: req.password,
      scope: req.scope ?? 'openid profile email',
    });
    if (req.totp) body.set('totp', req.totp);
    return this.tokenRequest(body);
  }

  /** Exchange a refresh token for a new access + refresh token pair. */
  async refreshGrant(refreshToken: string): Promise<TokenGrantResponse> {
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
  async logout(refreshToken: string): Promise<{ ok: boolean; httpStatus: number }> {
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
    } catch {
      return { ok: false, httpStatus: 0 };
    } finally {
      clearTimeout(timer);
    }
  }

  private async tokenRequest(body: URLSearchParams): Promise<TokenGrantResponse> {
    const publicUrl = `${this.baseUrl}/realms/${encodeURIComponent(this.realm)}/protocol/openid-connect/token`;
    const { url, headers } = this.resolveBackchannel(publicUrl, {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: 'POST',
        headers,
        body: body.toString(),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const isAbort = (err as { name?: string })?.name === 'AbortError';
      throw new KeycloakGrantError(
        `Keycloak token endpoint unreachable: ${String((err as Error)?.message ?? err)}`,
        isAbort ? 'timeout' : 'network_error',
        0,
      );
    }
    clearTimeout(timer);

    if (!res.ok) {
      let errBody: { error?: string; error_description?: string } = {};
      try {
        errBody = (await res.json()) as typeof errBody;
      } catch {
        // non-json body — leave blank
      }
      const code = normalizeErrorCode(errBody.error, res.status);
      throw new KeycloakGrantError(
        errBody.error_description ?? `Keycloak token request failed: ${res.status}`,
        code,
        res.status,
        errBody.error_description,
      );
    }

    const payload = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      id_token?: string;
      expires_in: number;
      refresh_expires_in: number;
      token_type: string;
      scope?: string;
    };

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

function normalizeErrorCode(raw: string | undefined, httpStatus: number): KeycloakGrantErrorCode {
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
export function buildDefaultKeycloakLoginClient(): KeycloakLoginClient | null {
  const baseUrl = process.env.KEYCLOAK_BASE_URL;
  const internalBaseUrl = process.env.KEYCLOAK_INTERNAL_BASE_URL;
  const realm = process.env.KEYCLOAK_REALM;
  const clientId = process.env.KEYCLOAK_LOGIN_CLIENT_ID;
  const clientSecret = process.env.KEYCLOAK_LOGIN_CLIENT_SECRET;
  if (!baseUrl || !realm || !clientId || !clientSecret) return null;
  return new KeycloakLoginClient({ baseUrl, internalBaseUrl, realm, clientId, clientSecret });
}

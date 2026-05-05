"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.oidcRouter = void 0;
/**
 * OIDC browser-mediated flow (clean shell).
 *
 *   /oidc/start    → 302 https://shahin-ai.com/login/realms/dogan/protocol/openid-connect/auth?...
 *   /oidc/callback → POST token endpoint → set httpOnly cookies → 302 /workspace-home
 *
 * No onboarding wizard. Register submit lands directly on /workspace-home.
 */
const express_1 = require("express");
const node_crypto_1 = __importDefault(require("node:crypto"));
const axios_1 = __importDefault(require("axios"));
const session_1 = require("../lib/session");
const pg_1 = require("pg");
const post_login_roles_1 = require("../lib/post-login-roles");
// Fix 6 (Phase 18) — Lazy pool used by post-login role hook. Optional;
// hook is a no-op when DATABASE_URL is unset (CI / local without DB).
let _pool = null;
function getPool() {
    if (_pool)
        return _pool;
    const url = process.env.DATABASE_URL;
    if (!url)
        return null;
    _pool = new pg_1.Pool({ connectionString: url, max: 4, idleTimeoutMillis: 10_000 });
    return _pool;
}
const AUTH_PUBLIC = `${session_1.KC_BASE}/realms/${session_1.KC_REALM}/protocol/openid-connect/auth`;
const REGISTRATIONS_PUBLIC = `${session_1.KC_BASE}/realms/${session_1.KC_REALM}/protocol/openid-connect/registrations`;
const TOKEN_INTERNAL = `${session_1.KC_INTERNAL}/realms/${session_1.KC_REALM}/protocol/openid-connect/token`;
exports.oidcRouter = (0, express_1.Router)();
function authFailureRoute(mode, autoProvisionAttempted, code) {
    const targetMode = autoProvisionAttempted ? 'register' : mode;
    const path = targetMode === 'register' ? '/register' : '/login';
    return `${path}?error=${encodeURIComponent(code)}`;
}
function tenantDispatchFailureCode(resp) {
    const blocked = resp?.data?.blocked;
    if (typeof blocked === 'string' && blocked)
        return blocked;
    const error = resp?.data?.error;
    if (typeof error === 'string' && error)
        return error;
    return 'BACKEND_ERROR';
}
exports.oidcRouter.get('/start', (req, res) => {
    const mode = req.query.mode === 'register' ? 'register' : 'login';
    const state = node_crypto_1.default.randomBytes(16).toString('hex');
    const nonce = node_crypto_1.default.randomBytes(16).toString('hex');
    const verifier = node_crypto_1.default.randomBytes(32).toString('base64url');
    const challenge = node_crypto_1.default.createHash('sha256').update(verifier).digest('base64url');
    res.cookie(session_1.COOKIE_STATE, JSON.stringify({ state, nonce, verifier, mode, returnUrl: session_1.DEFAULT_LANDING }), {
        httpOnly: true, secure: session_1.SECURE, sameSite: session_1.SAMESITE, domain: session_1.COOKIE_DOMAIN, path: '/',
        maxAge: 10 * 60 * 1000,
    });
    // Use the dedicated `/registrations` endpoint to land users directly on
    // Keycloak's signup form. The `/auth?kc_action=register` query only fires
    // for already-authenticated users in modern Keycloak, which is why every
    // CTA was previously falling back to the login screen.
    const url = new URL(mode === 'register' ? REGISTRATIONS_PUBLIC : AUTH_PUBLIC);
    url.searchParams.set('client_id', session_1.CLIENT_ID);
    url.searchParams.set('redirect_uri', session_1.REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    if (mode === 'login') {
        url.searchParams.set('prompt', 'login');
    }
    res.redirect(302, url.toString());
});
exports.oidcRouter.get('/callback', async (req, res) => {
    const code = req.query.code;
    const stateParam = req.query.state;
    const kcActionStatus = req.query.kc_action_status;
    const errorParam = req.query.error;
    // KC custom action (registration) failed server-side. Recover by sending
    // the user back to /oidc/start?mode=register instead of exchanging the
    // poisoned authorization code.
    if (kcActionStatus && kcActionStatus !== 'success') {
        return res.redirect(302, '/api/auth/oidc/start?mode=register');
    }
    if (errorParam) {
        return res.redirect(302, `/?auth_error=${encodeURIComponent(errorParam)}`);
    }
    if (!code || !stateParam)
        return res.status(400).send('Missing code/state');
    const raw = req.cookies?.[session_1.COOKIE_STATE];
    if (!raw)
        return res.status(400).send('STATE_COOKIE_MISSING');
    let stored;
    try {
        stored = JSON.parse(raw);
    }
    catch {
        return res.status(400).send('STATE_COOKIE_MALFORMED');
    }
    if (stored.state !== stateParam)
        return res.status(400).send('STATE_MISMATCH');
    try {
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: session_1.REDIRECT_URI,
            client_id: session_1.CLIENT_ID,
            client_secret: session_1.CLIENT_SECRET,
            code_verifier: stored.verifier,
        });
        const { data } = await axios_1.default.post(TOKEN_INTERNAL, body.toString(), {
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            timeout: 10_000,
        });
        const cookieOpts = {
            httpOnly: true, secure: session_1.SECURE, sameSite: session_1.SAMESITE, domain: session_1.COOKIE_DOMAIN, path: '/',
        };
        res.cookie(session_1.COOKIE_ACCESS, data.access_token, { ...cookieOpts, maxAge: (0, session_1.expiresMs)(data.expires_in, 'expires_in') });
        if (data.refresh_token) {
            res.cookie(session_1.COOKIE_REFRESH, data.refresh_token, { ...cookieOpts, maxAge: (0, session_1.expiresMs)(data.refresh_expires_in, 'refresh_expires_in') });
        }
        res.clearCookie(session_1.COOKIE_STATE, { ...cookieOpts });
        // Dispatch to tenant-service so register/login finishes the workspace
        // resolution server-side (Tasks 3/4/5). On register -> POST /register;
        // on login -> GET /me (recovers old users via email-fallback). Any
        // non-2xx response must fail closed back to a real auth entry route so
        // the SPA never boots the workspace with a half-resolved session.
        let landing = stored.returnUrl || session_1.DEFAULT_LANDING;
        try {
            if (session_1.TENANT_SERVICE_URL) {
                const mode = stored.mode === 'register' ? 'register' : 'login';
                const claims = (0, session_1.decodeAccessTokenClaims)(data.access_token);
                if (!claims.sub || !claims.email)
                    throw new Error('NO_CLAIMS');
                const headers = {
                    'x-user-sub': claims.sub,
                    'x-user-email': claims.email,
                };
                if (claims.name)
                    headers['x-user-name'] = claims.name;
                // Patch 1 — propagate organisation-name claims projected by the
                // Keycloak BFF protocol mappers (see provision-dogan-realm.sh
                // [8.7/9] map-companyNameEn / map-companyNameAr). Tolerant of the
                // legacy single-claim `company` shape so partial deployments still
                // produce a valid orgName.
                const c = claims;
                const companyEn = (typeof c.companyNameEn === 'string' && c.companyNameEn)
                    || (typeof c.company === 'string' && c.company)
                    || null;
                const companyAr = (typeof c.companyNameAr === 'string' && c.companyNameAr) || null;
                if (companyEn)
                    headers['x-user-company'] = companyEn;
                if (companyAr)
                    headers['x-user-company-ar'] = companyAr;
                const path = mode === 'register' ? '/register' : '/me';
                let autoProvisionAttempted = false;
                let resp = await axios_1.default.request({
                    method: mode === 'register' ? 'post' : 'get',
                    url: `${session_1.TENANT_SERVICE_URL}${path}`,
                    data: mode === 'register'
                        ? { orgName: companyEn || undefined, orgNameAr: companyAr || undefined }
                        : undefined,
                    headers,
                    timeout: 10_000,
                    validateStatus: () => true,
                });
                // Auto-provision: if a login-mode user has no DB account or no
                // active membership, fall back to /register so any authenticated
                // identity always ends up with a workspace. This avoids the
                // /workspace-blocked dead-end for first-time logins that bypassed
                // the explicit register button.
                if (mode !== 'register' &&
                    resp.status === 409 &&
                    (resp.data?.blocked === 'NO_USER' || resp.data?.blocked === 'NO_MEMBERSHIP')) {
                    autoProvisionAttempted = true;
                    resp = await axios_1.default.request({
                        method: 'post',
                        url: `${session_1.TENANT_SERVICE_URL}/register`,
                        data: {},
                        headers,
                        timeout: 10_000,
                        validateStatus: () => true,
                    });
                }
                if (resp.status < 200 || resp.status >= 300) {
                    res.clearCookie(session_1.COOKIE_ACCESS, cookieOpts);
                    res.clearCookie(session_1.COOKIE_REFRESH, cookieOpts);
                    landing = authFailureRoute(mode, autoProvisionAttempted, tenantDispatchFailureCode(resp));
                }
                // Fix 6 (Phase 18) — Auto-assign DAuth role on first login. Closes
                // the silent RBAC void so AccessStore.hasPermission() can answer.
                try {
                    const pool = getPool();
                    const tenantId = resp?.data?.tenantId ||
                        resp?.data?.tenant?.id ||
                        resp?.data?.workspace?.tenantId ||
                        null;
                    if (pool && tenantId && claims.sub) {
                        const realmRoles = Array.isArray(claims?.realm_access?.roles)
                            ? claims.realm_access.roles
                            : [];
                        // Phase 18.1 — founder elevation. tenant-service /register returns
                        // { idempotent: false } when it just created the tenant in this
                        // same call. membership.isOwner==true is also a founder signal.
                        const isFounder = (resp?.data?.idempotent === false &&
                            (stored.mode === 'register' || resp?.data?.membership?.isOwner === true));
                        await (0, post_login_roles_1.ensureUserRoleAssignment)({
                            pool,
                            userSub: String(claims.sub),
                            email: String(claims.email),
                            tenantId: String(tenantId),
                            kcRealmRoles: realmRoles,
                            isFounder,
                        });
                    }
                }
                catch (e) {
                    console.warn('[oidc/callback] post-login role hook failed', e.message);
                }
                // Dynamic MFA gate. Per-tenant policy in dos.tenant_security_policy
                // (mfa_required boolean). When true, divert the landing target to
                // /auth/mfa and tag a cookie so the MFA page knows where to send
                // the user after a successful verify (handler.onSuccessRedirect
                // in the DB binding overrides this — kept here as a sane default).
                try {
                    const pool = getPool();
                    const tenantId = resp?.data?.tenantId ||
                        resp?.data?.tenant?.id ||
                        resp?.data?.workspace?.tenantId ||
                        null;
                    if (pool && tenantId) {
                        const polR = await pool.query(`SELECT mfa_required FROM dos.tenant_security_policy WHERE tenant_id = $1`, [tenantId]);
                        const mfaRequired = polR.rows[0]?.mfa_required === true;
                        if (mfaRequired) {
                            res.cookie('dos_mfa_return', landing, {
                                ...cookieOpts, maxAge: 10 * 60 * 1000,
                            });
                            landing = '/auth/mfa';
                        }
                    }
                }
                catch (e) {
                    console.warn('[oidc/callback] mfa policy lookup failed', e.message);
                }
            }
        }
        catch (e) {
            console.warn('[oidc/callback] tenant dispatch failed', e?.message || e);
            res.clearCookie(session_1.COOKIE_ACCESS, cookieOpts);
            res.clearCookie(session_1.COOKIE_REFRESH, cookieOpts);
            landing = authFailureRoute(stored.mode === 'register' ? 'register' : 'login', false, 'BACKEND_ERROR');
        }
        res.redirect(302, landing);
    }
    catch (err) {
        console.error('[oidc/callback] token exchange failed', err?.response?.data || err.message);
        res.status(502).send('TOKEN_EXCHANGE_FAILED');
    }
});
// Sanitized session-state endpoint for the SPA.
//
// The OIDC callback sets `dos_access_token` as httpOnly+Secure so the SPA
// cannot read it directly. Without a server-validated session probe the
// Angular guards have no way to know the user is authenticated and bounce
// them back to /login → infinite splash loop after KC redirect.
//
// This endpoint:
//   1. Reads the httpOnly access-token cookie server-side.
//   2. Validates it locally via Keycloak JWKS (signature, exp, iss, aud).
//   3. Optionally enriches with tenant context from tenant-service.
//   4. Returns ONLY non-sensitive display + routing metadata.
//
// The raw access token, refresh token, bearer value, and any signed JWT
// MUST NOT appear in the response body or response headers.
exports.oidcRouter.get('/session', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Cookie');
    const access = req.cookies?.[session_1.COOKIE_ACCESS];
    if (!access)
        return res.status(401).json({ authenticated: false, error: 'NO_SESSION' });
    let claims;
    try {
        claims = await (0, session_1.verifySession)(access);
    }
    catch {
        return res.status(401).json({ authenticated: false, error: 'INVALID_SESSION' });
    }
    const sub = typeof claims.sub === 'string' ? claims.sub : '';
    if (!sub)
        return res.status(401).json({ authenticated: false, error: 'INVALID_SESSION' });
    const email = typeof claims.email === 'string' ? claims.email : null;
    const name = typeof claims.name === 'string'
        ? claims.name
        : typeof claims['preferred_username'] === 'string'
            ? claims['preferred_username']
            : null;
    // Best-effort tenant + permission resolution. Failures fall back to a
    // minimal authenticated session — the SPA can still render the workspace
    // and lazy-load permissions.
    let tenant = {
        id: typeof claims['tenantId'] === 'string' ? claims['tenantId'] : null,
        name: null,
        slug: typeof claims['tenantCode'] === 'string' ? claims['tenantCode'] : null,
    };
    let permissions = [];
    let landingRoute = '/workspace-home';
    let role = typeof claims['role'] === 'string' ? claims['role'] : null;
    let isSuperAdmin = claims['isSuperAdmin'] === true;
    if (session_1.TENANT_SERVICE_URL) {
        try {
            const headers = { 'x-user-sub': sub };
            if (email)
                headers['x-user-email'] = email;
            if (name)
                headers['x-user-name'] = name;
            const resp = await axios_1.default.get(`${session_1.TENANT_SERVICE_URL}/me`, {
                headers, timeout: 5_000, validateStatus: () => true,
            });
            if (resp.status === 200 && resp.data && typeof resp.data === 'object') {
                const t = resp.data.tenant ?? {};
                tenant = {
                    id: typeof t.id === 'string' ? t.id : tenant.id,
                    name: typeof t.name === 'string' ? t.name : tenant.name,
                    slug: typeof t.slug === 'string' ? t.slug : (typeof t.code === 'string' ? t.code : tenant.slug),
                };
                if (typeof resp.data.role === 'string')
                    role = resp.data.role;
                if (resp.data.isSuperAdmin === true)
                    isSuperAdmin = true;
                if (Array.isArray(resp.data.permissions)) {
                    permissions = resp.data.permissions.filter((p) => typeof p === 'string');
                }
                if (typeof resp.data.landingRoute === 'string')
                    landingRoute = resp.data.landingRoute;
            }
        }
        catch {
            // tenant lookup is best-effort — keep claims-derived defaults
        }
    }
    return res.json({
        authenticated: true,
        user: { id: sub, email, name },
        tenant,
        workspace: { route: landingRoute },
        role,
        isSuperAdmin,
        permissions,
    });
});
// Rotate the access cookie using the refresh-token cookie. Invoked by the
// SPA before the access token expires (single source of truth = cookie).
exports.oidcRouter.post('/refresh', async (req, res) => {
    const refresh = req.cookies?.[session_1.COOKIE_REFRESH];
    if (!refresh)
        return res.status(401).json({ error: 'NO_REFRESH_COOKIE' });
    try {
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refresh,
            client_id: session_1.CLIENT_ID,
            client_secret: session_1.CLIENT_SECRET,
        });
        const { data } = await axios_1.default.post(TOKEN_INTERNAL, body.toString(), {
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            timeout: 10_000,
        });
        const cookieOpts = {
            httpOnly: true, secure: session_1.SECURE, sameSite: session_1.SAMESITE, domain: session_1.COOKIE_DOMAIN, path: '/',
        };
        res.cookie(session_1.COOKIE_ACCESS, data.access_token, { ...cookieOpts, maxAge: (0, session_1.expiresMs)(data.expires_in, 'expires_in') });
        if (data.refresh_token) {
            res.cookie(session_1.COOKIE_REFRESH, data.refresh_token, { ...cookieOpts, maxAge: (0, session_1.expiresMs)(data.refresh_expires_in, 'refresh_expires_in') });
        }
        res.json({ ok: true, expiresIn: data.expires_in });
    }
    catch (err) {
        console.error('[oidc/refresh] failed', err?.response?.data || err.message);
        const cookieOpts = { httpOnly: true, secure: session_1.SECURE, sameSite: session_1.SAMESITE, domain: session_1.COOKIE_DOMAIN, path: '/' };
        res.clearCookie(session_1.COOKIE_ACCESS, cookieOpts);
        res.clearCookie(session_1.COOKIE_REFRESH, cookieOpts);
        res.status(401).json({ error: 'REFRESH_FAILED' });
    }
});
// Server-side logout — clears cookies and revokes the refresh token in KC.
exports.oidcRouter.post('/logout', async (req, res) => {
    const refresh = req.cookies?.[session_1.COOKIE_REFRESH];
    const cookieOpts = { httpOnly: true, secure: session_1.SECURE, sameSite: session_1.SAMESITE, domain: session_1.COOKIE_DOMAIN, path: '/' };
    if (refresh) {
        try {
            const body = new URLSearchParams({
                client_id: session_1.CLIENT_ID, client_secret: session_1.CLIENT_SECRET, refresh_token: refresh,
            });
            await axios_1.default.post(`${session_1.KC_INTERNAL}/realms/${session_1.KC_REALM}/protocol/openid-connect/logout`, body.toString(), { headers: { 'content-type': 'application/x-www-form-urlencoded' }, timeout: 10_000 });
        }
        catch { /* best-effort */ }
    }
    res.clearCookie(session_1.COOKIE_ACCESS, cookieOpts);
    res.clearCookie(session_1.COOKIE_REFRESH, cookieOpts);
    res.clearCookie(session_1.COOKIE_STATE, cookieOpts);
    res.json({ ok: true });
});
//# sourceMappingURL=oidc.routes.js.map
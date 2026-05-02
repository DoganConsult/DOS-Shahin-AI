/**
 * OIDC browser-mediated flow (clean shell).
 *
 *   /oidc/start    → 302 https://shahin-ai.com/login/realms/dogan/protocol/openid-connect/auth?...
 *   /oidc/callback → POST token endpoint → set httpOnly cookies → 302 /workspace-home
 *
 * No onboarding wizard. Register submit lands directly on /workspace-home.
 */
import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import axios from 'axios';
import {
  KC_BASE,
  KC_INTERNAL,
  KC_REALM,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  COOKIE_STATE,
  COOKIE_DOMAIN,
  SAMESITE,
  SECURE,
  DEFAULT_LANDING,
  KC_ISSUER,
  KC_JWKS_URL,
  KC_AUDIENCE,
  sessionJwks,
  TENANT_SERVICE_URL,
  decodeAccessTokenClaims,
  expiresMs,
  verifySession,
} from '../lib/session';
import { Pool } from 'pg';
import { ensureUserRoleAssignment } from '../lib/post-login-roles';

// Fix 6 (Phase 18) — Lazy pool used by post-login role hook. Optional;
// hook is a no-op when DATABASE_URL is unset (CI / local without DB).
let _pool: Pool | null = null;
function getPool(): Pool | null {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  _pool = new Pool({ connectionString: url, max: 4, idleTimeoutMillis: 10_000 });
  return _pool;
}

const AUTH_PUBLIC          = `${KC_BASE}/realms/${KC_REALM}/protocol/openid-connect/auth`;
const REGISTRATIONS_PUBLIC = `${KC_BASE}/realms/${KC_REALM}/protocol/openid-connect/registrations`;
const TOKEN_INTERNAL       = `${KC_INTERNAL}/realms/${KC_REALM}/protocol/openid-connect/token`;

export const oidcRouter = Router();

oidcRouter.get('/start', (req: Request, res: Response) => {
  const mode = (req.query.mode as string) === 'register' ? 'register' : 'login';
  const state    = crypto.randomBytes(16).toString('hex');
  const nonce    = crypto.randomBytes(16).toString('hex');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  res.cookie(COOKIE_STATE, JSON.stringify({ state, nonce, verifier, mode, returnUrl: DEFAULT_LANDING }), {
    httpOnly: true, secure: SECURE, sameSite: SAMESITE, domain: COOKIE_DOMAIN, path: '/',
    maxAge: 10 * 60 * 1000,
  });

  // Use the dedicated `/registrations` endpoint to land users directly on
  // Keycloak's signup form. The `/auth?kc_action=register` query only fires
  // for already-authenticated users in modern Keycloak, which is why every
  // CTA was previously falling back to the login screen.
  const url = new URL(mode === 'register' ? REGISTRATIONS_PUBLIC : AUTH_PUBLIC);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
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

oidcRouter.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const stateParam = req.query.state as string | undefined;
  const kcActionStatus = req.query.kc_action_status as string | undefined;
  const errorParam = req.query.error as string | undefined;

  // KC custom action (registration) failed server-side. Recover by sending
  // the user back to /oidc/start?mode=register instead of exchanging the
  // poisoned authorization code.
  if (kcActionStatus && kcActionStatus !== 'success') {
    return res.redirect(302, '/api/auth/oidc/start?mode=register');
  }
  if (errorParam) {
    return res.redirect(302, `/?auth_error=${encodeURIComponent(errorParam)}`);
  }
  if (!code || !stateParam) return res.status(400).send('Missing code/state');

  const raw = req.cookies?.[COOKIE_STATE];
  if (!raw) return res.status(400).send('STATE_COOKIE_MISSING');
  let stored: { state: string; nonce: string; verifier: string; mode?: string; returnUrl: string };
  try { stored = JSON.parse(raw); } catch { return res.status(400).send('STATE_COOKIE_MALFORMED'); }
  if (stored.state !== stateParam) return res.status(400).send('STATE_MISMATCH');

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code_verifier: stored.verifier,
    });
    const { data } = await axios.post(TOKEN_INTERNAL, body.toString(), {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      timeout: 10_000,
    });

    const cookieOpts = {
      httpOnly: true, secure: SECURE, sameSite: SAMESITE, domain: COOKIE_DOMAIN, path: '/',
    } as const;

    res.cookie(COOKIE_ACCESS, data.access_token, { ...cookieOpts, maxAge: expiresMs(data.expires_in, 'expires_in') });
    if (data.refresh_token) {
      res.cookie(COOKIE_REFRESH, data.refresh_token, { ...cookieOpts, maxAge: expiresMs(data.refresh_expires_in, 'refresh_expires_in') });
    }
    res.clearCookie(COOKIE_STATE, { ...cookieOpts });

    // Dispatch to tenant-service so register/login finishes the workspace
    // resolution server-side (Tasks 3/4/5). On register → POST /register;
    // on login → GET /me (recovers old users via email-fallback). Failures
    // route to /workspace-blocked with the blocked code so the SPA can
    // render a controlled state instead of a blank workspace.
    let landing = stored.returnUrl || DEFAULT_LANDING;
    try {
      if (TENANT_SERVICE_URL) {
        const claims = decodeAccessTokenClaims(data.access_token);
        if (!claims.sub || !claims.email) throw new Error('NO_CLAIMS');
        const headers: Record<string, string> = {
          'x-user-sub':   claims.sub,
          'x-user-email': claims.email,
        };
        if (claims.name) headers['x-user-name'] = claims.name;
        // Patch 1 — propagate organisation-name claims projected by the
        // Keycloak BFF protocol mappers (see provision-dogan-realm.sh
        // [8.7/9] map-companyNameEn / map-companyNameAr). Tolerant of the
        // legacy single-claim `company` shape so partial deployments still
        // produce a valid orgName.
        const c = claims as Record<string, unknown>;
        const companyEn = (typeof c.companyNameEn === 'string' && c.companyNameEn)
          || (typeof c.company === 'string' && c.company)
          || null;
        const companyAr = (typeof c.companyNameAr === 'string' && c.companyNameAr) || null;
        if (companyEn) headers['x-user-company']    = companyEn as string;
        if (companyAr) headers['x-user-company-ar'] = companyAr as string;
        const path = stored.mode === 'register' ? '/register' : '/me';
        let resp = await axios.request({
          method: stored.mode === 'register' ? 'post' : 'get',
          url: `${TENANT_SERVICE_URL}${path}`,
          data: stored.mode === 'register'
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
        if (
          stored.mode !== 'register' &&
          resp.status === 409 &&
          (resp.data?.blocked === 'NO_USER' || resp.data?.blocked === 'NO_MEMBERSHIP')
        ) {
          resp = await axios.request({
            method: 'post',
            url: `${TENANT_SERVICE_URL}/register`,
            data: {},
            headers,
            timeout: 10_000,
            validateStatus: () => true,
          });
        }
        if (resp.status === 409 && resp.data?.blocked) {
          landing = `/workspace-blocked?code=${encodeURIComponent(resp.data.blocked)}`;
        } else if (resp.status >= 500) {
          landing = '/workspace-blocked?code=BACKEND_ERROR';
        }

        // Fix 6 (Phase 18) — Auto-assign DAuth role on first login. Closes
        // the silent RBAC void so AccessStore.hasPermission() can answer.
        try {
          const pool = getPool();
          const tenantId =
            resp?.data?.tenantId ||
            resp?.data?.tenant?.id ||
            resp?.data?.workspace?.tenantId ||
            null;
          if (pool && tenantId && claims.sub) {
            const realmRoles: string[] = Array.isArray((claims as any)?.realm_access?.roles)
              ? ((claims as any).realm_access.roles as string[])
              : [];
            // Phase 18.1 — founder elevation. tenant-service /register returns
            // { idempotent: false } when it just created the tenant in this
            // same call. membership.isOwner==true is also a founder signal.
            const isFounder = (
              resp?.data?.idempotent === false &&
              (stored.mode === 'register' || resp?.data?.membership?.isOwner === true)
            );
            await ensureUserRoleAssignment({
              pool,
              userSub: String(claims.sub),
              email: String(claims.email),
              tenantId: String(tenantId),
              kcRealmRoles: realmRoles,
              isFounder,
            });
          }
        } catch (e) {
          console.warn('[oidc/callback] post-login role hook failed', (e as Error).message);
        }
      }
    } catch (e: any) {
      console.warn('[oidc/callback] tenant dispatch failed', e?.message || e);
      landing = '/workspace-blocked?code=BACKEND_ERROR';
    }

    res.redirect(302, landing);
  } catch (err: any) {
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
oidcRouter.get('/session', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Cookie');

  const access = req.cookies?.[COOKIE_ACCESS] as string | undefined;
  if (!access) return res.status(401).json({ authenticated: false, error: 'NO_SESSION' });

  let claims: any;
  try {
    claims = await verifySession(access);
  } catch {
    return res.status(401).json({ authenticated: false, error: 'INVALID_SESSION' });
  }

  const sub = typeof claims.sub === 'string' ? claims.sub : '';
  if (!sub) return res.status(401).json({ authenticated: false, error: 'INVALID_SESSION' });

  const email = typeof claims.email === 'string' ? claims.email : null;
  const name =
    typeof claims.name === 'string'
      ? claims.name
      : typeof claims['preferred_username'] === 'string'
        ? (claims['preferred_username'] as string)
        : null;

  // Best-effort tenant + permission resolution. Failures fall back to a
  // minimal authenticated session — the SPA can still render the workspace
  // and lazy-load permissions.
  let tenant: { id: string | null; name: string | null; slug: string | null } = {
    id: typeof claims['tenantId'] === 'string' ? (claims['tenantId'] as string) : null,
    name: null,
    slug: typeof claims['tenantCode'] === 'string' ? (claims['tenantCode'] as string) : null,
  };
  let permissions: string[] = [];
  let landingRoute = '/workspace-home';
  let role: string | null = typeof claims['role'] === 'string' ? (claims['role'] as string) : null;
  let isSuperAdmin = claims['isSuperAdmin'] === true;

  if (TENANT_SERVICE_URL) {
    try {
      const headers: Record<string, string> = { 'x-user-sub': sub };
      if (email) headers['x-user-email'] = email;
      if (name)  headers['x-user-name']  = name;
      const resp = await axios.get(`${TENANT_SERVICE_URL}/me`, {
        headers, timeout: 5_000, validateStatus: () => true,
      });
      if (resp.status === 200 && resp.data && typeof resp.data === 'object') {
        const t = resp.data.tenant ?? {};
        tenant = {
          id: typeof t.id === 'string' ? t.id : tenant.id,
          name: typeof t.name === 'string' ? t.name : tenant.name,
          slug: typeof t.slug === 'string' ? t.slug : (typeof t.code === 'string' ? t.code : tenant.slug),
        };
        if (typeof resp.data.role === 'string') role = resp.data.role;
        if (resp.data.isSuperAdmin === true) isSuperAdmin = true;
        if (Array.isArray(resp.data.permissions)) {
          permissions = resp.data.permissions.filter((p: unknown): p is string => typeof p === 'string');
        }
        if (typeof resp.data.landingRoute === 'string') landingRoute = resp.data.landingRoute;
      }
    } catch {
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
oidcRouter.post('/refresh', async (req: Request, res: Response) => {
  const refresh = req.cookies?.[COOKIE_REFRESH] as string | undefined;
  if (!refresh) return res.status(401).json({ error: 'NO_REFRESH_COOKIE' });
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });
    const { data } = await axios.post(TOKEN_INTERNAL, body.toString(), {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      timeout: 10_000,
    });
    const cookieOpts = {
      httpOnly: true, secure: SECURE, sameSite: SAMESITE, domain: COOKIE_DOMAIN, path: '/',
    } as const;
    res.cookie(COOKIE_ACCESS, data.access_token, { ...cookieOpts, maxAge: expiresMs(data.expires_in, 'expires_in') });
    if (data.refresh_token) {
      res.cookie(COOKIE_REFRESH, data.refresh_token, { ...cookieOpts, maxAge: expiresMs(data.refresh_expires_in, 'refresh_expires_in') });
    }
    res.json({ ok: true, expiresIn: data.expires_in });
  } catch (err: any) {
    console.error('[oidc/refresh] failed', err?.response?.data || err.message);
    const cookieOpts = { httpOnly: true, secure: SECURE, sameSite: SAMESITE, domain: COOKIE_DOMAIN, path: '/' } as const;
    res.clearCookie(COOKIE_ACCESS, cookieOpts);
    res.clearCookie(COOKIE_REFRESH, cookieOpts);
    res.status(401).json({ error: 'REFRESH_FAILED' });
  }
});

// Server-side logout — clears cookies and revokes the refresh token in KC.
oidcRouter.post('/logout', async (req: Request, res: Response) => {
  const refresh = req.cookies?.[COOKIE_REFRESH] as string | undefined;
  const cookieOpts = { httpOnly: true, secure: SECURE, sameSite: SAMESITE, domain: COOKIE_DOMAIN, path: '/' } as const;
  if (refresh) {
    try {
      const body = new URLSearchParams({
        client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: refresh,
      });
      await axios.post(
        `${KC_INTERNAL}/realms/${KC_REALM}/protocol/openid-connect/logout`,
        body.toString(),
        { headers: { 'content-type': 'application/x-www-form-urlencoded' }, timeout: 10_000 },
      );
    } catch { /* best-effort */ }
  }
  res.clearCookie(COOKIE_ACCESS, cookieOpts);
  res.clearCookie(COOKIE_REFRESH, cookieOpts);
  res.clearCookie(COOKIE_STATE, cookieOpts);
  res.json({ ok: true });
});

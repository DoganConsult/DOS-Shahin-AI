/**
 * Direct-grant password routes — eliminates the legacy Keycloak login form.
 *
 * Mounted by server.ts at `/password`, exposed by gateway as
 *   POST /api/auth/password/login    — Resource Owner Password Credentials
 *   POST /api/auth/password/register — KC admin create user + auto-login
 *
 * Carbon Auth Pages Pack collects credentials in <dos-auth-login-card> and
 * <dos-auth-register-card>; submit events POST here, which exchanges with
 * Keycloak server-side, sets the same httpOnly access/refresh cookies the
 * /oidc/callback path sets, dispatches to tenant-service, runs the
 * post-login role hook, and decides MFA. No second password prompt on
 * Keycloak's UI — single source of credential entry.
 */
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { Pool } from 'pg';
import {
  KC_BASE,
  KC_INTERNAL,
  KC_REALM,
  CLIENT_ID,
  CLIENT_SECRET,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  COOKIE_DOMAIN,
  SAMESITE,
  SECURE,
  DEFAULT_LANDING,
  TENANT_SERVICE_URL,
  decodeAccessTokenClaims,
  expiresMs,
} from '../lib/session';
import { ensureUserRoleAssignment } from '../lib/post-login-roles';

export const passwordRouter = Router();

const TOKEN_INTERNAL = `${KC_INTERNAL}/realms/${KC_REALM}/protocol/openid-connect/token`;
const ADMIN_USERS    = `${KC_INTERNAL}/admin/realms/${KC_REALM}/users`;

// Lazy DB pool for the post-login role hook + MFA policy lookup.
let _pool: Pool | null = null;
function getPool(): Pool | null {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  _pool = new Pool({ connectionString: url, max: 4, idleTimeoutMillis: 10_000 });
  return _pool;
}

interface KcTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
}

async function kcPasswordGrant(username: string, password: string): Promise<KcTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    username,
    password,
    scope: 'openid profile email',
  });
  const { data } = await axios.post<KcTokenResponse>(TOKEN_INTERNAL, body.toString(), {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    timeout: 15_000,
  });
  return data;
}

async function kcClientCredentialsToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const { data } = await axios.post<{ access_token: string }>(TOKEN_INTERNAL, body.toString(), {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    timeout: 10_000,
  });
  return data.access_token;
}

interface KcCreateUserPayload {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  requiredActions?: string[];
  attributes?: Record<string, string[]>;
  credentials: Array<{ type: 'password'; value: string; temporary: false }>;
}

async function kcCreateUser(payload: KcCreateUserPayload): Promise<void> {
  const adminToken = await kcClientCredentialsToken();
  const resp = await axios.post(ADMIN_USERS, payload, {
    headers: {
      authorization: `Bearer ${adminToken}`,
      'content-type': 'application/json',
    },
    timeout: 15_000,
    validateStatus: () => true,
  });
  if (resp.status === 201) return;
  if (resp.status === 409) throw Object.assign(new Error('USER_EXISTS'), { code: 'USER_EXISTS' });
  const msg = typeof resp.data === 'object' ? JSON.stringify(resp.data).slice(0, 200) : String(resp.data).slice(0, 200);
  throw new Error(`KC_CREATE_USER_${resp.status}:${msg}`);
}

function setSessionCookies(
  res: Response,
  tok: KcTokenResponse,
): void {
  const cookieOpts = {
    httpOnly: true, secure: SECURE, sameSite: SAMESITE, domain: COOKIE_DOMAIN, path: '/',
  } as const;
  res.cookie(COOKIE_ACCESS, tok.access_token, {
    ...cookieOpts,
    maxAge: expiresMs(tok.expires_in, 'expires_in'),
  });
  if (tok.refresh_token) {
    res.cookie(COOKIE_REFRESH, tok.refresh_token, {
      ...cookieOpts,
      maxAge: expiresMs(tok.refresh_expires_in, 'refresh_expires_in'),
    });
  }
}

interface FinalizeArgs {
  res: Response;
  tok: KcTokenResponse;
  mode: 'login' | 'register';
  orgNameEn?: string | null;
  orgNameAr?: string | null;
}

async function finalizeLogin({ res, tok, mode, orgNameEn, orgNameAr }: FinalizeArgs):
  Promise<{ ok: true; redirect: string | null; mfaRequired: boolean }> {
  setSessionCookies(res, tok);

  // Landing route is owned by dos.tenant_landing_config (resolved by
  // ui-os-service). password flow does not invent a fallback; null
  // forces the SPA to render empty/no-op (NO FRONTEND INVENTION).
  let landing: string | null = DEFAULT_LANDING;
  let mfaRequired = false;

  if (TENANT_SERVICE_URL) {
    const claims = decodeAccessTokenClaims(tok.access_token);
    if (!claims.sub || !claims.email) {
      throw Object.assign(new Error('NO_CLAIMS'), { code: 'NO_CLAIMS' });
    }
    const headers: Record<string, string> = {
      'x-user-sub':   claims.sub,
      'x-user-email': claims.email,
    };
    if (claims.name) headers['x-user-name'] = claims.name;
    if (orgNameEn)   headers['x-user-company']    = orgNameEn;
    if (orgNameAr)   headers['x-user-company-ar'] = orgNameAr;

    const path = mode === 'register' ? '/register' : '/me';
    let resp = await axios.request({
      method: mode === 'register' ? 'post' : 'get',
      url: `${TENANT_SERVICE_URL}${path}`,
      data: mode === 'register'
        ? { orgName: orgNameEn || undefined, orgNameAr: orgNameAr || undefined }
        : undefined,
      headers,
      timeout: 10_000,
      validateStatus: () => true,
    });

    // Auto-provision: login-mode user with no DB account → fall back to register.
    if (
      mode !== 'register' &&
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

    if (resp.status < 200 || resp.status >= 300) {
      const blocked = typeof resp.data?.blocked === 'string' ? resp.data.blocked : 'BACKEND_ERROR';
      const cookieOpts = {
        httpOnly: true, secure: SECURE, sameSite: SAMESITE, domain: COOKIE_DOMAIN, path: '/',
      } as const;
      res.clearCookie(COOKIE_ACCESS, cookieOpts);
      res.clearCookie(COOKIE_REFRESH, cookieOpts);
      throw Object.assign(new Error(blocked), { code: blocked });
    }

    const tenantId =
      resp?.data?.tenantId ||
      resp?.data?.tenant?.id ||
      resp?.data?.workspace?.tenantId ||
      null;

    // Post-login role auto-assignment.
    try {
      const pool = getPool();
      if (pool && tenantId) {
        const realmRoles: string[] = Array.isArray((claims as any)?.realm_access?.roles)
          ? ((claims as any).realm_access.roles as string[])
          : [];
        const isFounder =
          resp?.data?.idempotent === false &&
          (mode === 'register' || resp?.data?.membership?.isOwner === true);
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
      console.warn('[password] post-login role hook failed', (e as Error).message);
    }

    // Dynamic per-tenant MFA gate.
    try {
      const pool = getPool();
      if (pool && tenantId) {
        const polR = await pool.query<{ mfa_required: boolean }>(
          `SELECT mfa_required FROM dos.tenant_security_policy WHERE tenant_id = $1`,
          [tenantId],
        );
        mfaRequired = polR.rows[0]?.mfa_required === true;
      }
    } catch (e) {
      console.warn('[password] mfa policy lookup failed', (e as Error).message);
    }

    if (mfaRequired) {
      const cookieOpts = {
        httpOnly: true, secure: SECURE, sameSite: SAMESITE, domain: COOKIE_DOMAIN, path: '/',
      } as const;
      if (landing) {
        res.cookie('dos_mfa_return', landing, { ...cookieOpts, maxAge: 10 * 60 * 1000 });
      }
      landing = '/mfa';
    }
  }

  return { ok: true, redirect: landing, mfaRequired };
}

// ── POST /password/login ─────────────────────────────────────────────────
passwordRouter.post('/login', async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'CREDENTIALS_REQUIRED' });
  }
  let tok: KcTokenResponse;
  try {
    tok = await kcPasswordGrant(email, password);
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const code = (data?.error_description || data?.error || '').toString();
    if (status === 401 || status === 400) {
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS', detail: code });
    }
    if (status === 403) {
      return res.status(403).json({ ok: false, error: 'DIRECT_GRANT_DISABLED', detail: code });
    }
    console.error('[password/login] kc token failed', code || err?.message);
    return res.status(502).json({ ok: false, error: 'KC_TOKEN_FAILED' });
  }

  try {
    const result = await finalizeLogin({ res, tok, mode: 'login' });
    return res.json(result);
  } catch (err: any) {
    return res.status(409).json({ ok: false, error: err?.code || 'BACKEND_ERROR' });
  }
});

// ── POST /password/register ──────────────────────────────────────────────
passwordRouter.post('/register', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const email     = String(body.email ?? '').trim().toLowerCase();
  const password  = String(body.password ?? '');
  const fullName  = String(body.fullName ?? '').trim();
  const company   = typeof body.company   === 'string' ? body.company.trim()   : '';
  const companyAr = typeof body.companyAr === 'string' ? body.companyAr.trim() : '';
  const country   = typeof body.country   === 'string' ? body.country.trim()   : '';
  if (!email || !password || !fullName) {
    return res.status(400).json({ ok: false, error: 'REGISTRATION_FIELDS_REQUIRED' });
  }
  // The Keycloak realm declares companyNameEn + country as REQUIRED user-
  // profile attributes (verify-profile required action evaluates them
  // dynamically). Missing either → KC's direct-grant token call fails
  // with "Account is not fully set up". Reject early with a precise code
  // so the form can highlight the offending step instead of the generic
  // KC_TOKEN_FAILED post-create.
  if (!company) {
    return res.status(400).json({ ok: false, error: 'COMPANY_REQUIRED' });
  }
  if (!country) {
    return res.status(400).json({ ok: false, error: 'COUNTRY_REQUIRED' });
  }
  const acceptedTerms = body.acceptedTerms === true;
  if (!acceptedTerms) {
    return res.status(400).json({ ok: false, error: 'TERMS_NOT_ACCEPTED' });
  }

  const [firstName, ...rest] = fullName.split(/\s+/);
  const lastName = rest.join(' ') || firstName;

  const attributes: Record<string, string[]> = {
    companyNameEn: [company],
    country:       [country],
  };
  if (companyAr) attributes.companyNameAr = [companyAr];
  if (typeof body.jobTitle === 'string' && body.jobTitle)
    attributes.jobTitle = [String(body.jobTitle)];
  if (typeof body.industry === 'string' && body.industry)
    attributes.industry = [String(body.industry)];
  if (typeof body.companySize === 'string' && body.companySize)
    attributes.companySize = [String(body.companySize)];
  if (typeof body.regulatoryScope === 'string' && body.regulatoryScope)
    attributes.regulatoryScope = [String(body.regulatoryScope)];

  try {
    await kcCreateUser({
      email,
      username: email,
      firstName: firstName || email,
      lastName,
      enabled: true,
      emailVerified: true,
      requiredActions: [],
      attributes,
      credentials: [{ type: 'password', value: password, temporary: false }],
    });
  } catch (err: any) {
    if (err?.code === 'USER_EXISTS') {
      return res.status(409).json({ ok: false, error: 'EMAIL_ALREADY_REGISTERED' });
    }
    console.error('[password/register] kc create failed', err?.message);
    return res.status(502).json({ ok: false, error: 'KC_CREATE_FAILED' });
  }

  let tok: KcTokenResponse;
  try {
    tok = await kcPasswordGrant(email, password);
  } catch (err: any) {
    console.error('[password/register] post-create login failed', err?.response?.data || err?.message);
    return res.status(502).json({ ok: false, error: 'KC_TOKEN_FAILED' });
  }

  try {
    const result = await finalizeLogin({
      res, tok, mode: 'register',
      orgNameEn: company || null,
      orgNameAr: companyAr || null,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(409).json({ ok: false, error: err?.code || 'BACKEND_ERROR' });
  }
});

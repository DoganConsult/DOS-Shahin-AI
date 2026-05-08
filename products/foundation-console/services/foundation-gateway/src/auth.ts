// Foundation Console — OIDC + cookie session (HttpOnly, encrypted, no tokens in JS).
// Doctrine: zero Bearer token in browser. Zero localStorage/sessionStorage. Zero legacy auth-service reuse.
// Pure native: node:crypto + global fetch. No new deps.
import crypto from 'node:crypto';
import type { Express, NextFunction, Request, Response, RequestHandler } from 'express';
import type { FcConfig } from '@fc/config';
import type { FcLogger } from '@fc/logger';

const STATE_COOKIE = 'fc_oauth_state';
const STATE_TTL_SEC = 300;
const DEFAULT_SESSION_TTL_SEC = 3600;

interface OidcMetadata {
  readonly authorization_endpoint: string;
  readonly token_endpoint: string;
  readonly end_session_endpoint?: string;
  readonly jwks_uri: string;
  readonly issuer: string;
}

let cachedMeta: OidcMetadata | null = null;
async function getMetadata(issuer: string): Promise<OidcMetadata> {
  if (cachedMeta) return cachedMeta;
  const url = issuer.replace(/\/$/, '') + '/.well-known/openid-configuration';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`oidc_discovery_${res.status}`);
  cachedMeta = (await res.json()) as OidcMetadata;
  return cachedMeta;
}

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string): Buffer {
  let v = s.replace(/-/g, '+').replace(/_/g, '/');
  while (v.length % 4) v += '=';
  return Buffer.from(v, 'base64');
}

function encryptJson(secret: string, data: unknown): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(data))), cipher.final()]);
  const tag = cipher.getAuthTag();
  return b64url(Buffer.concat([iv, tag, enc]));
}

function decryptJson<T>(secret: string, token: string): T | null {
  try {
    const key = deriveKey(secret);
    const buf = fromB64url(token);
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(plain.toString('utf8')) as T;
  } catch {
    return null;
  }
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie ?? '';
  const out: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function buildCookie(
  cfg: FcConfig,
  name: string,
  value: string,
  maxAgeSec: number,
): string {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (cfg.session.cookieDomain && cfg.session.cookieDomain !== 'localhost') {
    parts.push(`Domain=${cfg.session.cookieDomain}`);
  }
  if (cfg.nodeEnv === 'production') parts.push('Secure');
  return parts.join('; ');
}

function setHttpOnlyCookie(res: Response, cfg: FcConfig, name: string, value: string, maxAgeSec: number): void {
  res.append('Set-Cookie', buildCookie(cfg, name, value, maxAgeSec));
}
function clearHttpOnlyCookie(res: Response, cfg: FcConfig, name: string): void {
  res.append('Set-Cookie', buildCookie(cfg, name, '', 0));
}

interface StateData {
  readonly state: string;
  readonly codeVerifier: string;
  readonly iat: number;
  readonly next?: string;
}

// Sanitize ?next= so callback can only return to a same-origin path.
function sanitizeNext(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) return '/';
  if (raw.length > 1024) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}
export interface SessionData {
  readonly sub: string;
  readonly email?: string;
  readonly name?: string;
  readonly iat: number;
  readonly exp: number;
  readonly perms?: readonly string[];
  readonly tenantId?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    fcSession?: SessionData;
  }
}

// Reusable middleware: require valid fc_sid cookie session. Returns 401 JSON on failure
// (never redirects — the API contract is JSON-only). Attaches sanitized session to req.fcSession.
export function makeRequireSession(cfg: FcConfig): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const cookies = parseCookies(req);
    const raw = cookies[cfg.session.cookieName];
    if (!raw) { res.status(401).json({ error: 'unauthenticated' }); return; }
    const data = decryptJson<SessionData>(cfg.session.secret, raw);
    if (!data || typeof data.sub !== 'string' || !data.sub) {
      res.status(401).json({ error: 'session_invalid' }); return;
    }
    if (typeof data.exp !== 'number' || data.exp <= Math.floor(Date.now() / 1000)) {
      res.status(401).json({ error: 'session_expired' }); return;
    }
    req.fcSession = data;
    next();
  };
}
interface IdTokenClaims {
  readonly sub?: string;
  readonly email?: string;
  readonly name?: string;
  readonly preferred_username?: string;
}

function decodeIdTokenClaims(idToken: string): IdTokenClaims | null {
  const parts = idToken.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(fromB64url(parts[1]!).toString('utf8')) as IdTokenClaims;
  } catch {
    return null;
  }
}

function callbackPath(cfg: FcConfig): string {
  return new URL(cfg.oidc.redirectUri).pathname;
}

export function registerAuthRoutes(app: Express, cfg: FcConfig, log: FcLogger): void {
  // ── /auth/login ─────────────────────────────────────────────────
  app.get('/auth/login', async (req: Request, res: Response): Promise<void> => {
    try {
      const meta = await getMetadata(cfg.oidc.issuerUrl);
      const state = b64url(crypto.randomBytes(24));
      const codeVerifier = b64url(crypto.randomBytes(48));
      const codeChallenge = b64url(crypto.createHash('sha256').update(codeVerifier).digest());
      const next = sanitizeNext(req.query['next']);
      const stateData: StateData = { state, codeVerifier, iat: Math.floor(Date.now() / 1000), next };
      setHttpOnlyCookie(res, cfg, STATE_COOKIE, encryptJson(cfg.session.secret, stateData), STATE_TTL_SEC);

      const url = new URL(meta.authorization_endpoint);
      url.searchParams.set('client_id', cfg.oidc.clientId);
      url.searchParams.set('redirect_uri', cfg.oidc.redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'openid profile email');
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
      res.redirect(302, url.toString());
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : String(err) }, 'auth/login failed');
      res.status(502).json({ error: 'oidc_discovery_failed' });
    }
  });

  // ── /auth/callback ──────────────────────────────────────────────
  app.get(callbackPath(cfg), async (req: Request, res: Response): Promise<void> => {
    const code = typeof req.query['code'] === 'string' ? req.query['code'] : '';
    const stateParam = typeof req.query['state'] === 'string' ? req.query['state'] : '';
    const cookies = parseCookies(req);
    const stateCookie = cookies[STATE_COOKIE];
    if (!code || !stateParam || !stateCookie) {
      res.status(400).json({ error: 'auth_callback_missing_params' });
      return;
    }
    const stateData = decryptJson<StateData>(cfg.session.secret, stateCookie);
    if (!stateData || stateData.state !== stateParam) {
      res.status(400).json({ error: 'auth_state_mismatch' });
      return;
    }
    if (Math.floor(Date.now() / 1000) - stateData.iat > STATE_TTL_SEC) {
      res.status(400).json({ error: 'auth_state_expired' });
      return;
    }
    try {
      const meta = await getMetadata(cfg.oidc.issuerUrl);
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: cfg.oidc.clientId,
        code,
        redirect_uri: cfg.oidc.redirectUri,
        code_verifier: stateData.codeVerifier,
      });
      if (cfg.oidc.clientSecret) body.set('client_secret', cfg.oidc.clientSecret);
      const tokRes = await fetch(meta.token_endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!tokRes.ok) {
        const text = await tokRes.text();
        log.warn({ status: tokRes.status, body: text }, 'token exchange failed');
        res.status(401).json({ error: 'auth_token_exchange_failed' });
        return;
      }
      const tok = (await tokRes.json()) as { id_token?: string; access_token?: string; expires_in?: number };
      const claims = decodeIdTokenClaims(tok.id_token ?? '');
      if (!claims?.sub) {
        res.status(401).json({ error: 'auth_id_token_invalid' });
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      const ttl = tok.expires_in ?? DEFAULT_SESSION_TTL_SEC;
      const baseSession = { sub: claims.sub, iat: now, exp: now + ttl };
      const withEmail = claims.email ? { ...baseSession, email: claims.email } : baseSession;
      const displayName = claims.name ?? claims.preferred_username;
      const session: SessionData = displayName ? { ...withEmail, name: displayName } : withEmail;

      setHttpOnlyCookie(res, cfg, cfg.session.cookieName, encryptJson(cfg.session.secret, session), ttl);
      clearHttpOnlyCookie(res, cfg, STATE_COOKIE);
      const target = sanitizeNext(stateData.next);
      res.redirect(302, target);
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : String(err) }, 'auth/callback failed');
      res.status(502).json({ error: 'auth_callback_failed' });
    }
  });

  // ── /auth/session — sanitized session JSON or 401 ──────────────
  app.get('/auth/session', (req: Request, res: Response): void => {
    const cookies = parseCookies(req);
    const raw = cookies[cfg.session.cookieName];
    if (!raw) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    const data = decryptJson<SessionData>(cfg.session.secret, raw);
    if (!data) {
      res.status(401).json({ error: 'session_invalid' });
      return;
    }
    if (data.exp <= Math.floor(Date.now() / 1000)) {
      res.status(401).json({ error: 'session_expired' });
      return;
    }
    const out: Record<string, unknown> = { sub: data.sub, iat: data.iat, exp: data.exp };
    if (data.email) out['email'] = data.email;
    if (data.name)  out['name']  = data.name;
    res.json(out);
  });

  // ── /auth/logout ────────────────────────────────────────────────
  app.post('/auth/logout', (_req: Request, res: Response): void => {
    clearHttpOnlyCookie(res, cfg, cfg.session.cookieName);
    clearHttpOnlyCookie(res, cfg, STATE_COOKIE);
    res.json({ ok: true });
  });
  app.get('/auth/logout', (_req: Request, res: Response): void => {
    clearHttpOnlyCookie(res, cfg, cfg.session.cookieName);
    clearHttpOnlyCookie(res, cfg, STATE_COOKIE);
    res.redirect(302, '/');
  });

  // ── /auth/dev-session — env-gated test session minter ──────────
  // Doctrine: enabled ONLY if FC_DEV_TEST_SESSION_ENABLED=true. Never available in production.
  // Issues a real fc_sid cookie (same encryption path) so guard tests prove the 200 path.
  if (
    process.env['FC_DEV_TEST_SESSION_ENABLED'] === 'true' &&
    cfg.nodeEnv !== 'production'
  ) {
    app.post('/auth/dev-session', (req: Request, res: Response): void => {
      const body = (req.body ?? {}) as Partial<{ sub: string; email: string; name: string; perms: string[]; tenantId: string }>;
      const sub = typeof body.sub === 'string' && body.sub ? body.sub : 'dev-tester';
      const now = Math.floor(Date.now() / 1000);
      const ttl = DEFAULT_SESSION_TTL_SEC;
      const base: SessionData = { sub, iat: now, exp: now + ttl };
      const withEmail = typeof body.email === 'string' ? { ...base, email: body.email } : base;
      const withName  = typeof body.name  === 'string' ? { ...withEmail, name: body.name } : withEmail;
      const withPerms = Array.isArray(body.perms) && body.perms.every((p) => typeof p === 'string')
        ? { ...withName, perms: Object.freeze([...body.perms]) as readonly string[] }
        : withName;
      const session: SessionData = typeof body.tenantId === 'string' && body.tenantId
        ? { ...withPerms, tenantId: body.tenantId }
        : withPerms;
      setHttpOnlyCookie(res, cfg, cfg.session.cookieName, encryptJson(cfg.session.secret, session), ttl);
      res.json({ ok: true, sub, exp: session.exp });
    });
    log.warn({}, 'dev-session endpoint enabled (FC_DEV_TEST_SESSION_ENABLED=true) — non-production only');
  }
}

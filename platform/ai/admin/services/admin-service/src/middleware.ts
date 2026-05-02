import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { exec, one, q } from './db';

const KC_JWKS_URL = process.env.KEYCLOAK_JWKS_URL
  || (process.env.KEYCLOAK_BASE_URL && process.env.KEYCLOAK_REALM
        ? `${process.env.KEYCLOAK_BASE_URL.replace(/\/$/, '')}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`
        : '');
const KC_ISSUERS = (process.env.KEYCLOAK_ISSUER
  || (process.env.KEYCLOAK_BASE_URL && process.env.KEYCLOAK_REALM
        ? `${process.env.KEYCLOAK_BASE_URL.replace(/\/$/, '')}/realms/${process.env.KEYCLOAK_REALM}`
        : ''))
  .split(',').map(s => s.trim()).filter(Boolean);
const KC_ISSUER = KC_ISSUERS[0] || '';
const KC_REALM = process.env.KEYCLOAK_REALM || 'dogan';
const remoteJWKS = KC_JWKS_URL ? createRemoteJWKSet(new URL(KC_JWKS_URL)) : null;

export interface Actor {
  userId: string;
  tenantId: string;
  roles: string[];
  sessionId?: string;
  authMethod: 'jwt' | 'api_key' | 'dev';
  permissions: string[];
}
export interface AdminRequest extends Request { actor?: Actor; }

const PLATFORM_ADMIN_ROLES = new Set([
  'platform_admin', 'dos_admin', 'dauth_admin', 'dsoc_admin', 'dnoc_admin',
]);
const ALLOW_DEV_HEADERS = process.env.ADMIN_ALLOW_DEV_HEADERS === '1';
const REQUIRED_API_SCOPE = 'platform:admin';

async function resolveRolesAndPerms(userId: string, tenantId: string): Promise<{ roles: string[]; permissions: string[] }> {
  const roles = await q<{ role_code: string }>(
    `SELECT DISTINCT role_code FROM platform_dauth.user_role_assignments
      WHERE user_id=$1 AND is_active=TRUE
        AND (tenant_id=$2 OR tenant_id='platform' OR tenant_id IS NULL)
        AND (expires_at IS NULL OR expires_at > NOW())
        AND revoked_at IS NULL`,
    [userId, tenantId]
  ).catch(() => []);
  const roleCodes = roles.map(r => r.role_code);
  if (!roleCodes.length) return { roles: [], permissions: [] };
  // Prefer functional_roles.permissions[] (canonical); fall back to role_permissions table if present
  const perms = await q<{ permission_code: string }>(
    `SELECT DISTINCT unnest(COALESCE(permissions,'{}'::text[])) AS permission_code
       FROM platform_dauth.functional_roles WHERE role_code = ANY($1)`,
    [roleCodes]
  ).catch(() => []);
  return { roles: roleCodes, permissions: perms.map(p => p.permission_code) };
}

async function verifyBearer(token: string): Promise<Actor | null> {
  const decoded: any = jwt.decode(token, { complete: true });
  if (!decoded?.header?.kid) return null;
  const alg = (decoded.header.alg || '').toUpperCase();

  // Path A: DAuth-issued (HS*) — verify against jwt_signing_keys + sessions table.
  if (alg.startsWith('HS')) {
    const key = await one<{ secret: string; algorithm: string; status: string }>(
      `SELECT secret, algorithm, status FROM platform_dauth.jwt_signing_keys WHERE kid=$1`,
      [decoded.header.kid]
    );
    if (!key || key.status === 'retired') return null;
    let payload: any;
    try { payload = jwt.verify(token, key.secret, { algorithms: [(key.algorithm || 'HS256') as any] }); }
    catch { return null; }
    const userId = payload.sub || payload.user_id;
    const tenantId = payload.tenant_id || payload.tid || 'platform';
    const jti = payload.jti;
    if (!userId || !jti) return null;
    const session = await one<{ session_id: string; expires_at: string; revoked_at: string | null }>(
      `SELECT session_id, expires_at, revoked_at FROM platform_dauth.sessions WHERE jti=$1`,
      [jti]
    );
    if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) return null;
    await exec(`UPDATE platform_dauth.sessions SET last_active_at=NOW() WHERE session_id=$1`, [session.session_id]).catch(() => {});
    const { roles, permissions } = await resolveRolesAndPerms(userId, tenantId);
    return { userId, tenantId, roles, sessionId: session.session_id, authMethod: 'jwt', permissions };
  }

  // Path B: Keycloak-issued (RS*) — verify with remote JWKS, resolve user via iam_identities mirror.
  if (alg.startsWith('RS') && remoteJWKS) {
    let payload: any;
    try {
      const verified = await jwtVerify(token, remoteJWKS, { issuer: KC_ISSUERS.length ? KC_ISSUERS : undefined });
      payload = verified.payload;
    } catch { return null; }
    const sub = String(payload.sub || '');
    if (!sub) return null;
    // Map KC sub → DAuth user_id via iam_identities; fall back to email lookup.
    const ident = await one<{ user_id: string }>(
      `SELECT user_id FROM public.iam_identities WHERE provider='keycloak' AND realm=$1 AND external_subject=$2 AND status='active' LIMIT 1`,
      [KC_REALM, sub]
    );
    let userId = ident?.user_id || '';
    let tenantId = String(payload.tenant_id || (payload as any).tid || 'platform');
    if (!userId) {
      const email = String(payload.email || (payload as any).preferred_username || '').toLowerCase();
      if (email) {
        const u = await one<{ user_id: string; tenant_id: string }>(
          `SELECT user_id, tenant_id FROM public.users WHERE LOWER(email)=$1 LIMIT 1`,
          [email]
        );
        if (u) { userId = u.user_id; tenantId = u.tenant_id || tenantId; }
      }
    } else {
      const u = await one<{ tenant_id: string }>(
        `SELECT tenant_id FROM public.users WHERE user_id=$1 LIMIT 1`,
        [userId]
      );
      if (u?.tenant_id) tenantId = u.tenant_id;
    }
    if (!userId) return null;
    const { roles, permissions } = await resolveRolesAndPerms(userId, tenantId);
    return { userId, tenantId, roles, authMethod: 'jwt', permissions };
  }

  return null;
}

async function verifyApiKey(raw: string): Promise<Actor | null> {
  const hash = createHash('sha256').update(raw).digest('hex');
  const row = await one<{ key_id: string; tenant_id: string; user_id: string | null; scopes: string[]; status: string; expires_at: string | null }>(
    `SELECT key_id, tenant_id, user_id, scopes, status, expires_at
       FROM platform_dauth.api_keys WHERE key_hash=$1`, [hash]
  );
  if (!row || row.status !== 'active') return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
  if (!row.scopes?.includes(REQUIRED_API_SCOPE)) return null;
  await exec(`UPDATE platform_dauth.api_keys SET last_used_at=NOW() WHERE key_id=$1`, [row.key_id]).catch(() => {});
  const userId = row.user_id || `api_key:${row.key_id}`;
  const { roles, permissions } = row.user_id ? await resolveRolesAndPerms(row.user_id, row.tenant_id) : { roles: ['platform_admin'], permissions: [] };
  if (!row.user_id && !roles.includes('platform_admin')) roles.push('platform_admin');
  return { userId, tenantId: row.tenant_id, roles, authMethod: 'api_key', permissions };
}

export async function authenticate(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.header('authorization') || '';
    if (auth.toLowerCase().startsWith('bearer ')) {
      const actor = await verifyBearer(auth.slice(7).trim());
      if (actor) { req.actor = actor; return next(); }
      return res.status(401).json({ error: 'invalid_or_expired_token' });
    }
    const apiKey = req.header('x-api-key');
    if (apiKey) {
      const actor = await verifyApiKey(apiKey);
      if (actor) { req.actor = actor; return next(); }
      return res.status(401).json({ error: 'invalid_api_key' });
    }
    if (ALLOW_DEV_HEADERS && req.header('x-user-id')) {
      const userId = req.header('x-user-id') as string;
      const tenantId = (req.header('x-tenant-id') as string) || 'platform';
      const hdrRoles = (req.header('x-roles') as string)?.split(',').filter(Boolean) ?? [];
      const { roles: dbRoles, permissions } = await resolveRolesAndPerms(userId, tenantId);
      req.actor = { userId, tenantId, roles: Array.from(new Set([...dbRoles, ...hdrRoles])), authMethod: 'dev', permissions };
      return next();
    }
    return res.status(401).json({ error: 'authentication_required' });
  } catch (e: any) {
    return res.status(500).json({ error: 'auth_error', detail: e.message });
  }
}

export function requirePlatformAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const roles = req.actor?.roles ?? [];
  if (!roles.some(r => PLATFORM_ADMIN_ROLES.has(r))) {
    return res.status(403).json({ error: 'platform_admin_role_required', your_roles: roles });
  }
  next();
}

export function requireLayerAdmin(layer: 'dos' | 'dauth' | 'dsoc' | 'dnoc') {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    const roles = req.actor?.roles ?? [];
    if (roles.includes('platform_admin') || roles.includes(`${layer}_admin`)) return next();
    return res.status(403).json({ error: `${layer}_admin_role_required`, your_roles: roles });
  };
}

export function requireMutationAllowed(req: AdminRequest, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // CSRF protection: require custom header for cookie/JWT auth; API-keys bypass (machine-to-machine)
  if (req.actor?.authMethod === 'api_key') return next();
  const csrf = req.header('x-csrf') || req.header('x-requested-with');
  if (!csrf) return res.status(403).json({ error: 'csrf_header_required', hint: 'send x-requested-with: XMLHttpRequest' });
  next();
}

export function asyncHandler(fn: (req: AdminRequest, res: Response, next: NextFunction) => Promise<any>) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export async function audit(layer: string, action: string, actor: Actor | undefined, resource: { type: string; id?: string }, outcome: 'success' | 'failure' = 'success', attributes: any = {}) {
  try {
    await exec(
      `INSERT INTO platform_dsoc.audit_log(tenant_id,category,severity,actor_type,actor_id,action,resource_type,resource_id,outcome,occurred_at,attributes)
       VALUES($1,'config_change','info',$2,$3,$4,$5,$6,$7,NOW(),$8::jsonb)`,
      [
        actor?.tenantId || 'platform',
        actor?.authMethod === 'api_key' ? 'service' : 'user',
        actor?.userId || 'system',
        `${layer}.${action}`,
        resource.type,
        resource.id || null,
        outcome,
        JSON.stringify({ ...attributes, auth_method: actor?.authMethod, session_id: actor?.sessionId }),
      ]
    );
  } catch { /* audit failure must not break requests */ }
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'internal_error', details: err.detail || undefined });
}

export function paginate(req: Request): { limit: number; offset: number; page: number; pageSize: number } {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(req.query.pageSize as string) || 50));
  return { limit: pageSize, offset: (page - 1) * pageSize, page, pageSize };
}

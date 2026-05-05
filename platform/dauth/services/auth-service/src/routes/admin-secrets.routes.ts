/**
 * Platform-admin secret management.
 *
 * Mounted at `/admin/secrets`; gateway exposes as
 *   GET  /api/auth/admin/secrets             — list catalog + masked previews
 *   PUT  /api/auth/admin/secrets/:secretKey  — upsert one value
 *
 * Authorization:
 *   - Caller must hold a valid access cookie (session.verifySession).
 *   - Email must be in PLATFORM_ADMIN_EMAILS, OR the access-token must
 *     carry a realm role matching ADMIN_ROLE (default 'platform_admin').
 *   - The dynamic admin UI route (/admin/integrations/secrets) is itself
 *     gated by the workspace-shell perm catalog.
 */
import { Router, Request, Response } from 'express';
import { COOKIE_ACCESS, decodeAccessTokenClaims, verifySession } from '../lib/session';
import { listSecrets, setSecret } from '../lib/dynamic-secrets';

export const adminSecretsRouter = Router();

const ADMIN_ROLE = process.env.PLATFORM_ADMIN_REALM_ROLE || 'platform_admin';

function platformAdminEmails(): Set<string> {
  const csv = (process.env.PLATFORM_ADMIN_EMAILS || '').trim();
  const raw = csv === ''
    ? ['doganlap@gmail.com', 'ahmet.dogan@doganconsult.com']
    : csv.split(',').map((s) => s.trim()).filter(Boolean);
  return new Set(raw.map((s) => s.toLowerCase()));
}

interface Caller { sub: string; email: string; isPlatformAdmin: boolean; }

async function requirePlatformAdmin(req: Request, res: Response): Promise<Caller | null> {
  const access = req.cookies?.[COOKIE_ACCESS] as string | undefined;
  if (!access) {
    res.status(401).json({ ok: false, error: 'NO_SESSION' });
    return null;
  }
  let claims: Record<string, unknown> = {};
  try {
    claims = (await verifySession(access)) as Record<string, unknown>;
  } catch {
    const c = decodeAccessTokenClaims(access);
    claims = { sub: c.sub, email: c.email };
  }
  const sub = typeof claims.sub === 'string' ? claims.sub : '';
  const email = typeof claims.email === 'string' ? claims.email : '';
  if (!sub || !email) {
    res.status(401).json({ ok: false, error: 'NO_SESSION' });
    return null;
  }
  const realmRoles = Array.isArray((claims as { realm_access?: { roles?: unknown[] } }).realm_access?.roles)
    ? ((claims as { realm_access: { roles: unknown[] } }).realm_access.roles.filter((r) => typeof r === 'string') as string[])
    : [];
  const isAdmin = platformAdminEmails().has(email.toLowerCase()) || realmRoles.includes(ADMIN_ROLE);
  if (!isAdmin) {
    res.status(403).json({ ok: false, error: 'PLATFORM_ADMIN_REQUIRED' });
    return null;
  }
  return { sub, email, isPlatformAdmin: true };
}

adminSecretsRouter.get('/', async (req: Request, res: Response) => {
  const c = await requirePlatformAdmin(req, res);
  if (!c) return;
  const tenantId = typeof req.query.tenantId === 'string' && req.query.tenantId
    ? String(req.query.tenantId) : null;
  try {
    const items = await listSecrets({ tenantId });
    return res.json({ ok: true, items, scope: tenantId ? 'tenant' : 'platform', tenantId });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'LIST_FAILED', message: (e as Error).message });
  }
});

adminSecretsRouter.put('/:secretKey', async (req: Request, res: Response) => {
  const caller = await requirePlatformAdmin(req, res);
  if (!caller) return;
  const secretKey = req.params.secretKey;
  if (!/^[a-zA-Z][a-zA-Z0-9._-]{1,127}$/.test(secretKey)) {
    return res.status(400).json({ ok: false, error: 'INVALID_KEY' });
  }
  const body = (req.body ?? {}) as { value?: string; scope?: string; tenantId?: string };
  const value = typeof body.value === 'string' ? body.value : '';
  const scope = (body.scope === 'tenant' ? 'tenant' : 'platform') as 'platform' | 'tenant';
  const tenantId = scope === 'tenant'
    ? (typeof body.tenantId === 'string' && body.tenantId ? body.tenantId : null)
    : null;
  if (scope === 'tenant' && !tenantId) {
    return res.status(400).json({ ok: false, error: 'TENANT_ID_REQUIRED' });
  }
  try {
    const r = await setSecret(secretKey, value, {
      scope, tenantId,
      updatedBy: caller.email,
    });
    if (!r.ok) return res.status(400).json(r);
    return res.json({ ok: true, secretKey, scope, tenantId, deactivated: value === '' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'UPSERT_FAILED', message: (e as Error).message });
  }
});

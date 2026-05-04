import { Router, type Request, type Response } from 'express';
import { encryptBootstrap } from '../lib/jwe.js';
import { roleSetHash } from '../lib/cache-key.js';
import { BootstrapPayloadSchema } from '../schemas/bootstrap.schemas.js';

/**
 * GET /api/workspace/bootstrap
 *
 * Doctrine Article 2: single source of truth for SPA workspace bootstrap.
 * Returns a JWE-signed payload built from `dos.mv_workspace_bootstrap` keyed on
 * `(tenantId, roleSetHash, uiCatalogVersion)`. SSE invalidation arrives in M5.
 *
 * Inputs (all from authenticated session injected by gateway):
 *   - req.user.userId, req.user.email
 *   - req.tenant.tenantId
 *   - req.user.roles[]
 *
 * Output: `{ jwe, expiresAt, cacheKey }`
 */
export const bootstrapRouter = Router();

bootstrapRouter.get('/bootstrap', async (req: Request, res: Response) => {
  try {
    const sess = (req as any).user ?? null;
    const ten = (req as any).tenant ?? null;
    if (!sess || !ten) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }

    // M4 stub: read from mv_workspace_bootstrap (M5 will add SSE invalidation).
    // Until the materialized view is plumbed end-to-end via @dos/db, return a
    // deterministic projection of the verified session+tenant+role set so the
    // wire contract and JWE shape ship today and downstream consumers
    // (workspace-shell, navigation.store, accessStore.load) can adopt it.
    const roles: string[] = Array.isArray(sess.roles) ? sess.roles : [];
    const permissions: string[] = Array.isArray(sess.permissions) ? sess.permissions : [];
    const modules: string[] = Array.isArray(sess.modules) ? sess.modules : [];
    const uiCatalogVersion: string = String(sess.uiCatalogVersion ?? 'v1');

    const cacheKey = {
      tenantId: ten.tenantId,
      roleSetHash: roleSetHash(roles),
      uiCatalogVersion,
    };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    const payload = {
      session: {
        userId: sess.userId,
        email: sess.email,
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      tenant: {
        tenantId: ten.tenantId,
        name: ten.name ?? null,
        status: ten.status ?? 'active',
      },
      modules,
      permissions,
      roles,
      uiCatalogVersion,
      nav: { primary: [], secondary: [] },
      shell: { surfaces: [] },
      cacheKey,
    };

    BootstrapPayloadSchema.parse(payload);

    const jwe = await encryptBootstrap(payload);
    res.json({ jwe, expiresAt: expiresAt.toISOString(), cacheKey });
  } catch (err) {
    res.status(500).json({ error: 'bootstrap_failed', detail: String((err as Error).message) });
  }
});

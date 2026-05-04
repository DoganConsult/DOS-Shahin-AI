import { Router, type Request, type Response } from 'express';
import { encryptBootstrap } from '../lib/jwe.js';
import { roleSetHash } from '../lib/cache-key.js';
import { BootstrapPayloadSchema } from '../schemas/bootstrap.schemas.js';
import { readBootstrapMv } from '../lib/bootstrap-repo.js';

/**
 * GET /api/workspace/bootstrap
 *
 * Doctrine Article 2: single source of truth for SPA workspace bootstrap.
 * Reads `dos.mv_workspace_bootstrap` keyed on
 * `(tenantId, ui_catalog_version)` (M5 will add roleSetHash dim) and
 * returns a JWE-signed payload. SSE invalidation channel ships in M5.
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

    const tenantId = String(ten.tenantId);
    const uiCatalogVersion = String(sess.uiCatalogVersion ?? 'v1');
    const roles: string[] = Array.isArray(sess.roles) ? sess.roles : [];
    const permissions: string[] = Array.isArray(sess.permissions) ? sess.permissions : [];
    const modules: string[] = Array.isArray(sess.modules) ? sess.modules : [];

    const mv = await readBootstrapMv(tenantId, uiCatalogVersion);

    const cacheKey = {
      tenantId,
      roleSetHash: roleSetHash(roles),
      uiCatalogVersion,
    };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    const payload = {
      session: {
        userId: String(sess.userId),
        email: String(sess.email),
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      tenant: {
        tenantId,
        name: ten.name ?? null,
        status: ten.status ?? 'active',
      },
      modules,
      permissions,
      roles,
      uiCatalogVersion,
      nav: {
        primary: (mv?.routes as unknown[]) ?? [],
        secondary: [],
      },
      shell: { surfaces: (mv?.shell as unknown[]) ?? [] },
      cacheKey,
    };

    BootstrapPayloadSchema.parse(payload);

    const jwe = await encryptBootstrap(payload);
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    res.json({
      jwe,
      expiresAt: expiresAt.toISOString(),
      cacheKey,
      mvRefreshedAt: mv?.refreshed_at ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: 'bootstrap_failed', detail: String((err as Error).message) });
  }
});

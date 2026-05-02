import { Router } from 'express';
import { BootstrapQuerySchema } from '../schemas/bootstrap.schemas.js';
import { UiOsBootstrapManager } from '../managers/ui-os-bootstrap.manager.js';
import type { DbPool } from '../db.js';
import type { BootstrapRequest } from '../managers/ui-os-bootstrap.manager.js';

export function createBootstrapRouter(pool: DbPool): Router {
  const router = Router();
  const manager = new UiOsBootstrapManager(pool);

  router.get('/bootstrap', async (req, res) => {
    const parsed = BootstrapQuerySchema.safeParse({
      tenantId: req.header('x-dos-tenant-id') ?? req.query.tenantId,
      userId: req.header('x-dos-user-id') ?? req.query.userId,
      productCode: req.query.productCode ?? req.header('x-dos-product-code') ?? null,
      workspaceKey: req.query.workspaceKey ?? 'default',
    });

    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
      return;
    }

    try {
      const request: BootstrapRequest = {
        tenantId: parsed.data.tenantId as string,
        userId: parsed.data.userId as string,
        productCode: parsed.data.productCode ?? null,
        workspaceKey: parsed.data.workspaceKey ?? 'default',
      };
      const manifest = await manager.load(request);
      res.json(manifest);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      res.status(500).json({ error: 'bootstrap_failed', message });
    }
  });

  router.get('/bootstrap/minimal', async (req, res) => {
    const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
    const userId = (req.header('x-dos-user-id') ?? req.query.userId) as string | undefined;
    if (!tenantId || !userId) { res.status(400).json({ error: 'missing_identity' }); return; }
    try {
      res.json(await manager.loadMinimal({
        tenantId, userId,
        productCode: (req.query.productCode as string | undefined) ?? null,
        workspaceKey: (req.query.workspaceKey as string | undefined) ?? 'default',
      }));
    } catch (err) {
      res.status(500).json({ error: 'bootstrap_minimal_failed', message: (err as Error).message });
    }
  });

  router.get('/bootstrap/module/:moduleCode', async (req, res) => {
    const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
    const userId = (req.header('x-dos-user-id') ?? req.query.userId) as string | undefined;
    if (!tenantId || !userId) { res.status(400).json({ error: 'missing_identity' }); return; }
    try {
      const r = await manager.loadModuleScope(tenantId, userId, req.params.moduleCode);
      if (!r.module) { res.status(404).json({ error: 'module_not_found' }); return; }
      res.json(r);
    } catch (err) {
      res.status(500).json({ error: 'bootstrap_module_failed', message: (err as Error).message });
    }
  });

  router.get('/bootstrap/route/:routeKey', async (req, res) => {
    const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
    const userId = (req.header('x-dos-user-id') ?? req.query.userId) as string | undefined;
    if (!tenantId || !userId) { res.status(400).json({ error: 'missing_identity' }); return; }
    try {
      res.json(await manager.loadRouteScope(tenantId, userId, req.params.routeKey));
    } catch (err) {
      res.status(500).json({ error: 'bootstrap_route_failed', message: (err as Error).message });
    }
  });

  return router;
}

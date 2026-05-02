import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';
import {
  UiOsWidgetManager,
  type WidgetInstanceCreate,
} from '../managers/ui-os-widget.manager.js';
import {
  WidgetInstanceCreateSchema,
  WidgetInstancePatchSchema,
} from '../schemas/widget.schemas.js';

interface Context { tenantId: string; userId: string }

function context(req: Request, res: Response): Context | null {
  const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
  const userId = (req.header('x-dos-user-id') ?? req.query.userId) as string | undefined;
  if (!tenantId || !userId) {
    res.status(400).json({ error: 'missing_identity', message: 'x-dos-tenant-id and x-dos-user-id headers are required' });
    return null;
  }
  return { tenantId, userId };
}

export function createWidgetsRouter(pool: DbPool): Router {
  const router = Router();
  const manager = new UiOsWidgetManager(pool);

  router.get('/widgets/catalog', async (req, res) => {
    const ctx = context(req, res);
    if (!ctx) return;
    try {
      const items = await manager.catalog(
        ctx.tenantId,
        (req.query.moduleCode as string | undefined) ?? null,
      );
      res.json({ widgets: items });
    } catch (err) {
      res.status(500).json({ error: 'catalog_failed', message: (err as Error).message });
    }
  });

  router.get('/widgets/instances', async (req, res) => {
    const ctx = context(req, res);
    if (!ctx) return;
    try {
      const items = await manager.listInstances(
        ctx.tenantId,
        (req.query.dashboardKey as string | undefined) ?? null,
      );
      res.json({ instances: items });
    } catch (err) {
      res.status(500).json({ error: 'instances_failed', message: (err as Error).message });
    }
  });

  router.post('/widgets/instances', async (req, res) => {
    const ctx = context(req, res);
    if (!ctx) return;
    const parsed = WidgetInstanceCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
      return;
    }
    try {
      const inst = await manager.createInstance(ctx.tenantId, parsed.data as unknown as WidgetInstanceCreate);
      if (!inst) {
        res.status(404).json({ error: 'dashboard_not_found' });
        return;
      }
      res.status(201).json(inst);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('duplicate key')) {
        res.status(409).json({ error: 'instance_exists' });
        return;
      }
      res.status(500).json({ error: 'instance_create_failed', message: msg });
    }
  });

  router.put('/widgets/instances/:instanceKey', async (req, res) => {
    const ctx = context(req, res);
    if (!ctx) return;
    const parsed = WidgetInstancePatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
      return;
    }
    try {
      const inst = await manager.updateInstance(ctx.tenantId, req.params.instanceKey, parsed.data);
      if (!inst) {
        res.status(404).json({ error: 'instance_not_found' });
        return;
      }
      res.json(inst);
    } catch (err) {
      res.status(500).json({ error: 'instance_update_failed', message: (err as Error).message });
    }
  });

  router.delete('/widgets/instances/:instanceKey', async (req, res) => {
    const ctx = context(req, res);
    if (!ctx) return;
    try {
      const ok = await manager.deleteInstance(ctx.tenantId, req.params.instanceKey);
      if (!ok) {
        res.status(404).json({ error: 'instance_not_found' });
        return;
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'instance_delete_failed', message: (err as Error).message });
    }
  });

  router.post('/widgets/instances/:instanceKey/refresh', async (req, res) => {
    const ctx = context(req, res);
    if (!ctx) return;
    try {
      const r = await manager.refreshInstance(ctx.tenantId, req.params.instanceKey);
      if (!r) {
        res.status(404).json({ error: 'instance_not_found' });
        return;
      }
      res.json(r);
    } catch (err) {
      res.status(500).json({ error: 'instance_refresh_failed', message: (err as Error).message });
    }
  });

  return router;
}

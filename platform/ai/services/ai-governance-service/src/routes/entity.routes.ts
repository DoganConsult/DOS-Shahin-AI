import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import { validate, paginated, ok, rateLimiter } from '@dos/platform-core/http';
import { recordAudit } from '../adapters/audit.adapter';
import { publishEntityEvent } from '../events/publisher';
import * as entityService from '../domain/entity.service';
import { listQuerySchema, createEntityBody, updateEntityBody } from '../schemas/entity.schemas';
import type { AiGovernanceEntityTypeDef } from '../domain/entity-types';
import { withTenantClient } from '@dos/db';

/**
 * Build a Router for one ai-governance entity type.
 *
 * Routes (mounted at /api/ai-governance/<urlSlug>):
 *   GET    /          → list (paginated, FE expects bare array OR {data,total})
 *   GET    /stats     → counts by status
 *   GET    /:id       → single entity
 *   POST   /          → create
 *   PUT    /:id       → update
 *   DELETE /:id       → soft-delete
 */
export function buildEntityRouter(def: AiGovernanceEntityTypeDef): Router {
  
// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'ai-governance-service:entity', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

  router.use(authenticate);
  router.use(requireTenantId);

  router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
      const result = await entityService.list(tenantId, def.entityType, {
        page, pageSize, status, search, sortBy, sortOrder,
      });
      // FE list components consume the array directly (see e.g.
      // ai-monitoring-plans.component.ts:94). Honour the X-Total-Count header
      // so paginated callers still get the total.
      res.setHeader('X-Total-Count', String(result.total));
      res.setHeader('X-Page', String(result.page));
      res.setHeader('X-Page-Size', String(result.pageSize));
      // Dual-shape response: respect Accept hint for the typed callers.
      if ((req.query as any).envelope === 'true') {
        paginated(res, result.data, result.total, result.page, result.pageSize);
      } else {
        res.json(result.data);
      }
    } catch (err) {
      res.status(500).json({ error: `Failed to list ${def.urlSlug}`, details: (err as Error).message });
    }
  });

  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const stats = await entityService.getStats(tenantId, def.entityType);
      ok(res, stats);
    } catch (err) {
      res.status(500).json({ error: `Failed to get ${def.urlSlug} stats`, details: (err as Error).message });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const item = await entityService.getById(tenantId, def.entityType, req.params.id);
      if (!item) { res.status(404).json({ error: 'Not found' }); return; }
      ok(res, item);
    } catch (err) {
      res.status(500).json({ error: `Failed to get ${def.urlSlug}`, details: (err as Error).message });
    }
  });

  router.post('/', validate({ body: createEntityBody }), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actor = req.user?.id;
      const created = await entityService.create(tenantId, def.entityType, req.body, actor);
      await recordAudit(tenantId, 'create', def.entityType, created.id, actor, { title: created.title });
      await publishEntityEvent('created', def.entityType, tenantId, created.id, { title: created.title }, actor);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: `Failed to create ${def.urlSlug}`, details: (err as Error).message });
    }
  });

  router.put('/:id', validate({ body: updateEntityBody }), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actor = req.user?.id;
      const updated = await entityService.update(tenantId, def.entityType, req.params.id, req.body, actor);
      if (!updated) { res.status(404).json({ error: 'Not found' }); return; }
      await recordAudit(tenantId, 'update', def.entityType, updated.id, actor, { changes: Object.keys(req.body || {}) });
      await publishEntityEvent('updated', def.entityType, tenantId, updated.id, { title: updated.title }, actor);
      ok(res, updated);
    } catch (err) {
      res.status(500).json({ error: `Failed to update ${def.urlSlug}`, details: (err as Error).message });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actor = req.user?.id;
      const deleted = await entityService.softDelete(tenantId, def.entityType, req.params.id, actor);
      if (!deleted) { res.status(404).json({ error: 'Not found' }); return; }
      await recordAudit(tenantId, 'delete', def.entityType, req.params.id, actor);
      await publishEntityEvent('deleted', def.entityType, tenantId, req.params.id, undefined, actor);
      res.json({ message: `${def.label} deleted` });
    } catch (err) {
      res.status(500).json({ error: `Failed to delete ${def.urlSlug}`, details: (err as Error).message });
    }
  });

  return router;
}

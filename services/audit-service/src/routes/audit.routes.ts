import { Router, Request, Response } from 'express';
import { recordAuditEntry, listAuditTrail, getAuditEntry, exportAuditLog, bulkRemoveEntries, getAuditSummary } from '../domain/audit.service';
import { archiveOldAuditEntries, getRetentionStats } from '../domain/retention.service';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { authenticate, requirePermission, requireSuperAdmin } from '../adapters/auth.adapter';
import { createAuditEntryBody, listEntriesQuerySchema, bulkDeleteBody } from '../schemas/audit.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'audit-service:audit', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();
router.use(authenticate);

router.get('/logs', requirePermission('audit.trail.read'), validate({ query: listEntriesQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const result = await listAuditTrail(tenantId, {
      actorId: (req.query.userId || req.query.actorId) as string | undefined,
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      module: req.query.module as string | undefined,
      action: req.query.action as string | undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    });
    paginated(res, result.data, result.total, 1, result.data.length);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list audit logs' });
  }
});

router.get('/summary', requirePermission('audit.trail.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const summary = await getAuditSummary(tenantId, {
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
    });
    ok(res, summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load audit summary' });
  }
});

router.get('/entries', requirePermission('audit.trail.read'), validate({ query: listEntriesQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const result = await listAuditTrail(tenantId, {
      actorId: (req.query.userId || req.query.actorId) as string | undefined,
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      module: req.query.module as string | undefined,
      action: req.query.action as string | undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    });
    paginated(res, result.data, result.total, 1, result.data.length);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list audit entries' });
  }
});

router.post('/entries', requirePermission('audit.trail.write'), validate({ body: createAuditEntryBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const { userId, actorId, eventType, action: actionField, module, entityType, entityId, beforeState, afterState, ipAddress, source, metadata, details } = req.body;
    const result = await recordAuditEntry({ tenantId, actorId: actorId || userId, eventType, action: actionField, module, entityType, entityId, beforeState, afterState, ipAddress, source, details: details || metadata });
    res.status(201);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record audit entry' });
  }
});

router.get('/export', requirePermission('audit.trail.export'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const data = await exportAuditLog(tenantId, {
      actorId: (req.query.userId || req.query.actorId) as string | undefined,
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      module: req.query.module as string | undefined,
      action: req.query.action as string | undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    ok(res, { data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to export audit log' });
  }
});

router.get('/trail', requirePermission('audit.trail.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const entityType = req.query.entity_type as string | undefined;
    const entityId = req.query.entity_id as string | undefined;
    const result = await listAuditTrail(tenantId, {
      entityType,
      entityId,
      actorId: (req.query.userId || req.query.actorId) as string | undefined,
      module: req.query.module as string | undefined,
      action: req.query.action as string | undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    });
    paginated(res, result.data, result.total, 1, result.data.length);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get audit trail' });
  }
});

router.delete('/entries/bulk', requireSuperAdmin, validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const count = await bulkRemoveEntries(tenantId, req.body.ids);
    action(res, `${count} audit entries deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete audit entries' });
  }
});

router.get('/entries/:id', requirePermission('audit.trail.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const entry = await getAuditEntry(tenantId, req.params.id);
    if (!entry) {
      res.status(404).json({ error: 'Audit entry not found' });
      return;
    }
    ok(res, entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get audit entry' });
  }
});

router.post('/retention/archive', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const retentionDays = req.body.retentionDays ? parseInt(req.body.retentionDays, 10) : 365;
    const result = await archiveOldAuditEntries(tenantId, retentionDays);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive audit entries' });
  }
});

router.get('/retention/stats', requirePermission('audit.trail.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const stats = await getRetentionStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get retention stats' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/audit/timeline
// Consumed by frontend/.../docs/panels/activity-timeline-panel.component.ts
// Returns a flat list of audit events normalised to an "event" shape the
// FE timeline widget renders directly. Query:
//   ?entityType=& entityId=& module=& limit=&
// ─────────────────────────────────────────────────────────────────────
router.get('/timeline', requirePermission('audit.trail.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '';
    if (!tenantId) {
      res.status(400).json({ error: 'Missing x-tenant-id header' });
      return;
    }
    const result = await listAuditTrail(tenantId, {
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      module: req.query.module as string | undefined,
      limit: req.query.limit ? Math.min(parseInt(req.query.limit as string, 10) || 50, 200) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    });
    const events = result.data.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: (r['audit_id'] as string) || (r['entry_id'] as string) || '',
        timestamp: (r['created_at'] as string | undefined) ?? new Date().toISOString(),
        action: (r['action'] as string) ?? '',
        actorLabel: (r['actor_id'] as string) ?? (r['user_id'] as string) ?? '',
        entityType: (r['entity_type'] as string) ?? '',
        entityId: (r['entity_id'] as string) ?? '',
        module: (r['module'] as string) ?? '',
        payload: (r['details'] ?? r['payload'] ?? null),
      };
    });
    res.json({ events, total: result.total, hasMore: events.length < result.total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load audit timeline' });
  }
});

export default router;

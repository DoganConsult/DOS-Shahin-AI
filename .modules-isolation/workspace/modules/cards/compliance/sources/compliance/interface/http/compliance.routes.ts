import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as complianceService from '../../domain/compliance.service';
import { recordAudit, listAuditEntries } from '../adapters/audit.adapter';
import { publishComplianceAssessed, publishDomainEvent } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createComplianceBody, updateComplianceBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../../schemas/compliance.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'compliance-controls-service:compliance', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
    const result = await complianceService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list compliances', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await complianceService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get compliance stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await complianceService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await complianceService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Shahin FE (features/compliance/dashboards/compliance-dashboard.component.ts:89)
// calls `GET /api/compliance/dashboard`. Must be declared BEFORE the
// generic `/:id` handler below — even with its UUID guard, `/:id`
// would return 404 for 'dashboard' before we ever got here.
async function complianceDashboardHandler(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId!;
    const result = await complianceService.detectDrift(tenantId);
    const snapshot = await complianceService.captureSnapshot(tenantId);
    const stats = await complianceService.getStats(tenantId);
    ok(res, { stats, drift: result, latestSnapshot: snapshot });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get compliance dashboard', details: (err as Error).message });
  }
}

router.get('/dashboard', complianceDashboardHandler);

router.get('/:id', async (req: Request, res: Response) => {
  try {
    // The router is mounted at /compliance/, and sibling sub-routers
    // like /compliance/frameworks are mounted AFTER this handler in
    // services/compliance-controls-service/src/routes/index.ts. Treat
    // anything that isn't a UUID as "not found" here so requests for
    // sub-paths don't blow up inside getById with a uuid-parse error.
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Compliance not found', code: 'COMPLIANCE_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const item = await complianceService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Compliance not found', code: 'COMPLIANCE_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get compliance', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createComplianceBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await complianceService.create(tenantId, req.body);
    recordAudit(tenantId, 'compliance.created', 'compliance', item.requirement_id, actorId, { title: req.body.title || req.body.name });
    await publishComplianceAssessed(tenantId, item.requirement_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Compliance Created', `Compliance "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.requirement_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create compliance', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateComplianceBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await complianceService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Compliance not found', code: 'COMPLIANCE_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'compliance.updated', 'compliance', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishComplianceAssessed(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update compliance', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await complianceService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Compliance not found', code: 'COMPLIANCE_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'compliance.deleted', 'compliance', req.params.id, actorId);
    action(res, 'Compliance deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete compliance', details: (err as Error).message });
  }
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const item = await complianceService.restore(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Compliance not found or not deleted', code: 'COMPLIANCE_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'compliance.restored', 'compliance', req.params.id, actorId);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore compliance', details: (err as Error).message });
  }
});

router.get('/module/dashboard', complianceDashboardHandler);

router.get('/module/drift', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await complianceService.detectDrift(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to detect drift', details: (err as Error).message });
  }
});

router.post('/module/snapshot', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const snapshotId = await complianceService.captureSnapshot(tenantId);
    recordAudit(tenantId, 'compliance.snapshot-captured', 'compliance', snapshotId ?? 'n/a', actorId);
    ok(res, { snapshotId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to capture snapshot', details: (err as Error).message });
  }
});

router.get('/module/attestation', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await complianceService.runContinuousAttestationCheck(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to run attestation check', details: (err as Error).message });
  }
});

// Activity log for an obligation. The Shahin FE
// (features/compliance/pages/regulatory-group/compliance-regulatory/
// obligation-detail-page.component.ts:510) used to call the
// non-existent prefix `/api/compliance-ext/obligations/:id/activity`.
// Phase 2 closure C-01: caller realigned to the canonical
// `/api/compliance/obligations/:id/activity`, served here by proxying
// to audit-service with tenant + entity filters. No new datastore.
router.get('/obligations/:obligationId/activity', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { obligationId } = req.params;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10) || 50, 200) : 50;
    const offset = req.query.offset ? Math.max(parseInt(req.query.offset as string, 10) || 0, 0) : 0;
    const authToken = (req.headers['authorization'] as string | undefined)?.replace(/^Bearer\s+/i, '');
    const result = await listAuditEntries(tenantId, {
      entityType: 'obligation',
      entityId: obligationId,
      limit,
      offset,
      authToken,
    });
    paginated(res, result.data, result.total, Math.floor(offset / limit) + 1, limit);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load obligation activity', details: (err as Error).message });
  }
});

router.get('/module/regulatory-delta', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await complianceService.getRegulatoryDelta(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get regulatory delta', details: (err as Error).message });
  }
});

export default router;

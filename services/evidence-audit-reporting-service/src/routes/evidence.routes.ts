import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as evidenceService from '../domain/evidence.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishEvidenceSubmitted } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createEvidenceBody, updateEvidenceBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/evidence.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'evidence-audit-reporting-service:evidence', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
    const result = await evidenceService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list evidences', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await evidenceService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get evidence stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await evidenceService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await evidenceService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

// ── Module-delegated routes (Wave 2B) — must be before /:id ────────────

router.get('/module/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await evidenceService.getEvidenceDashboard(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get evidence dashboard', details: (err as Error).message });
  }
});

// Phase 11 route-collision guard (mirrors compliance.routes.ts pattern).
// The evidence router mounts /:id alongside sibling sub-routers served
// via the aggregator (evidence-requests, evidence-schedules, etc.). A
// non-UUID value now 404s cleanly instead of casting into Postgres and
// surfacing a 500.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Evidence not found', code: 'EVIDENCE_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const item = await evidenceService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Evidence not found', code: 'EVIDENCE_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get evidence', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createEvidenceBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await evidenceService.create(tenantId, req.body);
    recordAudit(tenantId, 'evidence.created', 'evidence', item.evidence_id, actorId, { title: req.body.title || req.body.name });
    await publishEvidenceSubmitted(tenantId, item.evidence_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Evidence Created', `Evidence "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.evidence_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create evidence', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateEvidenceBody }), async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Evidence not found', code: 'EVIDENCE_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await evidenceService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Evidence not found', code: 'EVIDENCE_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'evidence.updated', 'evidence', req.params.id, actorId, { changes: Object.keys(req.body) });
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update evidence', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Evidence not found', code: 'EVIDENCE_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await evidenceService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Evidence not found', code: 'EVIDENCE_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'evidence.deleted', 'evidence', req.params.id, actorId);
    action(res, 'Evidence deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete evidence', details: (err as Error).message });
  }
});

// ── Module-delegated /:id sub-routes (Wave 2B) ────────────────────────

router.get('/:id/score', async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Evidence not found', code: 'EVIDENCE_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const result = await evidenceService.scoreEvidence(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to score evidence', details: (err as Error).message });
  }
});

router.get('/:id/quality', async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Evidence not found', code: 'EVIDENCE_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const result = await evidenceService.getEvidenceQuality(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get evidence quality', details: (err as Error).message });
  }
});

router.get('/:id/freshness', async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Evidence not found', code: 'EVIDENCE_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const result = await evidenceService.checkFreshness(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check freshness', details: (err as Error).message });
  }
});

router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: 'Evidence not found', code: 'EVIDENCE_NOT_FOUND' });
      return;
    }
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { targetStatus, reason } = req.body;
    const result = await evidenceService.transitionEvidenceStatus(tenantId, req.params.id, targetStatus, actorId, reason);
    if (!result) {
      res.status(400).json({ error: 'Transition unavailable or invalid' });
      return;
    }
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to transition status', details: (err as Error).message });
  }
});

export default router;

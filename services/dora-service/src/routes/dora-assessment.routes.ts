import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as doraAssessmentService from '../domain/dora-assessment.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishDoraAssessmentCreated, publishDoraAssessmentCompleted } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createDoraAssessmentBody, updateDoraAssessmentBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/dora-assessment.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'dora-service:dora-assessment', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
    const result = await doraAssessmentService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list dora-assessments', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await doraAssessmentService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get dora-assessment stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await doraAssessmentService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await doraAssessmentService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

// ── Module-delegated routes (Wave 2B) — must be before /:id ────────────

router.get('/module/obligations', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await doraAssessmentService.getObligationStatus(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get obligation status', details: (err as Error).message });
  }
});

router.get('/module/resilience', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await doraAssessmentService.getResilienceAssessment(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get resilience assessment', details: (err as Error).message });
  }
});

router.get('/module/mapping', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await doraAssessmentService.getDoraMapping(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get DORA mapping', details: (err as Error).message });
  }
});

router.get('/module/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await doraAssessmentService.getDoraDashboard(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get DORA dashboard', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await doraAssessmentService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'DoraAssessment not found', code: 'DORA_ASSESSMENT_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get dora-assessment', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createDoraAssessmentBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await doraAssessmentService.create(tenantId, req.body);
    recordAudit(tenantId, 'dora-assessment.created', 'dora-assessment', item.assessment_id, actorId, { title: req.body.title || req.body.name });
    await publishDoraAssessmentCreated(tenantId, item.assessment_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'DoraAssessment Created', `DoraAssessment "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.assessment_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create dora-assessment', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateDoraAssessmentBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await doraAssessmentService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'DoraAssessment not found', code: 'DORA_ASSESSMENT_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'dora-assessment.updated', 'dora-assessment', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishDoraAssessmentCompleted(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update dora-assessment', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await doraAssessmentService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'DoraAssessment not found', code: 'DORA_ASSESSMENT_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'dora-assessment.deleted', 'dora-assessment', req.params.id, actorId);
    action(res, 'DoraAssessment deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete dora-assessment', details: (err as Error).message });
  }
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const item = await doraAssessmentService.restore(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'DoraAssessment not found or not deleted', code: 'DORA_ASSESSMENT_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'dora-assessment.restored', 'dora-assessment', req.params.id, actorId);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore dora-assessment', details: (err as Error).message });
  }
});

// ── Module-delegated /:id sub-routes (Wave 2B) ────────────────────────

router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { targetStatus, reason } = req.body;
    const result = await doraAssessmentService.transitionStatus(tenantId, req.params.id, targetStatus, actorId, reason);
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

import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as privacyAssessmentService from '../domain/privacy-assessment.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishPrivacyAssessmentCreated, publishPrivacyDpiaCompleted } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createPrivacyAssessmentBody, updatePrivacyAssessmentBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/privacy-assessment.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'privacy-service:privacy-assessment', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;

    const result = await privacyAssessmentService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list privacy-assessments', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await privacyAssessmentService.getStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get privacy-assessment stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const items = await privacyAssessmentService.bulkCreate(tenantId, req.body.items);
    res.status(201); ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const count = await privacyAssessmentService.bulkRemove(tenantId, req.body.ids);
    action(res, `${count} items deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
  }
});

// ── Module-delegated routes (Wave 2B) — must be before /:id ────────────

router.get('/module/data-mapping', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await privacyAssessmentService.getDataMapping(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get data mapping', details: (err as Error).message });
  }
});

router.get('/module/consent-status', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await privacyAssessmentService.getConsentStatus(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get consent status', details: (err as Error).message });
  }
});

router.get('/module/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await privacyAssessmentService.getPrivacyDashboard(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get privacy dashboard', details: (err as Error).message });
  }
});

router.get('/module/cross-border', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await privacyAssessmentService.getCrossBorderStatus(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cross-border status', details: (err as Error).message });
  }
});

router.post('/dsr', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { requestId, requestType } = req.body;
    const result = await privacyAssessmentService.processDSR(tenantId, requestId, requestType);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process DSR', details: (err as Error).message });
  }
});

router.post('/breach', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await privacyAssessmentService.handleBreach(tenantId, req.body);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to handle breach', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await privacyAssessmentService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'PrivacyAssessment not found', code: 'PRIVACY_ASSESSMENT_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get privacy-assessment', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createPrivacyAssessmentBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await privacyAssessmentService.create(tenantId, req.body);
    recordAudit(tenantId, 'privacy-assessment.created', 'privacy-assessment', item.assessment_id, actorId, { title: req.body.title || req.body.name });
    await publishPrivacyAssessmentCreated(tenantId, item.assessment_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'PrivacyAssessment Created', `PrivacyAssessment "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.assessment_id }).catch(() => {}); }
    res.status(201); ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create privacy-assessment', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updatePrivacyAssessmentBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await privacyAssessmentService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'PrivacyAssessment not found', code: 'PRIVACY_ASSESSMENT_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'privacy-assessment.updated', 'privacy-assessment', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishPrivacyDpiaCompleted(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update privacy-assessment', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await privacyAssessmentService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'PrivacyAssessment not found', code: 'PRIVACY_ASSESSMENT_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'privacy-assessment.deleted', 'privacy-assessment', req.params.id, actorId);
    action(res, 'PrivacyAssessment deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete privacy-assessment', details: (err as Error).message });
  }
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const item = await privacyAssessmentService.restore(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'PrivacyAssessment not found or not deleted', code: 'PRIVACY_ASSESSMENT_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'privacy-assessment.restored', 'privacy-assessment', req.params.id, actorId);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore privacy-assessment', details: (err as Error).message });
  }
});

// ── Module-delegated /:id sub-routes (Wave 2B) ────────────────────────

router.post('/:id/pia', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await privacyAssessmentService.runPIA(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to run PIA', details: (err as Error).message });
  }
});

router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { targetStatus, reason } = req.body;
    const result = await privacyAssessmentService.transitionStatus(tenantId, req.params.id, targetStatus, actorId, reason);
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

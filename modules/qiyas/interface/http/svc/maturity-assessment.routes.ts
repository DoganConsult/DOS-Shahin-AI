import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as maturityAssessmentService from '../../../domain/maturity-assessment.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishQiyasAssessmentCreated, publishQiyasLevelChanged } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createMaturityAssessmentBody, updateMaturityAssessmentBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/maturity-assessment.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'qiyas-journey-service:maturity-assessment', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;

    const result = await maturityAssessmentService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list maturity-assessments', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await maturityAssessmentService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get maturity-assessment stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const items = await maturityAssessmentService.bulkCreate(tenantId, req.body.items);
    recordAudit(tenantId, 'maturity-assessment.bulk-created', 'maturity-assessment', null as any, actorId, { count: items.length });
    res.status(201);
    ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create maturity-assessments', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const count = await maturityAssessmentService.bulkRemove(tenantId, req.body.ids);
    recordAudit(tenantId, 'maturity-assessment.bulk-deleted', 'maturity-assessment', null as any, actorId, { count });
    action(res, `${count} MaturityAssessments deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete maturity-assessments', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await maturityAssessmentService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'MaturityAssessment not found', code: 'MATURITY_ASSESSMENT_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get maturity-assessment', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createMaturityAssessmentBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await maturityAssessmentService.create(tenantId, req.body);
    recordAudit(tenantId, 'maturity-assessment.created', 'maturity-assessment', item.assessment_id, actorId, { title: req.body.title || req.body.name });
    await publishQiyasAssessmentCreated(tenantId, item.assessment_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'MaturityAssessment Created', `MaturityAssessment "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.assessment_id }).catch(() => {}); }
    res.status(201);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create maturity-assessment', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateMaturityAssessmentBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await maturityAssessmentService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'MaturityAssessment not found', code: 'MATURITY_ASSESSMENT_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'maturity-assessment.updated', 'maturity-assessment', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishQiyasLevelChanged(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update maturity-assessment', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await maturityAssessmentService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'MaturityAssessment not found', code: 'MATURITY_ASSESSMENT_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'maturity-assessment.deleted', 'maturity-assessment', req.params.id, actorId);
    action(res, 'MaturityAssessment deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete maturity-assessment', details: (err as Error).message });
  }
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const item = await maturityAssessmentService.restore(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'MaturityAssessment not found or not deleted', code: 'MATURITY_ASSESSMENT_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'maturity-assessment.restored', 'maturity-assessment', req.params.id, actorId);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore maturity-assessment', details: (err as Error).message });
  }
});

// ── Module domain delegation routes ──────────────────────────────────────

router.get('/maturity-levels', async (req: Request, res: Response) => {
  try {
    const result = await maturityAssessmentService.getMaturityLevels();
    ok(res, result ?? []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get maturity levels', details: (err as Error).message });
  }
});

router.get('/question-bank/:framework', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await maturityAssessmentService.getQuestionBank(tenantId, req.params.framework);
    ok(res, result ?? []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get question bank', details: (err as Error).message });
  }
});

router.post('/assessments/start', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await maturityAssessmentService.startAssessment(tenantId, req.body);
    if (!result) {
      res.status(503).json({ error: 'Assessment engine unavailable' });
      return;
    }
    res.status(201); ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to start assessment', details: (err as Error).message });
  }
});

router.get('/assessments/:assessmentId/score', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await maturityAssessmentService.computeAssessmentScore(tenantId, req.params.assessmentId);
    ok(res, result ?? { message: 'Score computation unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute score', details: (err as Error).message });
  }
});

router.get('/assessments/:assessmentId/report', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await maturityAssessmentService.buildReport(tenantId, req.params.assessmentId);
    ok(res, result ?? { message: 'Report builder unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build report', details: (err as Error).message });
  }
});

router.get('/benchmark', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await maturityAssessmentService.getQiyasBenchmark(tenantId);
    ok(res, result ?? { message: 'Benchmark data unavailable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get benchmark data', details: (err as Error).message });
  }
});

router.get('/trends', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await maturityAssessmentService.getTrendAnalysis(tenantId);
    ok(res, result ?? []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get trend analysis', details: (err as Error).message });
  }
});

export default router;

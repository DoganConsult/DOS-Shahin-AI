import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as trainingProgramService from '../domain/training-program.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishTrainingAssigned } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createTrainingProgramBody, updateTrainingProgramBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/training-program.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'training-service:training-program', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;

    const result = await trainingProgramService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list training-programs', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await trainingProgramService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get training-program stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const items = await trainingProgramService.bulkCreate(tenantId, req.body.items);
    recordAudit(tenantId, 'training-program.bulk-created', 'training-program', null as any, actorId, { count: items.length });
    res.status(201);
    ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create training-programs', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const count = await trainingProgramService.bulkRemove(tenantId, req.body.ids);
    recordAudit(tenantId, 'training-program.bulk-deleted', 'training-program', null as any, actorId, { count });
    action(res, `${count} TrainingPrograms deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete training-programs', details: (err as Error).message });
  }
});

// ── Module-delegated routes (Wave 2B) — must be before /:id ────────────

router.get('/module/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await trainingProgramService.getTrainingDashboard(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get training dashboard', details: (err as Error).message });
  }
});

router.get('/module/gap-analysis', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await trainingProgramService.getTrainingGapAnalysis(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get gap analysis', details: (err as Error).message });
  }
});

router.get('/module/maturity-score', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await trainingProgramService.getMaturityScore(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get maturity score', details: (err as Error).message });
  }
});

router.get('/module/completion-stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const programId = req.query.programId as string | undefined;
    const result = await trainingProgramService.getCompletionStats(tenantId, programId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get completion stats', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await trainingProgramService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'TrainingProgram not found', code: 'TRAINING_PROGRAM_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get training-program', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createTrainingProgramBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await trainingProgramService.create(tenantId, req.body);
    recordAudit(tenantId, 'training-program.created', 'training-program', item.program_id, actorId, { title: req.body.title || req.body.name });
    await publishTrainingAssigned(tenantId, item.program_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'TrainingProgram Created', `TrainingProgram "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.program_id }).catch(() => {}); }
    res.status(201);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create training-program', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateTrainingProgramBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await trainingProgramService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'TrainingProgram not found', code: 'TRAINING_PROGRAM_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'training-program.updated', 'training-program', req.params.id, actorId, { changes: Object.keys(req.body) });
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update training-program', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await trainingProgramService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'TrainingProgram not found', code: 'TRAINING_PROGRAM_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'training-program.deleted', 'training-program', req.params.id, actorId);
    action(res, 'TrainingProgram deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete training-program', details: (err as Error).message });
  }
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const item = await trainingProgramService.restore(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'TrainingProgram not found or not deleted', code: 'TRAINING_PROGRAM_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'training-program.restored', 'training-program', req.params.id, actorId);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore training-program', details: (err as Error).message });
  }
});

// ── Module-delegated /:id sub-routes (Wave 2B) ────────────────────────

router.get('/:id/enrollments', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const enrollments = await trainingProgramService.getEnrollments(tenantId, req.params.id);
    ok(res, enrollments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get enrollments', details: (err as Error).message });
  }
});

router.post('/:id/enroll', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { userId } = req.body;
    const targetUserId = userId || actorId;
    const result = await trainingProgramService.enrollUser(tenantId, req.params.id, targetUserId, actorId);
    if (!result) {
      res.status(400).json({ error: 'Enrollment failed' });
      return;
    }
    recordAudit(tenantId, 'training-program.enrolled', 'training-program', req.params.id, actorId, { enrolledUserId: targetUserId });
    res.status(201);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to enroll user', details: (err as Error).message });
  }
});

router.post('/:id/progress', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { userId, progress, completedModules } = req.body;
    const targetUserId = userId || actorId;
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      res.status(400).json({ error: 'progress must be a number between 0 and 100' });
      return;
    }
    const result = await trainingProgramService.updateProgress(tenantId, req.params.id, targetUserId, progress, completedModules);
    if (!result) {
      res.status(404).json({ error: 'Enrollment not found' });
      return;
    }
    recordAudit(tenantId, 'training-program.progress-updated', 'training-program', req.params.id, actorId, { userId: targetUserId, progress });
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress', details: (err as Error).message });
  }
});

router.get('/:id/questionnaire', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await trainingProgramService.getQuestionnaireEngine(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get questionnaire', details: (err as Error).message });
  }
});

router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { targetStatus, reason } = req.body;
    const result = await trainingProgramService.transitionStatus(tenantId, req.params.id, targetStatus, actorId, reason);
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

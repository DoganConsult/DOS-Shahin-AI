import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { GovernanceAiRepository } from '../repositories/governance_ai.repository';

const router = Router();
const repo = new GovernanceAiRepository();
router.use(moduleStack('governance-ai'));
router.use(auditMiddleware('governance-ai'));

router.get(
  '/',
  authenticate,
  requirePermission('governance_ai.record.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 25;
    const { rows, total } = await repo.findAllSignals(req.tenantId!, {
      page,
      limit,

      status: req.query.status,

      severity: req.query.severity,

      signalType: req.query.signalType,
    });
    res.json({ success: true, data: rows, total, page, limit });
  }),
);

router.get(
  '/:id',
  authenticate,
  requirePermission('governance_ai.record.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const signal = await repo.findSignalById(req.tenantId!, req.params.id);
    if (!signal) {
      res.status(404).json({ success: false, message: 'Signal not found' });
      return;
    }
    const interpretation = await repo.findInterpretation(req.tenantId!, req.params.id);
    const recommendations = interpretation
      ? await repo.findRecommendations(req.tenantId!, interpretation.id)
      : [];
    const escalations = await repo.findEscalations(req.tenantId!, req.params.id);
    res.json({ success: true, data: { signal, interpretation, recommendations, escalations } });
  }),
);

router.put(
  '/:id/status',
  authenticate,
  requirePermission('governance_ai.record.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await repo.updateSignalStatus(req.tenantId!, req.params.id, req.body.status);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Signal not found' });
      return;
    }
    res.json({ success: true, id: req.params.id, message: 'Signal status updated' });
  }),
);

export default router;

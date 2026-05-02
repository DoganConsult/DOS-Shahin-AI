/**
 * Governance Board Decision Routes — Zod-validated, DAuth-gated
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, setAuditData, asyncHandler, moduleStack } from '../ports/middleware.port';
import { BoardDecisionService } from '../services/board/board-decision.service';
import { ok, paginated } from '@dos/module-sdk';

const genericPayloadSchema = z.record(z.unknown());

const createDecisionSchema = z.object({
  boardId:      z.string().uuid(),
  title:        z.string().min(3).max(255),
  description:  z.string().optional(),
  decisionType: z.enum(['resolution','policy','directive','recommendation']).optional(),
  entityType:   z.string().optional(),
  entityId:     z.string().uuid().optional(),
});
const finalizeSchema = z.object({
  status:    z.enum(['approved','rejected','deferred']),
  rationale: z.string().optional(),
});
const listQuery = z.object({
  boardId: z.string().uuid().optional(),
  status:  z.enum(['draft','under_review','approved','rejected','deferred']).optional(),
  limit:   z.coerce.number().int().min(1).max(200).optional(),
  offset:  z.coerce.number().int().min(0).optional(),
});
const idParam = z.object({ id: z.string().uuid() });

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance'));

router.post(
  '/board-decisions',
  authenticate, requirePermission('governance.decisions.create'),
  validate({ body: createDecisionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    const id = await BoardDecisionService.createBoardDecision({ tenantId, createdBy: actor.id, ...req.body });
    await setAuditData(req as any, 'governance.decision_created', 'board_decision', { entityId: id });
    return res.status(201).json(ok({ id }));
  }),
);

router.get(
  '/board-decisions',
  authenticate, requirePermission('governance.decisions.read'),
  validate({ query: listQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const boardId: string = req.query.boardId as string;
    if (!boardId) return res.status(400).json({ error: 'boardId required' });
    const result = await BoardDecisionService.listBoardDecisions(boardId, tenantId, req.query as any);
    return res.json(paginated(result.data, result.total, req.query as any));
  }),
);

router.post(
  '/board-decisions/:id/submit',
  authenticate, requirePermission('governance.decisions.update'),
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    await BoardDecisionService.submitDecisionForReview(req.params.id, tenantId, actor.id);
    await setAuditData(req as any, 'governance.decision_submitted', 'board_decision', { entityId: req.params.id });
    return res.json(ok({ message: 'Submitted for review' }));
  }),
);

router.post(
  '/board-decisions/:id/finalize',
  authenticate, requirePermission('governance.decisions.approve'),
  validate({ params: idParam, body: finalizeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const actor = (req as any).user;
    await BoardDecisionService.finalizeDecision(
      req.params.id, tenantId, req.body.status, actor.id, req.body.rationale,
    );
    await setAuditData(req as any, `governance.decision_${req.body.status}`, 'board_decision', {
      entityId: req.params.id, severity: req.body.status === 'rejected' ? 'warning' : 'info',
    });
    return res.json(ok({ message: `Decision ${req.body.status}` }));
  }),
);

router.get(
  '/health-score',
  authenticate, requirePermission('governance.health.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const result = await BoardDecisionService.getGovernanceHealthScore(tenantId);
    return res.json(ok(result));
  }),
);

export default router;


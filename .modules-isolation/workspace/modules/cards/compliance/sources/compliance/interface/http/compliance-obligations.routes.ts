/**
 * Compliance Obligation + Drift Routes — Zod-validated, DAuth-gated
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, auditMiddleware, setAuditData, asyncHandler, moduleStack } from '../../ports/middleware.port';
import {

  createObligation, listObligations, getOverdueObligations, markObligationMet,
} from '../../application/advanced/compliance-obligation-register.service';

const genericPayloadSchema = z.record(z.unknown());
import {
  getComplianceDrift, getGapsByFramework, getComplianceScoreSummary,
} from '../../application/analytics/compliance-drift.service';
import { ok, paginated } from '@dos/module-sdk';

const createObligationSchema = z.object({
  frameworkId:     z.string().uuid().optional(),
  obligationRef:   z.string().min(1).max(100),
  title:           z.string().min(3).max(255),
  description:     z.string().optional(),
  obligationType:  z.string().optional(),
  frequency:       z.string().optional(),
  dueDate:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ownerId:         z.string().uuid().optional(),
});
const listQuery = z.object({
  status:      z.string().optional(),
  ownerId:     z.string().uuid().optional(),
  frameworkId: z.string().uuid().optional(),
  limit:       z.coerce.number().int().min(1).max(200).optional(),
  offset:      z.coerce.number().int().min(0).optional(),
});
const idParam = z.object({ id: z.string().uuid() });
const frameworkParam = z.object({ frameworkId: z.string().uuid() });

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));

// ── Obligations ───────────────────────────────────────────────────
router.post(
  '/obligations',
  authenticate, requirePermission('compliance.obligations.create'),
  validate({ body: createObligationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const id = await createObligation(tenantId, req.body);
    await setAuditData(req as any, 'compliance.obligation_created', 'compliance_obligation', { entityId: id });
    return res.status(201).json(ok({ id }));
  }),
);

router.get(
  '/obligations',
  authenticate, requirePermission('compliance.obligations.read'),
  validate({ query: listQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const result = await listObligations(tenantId, req.query as any);
    return res.json(paginated(result.data, result.total, req.query as any));
  }),
);

router.get(
  '/obligations/overdue',
  authenticate, requirePermission('compliance.obligations.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    return res.json(ok(await getOverdueObligations(tenantId)));
  }),
);

router.post(
  '/obligations/:id/met',
  authenticate, requirePermission('compliance.obligations.update'),
  validate({ params: idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    await markObligationMet(req.params.id, tenantId);
    await setAuditData(req as any, 'compliance.obligation_met', 'compliance_obligation', { entityId: req.params.id });
    return res.json(ok({ message: 'Obligation marked met' }));
  }),
);

// ── Drift + Analytics ────────────────────────────────────────────
router.get(
  '/drift',
  authenticate, requirePermission('compliance.analytics.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    return res.json(ok(await getComplianceDrift(tenantId)));
  }),
);

router.get(
  '/score-summary',
  authenticate, requirePermission('compliance.analytics.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    return res.json(ok(await getComplianceScoreSummary(tenantId)));
  }),
);

router.get(
  '/frameworks/:frameworkId/gaps',
  authenticate, requirePermission('compliance.gaps.read'),
  validate({ params: frameworkParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const data = await getGapsByFramework(req.params.frameworkId, tenantId);
    return res.json(ok(data));
  }),
);

export default router;


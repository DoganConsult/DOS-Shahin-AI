import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
/**
 * Compliance Gaps — Continuous gap detection API.
 * Mounted at /api/compliance-gaps via route catalog.
 */


import { authenticate, requirePermission } from '../../../ports/auth.port';
import { detectComplianceGaps, getComplianceGapSummary } from '../../services/misc/continuous-gap-detector.service';

import { validate, auditMiddleware, setAuditData, asyncHandler, moduleStack, mutationEventHook } from '../../../ports/middleware.port';
import { createDetectBody } from '../../../schemas/compliance.schemas';

const router = Router();
router.use(auditMiddleware('compliance'));
router.use(moduleStack('compliance'));
router.use(mutationEventHook('compliance'));

/** GET /summary — current gap status by framework + worst controls */
router.get('/summary', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const summary = await getComplianceGapSummary(req.tenantId!);
  res.json(summary);
}));

/** POST /detect — trigger manual gap detection cycle */
router.post('/detect', authenticate, requirePermission('compliance.program.write'), validate({ body: createDetectBody }), asyncHandler(async (req: Request, res: Response) => {
  const report = await detectComplianceGaps(req.tenantId!);
  setAuditData(res as any, { action: 'execute', entityType: 'compliance_gap_detection', entityId: req.tenantId, afterState: { gapCount: report?.gaps?.length ?? 0 } });
  res.json(report);
}));

export default router;


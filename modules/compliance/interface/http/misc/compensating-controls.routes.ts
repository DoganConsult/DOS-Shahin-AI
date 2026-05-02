import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
// ============================================================================
// Compensating Control API Routes (F27)
// ============================================================================


import { authenticate, requirePermission } from '../../../ports/auth.port';
import { AuthenticatedRequest } from "@dos/types";

import { validate, auditMiddleware, setAuditData as _setAuditData, moduleStack, mutationEventHook } from '../../../ports/middleware.port';

import { createComplianceBody, createReviewBody, genericComplianceSchema } from '../../../schemas/compliance.schemas';
import {
  addCompensatingControl, listForException, removeCompensatingControl,
  reviewEffectiveness, assessCoverage,
} from "../../services/misc/compensating-control.service";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(mutationEventHook('compliance'));
router.use(authenticate);
router.use(auditMiddleware("compliance"));

router.get("/exception/:exceptionId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const comps = await listForException(tenantId, req.params.exceptionId);
    res.json({ compensatingControls: comps });
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.get("/exception/:exceptionId/coverage", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const assessment = await assessCoverage(tenantId, req.params.exceptionId);
    res.json(assessment);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.post("/", authenticate, requirePermission("compliance.program.manage"), validate({ body: createComplianceBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const comp = await addCompensatingControl(tenantId, req.body);
    res.status(201).json(comp);
  } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.post("/:compId/review", authenticate, requirePermission("compliance.program.manage"), validate({ body: createReviewBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const userId = (req as AuthenticatedRequest).userId!;
    await reviewEffectiveness(tenantId, req.params.compId, req.body.effectiveness, userId);
    res.json({ message: "Effectiveness reviewed" });
  } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.delete("/:compId", authenticate, requirePermission("compliance.program.manage"), validate({ body: genericComplianceSchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    await removeCompensatingControl(tenantId, req.params.compId);
    res.json({ message: "Removed" });
  } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : String(err) }); }
});

export default router;


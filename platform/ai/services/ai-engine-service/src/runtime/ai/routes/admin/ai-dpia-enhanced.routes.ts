import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import * as DPIAService from '../../services/governance/compliance/ai-dpia.service';
import { toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────────
import { auditMiddleware, asyncHandler as _asyncHandler, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { systemsSystemIdDpiaPostBody, dpiaDpiaIdRiskFactorsPostBody, dpiaDpiaIdSubmitPostBody, dpiaDpiaIdReviewPostBody } from "../../schemas/ai.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));
router.use(mutationEventHook('ai'));
router.use(auditMiddleware('dpia'));

// Create or update DPIA assessment
router.post('/systems/:systemId/dpia', authenticate, requirePermission('compliance.assessment.write'), validate({ body: systemsSystemIdDpiaPostBody }), async (req: Request, res: Response) => {
  try {
    const { systemId } = req.params;
    req.body.created_by = req.userId;
    const result = await DPIAService.createOrUpdateDPIA(
      req.tenantId,
      systemId,
      req.body
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get DPIA assessments
router.get('/dpia', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.assessment.read'), async (req: Request, res: Response) => {
  try {
    const { systemId, status } = req.query;
    const result = await DPIAService.getDPIAAssessments(
      req.tenantId,
      systemId as string | undefined,
      status as string | undefined
    );
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get specific DPIA
router.get('/dpia/:dpiaId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.assessment.read'), async (req: Request, res: Response) => {
  try {
    const { dpiaId } = req.params;
    const result = await DPIAService.getDPIAAssessments(req.tenantId);

    const dpia = (result as unknown as Record<string, unknown>[]).find((d) => d.dpia_id === dpiaId);
    if (!dpia) {
      return res.status(404).json({ error: 'DPIA not found' });
    }
    res.json(dpia);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Add risk factor to DPIA
router.post('/dpia/:dpiaId/risk-factors', authenticate, requirePermission('compliance.assessment.write'), validate({ body: dpiaDpiaIdRiskFactorsPostBody }), async (req: Request, res: Response) => {
  try {
    const { dpiaId } = req.params;
    const result = await DPIAService.addDPIARiskFactor(
      req.tenantId,
      dpiaId,
      req.body
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get DPIA risk factors
router.get('/dpia/:dpiaId/risk-factors', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.assessment.read'), async (req: Request, res: Response) => {
  try {
    const { dpiaId } = req.params;
    const result = await DPIAService.getDPIARiskFactors(req.tenantId, dpiaId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Submit DPIA for review
router.post('/dpia/:dpiaId/submit', authenticate, requirePermission('compliance.assessment.write'), validate({ body: dpiaDpiaIdSubmitPostBody }), async (req: Request, res: Response) => {
  try {
    const { dpiaId } = req.params;
    const result = await DPIAService.submitDPIAForReview(req.tenantId, dpiaId);
    res.json({ submitted: result });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Review DPIA (approve/reject)
router.post('/dpia/:dpiaId/review', authenticate, requirePermission('compliance.assessment.approve'), validate({ body: dpiaDpiaIdReviewPostBody }), async (req: Request, res: Response) => {
  try {
    const { dpiaId } = req.params;
    const { decision, approvalNotes } = req.body;
    const result = await DPIAService.reviewDPIA(
      req.tenantId,
      dpiaId,
      decision,
      req.userId,
      req.userRole || 'reviewer',
      approvalNotes
    );
    res.json({ reviewed: result });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get DPIAs requiring review
router.get('/dpia/requiring-review', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.assessment.read'), async (req: Request, res: Response) => {
  try {
    const result = await DPIAService.getDPIAsRequiringReview(req.tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;

let genericPayloadSchema = z.record(z.unknown());

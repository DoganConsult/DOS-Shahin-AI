import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import * as ModelRiskService from '../../services/governance/ai-model-risk.service';
import { toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────────
import { auditMiddleware, asyncHandler as _asyncHandler, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { modelsModelVersionIdRiskScorePostBody, modelsModelVersionIdLifecyclePostBody, lifecycleLifecycleIdApprovePostBody, modelsModelVersionIdAssessmentsPostBody } from "../../schemas/ai.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));
router.use(mutationEventHook('ai'));
router.use(auditMiddleware('ai'));

// Calculate and store risk score for a model
router.post('/models/:modelVersionId/risk-score', authenticate, requirePermission('ai.agent.write'), validate({ body: modelsModelVersionIdRiskScorePostBody }), async (req: Request, res: Response) => {
  try {
    const { modelVersionId } = req.params;
    const { systemId, ...modelData } = req.body;
    const result = await ModelRiskService.calculateModelRiskScore(
      req.tenantId,
      modelVersionId,
      systemId,
      modelData
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get risk scores
router.get('/models/:modelVersionId/risk-scores', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const { modelVersionId } = req.params;
    const { systemId } = req.query;
    const result = await ModelRiskService.getModelRiskScores(
      req.tenantId,
      modelVersionId,
      systemId as string | undefined
    );
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Transition model lifecycle
router.post('/models/:modelVersionId/lifecycle', authenticate, requirePermission('ai.agent.write'), validate({ body: modelsModelVersionIdLifecyclePostBody }), async (req: Request, res: Response) => {
  try {
    const { modelVersionId } = req.params;
    const { systemId, newState, transitionReason, requiresApproval } = req.body;
    const result = await ModelRiskService.transitionModelLifecycle(
      req.tenantId,
      modelVersionId,
      systemId,
      newState,
      transitionReason,
      req.userId,
      requiresApproval !== false
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Approve lifecycle transition
router.post('/lifecycle/:lifecycleId/approve', authenticate, requirePermission('ai.agent.approve'), validate({ body: lifecycleLifecycleIdApprovePostBody }), async (req: Request, res: Response) => {
  try {
    const { lifecycleId } = req.params;
    const { approvalNotes } = req.body;
    const result = await ModelRiskService.approveLifecycleTransition(
      req.tenantId,
      lifecycleId,
      req.userId,
      approvalNotes
    );
    res.json({ approved: result });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Create risk assessment
router.post('/models/:modelVersionId/assessments', authenticate, requirePermission('ai.agent.write'), validate({ body: modelsModelVersionIdAssessmentsPostBody }), async (req: Request, res: Response) => {
  try {
    const { modelVersionId } = req.params;
    const { systemId, ...assessmentData } = req.body;
    assessmentData.assessed_by = req.userId;
    const result = await ModelRiskService.createModelRiskAssessment(
      req.tenantId,
      modelVersionId,
      systemId,
      assessmentData
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get risk assessments
router.get('/models/:modelVersionId/assessments', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const { modelVersionId } = req.params;
    const { systemId } = req.query;
    const result = await ModelRiskService.getModelRiskAssessments(
      req.tenantId,
      modelVersionId,
      systemId as string | undefined
    );
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get models requiring assessment
router.get('/models/requiring-assessment', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const result = await ModelRiskService.getModelsRequiringAssessment(req.tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;

let genericPayloadSchema = z.record(z.unknown());

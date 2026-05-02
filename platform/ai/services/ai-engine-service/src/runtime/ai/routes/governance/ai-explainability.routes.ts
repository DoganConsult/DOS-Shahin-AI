import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import * as ExplainabilityService from '../../services/reasoning/ai-explainability.service';
import { toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────────
import { auditMiddleware, asyncHandler as _asyncHandler, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { explainabilityPostBody, explainabilityRecordIdReviewPostBody, explainabilityRecordIdCounterfactualPostBody } from "../../schemas/ai.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));
router.use(mutationEventHook('ai'));
router.use(auditMiddleware('ai'));

// Create explainability record
router.post('/explainability', authenticate, requirePermission('ai.agent.write'), validate({ body: explainabilityPostBody }), async (req: Request, res: Response) => {
  try {
    const { systemId, decisionId, ...recordData } = req.body;
    recordData.created_by = req.userId;
    const result = await ExplainabilityService.createExplainabilityRecord(
      req.tenantId,
      {
        agent_id: systemId,
        decision_type: decisionId,
        ...recordData,
      }
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get explainability records
router.get('/explainability', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const { systemId, decisionId, startDate: _startDate, endDate: _endDate } = req.query;
    const result = await ExplainabilityService.getExplainabilityRecords(
      req.tenantId,
      {
        agent_id: systemId as string | undefined,
        decision_type: decisionId as string | undefined,
      }
    );
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Review explainability record
router.post('/explainability/:recordId/review', authenticate, requirePermission('ai.agent.write'), validate({ body: explainabilityRecordIdReviewPostBody }), async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    const { reviewStatus, reviewNotes } = req.body;
    const result = await ExplainabilityService.reviewExplainabilityRecord(
      req.tenantId,
      recordId,
      req.userId,
      reviewStatus,
      reviewNotes
    );
    res.json({ reviewed: result });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Create counterfactual analysis
router.post('/explainability/:recordId/counterfactual', authenticate, requirePermission('ai.agent.write'), validate({ body: explainabilityRecordIdCounterfactualPostBody }), async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    const { scenarioDescription, alternativeInputs, predictedOutcome } = req.body;
    const result = await ExplainabilityService.createCounterfactualAnalysis(
      req.tenantId,
      recordId,
      {
        scenario_description: scenarioDescription,
        input_changes: alternativeInputs,
        predicted_outcome: predictedOutcome,
      }
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get explainability requirements
router.get('/explainability/requirements', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const { systemId } = req.query;
    const result = await ExplainabilityService.getExplainabilityRequirements(
      req.tenantId,
      systemId as string | undefined
    );
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get transparency metrics
router.get('/explainability/transparency-metrics', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const { systemId, startDate, endDate } = req.query;
    const result = await ExplainabilityService.calculateTransparencyMetrics(
      req.tenantId,
      (systemId as string) || '',
      (startDate as string) || new Date(Date.now() - 30 * 86400000).toISOString(),
      (endDate as string) || new Date().toISOString()
    );
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;

let genericPayloadSchema = z.record(z.unknown());

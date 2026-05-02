import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import * as AgentPerformanceService from '../../services/observability/ai-agent-performance.service';
import { toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────────
import { auditMiddleware, asyncHandler as _asyncHandler, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { agentsAgentIdPerformancePostBody, agentsAgentIdBiasDetectionPostBody, biasDetectionsDetectionIdRemediationPatchBody, agentsAgentIdTrustScorePostBody, agentsAgentIdHumanOverridesPostBody } from "../../schemas/ai.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));
router.use(mutationEventHook('ai'));
router.use(auditMiddleware('ai'));

// Record agent performance metric
router.post('/agents/:agentId/performance', authenticate, requirePermission('ai.agent.write'), validate({ body: agentsAgentIdPerformancePostBody }), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const result = await AgentPerformanceService.recordAgentPerformanceMetric(
      req.tenantId,
      agentId,
      req.body
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get agent performance metrics
router.get('/agents/:agentId/performance', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate } = req.query;
    const result = await AgentPerformanceService.getAgentPerformanceMetrics(
      req.tenantId,
      agentId,
      startDate as string | undefined,
      endDate as string | undefined
    );
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Detect bias for an agent
router.post('/agents/:agentId/bias-detection', authenticate, requirePermission('ai.agent.write'), validate({ body: agentsAgentIdBiasDetectionPostBody }), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const result = await AgentPerformanceService.detectAgentBias(
      req.tenantId,
      agentId,
      req.body
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get bias detections
router.get('/agents/:agentId/bias-detections', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const result = await AgentPerformanceService.getAgentBiasDetections(
      req.tenantId,
      agentId
    );
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Update bias remediation
router.patch('/bias-detections/:detectionId/remediation', authenticate, requirePermission('ai.agent.write'), validate({ body: biasDetectionsDetectionIdRemediationPatchBody }), async (req: Request, res: Response) => {
  try {
    const { detectionId } = req.params;
    const { remediationStatus, remediationNotes } = req.body;
    const result = await AgentPerformanceService.updateBiasRemediation(
      req.tenantId,
      detectionId,
      remediationStatus,
      remediationNotes
    );
    res.json({ updated: result });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Calculate and get agent trust score
router.post('/agents/:agentId/trust-score', authenticate, requirePermission('ai.agent.write'), validate({ body: agentsAgentIdTrustScorePostBody }), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const result = await AgentPerformanceService.calculateAgentTrustScore(
      req.tenantId,
      agentId,
      req.body
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Get agent trust scores
router.get('/agents/:agentId/trust-scores', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const result = await AgentPerformanceService.getAgentTrustScores(
      req.tenantId,
      agentId
    );
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// Record human override
router.post('/agents/:agentId/human-overrides', authenticate, requirePermission('ai.agent.write'), validate({ body: agentsAgentIdHumanOverridesPostBody }), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { decisionId, overrideReason, overrideAction } = req.body;
    const result = await AgentPerformanceService.recordHumanOverride(
      req.tenantId,
      {
        agent_id: agentId,
        decision_id: decisionId,
        ai_decision: {},
        human_decision: overrideAction,
        override_reason: overrideReason,
        override_outcome: 'accepted',
        overridden_by: req.userId,
      }
    );
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;

let genericPayloadSchema = z.record(z.unknown());

import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z as _z } from 'zod';
/**
 * Workflow Agent Routes — HTTP API for agent-workflow integration.
 *
 * All routes protected with full DAuth middleware stack.
 * Agent actions gated by platform mode + AI policy.
 */

import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, asyncHandler, moduleStack, auditMiddleware, setAuditData } from '../../ports/middleware.port';

import {
  assignAgentToTask,
  getAgentTaskAssignments,
  executeAgentTask,
  escalateToHuman,
  reviewAgentDecisions,
  getAgentWorkloadSummary,
} from '../../services/ai/workflow-agent-role.service';
import { createAssignBody, createExecuteBody, createEscalateBody, updateAiPolicyBody } from '../../schemas/workflow.schemas';
import {
  getWorkflowAiPolicy,
  setWorkflowAiPolicy,
  getAutonomyBoundaries,
} from '../../services/ai/workflow-ai-agent-policy.service';
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware('workflow'));

// ── POST /agents/:agentId/assign — Assign agent to task ────────────

router.post(
  '/agents/:agentId/assign',
  authenticate,
  requirePermission('workflow.agent.manage'),
  validate({ body: createAssignBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;
    const { agentId } = req.params;
    const { taskId, mode = 'observe' } = req.body;

    if (!taskId) { res.status(400).json({ error: 'taskId is required' }); return; }

    const assignment = await assignAgentToTask(tenantId, taskId, agentId, mode, userId);
    if (!assignment) { res.status(400).json({ error: 'Assignment failed — check agent eligibility and platform mode' }); return; }

    setAuditData(res as any, { action: 'assign_agent', entityType: 'task', entityId: taskId });
    res.json({ success: true, data: assignment });
  }),
);

// ── GET /agents/:agentId/tasks — List agent's tasks ────────────────

router.get(
  '/agents/:agentId/tasks',
  authenticate,
  requirePermission('workflow.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { agentId } = req.params;
    const { status } = req.query;

    const assignments = await getAgentTaskAssignments(tenantId, agentId, status as string);
    res.json({ success: true, data: assignments });
  }),
);

// ── POST /agents/:agentId/execute/:taskId — Agent executes task ────

router.post(
  '/agents/:agentId/execute/:taskId',
  authenticate,
  requirePermission('workflow.agent.execute'),
  validate({ body: createExecuteBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { agentId, taskId } = req.params;
    const { action = 'complete', reasoning = '', confidence = 0.8 } = req.body;

    const result = await executeAgentTask(tenantId, taskId, agentId, action, reasoning, confidence);

    setAuditData(res as any, { action: 'agent_execute', entityType: 'task', entityId: taskId, afterState: result });
    res.json({ success: true, data: result });
  }),
);

// ── POST /agents/:agentId/escalate/:taskId — Escalate to human ─────

router.post(
  '/agents/:agentId/escalate/:taskId',
  authenticate,
  requirePermission('workflow.agent.manage'),
  validate({ body: createEscalateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { agentId, taskId } = req.params;
    const { reason = 'Agent requested human review' } = req.body;

    const result = await escalateToHuman(tenantId, taskId, agentId, reason);

    setAuditData(res as any, { action: 'agent_escalate', entityType: 'task', entityId: taskId });
    res.json({ success: true, data: result });
  }),
);

// ── GET /agents/:agentId/decisions — Review agent decisions ────────

router.get(
  '/agents/:agentId/decisions',
  authenticate,
  requirePermission('workflow.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { agentId } = req.params;
    const { limit = '50', unreviewed } = req.query;

    const decisions = await reviewAgentDecisions(tenantId, {
      agentId,
      limit: parseInt(limit as string),
      onlyUnreviewed: unreviewed === 'true',
    });

    res.json({ success: true, data: decisions });
  }),
);

// ── GET /agents/:agentId/workload — Agent workload summary ─────────

router.get(
  '/agents/:agentId/workload',
  authenticate,
  requirePermission('workflow.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { agentId } = req.params;

    const workload = await getAgentWorkloadSummary(tenantId, agentId);
    res.json({ success: true, data: workload });
  }),
);

// ── GET /agents/:agentId/boundaries — Agent autonomy boundaries ────

router.get(
  '/agents/:agentId/boundaries',
  authenticate,
  requirePermission('workflow.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { agentId } = req.params;
    const { moduleCode } = req.query;

    const boundaries = await getAutonomyBoundaries(tenantId, agentId, moduleCode as string);
    res.json({ success: true, data: boundaries });
  }),
);

// ── GET /ai-policy/:moduleCode — Get AI workflow policy ────────────

router.get(
  '/ai-policy/:moduleCode',
  authenticate,
  requirePermission('workflow.policy.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { moduleCode } = req.params;

    const policy = await getWorkflowAiPolicy(tenantId, moduleCode);
    res.json({ success: true, data: policy });
  }),
);

// ── PUT /ai-policy/:moduleCode — Set AI workflow policy ────────────

router.put(
  '/ai-policy/:moduleCode',
  authenticate,
  requirePermission('workflow.policy.manage'),
  validate({ body: updateAiPolicyBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;
    const { moduleCode } = req.params;

    const policy = await setWorkflowAiPolicy(tenantId, moduleCode, req.body, userId);

    setAuditData(res as any, { action: 'update_ai_policy', entityType: 'workflow_policy', entityId: moduleCode });
    res.json({ success: true, data: policy });
  }),
);

export default router;


// @ts-nocheck
import { Request, Response, Router } from 'express';
import { z as _z } from 'zod';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
import { logger } from '../../ports/logger.port';
// AGRC-OS — Agent Orchestration routes
// Covers: agent runs, run graph, node ask, run events, run stats,
//         proposals (approve/reject), shadow agents, hyper-role check, autonomy policy


import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import { errMsg } from '../../../../i18n/error-messages';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { writeLimiter } from './shared';
import { createAskBody, createApproveBody, createRejectBody, updateShadowAgentsBody, createCheckBody } from '../../schemas/agrc-engine.schemas';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(auditMiddleware('agrc-engine'));

// ════════════════════════════════════════════════════════════════
// Agent Orchestration — Runs, Graph, Proposals, Shadow Agents
// ════════════════════════════════════════════════════════════════

// GET /api/agrc-os/agent-runs — List agent runs
router.get('/agent-runs', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const { listAgentRuns } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const runs = await listAgentRuns(req.tenantId, {
      status: req.query.status as string | undefined,
      agentId: req.query.agentId as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    });
    res.json({ runs, count: runs.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// GET /api/agrc-os/agent-runs/:runId — Get single run state
router.get('/agent-runs/:runId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const { getAgentRun } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const run = await getAgentRun(req.tenantId, req.params.runId);
    if (!run) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
    res.json(run);
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// GET /api/agrc-os/agent-runs/:runId/graph — Get run graph (nodes + edges + state)
router.get('/agent-runs/:runId/graph', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const { getRunGraph } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const graph = await getRunGraph(req.tenantId, req.params.runId);
    res.json(graph);
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// POST /api/agrc-os/agent-runs/:runId/node/:nodeId/ask — Talk to Node
router.post('/agent-runs/:runId/node/:nodeId/ask', authenticate, requirePermission('platform.agent.read'), validate({ body: createAskBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { runId, nodeId } = req.params;
    const { question, mode } = req.body;
    if (!question) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }

    const { getRunGraph, getAgentRun, recordAgentEvent } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const { claudeChat } = await import('../../../../config/claude-client');

    const run = await getAgentRun(tenantId, runId);
    if (!run) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }

    const graph = await getRunGraph(tenantId, runId);
    const node = graph.nodes.find(n => n.id === nodeId);
    const nodeState = graph.state[nodeId] as Record<string, unknown> | undefined;

    const contextPrompt = `You are an AI agent assistant for the Shahin-Ai Platform.
A manager is asking about a specific workflow node in an agent run.

Run ID: ${runId}
Node ID: ${nodeId}
Node Label: ${node?.label || nodeId}

Node Status: ${nodeState?.status || 'any'}

Node Owner: ${nodeState?.owner || 'unassigned'}

Node SLA Hours: ${nodeState?.slaHours || 'none'}

Started: ${nodeState?.startedAt || 'not started'}

Ended: ${nodeState?.endedAt || 'not ended'}
Agent: ${run.agent_id || 'orchestrator'}
Platform Mode: ${run.platform_mode}
Run Status: ${run.status}

Full graph state:
${JSON.stringify(graph.state, null, 2)}

Answer the question helpfully. If you can suggest actions to unblock or improve the situation, include them as a JSON array in your response under "actions".
Respond with JSON: { "answer": "...", "actions": [{ "type": "...", "payload": {...}, "requires_approval": true/false }] }`;

    let answer: string;
    let actions: Record<string, unknown>[] = [];
    try {
      const resp = await claudeChat(contextPrompt, [{ role: 'user', content: question }], { maxTokens: 1024, temperature: 0.3 });
      try {
        const parsed = JSON.parse(resp);
        answer = parsed.answer || resp;
        actions = parsed.actions || [];
      } catch {
        answer = resp;
      }
    } catch {

      answer = `Node "${node?.label || nodeId}" is currently ${nodeState?.status || 'any'}. ${nodeState?.status === 'awaiting_approval' ? 'It requires human approval to proceed.' : nodeState?.status === 'done' ? 'This step has been completed.' : 'Unable to provide detailed analysis at this time.'}`;
    }

    await recordAgentEvent(tenantId, {
      runId, agentId: run.agent_id || undefined, eventType: 'node.asked',
      nodeId, data: { question, answer: answer.slice(0, 500), mode: mode || 'manager' },
    }).catch(catchHandler(EC.EVENT_BUS, {}));

    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ answer, actions });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// GET /api/agrc-os/agent-runs/:runId/events — Get run events (for playback)
router.get('/agent-runs/:runId/events', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const { getRunEvents } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const events = await getRunEvents(
      req.tenantId,
      req.params.runId,
      req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
    );
    res.json({ events, count: events.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// GET /api/agrc-os/agent-run-stats — Dashboard stats
router.get('/agent-run-stats', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const { getAgentRunStats } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const stats = await getAgentRunStats(req.tenantId);
    res.json(stats);
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// ── Proposals ──────────────────────────────────────────────────

// GET /api/agrc-os/proposals — List proposals
router.get('/proposals', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const { listProposals } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const proposals = await listProposals(req.tenantId, {
      status: req.query.status as string | undefined,
      agentId: req.query.agentId as string | undefined,
      runId: req.query.runId as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    });
    res.json({ proposals, count: proposals.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// POST /api/agrc-os/proposals/:id/approve
router.post('/proposals/:id/approve', authenticate, requirePermission('platform.agent.write'), writeLimiter, validate({ body: createApproveBody }), async (req: Request, res: Response) => {
  try {
    const { approveProposal } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const { executeAction } = await import('../../runtime/ai/services/agents/core/agent-runner.service');
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const result = await approveProposal(tenantId, req.params.id, userId, req.body.comment);

    if (!result.success) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }

    if (result.proposal?.auto_executable && result.proposal?.payload_json) {
      const payload = typeof result.proposal.payload_json === 'string'
        ? JSON.parse(result.proposal.payload_json) : result.proposal.payload_json;
      try {
        await executeAction(tenantId, (result as any).proposal.agent_id, {

          type: (result.proposal.type || '').toLowerCase(),
          title: payload.title || result.proposal.type,
          description: payload.description || result.proposal.reason || '',
          priority: payload.priority || 'medium',
          entityType: payload.entityType,
          entityId: payload.entityId,
          payload,
        });
      } catch (execErr: unknown) {
        logger.warn(`[Proposals] Auto-execution after approval failed: ${toErrorMessage(execErr)}`);
      }
    }

    setAuditData(res as any, {
      action: 'update', entityType: 'agent_proposal', entityId: req.params.id,
      afterState: { decision: 'approved', comment: req.body.comment },
    });
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ success: true, status: 'approved' });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// POST /api/agrc-os/proposals/:id/reject
router.post('/proposals/:id/reject', authenticate, requirePermission('platform.agent.write'), writeLimiter, validate({ body: createRejectBody }), async (req: Request, res: Response) => {
  try {
    const { rejectProposal } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const userId = req.user?.userId;
    const result = await rejectProposal(req.tenantId, req.params.id, userId, req.body.comment);

    if (!result.success) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }

    setAuditData(res as any, {
      action: 'delete', entityType: 'agent_proposal', entityId: req.params.id,
      afterState: { decision: 'rejected', comment: req.body.comment },
    });
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ success: true, status: 'rejected' });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// ── Shadow Agent Config ────────────────────────────────────────

// GET /api/agrc-os/shadow-agents — List all shadow agent configs
router.get('/shadow-agents', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('delegation.chain.read'), async (req: Request, res: Response) => {
  try {
    const { listShadowAgents } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const configs = await listShadowAgents(req.tenantId, {
      enabledOnly: req.query.enabledOnly === 'true',
    });
    res.json({ shadowAgents: configs, count: configs.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// GET /api/agrc-os/shadow-agents/:userId — Get shadow agent config for user
router.get('/shadow-agents/:userId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('delegation.chain.read'), async (req: Request, res: Response) => {
  try {
    const { getShadowAgentConfig } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const config = await getShadowAgentConfig(req.tenantId, req.params.userId);
    res.json({ config: config || null });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// PUT /api/agrc-os/shadow-agents/:userId — Create/update shadow agent config
router.put('/shadow-agents/:userId', authenticate, requirePermission('delegation.chain.manage'), writeLimiter, validate({ body: updateShadowAgentsBody }), async (req: Request, res: Response) => {
  try {
    const { upsertShadowAgentConfig } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const config = await upsertShadowAgentConfig(req.tenantId, req.params.userId, req.body);
    setAuditData(res as any, {
      action: 'update', entityType: 'shadow_agent_config', entityId: req.params.userId,
      afterState: config,
    });
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'updated', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ config });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// ── Hyper-Role check ───────────────────────────────────────────

// POST /api/agrc-os/hyper-role/check — Check if action is allowed by Hyper-Role
router.post('/hyper-role/check', authenticate, requirePermission('platform.agent.read'), validate({ body: createCheckBody }), async (req: Request, res: Response) => {
  try {
    const { computeHyperRole, mapModeToAutonomy } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');

    const { getTenantPlatformMode } = await import('@dos/platform-core/settings/platform-mode-gate');
    const tenantId = req.tenantId;
    const { agentId, actionType, userPermissions, autonomyLevel } = req.body;

    if (!agentId || !actionType) {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
      return;
    }

    const mode = await getTenantPlatformMode(tenantId);
    const effectivePerms = userPermissions || [];
    const level = autonomyLevel || mapModeToAutonomy(mode);

    const result = computeHyperRole(effectivePerms, agentId, actionType, level, mode);
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ ...result, tenantMode: mode, requestedAutonomy: level });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// ── Autonomy policy lookup ─────────────────────────────────────

// GET /api/agrc-os/autonomy-policy — Get autonomy policy for an action type
router.get('/autonomy-policy', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const { getAutonomyPolicy } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service');
    const actionType = req.query.actionType as string;
    if (!actionType) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
    const policy = await getAutonomyPolicy(req.tenantId, actionType);
    res.json(policy);
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

export default router;


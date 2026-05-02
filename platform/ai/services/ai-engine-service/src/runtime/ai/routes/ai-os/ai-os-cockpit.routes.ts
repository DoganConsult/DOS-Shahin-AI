// @ts-nocheck
import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { getCockpitSnapshot } from '../../services/cockpit/ai-cockpit.service';
import { toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────────
import { auditMiddleware, asyncHandler as _asyncHandler, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { aiOsAgentsAgentIdDryRunPostBody, aiOsAgentsAgentIdReplayRunIdPostBody } from "../../schemas/ai.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));
router.use(mutationEventHook('ai'));
router.use(auditMiddleware('ai'));

// GET /api/ai-os/cockpit — Aggregated AI OS health dashboard
router.get('/ai-os/cockpit', validate({ query: z.record(z.unknown()) }), requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    const snapshot = await getCockpitSnapshot(tenantId);
    res.json(snapshot);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Cockpit snapshot failed', detail: toErrorMessage(err) });
  }
});

// POST /api/ai-os/agents/:agentId/dry-run — Test agent without side effects
router.post('/ai-os/agents/:agentId/dry-run', requirePermission('ai.agent.execute'), validate({ body: aiOsAgentsAgentIdDryRunPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { agentId } = req.params;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    // Run agent in dry-run mode (propose actions but don't execute)
    const { runAgent } = await import('../../services/agents/core/agent-runner.service');
    const result = await runAgent(tenantId, agentId, { dryRun: true });
    res.json({ dryRun: true, ...result });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Dry run failed', detail: toErrorMessage(err) });
  }
});

// POST /api/ai-os/agents/:agentId/replay/:runId — Replay a failed agent run
router.post('/ai-os/agents/:agentId/replay/:runId', requirePermission('ai.agent.execute'), validate({ body: aiOsAgentsAgentIdReplayRunIdPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { agentId, runId } = req.params;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    // Re-run the agent (new run, not resume)
    const { runAgent } = await import('../../services/agents/core/agent-runner.service');
    const result = await runAgent(tenantId, agentId, { replayFromRunId: runId });
    res.json({ replay: true, originalRunId: runId, ...result });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Replay failed', detail: toErrorMessage(err) });
  }
});

router.get('/ai-os/operating-cockpit', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId || req.user?.id;
    if (!tenantId || !userId) return res.status(400).json({ error: 'Missing tenant or user context' });
    const roleCode = req.query.role as string | undefined;

    const { getOperatingCockpit } = await import('../../../../platform/dos/config/registry/operating-cockpit.service');
    const snapshot = await getOperatingCockpit(tenantId, userId, roleCode);
    res.json(snapshot);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Operating cockpit failed', detail: toErrorMessage(err) });
  }
});

export default router;

let genericPayloadSchema = z.record(z.unknown());

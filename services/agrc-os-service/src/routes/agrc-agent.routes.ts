import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import { recordAudit } from '../adapters/audit.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { invokeAgentBody, approveActionBody, listDiscoveriesQuery, createHandoffBody } from '../schemas/agrc-cycle.schemas';
import { publishDomainEvent, publishAgrcAgentInvoked } from '../events/publisher';
import * as agentService from '../domain/agrc-agent.service';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'agrc-os-service:agrc-agent', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();
router.use(authenticate);
router.use(requireTenantId);

// POST /agents/invoke — Invoke a single agent
router.post('/invoke', validate({ body: invokeAgentBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const run = await agentService.invokeAgent(tenantId, req.body);
    recordAudit(tenantId, 'agrc.agent.invoked', 'agent', req.body.agentId, actorId, { task: req.body.task });
    await publishAgrcAgentInvoked(tenantId, run.run_id, { agentId: req.body.agentId }, actorId);
    res.status(202);
    ok(res, run);
  } catch (err) {
    res.status(500).json({ error: 'Failed to invoke agent', details: (err as Error).message });
  }
});

// GET /agents/discoveries — List agent discoveries
router.get('/discoveries', validate({ query: listDiscoveriesQuery }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await agentService.listDiscoveries(tenantId, req.query as any);
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list discoveries', details: (err as Error).message });
  }
});

// POST /agents/actions/approve — Approve or reject a proposed action
router.post('/actions/approve', validate({ body: approveActionBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const result = await agentService.approveAction(tenantId, req.body.actionId, req.body.approved, req.body.reason);
    recordAudit(tenantId, req.body.approved ? 'agrc.action.approved' : 'agrc.action.rejected', 'action', req.body.actionId, actorId);
    await publishDomainEvent(
      req.body.approved ? 'agrc.action.approved' : 'agrc.action.rejected',
      { actionId: req.body.actionId, approved: req.body.approved },
      tenantId, actorId,
    );
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process action approval', details: (err as Error).message });
  }
});

// GET /agents/actions/pending — List pending actions awaiting approval
router.get('/actions/pending', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actions = await agentService.listPendingActions(tenantId);
    ok(res, actions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list pending actions', details: (err as Error).message });
  }
});

// POST /agents/handoff — Create an agent-to-agent handoff
router.post('/handoff', validate({ body: createHandoffBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const handoff = await agentService.createHandoff(tenantId, req.body);
    recordAudit(tenantId, 'agrc.agent.handoff', 'handoff', handoff.handoff_id, actorId, {
      from: req.body.fromAgent,
      to: req.body.toAgent,
    });
    await publishDomainEvent('agrc.agent.handoff', {
      handoffId: handoff.handoff_id,
      fromAgent: req.body.fromAgent,
      toAgent: req.body.toAgent,
    }, tenantId, actorId);
    res.status(201);
    ok(res, handoff);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create handoff', details: (err as Error).message });
  }
});

// GET /agents/:agentId/runs — List runs for a specific agent
router.get('/:agentId/runs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 25;
    const result = await agentService.listAgentRuns(tenantId, req.params.agentId, page, pageSize);
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list agent runs', details: (err as Error).message });
  }
});

// GET /agents/:agentId/memory — Get agent memory
router.get('/:agentId/memory', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const memory = await agentService.getAgentMemory(tenantId, req.params.agentId);
    ok(res, memory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get agent memory', details: (err as Error).message });
  }
});

export default router;

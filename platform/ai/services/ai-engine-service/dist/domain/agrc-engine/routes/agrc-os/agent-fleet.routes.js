import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// AGRC-OS — Agent Fleet Intelligence
import { Router } from 'express';
import { validate, auditMiddleware, asyncHandler } from '../../ports/middleware.port.js';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { emitEvent } from '../../ports/events.port.js';
import { writeLimiter, heavyOpLimiter } from './shared.js';
import { createSnapshotBody, createRunBody } from '../../schemas/agrc-engine.schemas.js';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
const router = Router();
router.use(auditMiddleware('agrc-engine'));
router.get('/agents/fleet', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getFleetHealth } = await import('../../runtime/ai/services/observability/agent-metrics-aggregator.service.js');
    const hours = parseInt(req.query.hours) || 24;
    const result = await getFleetHealth(req.tenantId, hours);
    res.json(result);
}));
router.get('/agents/fleet/history', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getFleetSnapshotHistory } = await import('../../runtime/ai/services/observability/agent-metrics-aggregator.service.js');
    const result = await getFleetSnapshotHistory(req.tenantId, parseInt(req.query.limit) || 30);
    res.json(result);
}));
router.post('/agents/fleet/snapshot', authenticate, requirePermission('platform.agent.manage'), writeLimiter, validate({ body: createSnapshotBody }), asyncHandler(async (req, res) => {
    const { saveFleetSnapshot } = await import('../../runtime/ai/services/observability/agent-metrics-aggregator.service.js');
    await saveFleetSnapshot(req.tenantId);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ saved: true });
}));
router.get('/agents/performance', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getAgentPerformanceSummaries } = await import('../../runtime/ai/services/observability/agent-metrics-aggregator.service.js');
    const hours = parseInt(req.query.hours) || 24;
    const result = await getAgentPerformanceSummaries(req.tenantId, hours);
    res.json(result);
}));
router.get('/agents/cooperation', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getCooperationMetrics } = await import('../../runtime/ai/services/observability/agent-metrics-aggregator.service.js');
    const hours = parseInt(req.query.hours) || 24;
    const result = await getCooperationMetrics(req.tenantId, hours);
    res.json(result);
}));
router.get('/agents/trends', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getAgentTrends } = await import('../../runtime/ai/services/observability/agent-metrics-aggregator.service.js');
    const days = parseInt(req.query.days) || 7;
    const result = await getAgentTrends(req.tenantId, days);
    res.json(result);
}));
router.get('/agents/circuit-breaker', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { aiCircuitBreaker } = await import('../../runtime/ai/services/governance/circuit/ai-circuit-breaker.service.js');
    res.json(aiCircuitBreaker.getStats());
}));
router.get('/agents/backpressure', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { eventBus } = await import('../../../platform/services/event/event-bus.service');
    res.json(eventBus.getBackpressureStats());
}));
router.post('/agents/run', authenticate, requirePermission('platform.agent.manage'), heavyOpLimiter, validate({ body: createRunBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const _userId = req.user?.userId;
    const { workflow_id, agent_id, autonomy_level: _autonomy_level, inputs: _inputs } = req.body;
    if (agent_id) {
        const { runAgent } = await import('../../runtime/ai/services/agents/core/agent-runner.service.js');
        const { createAgentRun: _createAgentRun } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
        const { getTenantPlatformMode } = await import('@dos/platform-core/settings/platform-mode-gate');
        const { mapModeToAutonomy: _mapModeToAutonomy } = await import('../../runtime/ai/services/orchestration/agent-orchestration.service.js');
        const _mode = await getTenantPlatformMode(tenantId);
        const traceId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const result = await runAgent(tenantId, agent_id);
        emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
        res.json({ run_id: `run_${Date.now().toString(36)}`, status: 'completed', trace_id: traceId, ...result });
    }
    else {
        const { runAllAgents } = await import('../../runtime/ai/services/agents/core/agent-runner.service.js');
        const traceId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const results = await runAllAgents(tenantId);
        res.json({ agents: results.length, trace_id: traceId, workflow_id: workflow_id || 'all-agents', results });
    }
}));
router.post('/agents/run/:agentId', authenticate, requirePermission('platform.agent.manage'), heavyOpLimiter, validate({ body: createRunBody }), asyncHandler(async (req, res) => {
    const { runAgent } = await import('../../runtime/ai/services/agents/core/agent-runner.service.js');
    const traceId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await runAgent(req.tenantId, req.params.agentId);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ trace_id: traceId, ...result });
}));
export default router;
//# sourceMappingURL=agent-fleet.routes.js.map
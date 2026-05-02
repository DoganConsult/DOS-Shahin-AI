/**
 * AI OS — Agent Runtime, Circuit Breakers & Stuck Runs
 * @module ai-os/agents
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { aiReadLimiter, aiWriteLimiter, hoursQuery, setCacheHeaders, setNoCacheHeaders } from './shared.js';
import { aiOsAgentsAgentIdRuntimePutBody, aiOsAgentsAgentIdEnablePatchBody, aiOsAgentsAgentIdCircuitResetPostBody, aiOsStuckRunsRunIdCancelPostBody, aiOsAgentsAgentIdDisableReasonPostBody, aiOsCircuitBreakersAgentIdResetPostBody, } from './ai-os-schemas.js';
import { auditMiddleware, asyncHandler, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port.js';
import { setAgentEnabled, detectStuckRuns, getAgentRuntimeConfig, updateRuntimeConfig, cancelStuckRun, getAgentRunStats, listAllRuntimeConfigs, getAgentCircuitState, resetAgentCircuit, isAgentInCooldown, getRuntimeHealthSummary, validateRuntimeConfigIntegrity, setAgentDisableReason, } from '../../services/agents/core/ai-agent-runtime.service.js';
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.use(mutationEventHook('ai'));
// ── Runtime Configs ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /ai-os/agents/runtime-configs:
 *   get:
 *     summary: List all AI agent runtime configurations
 *     tags: [AI OS - Agent Runtime]
 *     responses:
 *       200:
 *         description: Agent runtime configs including model, temperature, token limits
 */
router.get('/ai-os/agents/runtime-configs', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const configs = await listAllRuntimeConfigs(req.tenantId);
    setCacheHeaders(res, 30);
    res.ok({ items: configs });
}));
/**
 * @swagger
 * /ai-os/agents/health-summary:
 *   get:
 *     summary: Get health summary across all AI agents
 *     tags: [AI OS - Agent Runtime]
 *     responses:
 *       200:
 *         description: Per-agent health status, error rates, last run times
 */
router.get('/ai-os/agents/health-summary', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const summary = await getRuntimeHealthSummary(req.tenantId);
    setCacheHeaders(res, 15);
    res.ok(summary);
}));
router.get('/ai-os/agents/config-integrity', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const result = await validateRuntimeConfigIntegrity(req.tenantId);
    setCacheHeaders(res, 30);
    res.ok(result);
}));
router.get('/ai-os/agents/:agentId/runtime', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const config = await getAgentRuntimeConfig(req.tenantId, req.params.agentId);
    setCacheHeaders(res, 30);
    res.ok(config || { enabled: true, max_retries: 3 });
}));
router.put('/ai-os/agents/:agentId/runtime', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsAgentsAgentIdRuntimePutBody }), asyncHandler(async (req, res) => {
    const config = await updateRuntimeConfig(req.tenantId, req.params.agentId, req.body, req.user?.userId);
    setNoCacheHeaders(res);
    res.ok(config || { error: 'Update failed' });
}));
router.patch('/ai-os/agents/:agentId/enable', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsAgentsAgentIdEnablePatchBody }), asyncHandler(async (req, res) => {
    const ok = await setAgentEnabled(req.tenantId, req.params.agentId, req.body.enabled, req.user?.userId);
    setNoCacheHeaders(res);
    res.ok({ updated: ok });
}));
router.get('/ai-os/agents/:agentId/stats', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: hoursQuery }), asyncHandler(async (req, res) => {
    const stats = await getAgentRunStats(req.tenantId, req.params.agentId, Number(req.query.hours) || 24);
    setCacheHeaders(res, 15);
    res.ok(stats);
}));
router.get('/ai-os/agents/:agentId/circuit', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const state = getAgentCircuitState(req.tenantId, req.params.agentId);
    setCacheHeaders(res, 10);
    res.ok(state);
}));
router.post('/ai-os/agents/:agentId/circuit/reset', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsAgentsAgentIdCircuitResetPostBody }), asyncHandler(async (req, res) => {
    resetAgentCircuit(req.tenantId, req.params.agentId);
    setNoCacheHeaders(res);
    res.ok({ reset: true });
}));
router.get('/ai-os/agents/:agentId/cooldown', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const result = await isAgentInCooldown(req.tenantId, req.params.agentId);
    setCacheHeaders(res, 10);
    res.ok(result);
}));
router.post('/ai-os/agents/:agentId/disable-reason', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsAgentsAgentIdDisableReasonPostBody }), asyncHandler(async (req, res) => {
    const ok = await setAgentDisableReason(req.tenantId, req.params.agentId, req.body.reason || 'manual', req.user.userId);
    setNoCacheHeaders(res);
    res.ok({ disabled: ok });
}));
// ── Stuck Runs ──────────────────────────────────────────────────────────────
router.get('/ai-os/stuck-runs', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const runs = await detectStuckRuns(req.tenantId);
    setCacheHeaders(res, 15);
    res.ok({ items: runs });
}));
router.post('/ai-os/stuck-runs/:runId/cancel', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsStuckRunsRunIdCancelPostBody }), asyncHandler(async (req, res) => {
    const ok = await cancelStuckRun(req.tenantId, req.params.runId);
    setNoCacheHeaders(res);
    res.ok({ cancelled: ok });
}));
// ── Per-Agent Circuit Breakers ──────────────────────────────────────────────
router.get('/ai-os/circuit-breakers', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getAllCircuitStates } = await import('../../services/governance/circuit/per-agent-circuit-breaker.service.js');
    const states = await getAllCircuitStates(req.tenantId);
    setCacheHeaders(res, 15);
    res.ok({ items: states, total: states.length });
}));
router.get('/ai-os/circuit-breakers/:agentId', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getAgentCircuitState: getPerAgentState } = await import('../../services/governance/circuit/per-agent-circuit-breaker.service.js');
    const state = await getPerAgentState(req.tenantId, req.params.agentId);
    setCacheHeaders(res, 10);
    res.ok(state);
}));
router.post('/ai-os/circuit-breakers/:agentId/reset', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsCircuitBreakersAgentIdResetPostBody }), asyncHandler(async (req, res) => {
    const { resetCircuitBreaker } = await import('../../services/governance/circuit/per-agent-circuit-breaker.service.js');
    await resetCircuitBreaker(req.tenantId, req.params.agentId);
    setNoCacheHeaders(res);
    res.ok({ reset: true });
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=agents.routes.js.map
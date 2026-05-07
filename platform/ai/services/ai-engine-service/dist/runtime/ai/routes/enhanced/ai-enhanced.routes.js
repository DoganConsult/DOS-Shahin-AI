// @ts-nocheck
import { Router } from 'express';
import { auditMiddleware, validate, asyncHandler } from '../../ports/middleware.port.js';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { emitModuleEvent } from '../../services/emit-event.js';
import { toErrorMessage } from '@dos/module-sdk';
import { enforceStatusTransition } from '../../ports/platform.port.js';
import { getFirstRow } from '@dos/db';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
import { emptyResult } from '../../ports/database.port.js';
import { modelConfigAgentIdPutBody, budgetPutBody, promptsAssetIdPostBody, promptsAssetIdActivateVersionIdPostBody, streamChatPostBody, evalsRunPostBody, memoryCompactPostBody, selfImprovePostBody, feedbackPostBody, proposedActionsIdPutBody, createOptimizeRoutingBody } from "../../schemas/ai.schemas.js";
import { z } from "zod";
const router = Router();
router.use(auditMiddleware('ai'));
router.get('/model-config', authenticate, requirePermission('admin.tenant.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getAllAgentModelConfigs } = await import('../../services/gateway/llm-router.service.js');
    const configs = await getAllAgentModelConfigs(req.tenantId);
    res.json({ configs });
}));
router.put('/model-config/:agentId', authenticate, requirePermission('admin.tenant.manage'), validate({ body: modelConfigAgentIdPutBody }), asyncHandler(async (req, res) => {
    const { upsertAgentModelConfig } = await import('../../services/gateway/llm-router.service.js');
    const ok = await upsertAgentModelConfig(req.tenantId, req.params.agentId, req.body);
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'updated', entityType: 'ai_enhanced', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.ai_enhanced.updated' });
    res.json({ success: ok });
}));
router.get('/usage', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getUsageSummary } = await import('../../services/gateway/llm-usage-tracker.service.js');
    const days = parseInt(req.query.days) || 30;
    const summary = await getUsageSummary(req.tenantId, days);
    res.json(summary);
}));
router.get('/budget', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getBudgetStatus } = await import('../../services/gateway/llm-usage-tracker.service.js');
    const status = await getBudgetStatus(req.tenantId);
    res.json(status || { message: 'No budget configured' });
}));
router.put('/budget', authenticate, requirePermission('admin.tenant.manage'), validate({ body: budgetPutBody }), asyncHandler(async (req, res) => {
    const { updateBudgetLimits, ensureBudgetRecord } = await import('../../services/gateway/llm-usage-tracker.service.js');
    await ensureBudgetRecord(req.tenantId);
    const ok = await updateBudgetLimits(req.tenantId, req.body.monthlyTokenLimit || 10000000, req.body.monthlyCostLimit || 100, req.body.softLimitPct || 80, req.body.hardLimitAction || 'throttle');
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'updated', entityType: 'ai_enhanced', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.ai_enhanced.updated' });
    res.json({ success: ok });
}));
router.get('/prompts/:assetId', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { listPromptVersions } = await import('../../services/llm/prompt-registry.service.js');
    const result = await listPromptVersions(req.tenantId, { asset_id: req.params.assetId });
    res.json({ versions: result.versions });
}));
router.post('/prompts/:assetId', authenticate, requirePermission('admin.tenant.manage'), validate({ body: promptsAssetIdPostBody }), asyncHandler(async (req, res) => {
    const { createDraftPromptVersion } = await import('../../services/llm/prompt-registry.service.js');
    const version = await createDraftPromptVersion(req.tenantId, {
        asset_id: req.params.assetId,
        template_text: req.body.systemPrompt || req.body.template_text,
        change_summary: req.body.description || '',
        created_by: req.userId || 'admin',
    });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'ai_enhanced', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.ai_enhanced.created' });
    res.json(version);
}));
router.post('/prompts/:assetId/activate/:versionId', authenticate, requirePermission('admin.tenant.manage'), validate({ body: promptsAssetIdActivateVersionIdPostBody }), asyncHandler(async (req, res) => {
    const { activatePromptVersion } = await import('../../services/llm/prompt-registry.service.js');
    const result = await activatePromptVersion(req.tenantId, req.params.versionId, req.userId || 'admin');
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'ai_enhanced', entityId: req.params.versionId || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.ai_enhanced.created' });
    res.json({ success: true, activated: result.activated });
}));
router.get('/cache/stats', validate({ query: z.record(z.unknown()) }), authenticate, async (_req, res) => {
    try {
        const { getCacheStats } = await import('../../services/llm/llm-cache.service.js');
        const stats = await getCacheStats();
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
router.post('/stream/chat', authenticate, validate({ body: streamChatPostBody }), asyncHandler(async (req, res) => {
    try {
        const { guardInput } = await import('../../services/llm/prompt-injection-guard.service.js');
        const guard = await guardInput(req.tenantId, req.body.message || '', req.userId);
        if (!guard.allowed) {
            res.status(400).json({ error: guard.warning });
            return;
        }
        const { streamClaudeResponse } = await import('../../services/llm/llm-stream.service.js');
        const messages = [
            ...(req.body.systemPrompt ? [{ role: 'system', content: req.body.systemPrompt }] : []),
            { role: 'user', content: guard.sanitizedInput },
        ];
        await streamClaudeResponse(messages, res, { agentId: req.body.agentId, tenantId: req.tenantId });
    }
    catch (err) {
        if (!res.headersSent)
            res.status(500).json({ error: toErrorMessage(err) });
    }
}));
router.get('/traces', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { queryTraces } = await import('../../services/llm/llm-trace.service.js');
    const result = await queryTraces({
        tenantId: req.tenantId,
        agentId: req.query.agentId,
        runId: req.query.runId,
        status: req.query.status,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
    });
    res.json(result);
}));
router.get('/traces/stats', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getTraceStats } = await import('../../services/llm/llm-trace.service.js');
    const days = parseInt(req.query.days) || 7;
    const stats = await getTraceStats(req.tenantId, days);
    res.json(stats);
}));
router.get('/evals', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getEvalSummary } = await import('../../services/agents/lifecycle/agent-eval.service.js');
    const days = parseInt(req.query.days) || 30;
    const summary = await getEvalSummary(req.tenantId, req.query.agentId, days);
    res.json(summary);
}));
router.post('/evals/run', authenticate, requirePermission('admin.tenant.manage'), validate({ body: evalsRunPostBody }), asyncHandler(async (req, res) => {
    const { batchEvaluate } = await import('../../services/agents/lifecycle/agent-eval.service.js');
    const result = await batchEvaluate(req.tenantId, req.body.sampleSize || 10);
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'ai_enhanced', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.ai_enhanced.created' });
    res.json(result);
}));
router.get('/injection-stats', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getInjectionStats } = await import('../../services/llm/prompt-injection-guard.service.js');
    const days = parseInt(req.query.days) || 30;
    const stats = await getInjectionStats(req.tenantId, days);
    res.json(stats);
}));
router.get('/memory/health', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getMemoryHealth } = await import('../../services/memory/memory-compaction.service.js');
    const health = await getMemoryHealth(req.tenantId);
    res.json(health);
}));
router.post('/memory/compact', authenticate, requirePermission('admin.tenant.manage'), validate({ body: memoryCompactPostBody }), asyncHandler(async (req, res) => {
    const { runCompaction } = await import('../../services/memory/memory-compaction.service.js');
    const result = await runCompaction(req.tenantId);
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'ai_enhanced', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.ai_enhanced.created' });
    res.json(result);
}));
router.get('/cycle-memory', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getCycleIds } = await import('../../services/orchestration/agent-cycle-memory.service.js');
    const cycles = await getCycleIds(req.tenantId, parseInt(req.query.limit) || 20);
    res.json({ cycles });
}));
router.get('/cycle-memory/:cycleId', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getCycleMemory } = await import('../../services/orchestration/agent-cycle-memory.service.js');
    const entries = await getCycleMemory(req.tenantId, req.params.cycleId, req.query.agentId);
    res.json({ entries });
}));
router.get('/shared-memory', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { readAllSharedScopes } = await import('../../services/memory/shared-agent-memory.service.js');
    const entries = await readAllSharedScopes(req.tenantId, req.query.agentId, parseInt(req.query.limit) || 20);
    res.json({ entries });
}));
router.post('/self-improve', authenticate, requirePermission('admin.tenant.manage'), validate({ body: selfImprovePostBody }), asyncHandler(async (req, res) => {
    const { runSelfImprovementCycle } = await import('../../services/agents/lifecycle/agent-self-improve.service.js');
    const result = await runSelfImprovementCycle(req.tenantId);
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'ai_enhanced', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.ai_enhanced.created' });
    res.json(result);
}));
router.get('/bilingual-prompts', validate({ query: z.record(z.unknown()) }), authenticate, async (_req, res) => {
    try {
        const { getAllBilingualPrompts } = await import('../../platform/services/misc/bilingual-prompt.service.js');
        const prompts = getAllBilingualPrompts();
        res.json({ prompts });
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// ── User Feedback Routes ────────────────────────────────────────
router.post('/feedback', authenticate, validate({ body: feedbackPostBody }), asyncHandler(async (req, res) => {
    const { submitFeedback } = await import('../../services/agents/lifecycle/agent-eval.service.js');
    const { agentId, runId, rating, comment } = req.body;
    if (!agentId || !rating) {
        return res.status(400).json({ error: 'agentId and rating are required' });
    }
    const result = await submitFeedback(req.tenantId, req.user?.userId || 'anonymous', agentId, runId || null, rating, comment);
    res.json(result || { error: 'Failed to submit feedback' });
}));
router.get('/feedback/summary', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getFeedbackSummary } = await import('../../services/agents/lifecycle/agent-eval.service.js');
    const summary = await getFeedbackSummary(req.tenantId, req.query.agentId);
    res.json(summary);
}));
router.get('/feedback/correlation', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getFeedbackVsEvalCorrelation } = await import('../../services/agents/lifecycle/agent-eval.service.js');
    const days = parseInt(req.query.days) || 30;
    const result = await getFeedbackVsEvalCorrelation(req.tenantId, days);
    res.json(result);
}));
// ── Admin / Observability Routes ────────────────────────────────
router.get('/gateway/health', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (_req, res) => {
    try {
        const { getGatewayHealth } = await import('../../services/gateway/ai-gateway.service.js');
        res.json(getGatewayHealth());
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
router.get('/evals/slo-status', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getEvalSLOStatus } = await import('../../services/agents/lifecycle/agent-eval.service.js');
    const days = parseInt(req.query.days) || 7;
    const status = await getEvalSLOStatus(req.tenantId, days);
    res.json(status);
}));
router.get('/guard-decisions/stats', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getGuardDecisionStats } = await import('../../runtime/ai/graphs/nodes/guard.node');
    const days = parseInt(req.query.days) || 7;
    const stats = await getGuardDecisionStats(req.tenantId, days);
    res.json(stats);
}));
// ── Proposed Actions (Approval Queue) ───────────────────────────
router.get('/proposed-actions', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { safeQuery, tenantSchema } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    const status = req.query.status || 'pending';
    const limit = parseInt(req.query.limit) || 50;
    const result = await safeQuery(`SELECT * FROM "${schema}".proposed_actions
  WHERE tenant_id = $1 AND status = $2
  ORDER BY created_at DESC LIMIT $3`, [req.tenantId, status, limit]);
    res.json({ items: result.rows, total: result.rows.length });
}));
router.put('/proposed-actions/:id', authenticate, requirePermission('admin.tenant.manage'), validate({ body: proposedActionsIdPutBody }), asyncHandler(async (req, res) => {
    const { safeQuery, tenantSchema } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    const { status, reviewNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be approved or rejected' });
    }
    const enforcement = await enforceStatusTransition(req.tenantId, {
        moduleCode: 'ai-governance', table: 'proposed_actions', idColumn: 'id',
        entityId: req.params.id, toStatus: status, actorUserId: req.user?.userId || 'admin',
        extraSets: `reviewed_by = $2, reviewed_at = NOW(), review_notes = $3`,
        extraParams: [req.user?.userId || 'admin', reviewNotes || null],
    });
    if (enforcement.blocked)
        return res.status(403).json({ error: 'Transition denied', reason: enforcement.reason });
    let result;
    if (!enforcement.success) {
        result = await safeQuery(`UPDATE "${schema}".proposed_actions
  SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
  WHERE id = $4 AND tenant_id = $5 RETURNING *`, [status, req.user?.userId || 'admin', reviewNotes || null, req.params.id, req.tenantId]);
    }
    else {
        result = await safeQuery(`SELECT * FROM "${schema}".proposed_actions WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]);
    }
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Proposed action not found' });
    }
    const { emitModuleEvent } = await import('../../services/emit-event.js');
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'updated', entityType: 'proposed_action', entityId: req.params.id }), { tenantId: req.tenantId, operation: 'grcEvent:governance.proposed_action.updated' });
    res.json({ success: true, item: getFirstRow(result) });
}));
// ═══════════════════════════════════════════════════════════════
// AI-First Dynamic Model Routing & Cost Optimization
// ═══════════════════════════════════════════════════════════════
// GET /ai-enhanced/model-performance — DB-driven model performance analytics
router.get('/model-performance', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { safeQuery, tenantSchema } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    const days = parseInt(req.query.days) || 30;
    const [usage, errors, latency, costByAgent] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT model, COUNT(*) AS calls, SUM(input_tokens + output_tokens) AS total_tokens, SUM(cost_usd) AS total_cost
              FROM "${schema}".llm_usage_log WHERE created_at > NOW() - ($1 || ' days')::interval GROUP BY model ORDER BY calls DESC`, [days]), { tenantId: req.tenantId, operation: 'query llm_usage_log' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT model, COUNT(*) AS error_count, COUNT(*) FILTER (WHERE error_type = 'rate_limit') AS rate_limits, COUNT(*) FILTER (WHERE error_type = 'timeout') AS timeouts
              FROM "${schema}".llm_error_log WHERE created_at > NOW() - ($1 || ' days')::interval GROUP BY model`, [days]), { tenantId: req.tenantId, operation: 'query llm_usage_log' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT model, ROUND(AVG(latency_ms)) AS avg_latency, ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)) AS p95_latency, ROUND(percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms)) AS p99_latency
              FROM "${schema}".llm_usage_log WHERE created_at > NOW() - ($1 || ' days')::interval GROUP BY model`, [days]), { tenantId: req.tenantId, operation: 'query llm_error_log' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT agent_id, model, SUM(cost_usd) AS cost, COUNT(*) AS calls
              FROM "${schema}".llm_usage_log WHERE created_at > NOW() - ($1 || ' days')::interval GROUP BY agent_id, model ORDER BY cost DESC LIMIT 20`, [days]), { tenantId: req.tenantId, operation: 'query llm_usage_log' }),
    ]);
    res.json({ period_days: days, usage: usage.rows, errors: errors.rows, latency: latency.rows, cost_by_agent: costByAgent.rows });
}));
// POST /ai-enhanced/optimize-routing — AI-driven model routing optimization
router.post('/optimize-routing', authenticate, requirePermission('admin.tenant.manage'), validate({ body: createOptimizeRoutingBody }), asyncHandler(async (req, res) => {
    const { safeQuery, tenantSchema } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    const [currentConfigs, usageData, budgetStatus] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".agent_model_configs`), { tenantId: req.tenantId, operation: 'query agent_model_configs' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT agent_id, model, AVG(latency_ms) AS avg_latency, SUM(cost_usd) AS total_cost, COUNT(*) AS calls, SUM(CASE WHEN error_type IS NOT NULL THEN 1 ELSE 0 END) AS errors FROM "${schema}".llm_usage_log WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY agent_id, model`), { tenantId: req.tenantId, operation: 'query agent_model_configs' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".llm_budget LIMIT 1`), { tenantId: req.tenantId, operation: 'query agent_model_configs' }),
    ]);
    const { claudeJSON } = await import('../../../../config/claude-client.js');
    const optimization = await claudeJSON({
        systemPrompt: `You are an AI model routing optimizer. Analyze usage patterns and recommend optimal model assignments.
Respond with JSON: {
  recommendations: [{agent_id: string, current_model: string, recommended_model: string, reason: string, estimated_savings_pct: number}],
  budget_analysis: {current_monthly_cost: number, projected_cost: number, savings_pct: number},
  performance_trade_offs: string[],
  overall_score: number (0-100)
}`,
        userMessage: `Current configs:\n${JSON.stringify(currentConfigs.rows)}\n\nUsage (7d):\n${JSON.stringify(usageData.rows)}\n\nBudget:\n${JSON.stringify(budgetStatus.rows[0] || {})}`,
        maxTokens: 1536,
        temperature: 0.2,
    });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'ai', event: 'optimization_requested', entityType: 'ai_enhanced', entityId: 'routing' }), { tenantId: req.tenantId, operation: 'grcEvent:ai.ai_enhanced.optimization_requested' });
    res.json(optimization);
}));
// GET /ai-enhanced/cost-forecast — AI cost forecasting
router.get('/cost-forecast', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { safeQuery, tenantSchema } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    const historicalCost = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT DATE(created_at) AS day, SUM(cost_usd) AS daily_cost, SUM(input_tokens + output_tokens) AS daily_tokens, COUNT(*) AS daily_calls
     FROM "${schema}".llm_usage_log WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY DATE(created_at) ORDER BY day`), { tenantId: req.tenantId, operation: 'query llm_usage_log' });
    const { claudeJSON } = await import('../../../../config/claude-client.js');
    const forecast = await claudeJSON({
        systemPrompt: `You are an AI cost forecasting engine. Analyze historical usage and project future costs.
Respond with JSON: {
  forecast_30d: {estimated_cost: number, estimated_tokens: number, confidence: number},
  forecast_90d: {estimated_cost: number, estimated_tokens: number, confidence: number},
  trend: "increasing"|"stable"|"decreasing",
  growth_rate_pct: number,
  anomalies: [{day: string, type: string, description: string}],
  cost_optimization_tips: string[]
}`,
        userMessage: `Historical daily costs (30d):\n${JSON.stringify(historicalCost.rows)}`,
        maxTokens: 1024,
        temperature: 0.2,
    });
    res.json({ historical: historicalCost.rows, ...(forecast || {}) });
}));
// GET /ai-enhanced/health-dashboard — Unified AI health dashboard
router.get('/health-dashboard', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { safeQuery, tenantSchema } = await import('@dos/db');
    const schema = tenantSchema(req.tenantId);
    const [agentHealth, recentErrors, budgetStatus, decisionStats] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT agent_id, enabled, last_run_at, error_count, success_count,
              CASE WHEN error_count > success_count THEN 'unhealthy' WHEN last_run_at < NOW() - INTERVAL '2 hours' THEN 'stale' ELSE 'healthy' END AS health_status
              FROM "${schema}".agent_runtime_config ORDER BY agent_id`), { tenantId: req.tenantId, operation: 'query agent_runtime_config' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT model, error_type, COUNT(*) AS cnt FROM "${schema}".llm_error_log WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY model, error_type ORDER BY cnt DESC LIMIT 10`), { tenantId: req.tenantId, operation: 'query agent_runtime_config' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".llm_budget LIMIT 1`), { tenantId: req.tenantId, operation: 'query agent_runtime_config' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT COUNT(*) AS total_24h, COUNT(*) FILTER (WHERE outcome = 'accepted') AS accepted, COUNT(*) FILTER (WHERE outcome = 'rejected') AS rejected FROM "${schema}".ai_decisions WHERE created_at > NOW() - INTERVAL '24 hours'`), { tenantId: req.tenantId, operation: 'query llm_error_log' }),
    ]);
    const healthyCount = agentHealth.rows.filter((a) => a.health_status === 'healthy').length;
    const totalCount = agentHealth.rows.length;
    res.json({
        overall_health: totalCount > 0 ? Math.round(100 * healthyCount / totalCount) : 0,
        agents: agentHealth.rows,
        recent_errors: recentErrors.rows,
        budget: budgetStatus.rows[0] || null,
        decisions_24h: decisionStats.rows[0] || { total_24h: 0 },
    });
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=ai-enhanced.routes.js.map
/**
 * AI OS — Maintenance, Trends, Regressions, A/B Tests, Tools, Cost & Forecasting
 * @module ai-os/operations
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { ValidationError } from '../../../../errors';
import { aiReadLimiter, aiWriteLimiter, aiExportLimiter, daysBackQuery, agentFilterQuery, setCacheHeaders, setNoCacheHeaders } from './shared';
import { aiOsMaintenancePruneSignalsPostBody, aiOsMaintenancePruneDecisionsPostBody, aiOsRegressionsDetectPostBody, aiOsRegressionsAlertIdAcknowledgePostBody, aiOsAbTestsPostBody, aiOsAbTestsTestIdAssignPostBody, aiOsAbTestsTestIdResultPostBody, aiOsToolsPostBody, aiOsToolsToolIdVersionsVersionDeprecatePostBody, aiOsCostAttributionCentersPostBody, aiOsCostAttributionProjectsPostBody, aiOsWebhookTestPostBody, } from './ai-os-schemas';
import { pruneSignals, pruneDecisions } from '../../services/cockpit/ai-cockpit-signal.service';
import { auditMiddleware, asyncHandler, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.use(mutationEventHook('ai'));
// ── Maintenance (heavy ops) ─────────────────────────────────────────────────
router.post('/ai-os/maintenance/prune-signals', authenticate, aiExportLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsMaintenancePruneSignalsPostBody }), asyncHandler(async (req, res) => {
    const deleted = await pruneSignals(req.tenantId, Number(req.body.retentionDays) || 90);
    setNoCacheHeaders(res);
    res.ok({ deletedSignals: deleted });
}));
router.post('/ai-os/maintenance/prune-decisions', authenticate, aiExportLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsMaintenancePruneDecisionsPostBody }), asyncHandler(async (req, res) => {
    const deleted = await pruneDecisions(req.tenantId, Number(req.body.retentionDays) || 180);
    setNoCacheHeaders(res);
    res.ok({ deletedDecisions: deleted });
}));
// ── Trend Analysis ──────────────────────────────────────────────────────────
router.get('/ai-os/trends', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { analyzeTrends } = await import('../../../analytics/services/misc/historical-trend-analyzer.service');
    const metric = req.query.metric || 'latency';
    const agentId = req.query.agentId;
    const period = req.query.period || 'daily';
    const daysBack = Number(req.query.daysBack) || 30;
    const result = await analyzeTrends(req.tenantId, metric, agentId, period, daysBack);
    setCacheHeaders(res, 60);
    res.ok(result);
}));
router.get('/ai-os/trends/summary', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getTrendSummary } = await import('../../../analytics/services/misc/historical-trend-analyzer.service');
    const agentId = req.query.agentId;
    const summary = await getTrendSummary(req.tenantId, agentId);
    setCacheHeaders(res, 60);
    res.ok(summary);
}));
// ── Regression Detection ────────────────────────────────────────────────────
router.post('/ai-os/regressions/detect', authenticate, aiExportLimiter, requirePermission('ai.agent.read'), validate({ body: aiOsRegressionsDetectPostBody }), asyncHandler(async (req, res) => {
    const { detectRegressions } = await import('../../../analytics/services/misc/performance-regression-detector.service');
    const alerts = await detectRegressions(req.tenantId, req.body);
    setNoCacheHeaders(res);
    res.ok({ items: alerts, total: alerts.length });
}));
router.get('/ai-os/regressions', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getRegressionAlerts } = await import('../../../analytics/services/misc/performance-regression-detector.service');
    const agentId = req.query.agentId;
    const acknowledged = req.query.acknowledged === 'true' ? true : req.query.acknowledged === 'false' ? false : undefined;
    const alerts = await getRegressionAlerts(req.tenantId, agentId, acknowledged);
    setCacheHeaders(res, 15);
    res.ok({ items: alerts, total: alerts.length });
}));
router.post('/ai-os/regressions/:alertId/acknowledge', authenticate, aiWriteLimiter, requirePermission('ai.agent.write'), validate({ body: aiOsRegressionsAlertIdAcknowledgePostBody }), asyncHandler(async (req, res) => {
    const { acknowledgeRegression } = await import('../../../analytics/services/misc/performance-regression-detector.service');
    await acknowledgeRegression(req.tenantId, req.params.alertId);
    setNoCacheHeaders(res);
    res.ok({ acknowledged: true });
}));
// ── A/B Testing ─────────────────────────────────────────────────────────────
router.get('/ai-os/ab-tests', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getTestResults, getWinningVariant } = await import('../../services/agents/agent-ab-testing.service');
    const testId = req.query.testId;
    if (!testId)
        throw new ValidationError([{ path: 'testId', message: 'testId query parameter is required' }]);
    const results = await getTestResults(req.tenantId, testId);
    const winner = await getWinningVariant(req.tenantId, testId);
    setCacheHeaders(res, 30);
    res.ok({ results, winningVariant: winner });
}));
router.post('/ai-os/ab-tests', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsAbTestsPostBody }), asyncHandler(async (req, res) => {
    const { upsertABTest } = await import('../../services/agents/agent-ab-testing.service');
    await upsertABTest(req.tenantId, req.body);
    setNoCacheHeaders(res);
    res.created({ success: true });
}));
router.post('/ai-os/ab-tests/:testId/assign', authenticate, aiWriteLimiter, requirePermission('ai.agent.read'), validate({ body: aiOsAbTestsTestIdAssignPostBody }), asyncHandler(async (req, res) => {
    const { assignToVariant } = await import('../../services/agents/agent-ab-testing.service');
    const variant = await assignToVariant(req.tenantId, req.params.testId, req.userId, req.body.sessionId);
    setNoCacheHeaders(res);
    res.ok({ variant });
}));
router.post('/ai-os/ab-tests/:testId/result', authenticate, aiWriteLimiter, requirePermission('ai.agent.write'), validate({ body: aiOsAbTestsTestIdResultPostBody }), asyncHandler(async (req, res) => {
    const { recordTestResult } = await import('../../services/agents/agent-ab-testing.service');
    await recordTestResult(req.tenantId, req.params.testId, req.body.variant, req.body.result);
    setNoCacheHeaders(res);
    res.ok({ recorded: true });
}));
// ── Tool Registry ───────────────────────────────────────────────────────────
router.get('/ai-os/tools', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { listTools, getTool } = await import('../../services/gateway/tool-registry.service');
    const toolId = req.query.toolId;
    const version = req.query.version;
    if (toolId) {
        const tool = await getTool(req.tenantId, toolId, version);
        setCacheHeaders(res, 30);
        res.ok(tool || { error: 'Tool not found' });
    }
    else {
        const category = req.query.category;
        const includeDeprecated = req.query.includeDeprecated === 'true';
        const tools = await listTools(req.tenantId, category, includeDeprecated);
        setCacheHeaders(res, 30);
        res.ok({ items: tools, total: tools.length });
    }
}));
router.post('/ai-os/tools', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsToolsPostBody }), asyncHandler(async (req, res) => {
    const { registerTool } = await import('../../services/gateway/tool-registry.service');
    await registerTool(req.tenantId, req.body);
    setNoCacheHeaders(res);
    res.created({ success: true });
}));
router.get('/ai-os/tools/:toolId/versions', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getToolVersions } = await import('../../services/gateway/tool-registry.service');
    const versions = await getToolVersions(req.tenantId, req.params.toolId);
    setCacheHeaders(res, 30);
    res.ok({ items: versions, total: versions.length });
}));
router.post('/ai-os/tools/:toolId/versions/:version/deprecate', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsToolsToolIdVersionsVersionDeprecatePostBody }), asyncHandler(async (req, res) => {
    const { deprecateToolVersion } = await import('../../services/gateway/tool-registry.service');
    await deprecateToolVersion(req.tenantId, req.params.toolId, req.params.version, req.body.replacedBy);
    setNoCacheHeaders(res);
    res.ok({ deprecated: true });
}));
router.get('/ai-os/tools/usage/stats', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: daysBackQuery }), asyncHandler(async (req, res) => {
    const { getToolUsageStats, getMostUsedTools } = await import('../../services/observability/tool-usage-analytics.service');
    const toolId = req.query.toolId;
    const daysBack = Number(req.query.daysBack) || 30;
    if (toolId) {
        const stats = await getToolUsageStats(req.tenantId, toolId, daysBack);
        setCacheHeaders(res, 30);
        res.ok({ items: stats, total: stats.length });
    }
    else {
        const limit = Number(req.query.limit) || 10;
        const mostUsed = await getMostUsedTools(req.tenantId, limit, daysBack);
        setCacheHeaders(res, 30);
        res.ok({ items: mostUsed, total: mostUsed.length });
    }
}));
// ── Budget & Cost ───────────────────────────────────────────────────────────
router.get('/ai-os/budget/throttle-stats', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: daysBackQuery }), asyncHandler(async (req, res) => {
    const { getThrottlingStats } = await import('../../services/misc/enhanced-budget-enforcement.service');
    const daysBack = Number(req.query.daysBack) || 7;
    const stats = await getThrottlingStats(req.tenantId, daysBack);
    setCacheHeaders(res, 30);
    res.ok(stats);
}));
router.get('/ai-os/error-recovery/stats', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: daysBackQuery.extend(agentFilterQuery.shape) }), asyncHandler(async (req, res) => {
    const { getRecoveryStats } = await import('../../services/misc/error-recovery.service');
    const agentId = req.query.agentId;
    const daysBack = Number(req.query.daysBack) || 30;
    const stats = await getRecoveryStats(req.tenantId, agentId, daysBack);
    setCacheHeaders(res, 30);
    res.ok(stats);
}));
router.get('/ai-os/token-efficiency', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: daysBackQuery.extend(agentFilterQuery.shape) }), asyncHandler(async (req, res) => {
    const { getEfficiencyMetrics } = await import('../../services/observability/token-efficiency-tracker.service');
    const agentId = req.query.agentId;
    const daysBack = Number(req.query.daysBack) || 30;
    const metrics = await getEfficiencyMetrics(req.tenantId, agentId, daysBack);
    setCacheHeaders(res, 30);
    res.ok(metrics);
}));
router.get('/ai-os/cost-attribution', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: daysBackQuery }), asyncHandler(async (req, res) => {
    const { getCostAttributionSummary } = await import('../../services/observability/cost-attribution.service');
    const daysBack = Number(req.query.daysBack) || 30;
    const summary = await getCostAttributionSummary(req.tenantId, daysBack);
    setCacheHeaders(res, 60);
    res.ok(summary);
}));
router.post('/ai-os/cost-attribution/centers', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsCostAttributionCentersPostBody }), asyncHandler(async (req, res) => {
    const { upsertCostCenter } = await import('../../services/observability/cost-attribution.service');
    await upsertCostCenter(req.body);
    setNoCacheHeaders(res);
    res.created({ success: true });
}));
router.post('/ai-os/cost-attribution/projects', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsCostAttributionProjectsPostBody }), asyncHandler(async (req, res) => {
    const { upsertProject } = await import('../../services/observability/cost-attribution.service');
    await upsertProject(req.body);
    setNoCacheHeaders(res);
    res.created({ success: true });
}));
// ── Usage Forecasting ───────────────────────────────────────────────────────
router.get('/ai-os/usage-forecast', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { forecastUsage, getForecastSummary } = await import('../../services/observability/usage-forecaster.service');
    const period = req.query.period || 'daily';
    const daysAhead = Number(req.query.daysAhead) || 30;
    if (req.query.summary === 'true') {
        const summary = await getForecastSummary(req.tenantId);
        setCacheHeaders(res, 60);
        res.ok(summary);
    }
    else {
        const forecast = await forecastUsage(req.tenantId, period, daysAhead);
        setCacheHeaders(res, 60);
        res.ok({ items: forecast, total: forecast.length });
    }
}));
// ── Webhook Test ────────────────────────────────────────────────────────────
router.post('/ai-os/webhook/test', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsWebhookTestPostBody }), asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
        throw new ValidationError([{ path: 'url', message: 'Valid HTTPS URL required' }]);
    }
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'webhook_test', tenantId: req.tenantId, timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(10_000),
    });
    setNoCacheHeaders(res);
    res.ok({ success: response.ok, status: response.status });
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=operations.routes.js.map
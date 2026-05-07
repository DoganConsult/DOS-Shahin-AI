/**
 * AI OS — Signals, Observations, Alerts, Activity Feed & Next Best Actions
 * @module ai-os/signals
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { NotFoundError } from '../../../../errors/index.js';
import { aiReadLimiter, aiWriteLimiter, daysBackQuery, setCacheHeaders, setNoCacheHeaders } from './shared.js';
import { aiOsObservationsIdAcknowledgePostBody, aiOsObservationsIdResolvePostBody, aiOsObservationsIdDismissPostBody, aiOsAlertsIdAcknowledgePostBody, aiOsAlertsIdResolvePostBody, aiOsAlertsIdEscalatePostBody, aiOsAlertsIdDismissPostBody, aiOsActivityAlertsEvaluatePostBody, aiOsActivityAlertsRulesPostBody, aiOsActivityAlertsAlertIdAcknowledgePostBody, } from './ai-os-schemas.js';
import { getLatestSignals, getSignalHistory, getSignalStats, getSignalTrend } from '../../services/cockpit/ai-cockpit-signal.service.js';
import { listObservations, getObservationsForEntity, acknowledgeObservation, resolveObservation, dismissObservation, getObservationStats } from '../../services/observability/ai-observation.service.js';
import { listAlerts, getAlertsForEntity, acknowledgeAlert, resolveAlert, escalateAlert, dismissAlert, getAlertStats } from '../../services/governance/compliance/ai-alert.service.js';
import { getNextBestActions } from '../../../workflow/services/ai/next-best-action.service.js';
import { getRuntimeHealthSummary, validateRuntimeConfigIntegrity } from '../../services/agents/core/ai-agent-runtime.service.js';
import { detectPolicyConflicts } from '../../services/governance/ai-policy-rule.service.js';
import { auditMiddleware, asyncHandler, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port.js';
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.use(mutationEventHook('ai'));
// ── Signals ─────────────────────────────────────────────────────────────────
router.get('/ai-os/signals', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const signals = await getLatestSignals(req.tenantId);
    setCacheHeaders(res, 15);
    res.ok({ items: signals });
}));
router.get('/ai-os/signals/stats', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const stats = await getSignalStats(req.tenantId);
    setCacheHeaders(res, 30);
    res.ok(stats);
}));
router.get('/ai-os/signals/:signalCode/history', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const history = await getSignalHistory(req.tenantId, req.params.signalCode, Number(req.query.limit) || 100);
    setCacheHeaders(res, 15);
    res.ok({ items: history });
}));
router.get('/ai-os/signals/:signalCode/trend', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: daysBackQuery }), asyncHandler(async (req, res) => {
    const trend = await getSignalTrend(req.tenantId, req.params.signalCode, Number(req.query.daysBack) || 7);
    setCacheHeaders(res, 30);
    res.ok({ items: trend });
}));
// ── Observations ────────────────────────────────────────────────────────────
router.get('/ai-os/observations', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { agentId, entityType, status, severity, limit, offset } = req.query;
    const result = await listObservations(req.tenantId, { agentId, entityType, status, severity, limit: Number(limit) || 50, offset: Number(offset) || 0 });
    setCacheHeaders(res, 15);
    res.ok(result);
}));
router.get('/ai-os/observations/stats', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const stats = await getObservationStats(req.tenantId);
    setCacheHeaders(res, 30);
    res.ok(stats);
}));
router.get('/ai-os/observations/entity/:entityType/:entityId', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const items = await getObservationsForEntity(req.tenantId, req.params.entityType, req.params.entityId);
    setCacheHeaders(res, 15);
    res.ok({ items });
}));
router.post('/ai-os/observations/:id/acknowledge', authenticate, aiWriteLimiter, requirePermission('ai.agent.write'), validate({ body: aiOsObservationsIdAcknowledgePostBody }), asyncHandler(async (req, res) => {
    const ok = await acknowledgeObservation(req.tenantId, req.params.id, req.userId || 'any');
    if (!ok)
        throw new NotFoundError('Observation', req.params.id);
    setNoCacheHeaders(res);
    res.ok({ success: true });
}));
router.post('/ai-os/observations/:id/resolve', authenticate, aiWriteLimiter, requirePermission('ai.agent.write'), validate({ body: aiOsObservationsIdResolvePostBody }), asyncHandler(async (req, res) => {
    const ok = await resolveObservation(req.tenantId, req.params.id, req.userId || 'any');
    if (!ok)
        throw new NotFoundError('Observation', req.params.id);
    setNoCacheHeaders(res);
    res.ok({ success: true });
}));
router.post('/ai-os/observations/:id/dismiss', authenticate, aiWriteLimiter, requirePermission('ai.agent.write'), validate({ body: aiOsObservationsIdDismissPostBody }), asyncHandler(async (req, res) => {
    const ok = await dismissObservation(req.tenantId, req.params.id, req.userId || 'any');
    if (!ok)
        throw new NotFoundError('Observation', req.params.id);
    setNoCacheHeaders(res);
    res.ok({ success: true });
}));
// ── System Alerts (computed from health/config/policy) ──────────────────────
// NOTE: Renamed from duplicate GET /ai-os/alerts to /ai-os/alerts/system
router.get('/ai-os/alerts/system', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const alerts = [];
    const [healthSummary, configIntegrity, conflicts] = await Promise.all([
        getRuntimeHealthSummary(tenantId),
        validateRuntimeConfigIntegrity(tenantId),
        detectPolicyConflicts(tenantId),
    ]);
    if (healthSummary.circuitOpenCount > 0)
        alerts.push({ level: 'critical', source: 'runtime', message: `${healthSummary.circuitOpenCount} agent circuit(s) OPEN` });
    if (healthSummary.stuckRunCount > 0)
        alerts.push({ level: 'warning', source: 'runtime', message: `${healthSummary.stuckRunCount} stuck run(s) detected` });
    if (healthSummary.disabledAgents > 0)
        alerts.push({ level: 'info', source: 'runtime', message: `${healthSummary.disabledAgents} agent(s) disabled` });
    if (healthSummary.failedRunsLast24h > 5)
        alerts.push({ level: 'warning', source: 'runtime', message: `${healthSummary.failedRunsLast24h} failed runs in last 24h` });
    for (const issue of configIntegrity.issues)
        alerts.push({ level: 'warning', source: 'config', message: issue });
    for (const c of conflicts)
        alerts.push({ level: 'warning', source: 'policy', message: `${c.ruleA} \u2194 ${c.ruleB}: ${c.conflict}` });
    setCacheHeaders(res, 15);
    res.ok({ items: alerts, total: alerts.length });
}));
// ── Persisted Alerts (from ai_alerts table) ─────────────────────────────────
router.get('/ai-os/alerts', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { alertType, severity, status, entityType, limit, offset } = req.query;
    const result = await listAlerts(req.tenantId, { alertType, severity, status, entityType, limit: Number(limit) || 50, offset: Number(offset) || 0 });
    setCacheHeaders(res, 15);
    res.ok(result);
}));
router.get('/ai-os/alerts/stats', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const stats = await getAlertStats(req.tenantId);
    setCacheHeaders(res, 30);
    res.ok(stats);
}));
router.get('/ai-os/alerts/entity/:entityType/:entityId', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const items = await getAlertsForEntity(req.tenantId, req.params.entityType, req.params.entityId);
    setCacheHeaders(res, 15);
    res.ok({ items });
}));
router.post('/ai-os/alerts/:id/acknowledge', authenticate, aiWriteLimiter, requirePermission('ai.agent.write'), validate({ body: aiOsAlertsIdAcknowledgePostBody }), asyncHandler(async (req, res) => {
    const ok = await acknowledgeAlert(req.tenantId, req.params.id, req.userId || 'any');
    if (!ok)
        throw new NotFoundError('Alert', req.params.id);
    setNoCacheHeaders(res);
    res.ok({ success: true });
}));
router.post('/ai-os/alerts/:id/resolve', authenticate, aiWriteLimiter, requirePermission('ai.agent.write'), validate({ body: aiOsAlertsIdResolvePostBody }), asyncHandler(async (req, res) => {
    const ok = await resolveAlert(req.tenantId, req.params.id, req.userId || 'any');
    if (!ok)
        throw new NotFoundError('Alert', req.params.id);
    setNoCacheHeaders(res);
    res.ok({ success: true });
}));
router.post('/ai-os/alerts/:id/escalate', authenticate, aiWriteLimiter, requirePermission('ai.agent.write'), validate({ body: aiOsAlertsIdEscalatePostBody }), asyncHandler(async (req, res) => {
    const ok = await escalateAlert(req.tenantId, req.params.id);
    if (!ok)
        throw new NotFoundError('Alert', req.params.id);
    setNoCacheHeaders(res);
    res.ok({ success: true });
}));
router.post('/ai-os/alerts/:id/dismiss', authenticate, aiWriteLimiter, requirePermission('ai.agent.write'), validate({ body: aiOsAlertsIdDismissPostBody }), asyncHandler(async (req, res) => {
    const ok = await dismissAlert(req.tenantId, req.params.id, req.userId || 'any');
    if (!ok)
        throw new NotFoundError('Alert', req.params.id);
    setNoCacheHeaders(res);
    res.ok({ success: true });
}));
// ── Activity Feed & Correlation ─────────────────────────────────────────────
router.get('/ai-os/activity-feed', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getUnifiedActivityFeed } = await import('../../services/activity/unified-activity-feed.service.js');
    const filter = {
        modules: req.query.modules ? req.query.modules.split(',') : undefined,
        entityTypes: req.query.entityTypes ? req.query.entityTypes.split(',') : undefined,
        userIds: req.query.userIds ? req.query.userIds.split(',') : undefined,
        actions: req.query.actions ? req.query.actions.split(',') : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
        read: req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined,
        archived: req.query.archived === 'true' ? true : req.query.archived === 'false' ? false : undefined,
        agentId: req.query.agentId,
        workflowId: req.query.workflowId,
    };
    const cursor = req.query.cursor;
    const limit = Number(req.query.limit) || 20;
    const result = await getUnifiedActivityFeed(req.tenantId, req.userId || null, filter, cursor, limit);
    setCacheHeaders(res, 10);
    res.ok(result);
}));
router.get('/ai-os/activity-timeline/:entityType/:entityId', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: daysBackQuery }), asyncHandler(async (req, res) => {
    const { getActivityTimeline } = await import('../../services/activity/activity-correlation.service.js');
    const daysBack = Number(req.query.daysBack) || 7;
    const timeline = await getActivityTimeline(req.tenantId, req.params.entityType, req.params.entityId, daysBack);
    setCacheHeaders(res, 15);
    res.ok({ items: timeline, total: timeline.length });
}));
router.get('/ai-os/activity-correlation/:entityType/:entityId', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { findCorrelatedActivities } = await import('../../services/activity/activity-correlation.service.js');
    const timeWindowMs = Number(req.query.timeWindowMs) || 5 * 60 * 1000;
    const groups = await findCorrelatedActivities(req.tenantId, req.params.entityType, req.params.entityId, timeWindowMs);
    setCacheHeaders(res, 15);
    res.ok({ items: groups, total: groups.length });
}));
// ── Activity-Based Alerts ───────────────────────────────────────────────────
router.get('/ai-os/activity-alerts', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getActiveAlerts } = await import('../../services/activity/activity-alerts.service.js');
    const severity = req.query.severity;
    const alerts = await getActiveAlerts(req.tenantId, severity);
    setCacheHeaders(res, 15);
    res.ok({ items: alerts, total: alerts.length });
}));
router.post('/ai-os/activity-alerts/evaluate', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsActivityAlertsEvaluatePostBody }), asyncHandler(async (req, res) => {
    const { evaluateAlertRules } = await import('../../services/activity/activity-alerts.service.js');
    const alerts = await evaluateAlertRules(req.tenantId);
    setNoCacheHeaders(res);
    res.ok({ items: alerts, total: alerts.length });
}));
router.post('/ai-os/activity-alerts/rules', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsActivityAlertsRulesPostBody }), asyncHandler(async (req, res) => {
    const { upsertAlertRule } = await import('../../services/activity/activity-alerts.service.js');
    await upsertAlertRule(req.tenantId, req.body);
    setNoCacheHeaders(res);
    res.created({ success: true });
}));
router.post('/ai-os/activity-alerts/:alertId/acknowledge', authenticate, aiWriteLimiter, requirePermission('ai.agent.write'), validate({ body: aiOsActivityAlertsAlertIdAcknowledgePostBody }), asyncHandler(async (req, res) => {
    const { acknowledgeAlert: ackActivityAlert } = await import('../../services/activity/activity-alerts.service.js');
    await ackActivityAlert(req.tenantId, req.params.alertId, req.userId || 'any');
    setNoCacheHeaders(res);
    res.ok({ acknowledged: true });
}));
// ── Next Best Actions ───────────────────────────────────────────────────────
router.get('/ai-os/next-best-actions', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const actions = await getNextBestActions(req.tenantId, req.userId || '', req.user?.role || 'viewer', limit);
    setCacheHeaders(res, 30);
    res.ok({ items: actions, total: actions.length });
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=signals.routes.js.map
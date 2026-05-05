/**
 * AI OS — Policy Rules, Event Triggers & Route Rules
 * @module ai-os/policy
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { NotFoundError } from '../../../../errors';
import { aiReadLimiter, aiWriteLimiter, aiDeleteLimiter, hoursQuery, setCacheHeaders, setNoCacheHeaders } from './shared';
import { aiOsPolicyRulesPostBody, aiOsPolicyRulesRuleIdPutBody, aiOsPolicyRulesRuleIdTogglePatchBody, aiOsEventTriggersPostBody, aiOsEventTriggersBindingIdTogglePatchBody, aiOsEventTriggersBindingIdTestFirePostBody, aiOsEventTriggersBindingIdPutBody, aiOsRouteRulesPostBody, aiOsRouteRulesRuleIdTogglePatchBody, aiOsRouteRulesRuleIdPutBody, } from './ai-os-schemas';
import { listPolicyRules, createPolicyRule, deletePolicyRule, togglePolicyRule, updatePolicyRule, getPolicyEvalStats, detectPolicyConflicts, getBlockedActionLog } from '../../services/governance/ai-policy-rule.service';
import { listEventTriggerBindings, createEventTriggerBinding, deleteEventTriggerBinding, toggleEventTriggerBinding, testFireBinding, updateEventTriggerBinding, getTriggerFireLog } from '../../services/workflow/ai-event-trigger.service';
import { listRouteRules, createRouteRule, deleteRouteRule, toggleRouteRule, updateRouteRule } from '../../services/workflow/ai-task-routing.service';
import { auditMiddleware, asyncHandler, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.use(mutationEventHook('ai'));
const genericPayloadSchema = z.record(z.unknown());
// ── Policy Rules ────────────────────────────────────────────────────────────
/** @swagger /api/ai-os/policy-rules: get: { summary: List policy rules, tags: [AI OS - Policy & Rules] } */
router.get('/ai-os/policy-rules', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const items = await listPolicyRules(req.tenantId, req.query.ruleType);
    setCacheHeaders(res, 30);
    res.ok({ items });
}));
/** @swagger /api/ai-os/policy-rules/stats: get: { summary: Policy evaluation stats, tags: [AI OS - Policy & Rules] } */
router.get('/ai-os/policy-rules/stats', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const stats = await getPolicyEvalStats(req.tenantId);
    setCacheHeaders(res, 30);
    res.ok(stats);
}));
/** @swagger /api/ai-os/policy-rules/conflicts: get: { summary: Detect policy conflicts, tags: [AI OS - Policy & Rules] } */
router.get('/ai-os/policy-rules/conflicts', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const conflicts = await detectPolicyConflicts(req.tenantId);
    setCacheHeaders(res, 30);
    res.ok({ items: conflicts });
}));
/** @swagger /api/ai-os/policy-rules/blocked-log: get: { summary: Blocked action log, tags: [AI OS - Policy & Rules] } */
router.get('/ai-os/policy-rules/blocked-log', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: hoursQuery }), asyncHandler(async (req, res) => {
    const items = await getBlockedActionLog(req.tenantId, Number(req.query.hours) || 24);
    setCacheHeaders(res, 15);
    res.ok({ items });
}));
router.post('/ai-os/policy-rules', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsPolicyRulesPostBody }), asyncHandler(async (req, res) => {
    const rule = await createPolicyRule(req.tenantId, req.body);
    setNoCacheHeaders(res);
    res.created(rule);
}));
router.put('/ai-os/policy-rules/:ruleId', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsPolicyRulesRuleIdPutBody }), asyncHandler(async (req, res) => {
    const rule = await updatePolicyRule(req.tenantId, req.params.ruleId, req.body);
    if (!rule)
        throw new NotFoundError('PolicyRule', req.params.ruleId);
    setNoCacheHeaders(res);
    res.ok(rule);
}));
router.patch('/ai-os/policy-rules/:ruleId/toggle', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsPolicyRulesRuleIdTogglePatchBody }), asyncHandler(async (req, res) => {
    const ok = await togglePolicyRule(req.tenantId, req.params.ruleId, req.body.enabled);
    setNoCacheHeaders(res);
    res.ok({ toggled: ok });
}));
router.delete('/ai-os/policy-rules/:ruleId', authenticate, aiDeleteLimiter, requirePermission('ai.agent.configure'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
    const _ok = await deletePolicyRule(req.tenantId, req.params.ruleId);
    res.deleted('Policy rule deleted');
}));
// ── Event Triggers ──────────────────────────────────────────────────────────
router.get('/ai-os/event-triggers', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const items = await listEventTriggerBindings(req.tenantId);
    setCacheHeaders(res, 30);
    res.ok({ items });
}));
router.get('/ai-os/event-triggers/fire-log', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: hoursQuery }), asyncHandler(async (req, res) => {
    const items = await getTriggerFireLog(req.tenantId, Number(req.query.hours) || 24);
    setCacheHeaders(res, 15);
    res.ok({ items });
}));
router.post('/ai-os/event-triggers', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsEventTriggersPostBody }), asyncHandler(async (req, res) => {
    const binding = await createEventTriggerBinding(req.tenantId, req.body);
    setNoCacheHeaders(res);
    res.created(binding);
}));
router.put('/ai-os/event-triggers/:bindingId', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsEventTriggersBindingIdPutBody }), asyncHandler(async (req, res) => {
    const binding = await updateEventTriggerBinding(req.tenantId, req.params.bindingId, req.body);
    if (!binding)
        throw new NotFoundError('EventTriggerBinding', req.params.bindingId);
    setNoCacheHeaders(res);
    res.ok(binding);
}));
router.patch('/ai-os/event-triggers/:bindingId/toggle', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsEventTriggersBindingIdTogglePatchBody }), asyncHandler(async (req, res) => {
    const ok = await toggleEventTriggerBinding(req.tenantId, req.params.bindingId, req.body.enabled);
    setNoCacheHeaders(res);
    res.ok({ toggled: ok });
}));
router.post('/ai-os/event-triggers/:bindingId/test-fire', authenticate, aiWriteLimiter, requirePermission('ai.agent.execute'), validate({ body: aiOsEventTriggersBindingIdTestFirePostBody }), asyncHandler(async (req, res) => {
    const result = await testFireBinding(req.tenantId, req.params.bindingId);
    setNoCacheHeaders(res);
    res.ok(result);
}));
router.delete('/ai-os/event-triggers/:bindingId', authenticate, aiDeleteLimiter, requirePermission('ai.agent.configure'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
    await deleteEventTriggerBinding(req.tenantId, req.params.bindingId);
    res.deleted('Event trigger binding deleted');
}));
// ── Route Rules ─────────────────────────────────────────────────────────────
router.get('/ai-os/route-rules', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const items = await listRouteRules(req.tenantId);
    setCacheHeaders(res, 30);
    res.ok({ items });
}));
router.post('/ai-os/route-rules', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsRouteRulesPostBody }), asyncHandler(async (req, res) => {
    const rule = await createRouteRule(req.tenantId, req.body);
    setNoCacheHeaders(res);
    res.created(rule);
}));
router.put('/ai-os/route-rules/:ruleId', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsRouteRulesRuleIdPutBody }), asyncHandler(async (req, res) => {
    const rule = await updateRouteRule(req.tenantId, req.params.ruleId, req.body);
    if (!rule)
        throw new NotFoundError('RouteRule', req.params.ruleId);
    setNoCacheHeaders(res);
    res.ok(rule);
}));
router.patch('/ai-os/route-rules/:ruleId/toggle', authenticate, aiWriteLimiter, requirePermission('ai.agent.configure'), validate({ body: aiOsRouteRulesRuleIdTogglePatchBody }), asyncHandler(async (req, res) => {
    const ok = await toggleRouteRule(req.tenantId, req.params.ruleId, req.body.enabled);
    setNoCacheHeaders(res);
    res.ok({ toggled: ok });
}));
router.delete('/ai-os/route-rules/:ruleId', authenticate, aiDeleteLimiter, requirePermission('ai.agent.configure'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
    await deleteRouteRule(req.tenantId, req.params.ruleId);
    res.deleted('Route rule deleted');
}));
export default router;
//# sourceMappingURL=policy.routes.js.map
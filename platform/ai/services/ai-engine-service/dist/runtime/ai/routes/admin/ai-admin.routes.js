import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { getModuleConfig, updateModuleConfig, reseedModule, getModuleHealth, reindexModule, backfillModule, getSlaConfig, getEscalationPolicy, getRunbookLinks, } from '../../controllers/ai-admin.controller.js';
import { getAiDiagnosticsSnapshot, getFailedRunAnalysis, getBlockedToolInvocations } from '../../diagnostics/ai-diagnostics.service.js';
import { getAiDashboard, getAiCostUsage } from '../../services/core/ai-dashboard.service.js';
import { validate, auditMiddleware, asyncHandler, rateLimiter, moduleStack, mutationEventHook } from '../../ports/middleware.port.js';
import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody } from '../../schemas/ai.schemas.js';
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.use(mutationEventHook('ai'));
router.use(authenticate);
router.use(auditMiddleware('ai-admin'));
router.use(rateLimiter({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req) => req.ip || 'unknown' }));
router.get('/config', requirePermission('ai.agent.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig));
router.put('/config', requirePermission('ai.agent.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig));
router.post('/reseed', requirePermission('admin.config.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule));
router.get('/health', requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth));
router.post('/reindex', requirePermission('admin.config.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule));
router.post('/backfill', requirePermission('admin.config.manage'), validate({ body: createBackfillBody }), asyncHandler(backfillModule));
router.get('/diagnostics', requirePermission('ai.agent.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const diagnostics = await getAiDiagnosticsSnapshot(tenantId);
    res.json({ success: true, data: diagnostics });
}));
router.get('/diagnostics/failed-runs', requirePermission('ai.agent.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 30);
    const items = await getFailedRunAnalysis(tenantId, limit);
    res.json({ success: true, data: items, total: items.length });
}));
router.get('/diagnostics/tool-usage', requirePermission('ai.agent.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const items = await getBlockedToolInvocations(tenantId);
    res.json({ success: true, data: items, total: items.length });
}));
router.get('/dashboard', requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const dashboard = await getAiDashboard(tenantId);
    res.json({ success: true, data: dashboard });
}));
router.get('/sla', requirePermission('ai.agent.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getSlaConfig));
router.get('/escalation-policy', requirePermission('ai.agent.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getEscalationPolicy));
router.get('/runbooks', requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getRunbookLinks));
router.get('/cost-usage', requirePermission('ai.agent.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const days = Math.min(365, parseInt(req.query.days, 10) || 30);
    const usage = await getAiCostUsage(tenantId, days);
    res.json({ success: true, data: usage });
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=ai-admin.routes.js.map
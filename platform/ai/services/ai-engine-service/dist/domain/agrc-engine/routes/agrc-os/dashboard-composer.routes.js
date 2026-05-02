// @ts-nocheck
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// AGRC-OS — Dashboard Composer Engine
import { Router } from 'express';
import { auditMiddleware, validate, asyncHandler } from '../../ports/middleware.port.js';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { errMsg } from '../../../../i18n/error-messages.js';
import { emitEvent } from '../../ports/events.port.js';
import { updateCustomBody } from '../../schemas/agrc-engine.schemas.js';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
const router = Router();
router.use(auditMiddleware('agrc-engine'));
router.get('/dashboards/catalog', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getDashboardCatalog, getDashboardStats } = await import('../../../dashboard/services/dashboard-composer.service.js');
    res.json({ dashboards: getDashboardCatalog(), stats: getDashboardStats() });
}));
router.get('/dashboards/layout/:code', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getDashboardLayout, loadCustomDashboard } = await import('../../../dashboard/services/dashboard-composer.service.js');
    const code = req.params.code;
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    // Check for tenant-level custom override first
    const custom = await loadCustomDashboard(tenantId, userId, code);
    if (custom) {
        res.json(custom);
        return;
    }
    const layout = getDashboardLayout(code);
    if (!layout) {
        res.status(404).json({ error: errMsg('NOT_FOUND', req) });
        return;
    }
    res.json(layout);
}));
router.get('/dashboards/hub/:hubRoute', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getHubDashboard } = await import('../../../dashboard/services/dashboard-composer.service.js');
    const layout = getHubDashboard(req.params.hubRoute);
    if (!layout) {
        res.status(404).json({ error: errMsg('NOT_FOUND', req) });
        return;
    }
    res.json(layout);
}));
router.get('/dashboards/role', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getRoleDashboard } = await import('../../../dashboard/services/dashboard-composer.service.js');
    const systemRole = req.user?.role || 'user';
    const layout = getRoleDashboard(systemRole);
    res.json(layout || { error: 'No dashboard for role' });
}));
router.get('/dashboards/stage/:stageId', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getStageDashboard } = await import('../../../dashboard/services/dashboard-composer.service.js');
    const layout = getStageDashboard(req.params.stageId);
    if (!layout) {
        res.status(404).json({ error: errMsg('NOT_FOUND', req) });
        return;
    }
    res.json(layout);
}));
router.get('/dashboards/category/:category', authenticate, requirePermission('platform.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { getDashboardsByCategory } = await import('../../../dashboard/services/dashboard-composer.service.js');
    res.json({ dashboards: getDashboardsByCategory(req.params.category) });
}));
router.put('/dashboards/custom/:code', authenticate, requirePermission('platform.agent.manage'), validate({ body: updateCustomBody }), asyncHandler(async (req, res) => {
    const { saveCustomDashboard } = await import('../../../dashboard/services/dashboard-composer.service.js');
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    await saveCustomDashboard(tenantId, userId, req.params.code, req.body);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'updated', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ saved: true, code: req.params.code });
}));
export default router;
//# sourceMappingURL=dashboard-composer.routes.js.map
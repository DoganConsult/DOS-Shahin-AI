"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
// ============================================
// Shahin GRC — Chart Data API Routes
// Widget data, batch queries, Monte Carlo, insights
// ============================================
const auth_port_1 = require("../ports/auth.port");
const dashboard_query_service_1 = require("../../dashboard/services/dashboard-query.service");
const monte_carlo_service_1 = require("../../risk/services/scoring/monte-carlo.service");
const widget_insights_service_1 = require("../../dashboard/services/widget-insights.service");
const chart_analytical_service_1 = require("../../reporting/services/chart/chart-analytical.service");
const chart_executive_service_1 = require("../../reporting/services/chart/chart-executive.service");
const chart_grc_core_service_1 = require("../../reporting/services/chart/chart-grc-core.service");
const dashboard_widgets_service_1 = require("../../dashboard/services/dashboard-widgets.service");
const events_port_1 = require("../ports/events.port");
const module_sdk_1 = require("@dos/module-sdk");
const database_port_1 = require("../ports/database.port");
async function getWidgetAccessForRole(tenantId, role) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const { rows } = await (0, database_port_1.safeQuery)(`SELECT dashboard_widgets FROM "${schema}".role_profiles WHERE role = $1 LIMIT 1`, [role]);
        const widgets = rows[0]?.dashboard_widgets;
        if (Array.isArray(widgets))
            return widgets;
        if (typeof widgets === 'string') {
            try {
                return JSON.parse(widgets);
            }
            catch {
                return [];
            }
        }
    }
    catch { /* table may not exist yet */ }
    return [];
}
async function canAccessWidget(tenantId, role, widgetId) {
    const allowed = await getWidgetAccessForRole(tenantId, role);
    if (allowed.length === 0)
        return false;
    return allowed.includes(widgetId);
}
// ── Zod Validation Schemas ──
const middleware_port_1 = require("../ports/middleware.port");
const resilience_1 = require("@dos/platform-core/resilience");
const analytics_schemas_1 = require("../schemas/analytics.schemas");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.auditMiddleware)('analytics'));
router.use((0, middleware_port_1.moduleStack)('analytics'));
// GET /api/dashboard/widgets — widget definitions for user's role
router.get('/widgets', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    try {
        const role = req.user?.role || 'viewer';
        const tenantId = req.tenantId;
        const widgetIds = await getWidgetAccessForRole(tenantId, role);
        res.json({
            success: true,
            data: { role, widgetIds },
            meta: { cached: false, generatedAt: new Date().toISOString() },
        });
    }
    catch (_err) {
        res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
    }
});
// GET /api/dashboard/widgets/:widgetId/data — widget data with tenant isolation + RBAC
router.get('/widgets/:widgetId/data', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const role = req.user?.role || 'viewer';
        const { widgetId } = req.params;
        if (!(await canAccessWidget(tenantId, role, widgetId))) {
            res.status(403).json({
                success: false,
                data: null,
                meta: { cached: false, generatedAt: new Date().toISOString(), error: 'WIDGET_ACCESS_DENIED' },
            });
            return;
        }
        const result = await (0, dashboard_query_service_1.queryWidgetData)(tenantId, widgetId, req.query);
        if (!result.success && result.data === null) {
            res.status(404).json({
                success: false,
                data: null,
                meta: { cached: false, generatedAt: new Date().toISOString(), error: 'WIDGET_NOT_FOUND' },
            });
            return;
        }
        res.json(result);
    }
    catch (_err) {
        res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
    }
});
// POST /api/dashboard/widgets/batch — batch widget data (max 20 IDs)
router.post('/widgets/batch', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), (0, middleware_port_1.validate)({ body: analytics_schemas_1.createWidgetsBatchBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const role = req.user?.role || 'viewer';
        const { widgetIds } = req.body;
        if (!Array.isArray(widgetIds)) {
            res.status(400).json({ success: false, data: null, meta: { error: 'widgetIds must be an array' } });
            return;
        }
        if (widgetIds.length > 20) {
            res.status(400).json({ success: false, data: null, meta: { error: 'Maximum 20 widget IDs per batch request' } });
            return;
        }
        // Filter to only accessible widgets
        const allowed = await getWidgetAccessForRole(tenantId, role);
        const allowedSet = new Set(allowed);
        const accessibleIds = widgetIds.filter((id) => allowedSet.has(id));
        const results = await (0, dashboard_query_service_1.queryBatchWidgetData)(tenantId, accessibleIds, req.query);
        (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'chart_data', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.chart_data.created' });
        res.json({
            success: true,
            data: results,
            meta: { cached: false, generatedAt: new Date().toISOString(), requested: widgetIds.length, returned: accessibleIds.length },
        });
    }
    catch (_err) {
        res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
    }
});
// GET /api/charts/monte-carlo/:riskId — Monte Carlo simulation
router.get('/monte-carlo/:riskId', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('risk.record.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { riskId } = req.params;
        const iterations = Math.min(parseInt(req.query.iterations) || 1000, 10000);
        const result = await (0, monte_carlo_service_1.runSimulation)(tenantId, riskId, iterations);
        res.json({
            success: true,
            data: result,
            meta: { cached: false, generatedAt: new Date().toISOString() },
        });
    }
    catch (err) {
        const status = (0, module_sdk_1.toErrorMessage)(err) === 'Risk not found' ? 404 : 500;
        res.status(status).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString(), error: (0, module_sdk_1.toErrorMessage)(err) } });
    }
});
// GET /api/charts/insights/:widgetId — AI insight strings
router.get('/insights/:widgetId', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { widgetId } = req.params;
        const insight = await (0, widget_insights_service_1.getChartInsight)(tenantId, widgetId);
        res.json({
            success: true,
            data: insight,
            meta: { cached: false, generatedAt: new Date().toISOString() },
        });
    }
    catch (_err) {
        res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
    }
});
// GET /api/charts/analytical — Pre-aggregated analytical dashboard data
router.get('/analytical', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const data = await (0, chart_analytical_service_1.getAnalyticalDashboard)(tenantId);
        res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
    }
    catch (_err) {
        res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
    }
});
// GET /api/charts/executive — Pre-aggregated executive dashboard data
router.get('/executive', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const data = await (0, chart_executive_service_1.getExecutiveDashboard)(tenantId);
        res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
    }
    catch (_err) {
        res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
    }
});
// GET /api/charts/grc-core — Pre-aggregated GRC core dashboard data
router.get('/grc-core', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const data = await (0, chart_grc_core_service_1.getGrcCoreDashboard)(tenantId);
        res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
    }
    catch (_err) {
        res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
    }
});
router.get('/module-widgets/incidents', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    const data = await (0, dashboard_widgets_service_1.getIncidentDashboardWidget)(req.tenantId);
    res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
});
router.get('/module-widgets/bcp', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    const data = await (0, dashboard_widgets_service_1.getBcpDashboardWidget)(req.tenantId);
    res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
});
router.get('/module-widgets/vendors', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    const data = await (0, dashboard_widgets_service_1.getVendorDashboardWidget)(req.tenantId);
    res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
});
router.get('/module-widgets/training', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.report.read'), async (req, res) => {
    const data = await (0, dashboard_widgets_service_1.getTrainingDashboardWidget)(req.tenantId);
    res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
});
router.get('/widgets/remediation', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('remediation.task.read'), async (req, res) => {
    try {
        res.json(await (0, dashboard_widgets_service_1.getRemediationDashboardWidget)(req.tenantId));
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/widgets/action', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('action.item.read'), async (req, res) => {
    try {
        res.json(await (0, dashboard_widgets_service_1.getActionDashboardWidget)(req.tenantId));
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/widgets/workflow', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('workflow.instance.read'), async (req, res) => {
    try {
        res.json(await (0, dashboard_widgets_service_1.getWorkflowDashboardWidget)(req.tenantId));
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/widgets/asset', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('asset.record.read'), async (req, res) => {
    try {
        res.json(await (0, dashboard_widgets_service_1.getAssetDashboardWidget)(req.tenantId));
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/widgets/integrations', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('integrations.connector.read'), async (req, res) => {
    try {
        res.json(await (0, dashboard_widgets_service_1.getIntegrationsDashboardWidget)(req.tenantId));
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/widgets/admin', (0, middleware_port_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), auth_port_1.authenticate, (0, auth_port_1.requirePermission)('admin.system.read'), async (req, res) => {
    try {
        res.json(await (0, dashboard_widgets_service_1.getAdminDashboardWidget)(req.tenantId));
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
exports.default = router;
//# sourceMappingURL=chart-data.routes.js.map
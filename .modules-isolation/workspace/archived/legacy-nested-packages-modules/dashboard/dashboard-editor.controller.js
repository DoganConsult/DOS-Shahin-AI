"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("./ports/auth.port");
const dashboard_editor_service_1 = require("./dashboard-editor.service");
const middleware_port_1 = require("./ports/middleware.port");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.auditMiddleware)('dashboard'));
const service = new dashboard_editor_service_1.DashboardEditorService();
router.get('/dashboard/:dashboardCode/widgets', auth_port_1.authenticate, async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(401).json({ message: 'Missing tenant context' });
        }
        const result = await service.listAvailableWidgets(String(tenantId));
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ message: (err instanceof Error ? err.message : null) ?? 'Failed to list widgets' });
    }
});
router.put('/dashboard/:dashboardCode/layout', auth_port_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ message: 'Missing auth context' });
        }
        const result = await service.saveLayout({
            userId: String(userId),
            tenantId: String(tenantId),
            dashboardCode: String(req.params.dashboardCode),
        }, req.body);
        (0, middleware_port_1.setAuditData)(res, { action: 'update_layout', entityType: 'dashboard_layout', entityId: req.params.dashboardCode });
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ message: (err instanceof Error ? err.message : null) ?? 'Failed to save layout' });
    }
});
router.delete('/dashboard/:dashboardCode/layout-override', auth_port_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ message: 'Missing auth context' });
        }
        const appliesToRole = typeof req.query.appliesToRole === 'string' ? req.query.appliesToRole : null;
        const result = await service.resetLayout({
            userId: String(userId),
            tenantId: String(tenantId),
            dashboardCode: String(req.params.dashboardCode),
        }, appliesToRole);
        (0, middleware_port_1.setAuditData)(res, { action: 'reset_layout', entityType: 'dashboard_layout', entityId: req.params.dashboardCode });
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ message: (err instanceof Error ? err.message : null) ?? 'Failed to reset layout' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard-editor.controller.js.map
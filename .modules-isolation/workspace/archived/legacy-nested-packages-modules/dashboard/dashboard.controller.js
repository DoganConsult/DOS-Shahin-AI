"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("./ports/auth.port");
const dashboard_service_1 = require("./dashboard.service");
const router = (0, express_1.Router)();
const service = new dashboard_service_1.DashboardService();
router.get('/dashboard/resolve', auth_port_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ message: 'Missing auth context' });
        }
        const result = await service.resolveDefault({
            userId: String(userId),
            tenantId: String(tenantId),
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({
            message: (err instanceof Error ? err.message : null) ?? 'Failed to resolve dashboard',
        });
    }
});
router.get('/dashboard/list', auth_port_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ message: 'Missing auth context' });
        }
        const result = await service.listAllowedDashboards({
            userId: String(userId),
            tenantId: String(tenantId),
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({
            message: (err instanceof Error ? err.message : null) ?? 'Failed to list dashboards',
        });
    }
});
router.get('/dashboard/:dashboardCode', auth_port_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ message: 'Missing auth context' });
        }
        const result = await service.getDashboard({
            userId: String(userId),
            tenantId: String(tenantId),
            dashboardCode: req.params.dashboardCode || 'default',
        });
        return res.json(result);
    }
    catch (err) {
        const msg = (err instanceof Error ? err.message : null) ?? 'Failed to load dashboard';
        return res.status(msg.includes('not found') ? 404 : msg.includes('allowed') ? 403 : 500).json({ message: msg });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.controller.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("./ports/auth.port");
const executive_widgets_service_1 = require("./executive-widgets.service");
const router = (0, express_1.Router)();
function resolveTenantId(req) {
    return (req.user?.tenantId ||
        req.query?.tenantId ||
        req.headers['x-tenant-id'] ||
        null);
}
router.get('/widgets/executive/summary', auth_port_1.authenticate, async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        if (!tenantId) {
            return res.status(400).json({ message: 'tenantId is required' });
        }
        const result = await new executive_widgets_service_1.ExecutiveWidgetsService().getSummary(tenantId);
        return res.json(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load executive summary widget';
        return res.status(400).json({ message });
    }
});
router.get('/widgets/executive/top-breached-kris', auth_port_1.authenticate, async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const limit = Number(req.query?.limit ?? 10);
        if (!tenantId) {
            return res.status(400).json({ message: 'tenantId is required' });
        }
        const result = await new executive_widgets_service_1.ExecutiveWidgetsService().getTopBreachedKris(tenantId, limit);
        return res.json(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load top breached KRIs widget';
        return res.status(400).json({ message });
    }
});
router.get('/widgets/executive/policy-review-debt', auth_port_1.authenticate, async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const limit = Number(req.query?.limit ?? 10);
        if (!tenantId) {
            return res.status(400).json({ message: 'tenantId is required' });
        }
        const result = await new executive_widgets_service_1.ExecutiveWidgetsService().getPolicyReviewDebt(tenantId, limit);
        return res.json(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load policy review debt widget';
        return res.status(400).json({ message });
    }
});
router.get('/widgets/executive/engine-trend', auth_port_1.authenticate, async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const limit = Number(req.query?.limit ?? 12);
        if (!tenantId) {
            return res.status(400).json({ message: 'tenantId is required' });
        }
        const result = await new executive_widgets_service_1.ExecutiveWidgetsService().getEngineTrend(tenantId, limit);
        return res.json(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load engine trend widget';
        return res.status(400).json({ message });
    }
});
exports.default = router;
//# sourceMappingURL=executive-widgets.controller.js.map
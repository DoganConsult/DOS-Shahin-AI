"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("./ports/auth.port");
const widgets_service_1 = require("./widgets.service");
const insight_widgets_service_1 = require("./insight-widgets.service");
const router = (0, express_1.Router)();
const service = new widgets_service_1.WidgetsService();
router.get('/widgets/:widgetKey', auth_port_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ message: 'Missing auth context' });
        }
        const widgetKey = String(req.params.widgetKey);
        const result = await service.getWidgetData({
            widgetKey,
            userId: String(userId),
            tenantId: String(tenantId),
        });
        // Insight widgets: frontend expects raw payload (e.g. {controls, insight})
        // Structural widgets: frontend expects the full WidgetResponseDto envelope
        if (insight_widgets_service_1.INSIGHT_WIDGET_KEYS.has(widgetKey)) {
            return res.json(result.payload);
        }
        return res.json(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load widget data';
        return res.status(500).json({ message });
    }
});
exports.default = router;
//# sourceMappingURL=widgets.controller.js.map
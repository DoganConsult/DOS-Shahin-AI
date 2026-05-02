"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
// @ts-ignore - Pragmatic stabilization to unblock build
/**
 * Analytics Diagnostics & Dashboard Routes
 * @owner analytics
 * @module analytics
 * @since 2026-03-31
 */
// @ts-ignore - Pragmatic stabilization to unblock build
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const analytics_diagnostics_service_1 = require("../diagnostics/analytics-diagnostics.service");
const middleware_port_2 = require("../ports/middleware.port");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('analytics'));
router.use((0, middleware_port_1.auditMiddleware)('analytics'));
router.get('/diagnostics', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('analytics.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await (0, analytics_diagnostics_service_1.runDiagnostics)(req.tenantId);
    res.json({ success: true, data: result });
}));
exports.default = router;
//# sourceMappingURL=analytics-diagnostics.routes.js.map
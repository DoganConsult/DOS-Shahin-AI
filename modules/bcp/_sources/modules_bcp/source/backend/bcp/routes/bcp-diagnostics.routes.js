"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// @ts-ignore - Pragmatic stabilization to unblock build
/**
 * Bcp Diagnostics Routes
 * @owner bcp
 * @module bcp
 * @since 2026-03-31
 */
// @ts-ignore - Pragmatic stabilization to unblock build
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const bcp_diagnostics_service_1 = require("../diagnostics/bcp-diagnostics.service");
const middleware_port_2 = require("../ports/middleware.port");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('bcp'));
router.use((0, middleware_port_1.auditMiddleware)('bcp'));
const diagnostics = new bcp_diagnostics_service_1.BcpDiagnosticsService();
router.get('/diagnostics', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('bcp.record.read'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const result = await diagnostics.runDiagnostics(req.tenantId);
    res.json({ success: true, data: result });
}));
exports.default = router;
//# sourceMappingURL=bcp-diagnostics.routes.js.map
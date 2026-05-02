"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("../../ports/auth.port");
const middleware_port_1 = require("../../ports/middleware.port");
const database_port_1 = require("../../ports/database.port");
const foundation_diagnostics_service_1 = require("../diagnostics/foundation-diagnostics.service");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('foundation'));
router.use((0, middleware_port_1.auditMiddleware)('foundation'));
router.get('/settings', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.manage'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`, ['foundation']).catch(() => ({ rows: [] }));
    res.json({ success: true, data: rows });
}));
router.get('/health', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.manage'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const diagnostics = await (0, foundation_diagnostics_service_1.getFoundationDiagnostics)(req.tenantId);
    res.json({ success: true, data: diagnostics });
}));
exports.default = router;
//# sourceMappingURL=foundation-admin.routes.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("../ports/auth.port");
const middleware_port_1 = require("../ports/middleware.port");
const database_port_1 = require("../ports/database.port");
const middleware_port_2 = require("../ports/middleware.port");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('bcp'));
router.use((0, middleware_port_1.auditMiddleware)('bcp'));
router.get('/settings', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('bcp.manage'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    // Return module-specific settings
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`, ['bcp']).catch(() => ({ rows: [] }));
    res.json({ success: true, data: rows });
}));
router.get('/health', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('bcp.manage'), (0, middleware_port_2.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    // Check table existence for owned tables
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1 LIMIT 50`, [schema]).catch(() => ({ rows: [] }));
    res.json({ success: true, tableCount: rows.length });
}));
exports.default = router;
//# sourceMappingURL=bcp-admin.routes.js.map
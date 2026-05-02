"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profilesRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const database_port_1 = require("../../ports/database.port");
// FE calls /api/profiles/roles — this is the canonical role catalogue
// (dos.functional_roles). Distinct from /api/roles which is the
// assignment-oriented surface (list/assign/revoke per user).
exports.profilesRouter = (0, express_1.Router)();
exports.profilesRouter.use(auth_adapter_1.authenticate);
exports.profilesRouter.use(auth_adapter_1.requireTenantId);
exports.profilesRouter.use((0, middleware_port_1.auditMiddleware)('profile'));
exports.profilesRouter.get('/roles', (0, auth_adapter_1.requirePermission)('role.read'), (0, middleware_port_1.asyncHandler)(async (_req, res) => {
    const result = await (0, database_port_1.query)(`SELECT fr.role_id, fr.role_code, fr.display_name, fr.description,
              fr.permissions, fr.created_at
         FROM dos.functional_roles fr
        ORDER BY fr.role_code`);
    res.json({ profiles: result.rows, roles: result.rows });
}));
//# sourceMappingURL=profiles.routes.js.map
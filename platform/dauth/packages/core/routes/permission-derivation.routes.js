"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_1 = require("@dos/platform-core/http");
const __1 = require("..");
const db_1 = require("@dos/db");
const router = (0, express_1.Router)();
router.get('/tree', __1.authenticate, (0, __1.requirePermission)('admin.system.read'), (0, http_1.asyncHandler)(async (req, res) => {
    const schema = (0, db_1.tenantSchema)(req.tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT fr.name as role, p.code as permission FROM "${schema}".role_permissions rp JOIN "${schema}".functional_roles fr ON rp.functional_role_id = fr.id JOIN "${schema}".permissions p ON rp.permission_id = p.id ORDER BY fr.name, p.code`);
    const tree = {};
    for (const row of result.rows) {
        (tree[row.role] ??= []).push(row.permission);
    }
    res.json(tree);
}));
exports.default = router;
//# sourceMappingURL=permission-derivation.routes.js.map
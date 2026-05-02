"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const session_middleware_1 = require("../middleware/session.middleware");
const access_resolver_1 = require("../access/access.resolver");
const http_1 = require("@dos/platform-core/http");
const http_2 = require("@dos/platform-core/http");
const http_3 = require("@dos/platform-core/http");
const db_1 = require("@dos/db");
const http_4 = require("@dos/platform-core/http");
const router = (0, express_1.Router)();
router.use(session_middleware_1.authenticate);
router.use((0, http_1.auditMiddleware)('dauth.role_matrix'));
router.use((0, http_2.automationMiddleware)('dauth.role_matrix'));
const matrixQuery = zod_1.z.object({
    moduleCode: zod_1.z.string().optional(),
    roles: zod_1.z.string().optional(),
});
router.get('/', (0, access_resolver_1.requirePermission)('dauth.role.read'), (0, http_3.validate)({ query: matrixQuery }), (0, http_4.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { moduleCode, roles: rolesParam } = req.query;
    let where = '';
    const conditions = [];
    const params = [];
    let idx = 1;
    if (moduleCode) {
        conditions.push(`b.module_code = $${idx++}`);
        params.push(moduleCode);
    }
    if (rolesParam) {
        const roleCodes = rolesParam.split(',').map((s) => s.trim()).filter(Boolean);
        if (roleCodes.length > 0) {
            conditions.push(`b.role_code = ANY($${idx++})`);
            params.push(roleCodes);
        }
    }
    if (conditions.length > 0) {
        where = `WHERE ${conditions.join(' AND ')}`;
    }
    const { rows } = await (0, db_1.safeQuery)(`SELECT fr.code AS role_code, fr.name AS role_name, fr.module_code,
            array_agg(DISTINCT b.permission_code) FILTER (WHERE b.permission_code IS NOT NULL AND b.is_active = true) AS permissions,
            COUNT(DISTINCT b.permission_code) FILTER (WHERE b.permission_code IS NOT NULL AND b.is_active = true)::int AS permission_count
     FROM "${schema}".functional_roles fr
     LEFT JOIN "${schema}".module_role_permission_bindings b ON b.role_code = fr.code AND b.is_active = true
     ${where}
     GROUP BY fr.code, fr.name, fr.module_code
     ORDER BY fr.name`, params);
    const matrix = {};
    for (const row of rows) {
        matrix[row.role_code] = {
            roleName: row.role_name,
            moduleCode: row.module_code,
            permissions: row.permissions ?? [],
            count: row.permission_count,
        };
    }
    res.json({ success: true, data: matrix, roleCount: rows.length });
}));
router.get('/compare', (0, access_resolver_1.requirePermission)('dauth.role.read'), (0, http_4.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const schema = (0, db_1.tenantSchema)(tenantId);
    const roleCodeQ = zod_1.z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/);
    const raParsed = roleCodeQ.safeParse(req.query.roleA);
    const rbParsed = roleCodeQ.safeParse(req.query.roleB);
    if (!raParsed.success || !rbParsed.success) {
        res.status(400).json({ error: 'roleA and roleB query params required', code: 'INVALID_PARAM' });
        return;
    }
    const roleA = raParsed.data;
    const roleB = rbParsed.data;
    const [permsA, permsB] = await Promise.all([
        (0, db_1.safeQuery)(`SELECT permission_code FROM "${schema}".module_role_permission_bindings WHERE role_code = $1 AND is_active = true`, [roleA]),
        (0, db_1.safeQuery)(`SELECT permission_code FROM "${schema}".module_role_permission_bindings WHERE role_code = $1 AND is_active = true`, [roleB]),
    ]);
    const setA = new Set(permsA.rows.map((r) => r.permission_code));
    const setB = new Set(permsB.rows.map((r) => r.permission_code));
    const shared = [...setA].filter(p => setB.has(p));
    const onlyA = [...setA].filter(p => !setB.has(p));
    const onlyB = [...setB].filter(p => !setA.has(p));
    res.json({ success: true, data: { roleA, roleB, shared, onlyA, onlyB, overlapPercent: shared.length / Math.max(setA.size, setB.size, 1) * 100 } });
}));
exports.default = router;
//# sourceMappingURL=role-matrix.routes.js.map
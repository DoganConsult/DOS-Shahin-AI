"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const session_middleware_1 = require("../middleware/session.middleware");
const access_resolver_1 = require("../access/access.resolver");
const http_1 = require("@dos/platform-core/http");
const http_2 = require("@dos/platform-core/http");
const http_3 = require("@dos/platform-core/http");
const events_1 = require("@dos/platform-core/events");
const resilience_1 = require("@dos/platform-core/resilience");
const errors_1 = require("@dos/types/errors");
const db_1 = require("@dos/db");
const http_4 = require("@dos/platform-core/http");
const rbac_schemas_1 = require("../schemas/rbac.schemas");
const codeParam = zod_1.z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/);
const router = (0, express_1.Router)();
router.use(session_middleware_1.authenticate);
router.use((0, http_1.auditMiddleware)('dauth.rbac'));
router.use((0, http_2.automationMiddleware)('dauth.rbac'));
const assignPermissionBody = rbac_schemas_1.assignPermissionBody.pick({ roleCode: true, permissionCode: true }).extend({
    moduleCode: zod_1.z.string().min(1).max(50).regex(/^[a-z][a-z0-9-]*$/, 'module_code must be lowercase kebab-case'),
});
const bulkAssignBody = zod_1.z.object({
    assignments: zod_1.z.array(assignPermissionBody).min(1).max(100),
});
const paginationQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    roleCode: zod_1.z.string().optional(),
    moduleCode: zod_1.z.string().optional(),
});
router.get('/', (0, access_resolver_1.requirePermission)('dauth.rbac.read'), (0, http_3.validate)({ query: paginationQuery }), (0, http_4.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const schema = (0, db_1.tenantSchema)(tenantId);
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE b.is_active = true';
    const params = [];
    let paramIdx = 1;
    if (req.query.roleCode) {
        whereClause += ` AND b.role_code = $${paramIdx++}`;
        params.push(req.query.roleCode);
    }
    if (req.query.moduleCode) {
        whereClause += ` AND b.module_code = $${paramIdx++}`;
        params.push(req.query.moduleCode);
    }
    const [countResult, dataResult] = await Promise.all([
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int as total FROM "${schema}".module_role_permission_bindings b ${whereClause}`, params),
        (0, db_1.safeQuery)(`SELECT b.id, b.module_code, b.role_code, b.permission_code, b.is_active, b.created_at
       FROM "${schema}".module_role_permission_bindings b
       ${whereClause}
       ORDER BY b.role_code, b.permission_code
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`, [...params, limit, offset]),
    ]);
    const total = Number(countResult.rows[0]?.total ?? 0);
    (0, http_4.paginated)(res, dataResult.rows, total, page, limit);
}));
router.get('/:moduleCode/:roleCode/:permissionCode', (0, access_resolver_1.requirePermission)('dauth.rbac.read'), (0, http_4.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const schema = (0, db_1.tenantSchema)(tenantId);
    const mc = codeParam.safeParse(req.params.moduleCode);
    const rc = codeParam.safeParse(req.params.roleCode);
    const pc = codeParam.safeParse(req.params.permissionCode);
    if (!mc.success || !rc.success || !pc.success) {
        res.status(400).json({ error: 'Invalid path parameters', code: 'INVALID_PARAM' });
        return;
    }
    const { rows } = await (0, db_1.safeQuery)(`SELECT b.*, fr.name AS role_name
     FROM "${schema}".module_role_permission_bindings b
     LEFT JOIN "${schema}".functional_roles fr ON fr.code = b.role_code
     WHERE b.module_code = $1 AND b.role_code = $2 AND b.permission_code = $3 AND b.is_active = true`, [mc.data, rc.data, pc.data]);
    if (rows.length === 0) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
    }
    res.json((0, http_4.ok)(rows[0], req));
}));
router.post('/', (0, access_resolver_1.requirePermission)('dauth.rbac.manage'), (0, http_3.validate)({ body: assignPermissionBody }), (0, http_4.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { roleCode, permissionCode, moduleCode } = req.body;
    const roleCheck = await (0, db_1.safeQuery)(`SELECT code FROM "${schema}".functional_roles WHERE code = $1`, [roleCode]);
    if (roleCheck.rows.length === 0) {
        res.status(404).json({ error: `Role '${roleCode}' not found` });
        return;
    }
    const sodCheck = await (0, db_1.safeQuery)(`SELECT sr.id, sr.description, sr.role_code_a, sr.role_code_b, sr.conflict_level
     FROM "${schema}".sod_rules sr
     WHERE sr.is_active = true AND (
       (sr.role_code_a = $1) OR (sr.role_code_b = $1)
     )`, [roleCode]);
    if (sodCheck.rows.length > 0) {
        const conflicts = sodCheck.rows.filter((r) => r.conflict_level === 'block');
        if (conflicts.length > 0) {
            res.status(409).json({
                error: 'SoD conflict detected',
                conflicts: conflicts.map((r) => ({ ruleId: r.id, description: r.description, roleA: r.role_code_a, roleB: r.role_code_b })),
            });
            return;
        }
    }
    const beforeState = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".module_role_permission_bindings WHERE role_code = $1 AND permission_code = $2 AND module_code = $3`, [roleCode, permissionCode, moduleCode]);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".module_role_permission_bindings (module_code, role_code, permission_code, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (module_code, role_code, permission_code) DO UPDATE SET is_active = true
     RETURNING *`, [moduleCode, roleCode, permissionCode]);
    (0, http_1.setAuditData)(res, {
        action: 'assign_permission',
        entityType: 'role_permission_binding',
        entityId: `${moduleCode}:${roleCode}:${permissionCode}`,
        beforeState: beforeState.rows[0] ?? null,
        afterState: rows[0],
    });
    (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_1.emitEvent)({
        tenantId, userId, module: 'dauth', event: 'assigned',
        entityType: 'role_permission_binding', entityId: `${moduleCode}:${roleCode}:${permissionCode}`,
    }), { tenantId, operation: 'grcEvent:dauth.role_permission.assigned' });
    res.status(201).json((0, http_4.ok)(rows[0], req));
}));
router.post('/bulk', (0, access_resolver_1.requirePermission)('dauth.rbac.manage'), (0, http_3.validate)({ body: bulkAssignBody }), (0, http_4.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { assignments } = req.body;
    const results = [];
    const errors = [];
    for (const a of assignments) {
        try {
            const sodCheck = await (0, db_1.safeQuery)(`SELECT sr.id, sr.conflict_level FROM "${schema}".sod_rules sr
         WHERE sr.is_active = true AND sr.conflict_level = 'block'
           AND (sr.role_code_a = $1 OR sr.role_code_b = $1)`, [a.roleCode]);
            if (sodCheck.rows.length > 0) {
                errors.push(`${a.roleCode}:${a.permissionCode} — SoD conflict (block)`);
                continue;
            }
            const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".module_role_permission_bindings (module_code, role_code, permission_code, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (module_code, role_code, permission_code) DO UPDATE SET is_active = true
         RETURNING *`, [a.moduleCode, a.roleCode, a.permissionCode]);
            results.push(rows[0]);
        }
        catch (err) {
            errors.push(`${a.roleCode}:${a.permissionCode} — ${(0, errors_1.toErrorMessage)(err)}`);
        }
    }
    (0, http_1.setAuditData)(res, { action: 'bulk_assign', entityType: 'role_permission_binding', afterState: { count: results.length, errors: errors.length } });
    (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_1.emitEvent)({
        tenantId, userId, module: 'dauth', event: 'bulk_assigned',
        entityType: 'role_permission_binding', entityId: 'bulk',
        data: { assigned: results.length, failed: errors.length },
    }), { tenantId, operation: 'grcEvent:dauth.role_permission.bulk_assigned' });
    (0, http_4.ok)(res, { assigned: results.length, errors });
}));
router.delete('/:moduleCode/:roleCode/:permissionCode', (0, access_resolver_1.requirePermission)('dauth.rbac.manage'), (0, http_4.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    const schema = (0, db_1.tenantSchema)(tenantId);
    const mc = codeParam.safeParse(req.params.moduleCode);
    const rc = codeParam.safeParse(req.params.roleCode);
    const pc = codeParam.safeParse(req.params.permissionCode);
    if (!mc.success || !rc.success || !pc.success) {
        res.status(400).json({ error: 'Invalid path parameters', code: 'INVALID_PARAM' });
        return;
    }
    const moduleCode = mc.data, roleCode = rc.data, permissionCode = pc.data;
    const before = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".module_role_permission_bindings WHERE module_code = $1 AND role_code = $2 AND permission_code = $3 AND is_active = true`, [moduleCode, roleCode, permissionCode]);
    if (before.rows.length === 0) {
        res.status(404).json({ error: 'Assignment not found or already revoked' });
        return;
    }
    await (0, db_1.safeQuery)(`UPDATE "${schema}".module_role_permission_bindings SET is_active = false
     WHERE module_code = $1 AND role_code = $2 AND permission_code = $3`, [moduleCode, roleCode, permissionCode]);
    (0, http_1.setAuditData)(res, {
        action: 'revoke_permission',
        entityType: 'role_permission_binding',
        entityId: `${moduleCode}:${roleCode}:${permissionCode}`,
        beforeState: before.rows[0],
        afterState: { is_active: false },
    });
    (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_1.emitEvent)({
        tenantId, userId, module: 'dauth', event: 'revoked',
        entityType: 'role_permission_binding', entityId: `${moduleCode}:${roleCode}:${permissionCode}`,
    }), { tenantId, operation: 'grcEvent:dauth.role_permission.revoked' });
    (0, http_4.action)(res, 'Permission revoked');
}));
exports.default = router;
//# sourceMappingURL=dynamic-rbac.routes.js.map
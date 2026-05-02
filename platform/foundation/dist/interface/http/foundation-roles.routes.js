"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resilience_port_1 = require("../../ports/resilience.port");
const auth_port_1 = require("../../ports/auth.port");
const middleware_port_1 = require("../../ports/middleware.port");
const database_port_1 = require("../../ports/database.port");
const foundation_schemas_1 = require("../../schemas/foundation.schemas");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('foundation'));
router.use((0, middleware_port_1.auditMiddleware)('foundation'));
router.use(middleware_port_1.scopeContext);
router.get('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT p.*, 
              COALESCE(array_agg(DISTINCT pp.permission_code) FILTER (WHERE pp.permission_code IS NOT NULL), '{}') AS permissions,
              COUNT(DISTINCT up.user_id)::int AS user_count
       FROM "${schema}".access_profiles p
       LEFT JOIN "${schema}".profile_permissions pp ON pp.profile_id = p.id
       LEFT JOIN "${schema}".user_profiles up ON up.profile_id = p.id
       WHERE p.deleted_at IS NULL
       GROUP BY p.id
       ORDER BY p.name_en ASC`).catch(() => ({ rows: [] }));
    res.json({ success: true, profiles: rows, total: rows.length });
}));
router.get('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT p.*,
              COALESCE(array_agg(DISTINCT pp.permission_code) FILTER (WHERE pp.permission_code IS NOT NULL), '{}') AS permissions
       FROM "${schema}".access_profiles p
       LEFT JOIN "${schema}".profile_permissions pp ON pp.profile_id = p.id
       WHERE p.id = $1 AND p.deleted_at IS NULL
       GROUP BY p.id`, [req.params.id]).catch(() => ({ rows: [] }));
    if (!rows[0]) {
        res.status(404).json({ success: false, error: 'Role not found' });
        return;
    }
    res.json({ success: true, data: rows[0] });
}));
router.post('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.system.manage'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.createFoundationBody }), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const userId = req.user.userId;
    const { nameEn, nameAr, code, description, permissions } = req.body;
    const { rows } = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".access_profiles 
       (name_en, name_ar, code, description_en, is_system, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, false, $5, NOW(), NOW()) RETURNING *`, [nameEn, nameAr || null, code, description || null, userId]);
    const profile = rows[0];
    if (profile && Array.isArray(permissions)) {
        for (const perm of permissions) {
            await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".profile_permissions (profile_id, permission_code, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`, [profile.id, perm]).catch((0, resilience_port_1.catchHandler)(resilience_port_1.EC.EVENT_BUS));
        }
    }
    res.status(201).json({ success: true, data: profile });
}));
exports.default = router;
//# sourceMappingURL=foundation-roles.routes.js.map
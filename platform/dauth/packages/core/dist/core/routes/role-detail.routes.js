"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const session_middleware_1 = require("../middleware/session.middleware");
const access_resolver_1 = require("../access/access.resolver");
const http_1 = require("@dos/platform-core/http");
const http_2 = require("@dos/platform-core/http");
const db_1 = require("@dos/db");
const http_3 = require("@dos/platform-core/http");
const observability_1 = require("@dos/platform-core/observability");
const zod_1 = require("zod");
const roleCodeParam = zod_1.z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.:-]+$/, 'Invalid role code format');
const router = (0, express_1.Router)();
router.use(session_middleware_1.authenticate);
router.use((0, http_1.auditMiddleware)('dauth.role_detail'));
router.use((0, http_2.automationMiddleware)('dauth.role_detail'));
router.get('/:roleCode', (0, access_resolver_1.requirePermission)('dauth.role.read'), (0, http_3.asyncHandler)(async (req, res) => {
    const parsed = roleCodeParam.safeParse(req.params.roleCode);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid role code', code: 'INVALID_PARAM' });
        return;
    }
    const tenantId = req.tenantId;
    const schema = (0, db_1.tenantSchema)(tenantId);
    const roleCode = parsed.data;
    const { rows: roleRows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".functional_roles WHERE code = $1`, [roleCode]);
    if (roleRows.length === 0) {
        res.status(404).json({ error: 'Role not found' });
        return;
    }
    const [permsRes, assigneesRes, delegationsRes, auditRes] = await Promise.all([
        (0, db_1.safeQuery)(`SELECT b.permission_code, b.module_code, b.is_active, b.created_at
       FROM "${schema}".module_role_permission_bindings b
       WHERE b.role_code = $1 AND b.is_active = true
       ORDER BY b.permission_code`, [roleCode]),
        (0, db_1.safeQuery)(`SELECT a.user_id, a.created_at AS assigned_at, a.scope_type, a.scope_id, a.is_primary,
              u.email, u.full_name, u.job_title
       FROM "${schema}".enterprise_user_role_assignments a
       LEFT JOIN public.users u ON u.user_id = a.user_id
       WHERE a.functional_role_code = $1 AND a.is_active = true
       ORDER BY a.created_at DESC LIMIT 50`, [roleCode]),
        (0, db_1.safeQuery)(`SELECT dc.id, dc.delegator_user_id, dc.delegate_user_id, dc.valid_from, dc.valid_to, dc.delegation_type, dc.is_active
       FROM "${schema}".delegation_chains dc
       WHERE dc.scope_codes @> ARRAY[$1]::text[] AND dc.is_active = true
       ORDER BY dc.valid_from DESC LIMIT 20`, [roleCode]).catch((err) => { observability_1.logger.warn(`[RoleDetail] delegation_chains query failed for role ${roleCode}: ${err instanceof Error ? err.message : String(err)}`); return { rows: [] }; }),
        (0, db_1.safeQuery)(`SELECT at.action, at."timestamp", at.user_id, at.details
       FROM "${schema}".audit_trail at
       WHERE at.entity_type = 'functional_role' AND at.entity_id = $1
       ORDER BY at."timestamp" DESC LIMIT 20`, [roleCode]).catch((err) => { observability_1.logger.warn(`[RoleDetail] audit_trail query failed for role ${roleCode}: ${err instanceof Error ? err.message : String(err)}`); return { rows: [] }; }),
    ]);
    res.json((0, http_3.ok)({
        ...roleRows[0],
        permissions: permsRes.rows,
        assignees: assigneesRes.rows,
        delegations: delegationsRes.rows,
        recentAudit: auditRes.rows,
    }, req));
}));
exports.default = router;
//# sourceMappingURL=role-detail.routes.js.map
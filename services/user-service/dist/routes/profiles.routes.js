"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profilesRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../adapters/auth.adapter");
const http_1 = require("@dos/platform-core/http");
const db_1 = require("@dos/db");
// FE calls /api/profiles/roles — this is the canonical role catalogue
// (dos.functional_roles). Distinct from /api/roles which is the
// assignment-oriented surface (list/assign/revoke per user).
exports.profilesRouter = (0, express_1.Router)();
exports.profilesRouter.use(auth_adapter_1.authenticate);
exports.profilesRouter.use(auth_adapter_1.requireTenantId);
exports.profilesRouter.use((0, http_1.auditMiddleware)('profile'));
// W2.F2.1 — canonical role catalogue (reconciled).
// Source of truth precedence:
//   1) platform_dauth.functional_roles  (authoritative, carries permissions[])
//   2) dos.functional_roles             (legacy tenant-scoped; merged in if a
//                                        role_code exists there but not in
//                                        platform_dauth)
// Active-user counts are pulled from platform_dauth.user_role_assignments
// scoped to the caller's tenant.
exports.profilesRouter.get('/roles', (0, auth_adapter_1.requirePermission)('role.read'), (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const result = await (0, db_1.query)(`WITH plat AS (
         SELECT pr.role_code,
                COALESCE(pr.display_name_en, pr.display_name)        AS display_name,
                pr.display_name_en, pr.display_name_ar,
                pr.description, pr.description_en, pr.description_ar,
                pr.permissions,
                'platform_dauth'::text                                AS source,
                pr.created_at
           FROM platform_dauth.functional_roles pr
       ),
       legacy AS (
         SELECT fr.role_code,
                fr.display_name,
                NULL::text AS display_name_en, NULL::text AS display_name_ar,
                fr.description,
                NULL::text AS description_en, NULL::text AS description_ar,
                fr.permissions,
                'dos'::text AS source,
                fr.created_at
           FROM dos.functional_roles fr
          WHERE NOT EXISTS (SELECT 1 FROM plat WHERE plat.role_code = fr.role_code)
       ),
       merged AS (
         SELECT * FROM plat
         UNION ALL
         SELECT * FROM legacy
       ),
       counts AS (
         SELECT role_code, COUNT(*)::int AS active_users
           FROM platform_dauth.user_role_assignments
          WHERE tenant_id = $1 AND is_active = TRUE
          GROUP BY role_code
       )
       SELECT m.role_code,
              m.display_name, m.display_name_en, m.display_name_ar,
              m.description,  m.description_en,  m.description_ar,
              m.permissions, m.source, m.created_at,
              COALESCE(c.active_users, 0)::int AS active_users
         FROM merged m
    LEFT JOIN counts c ON c.role_code = m.role_code
        ORDER BY m.role_code`, [tenantId]);
    res.json({ profiles: result.rows, roles: result.rows, data: result.rows });
}));
//# sourceMappingURL=profiles.routes.js.map
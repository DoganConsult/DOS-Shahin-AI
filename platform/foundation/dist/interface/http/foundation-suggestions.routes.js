"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foundationSuggestionsRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const database_port_1 = require("../../ports/database.port");
// W6.F6.6 — Foundation overview suggestions. Real data-driven suggestions
// computed from the tenant's own foundation state — never fake AI scores.
exports.foundationSuggestionsRouter = (0, express_1.Router)();
exports.foundationSuggestionsRouter.use(auth_adapter_1.authenticate);
exports.foundationSuggestionsRouter.use(auth_adapter_1.requireTenantId);
exports.foundationSuggestionsRouter.get('/suggestions', (0, auth_adapter_1.requirePermission)('foundation.read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const suggestions = [];
    // Orphaned departments (no parent BU)
    try {
        const r = await (0, database_port_1.query)(`SELECT COUNT(*)::int AS n FROM "${schema}".departments WHERE deleted_at IS NULL AND business_unit_id IS NULL`);
        const n = r.rows[0]?.n ?? 0;
        if (n > 0)
            suggestions.push({
                code: 'orphaned_departments', severity: 'medium',
                titleEn: `${n} department(s) have no business unit`,
                titleAr: `${n} قسم بدون وحدة عمل`,
                route: '/foundation/departments', count: n,
            });
    }
    catch { /* schema may not have departments yet */ }
    // Vacant positions (no holder)
    try {
        const r = await (0, database_port_1.query)(`SELECT COUNT(*)::int AS n FROM dos.positions p
          WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM dos.position_assignments a WHERE a.position_id = p.position_id AND a.deleted_at IS NULL)`, [tenantId]);
        const n = r.rows[0]?.n ?? 0;
        if (n > 0)
            suggestions.push({
                code: 'vacant_positions', severity: 'low',
                titleEn: `${n} vacant position(s)`,
                titleAr: `${n} منصب شاغر`,
                route: '/foundation/positions', count: n,
            });
    }
    catch { /* */ }
    // Users without role assignment
    try {
        const r = await (0, database_port_1.query)(`SELECT COUNT(*)::int AS n FROM "${schema}".users u
          WHERE u.deleted_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM platform_dauth.user_role_assignments a WHERE a.user_id = u.user_id AND a.tenant_id = $1)`, [tenantId]);
        const n = r.rows[0]?.n ?? 0;
        if (n > 0)
            suggestions.push({
                code: 'users_without_role', severity: 'high',
                titleEn: `${n} user(s) without any role`,
                titleAr: `${n} مستخدم بدون أي دور`,
                route: '/foundation/users', count: n,
            });
    }
    catch { /* */ }
    res.json({ tenantId, generatedAt: new Date().toISOString(), suggestions });
}));
exports.default = exports.foundationSuggestionsRouter;
//# sourceMappingURL=foundation-suggestions.routes.js.map
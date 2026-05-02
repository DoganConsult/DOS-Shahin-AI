// Wave W4 — Platform-admin discovery endpoints (read-only).
//
// Surfaces:
//   GET /api/ui-os/platform-admin/services    — dos.ui_service_registry
//   GET /api/ui-os/platform-admin/modules     — dos.dynamic_ui_modules WHERE product_key='platform'
//   GET /api/ui-os/platform-admin/navigation  — dos.dynamic_ui_navigation WHERE tenant_id IS NULL
//                                                AND module_code in DNA set
//   GET /api/ui-os/platform-admin/module-roles — dos.platform_admin_module_roles
//
// All endpoints are READ-ONLY. Mutating endpoints will be added in W6
// behind the existing OpenFGA `ui_admin` gate.
import { Router } from 'express';
const DNA_MODULES = [
    'dauth', 'config-center', 'tenant-management', 'multi-tenant-mgmt',
    'foundation-admin', 'dos-platform', 'dnoc', 'dsoc', 'ai-platform',
];
export function createPlatformAdminRouter(pool) {
    const router = Router();
    router.get('/platform-admin/services', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT s.service_code, s.display_name, s.module_code, s.port,
                s.gateway_prefix, s.cwd, s.wave, s.registry_status,
                s.health_path, s.manifest_path, s.admin_route, s.notes,
                COALESCE(
                  (SELECT json_agg(p.prefix ORDER BY p.is_primary DESC, p.prefix)
                     FROM dos.ui_service_registry_prefixes p
                    WHERE p.service_code = s.service_code),
                  '[]'::json
                ) AS prefixes
           FROM dos.ui_service_registry s
          ORDER BY s.port`);
            res.json({ services: rows, count: rows.length });
        }
        catch (e) {
            res.status(500).json({ error: 'services_query_failed', message: e.message });
        }
    });
    router.get('/platform-admin/modules', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT m.module_code, m.platform_key, m.product_key, m.display_name,
                m.default_route, m.registry_status, m.canonical_source,
                COALESCE(
                  (SELECT json_agg(r.role_code ORDER BY r.role_code)
                     FROM dos.platform_admin_module_roles r
                    WHERE r.module_code = m.module_code),
                  '[]'::json
                ) AS roles
           FROM dos.dynamic_ui_modules m
          WHERE m.product_key = 'platform'
          ORDER BY m.platform_key, m.module_code`);
            res.json({ modules: rows, count: rows.length });
        }
        catch (e) {
            res.status(500).json({ error: 'modules_query_failed', message: e.message });
        }
    });
    router.get('/platform-admin/navigation', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT id::text, module_code, label, route, sort_order,
                parent_id::text AS parent_id, readiness
           FROM dos.dynamic_ui_navigation
          WHERE tenant_id IS NULL AND module_code = ANY($1::text[])
          ORDER BY sort_order, label`, [DNA_MODULES]);
            res.json({ navigation: rows, count: rows.length });
        }
        catch (e) {
            res.status(500).json({ error: 'navigation_query_failed', message: e.message });
        }
    });
    router.get('/platform-admin/module-roles', async (_req, res) => {
        try {
            const { rows } = await pool.query(`SELECT module_code, role_code, granted_by, granted_at
           FROM dos.platform_admin_module_roles
          ORDER BY module_code, role_code`);
            res.json({ moduleRoles: rows, count: rows.length });
        }
        catch (e) {
            res.status(500).json({ error: 'module_roles_query_failed', message: e.message });
        }
    });
    return router;
}
//# sourceMappingURL=platform-admin.routes.js.map
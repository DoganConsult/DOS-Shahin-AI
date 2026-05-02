-- 0001 — Seed Dynamic UI route contracts for the 4 Shahin user/tenant
-- routes that were previously handwritten loadComponent entries in
-- products/shahin-ai/app/src/app/app.routes.ts.
--   /profile, /settings, /tenant-profile, /tenant-settings  → module: foundation
-- Each row registers the route with the SPA's DynamicPageHostComponent
-- dispatcher: signature_widget points at WIDGET_KEY_MAP entries (shahin-*),
-- component_key points at COMPONENT_MAP entries (Shahin*Page).
--
-- Idempotent: re-running this migration is a no-op via WHERE NOT EXISTS.
BEGIN;

INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, signature_widget,
   audience_profiles, realtime_enabled)
SELECT NULL, 'foundation', x.path, x.comp, x.perm,
       x.sort, 'active', x.pt, x.lay, 'page-local', x.intent,
       x.scope, FALSE, x.sw,
       NULL::text[], FALSE
  FROM (VALUES
    ('/profile',          'ShahinProfilePage',        NULL,
     100, 'object',   'object-page', 'manage',     'self',   'shahin-profile'),
    ('/settings',         'ShahinSettingsPage',       NULL,
     110, 'settings', 'full-page',   'configure',  'self',   'shahin-settings'),
    ('/tenant-profile',   'ShahinTenantProfilePage',  NULL,
     120, 'object',   'object-page', 'manage',     'tenant', 'shahin-tenant-profile'),
    ('/tenant-settings',  'ShahinTenantSettingsPage', 'platform.tenant.admin',
     130, 'settings', 'full-page',   'configure',  'tenant', 'shahin-tenant-settings')
  ) AS x(path, comp, perm, sort, pt, lay, intent, scope, sw)
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_routes r
    WHERE r.tenant_id IS NULL
      AND r.module_code = 'foundation'
      AND r.path_pattern = x.path
 );

COMMIT;

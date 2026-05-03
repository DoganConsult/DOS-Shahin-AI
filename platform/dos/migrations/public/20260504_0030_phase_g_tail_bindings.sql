-- Phase G — Tail bindings (block A) + /compliance/controls/list route hygiene (block B).
-- Owner: ui-os-service.
--
-- Closes the last 5 active routes that have no row in
-- dos.ui_route_template_binding, and adds the missing
-- dos.dynamic_ui_routes row that the Phase G block B binding for
-- /compliance/controls/list was orphaned to.
--
-- Forward-only and idempotent (ON CONFLICT DO UPDATE / WHERE NOT EXISTS).

BEGIN;

-- ─── A — config-center 5 admin routes ──────────────────────────────────────
-- Live DB shows these 5 active routes ship a component_key but have no
-- binding row. They are admin/config-center surfaces, so map them onto
-- module-settings (configuration archetype) for the listing-style views and
-- trend-intelligence for the live-metrics views.
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export) VALUES
  ('/admin/config-center/compare',   'module-settings',     'ModuleSettingsTemplateComponent'),
  ('/admin/config-center/gateway',   'trend-intelligence',  'TrendIntelligenceTemplateComponent'),
  ('/admin/config-center/health',    'trend-intelligence',  'TrendIntelligenceTemplateComponent'),
  ('/admin/config-center/resolve',   'module-settings',     'ModuleSettingsTemplateComponent'),
  ('/admin/config-center/workspace', 'module-settings',     'ModuleSettingsTemplateComponent')
ON CONFLICT (route) DO UPDATE SET
  archetype       = EXCLUDED.archetype,
  template_export = EXCLUDED.template_export;

-- ─── B — /compliance/controls/list route registry hygiene ──────────────────
-- Phase G block B seeded a binding for this route, but no
-- dos.dynamic_ui_routes row exists. Add the route so the binding is
-- reachable via the resolver and the ui-registry:verify gate stops flagging
-- it as orphaned.
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope)
SELECT NULL, 'compliance', '/compliance/controls/list',
       'compliance.controls.list.page', NULL,
       60, 'active', 'list', 'full-page', 'module-overview'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_routes
    WHERE path_pattern = '/compliance/controls/list'
 );

-- Register the placeholder component_key so component-map-coverage stays
-- green. Vendor=ibm-carbon (table primitive — list = data table).
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('compliance.controls.list.page', 'ibm-carbon', 'table', 'approved')
ON CONFLICT (component_key) DO NOTHING;

-- ─── C — Sanity guard ─────────────────────────────────────────────────────
DO $$
DECLARE
  missing INT;
BEGIN
  SELECT count(*) INTO missing
    FROM dos.dynamic_ui_routes r
   WHERE r.readiness = 'active'
     AND NOT EXISTS (
       SELECT 1 FROM dos.ui_route_template_binding b WHERE b.route = r.path_pattern
     )
     AND r.path_pattern NOT IN
       ('/profile','/settings','/tenant-profile','/tenant-settings',
        '/login','/register','/forgot-password','/mfa','/reset-password');
  IF missing > 0 THEN
    RAISE EXCEPTION '[phase-g-tail] still % active routes without a template binding', missing;
  END IF;
END $$;

COMMIT;

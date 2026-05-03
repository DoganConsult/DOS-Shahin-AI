-- Phase F — Utility Pages seed (User Profile, Tenant Profile, Tenant Settings,
-- Tenant Services, Platform Settings, DAuth Console, DNOC Console, DSOC Console).
-- Owner: ui-os-service.
--
-- Adds 8 dedicated component_keys for the utility surfaces, registers 2 NEW
-- routes (/admin/platform-settings, /tenant-services), and binds every
-- non-EXEMPT route to its archetype + template_export. The 4 SPA-local
-- routes (/profile, /tenant-profile, /settings, /tenant-settings) remain on
-- the verify.mjs EXEMPT list because the existing SPA components already
-- own them — the new component_keys are registered for downstream waves
-- that migrate those SPA pages onto the dynamic binding contract.
--
-- The 3 platform consoles (/admin/dauth, /admin/dnoc, /admin/dsoc) already
-- exist in dos.dynamic_ui_routes via the W8 enrollment migrations and were
-- rebound to decision-dashboard / command-dashboard archetypes by
-- 20260503_0021_phase_f_rebind_to_31_archetypes.sql. Here we additionally
-- register their dedicated `platform.<m>.console` component_keys for use by
-- Phase F-F4 admin pages and dynamic UI lookups.
--
-- Forward-only and idempotent:
--   ① INSERT … ON CONFLICT (component_key) DO NOTHING for registry rows.
--   ② INSERT … WHERE NOT EXISTS for new dynamic_ui_routes rows.
--   ③ INSERT … ON CONFLICT (route) DO UPDATE for ui_route_template_binding.
--
-- Carbon-only contract preserved:
--   Every inserted registry row carries vendor='ibm-carbon',
--   approval_status='approved' and a carbon_key whose row in
--   dos.ui_carbon_components has vendor='ibm-carbon' AND
--   runtime_status IN ('active','wrapper-required'). The
--   trg_carbon_only_runtime DB trigger enforces vendor='ibm-carbon' on
--   INSERT/UPDATE.

BEGIN;

-- =====================================================================
-- 1. Component registry — 8 new utility-surface keys.
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  -- User identity surfaces
  ('module.user_profile.page',        'ibm-carbon', 'tabs',  'approved'),
  ('module.tenant_profile.page',      'ibm-carbon', 'tabs',  'approved'),
  -- Tenant administration surfaces
  ('module.tenant_settings.page',     'ibm-carbon', 'tabs',  'approved'),
  ('module.tenant_services.page',     'ibm-carbon', 'table', 'approved'),
  -- Platform administration surfaces
  ('platform.platform_settings.page', 'ibm-carbon', 'grid',  'approved'),
  ('platform.dauth.console',          'ibm-carbon', 'grid',  'approved'),
  ('platform.dnoc.console',           'ibm-carbon', 'grid',  'approved'),
  ('platform.dsoc.console',           'ibm-carbon', 'grid',  'approved')
ON CONFLICT (component_key) DO NOTHING;

-- =====================================================================
-- 2. dynamic_ui_routes — 2 NEW routes (others already exist or are EXEMPT).
--    All critical fields populated for the dynamic-ui Hard Gates.
-- =====================================================================
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, title_key, subtitle_key,
   data_resource_key, default_view, audit_enabled, realtime_enabled)
SELECT NULL, x.module_code, x.path, x.component, x.perm, x.sort, 'active',
       x.page_type, x.layout, x.kpi_scope, x.intent, x.scope, FALSE,
       x.title_key, x.subtitle_key, x.data_resource_key, x.def_view,
       TRUE, FALSE
  FROM (VALUES
    ('tenant-management',  '/tenant-services',         'module.tenant_services.page',     'tenant.service.read',
        900, 'list',     'full-page', 'none',           'manage',    'tenant',
        'tenant.page.services.title',     'tenant.page.services.subtitle',     'tenant.resource.services',     'table'),
    ('config-center',      '/admin/platform-settings', 'platform.platform_settings.page', 'platform.admin.read',
        950, 'overview', 'dashboard', 'module-overview','configure', 'platform',
        'platform.page.settings.title',   'platform.page.settings.subtitle',   'platform.resource.settings',   'cards')
  ) AS x(module_code, path, component, perm, sort, page_type, layout, kpi_scope,
         intent, scope, title_key, subtitle_key, data_resource_key, def_view)
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_routes r
    WHERE r.tenant_id IS NULL
      AND r.module_code = x.module_code
      AND r.path_pattern = x.path
 );

-- =====================================================================
-- 3. ui_route_template_binding — bind the 2 NEW routes to their archetypes.
--    /admin/dauth, /admin/dnoc, /admin/dsoc, /tenant-settings already bound
--    by earlier seed migrations (0018 + 0021); /profile, /tenant-profile,
--    /settings, /tenant-settings remain EXEMPT (verify.mjs:50).
-- =====================================================================
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props) VALUES
  ('/tenant-services',         'intelligent-register', 'ModuleRecordsTemplateComponent',    '{}'::jsonb),
  ('/admin/platform-settings', 'command-dashboard',    'CommandDashboardTemplateComponent', '{}'::jsonb)
ON CONFLICT (route) DO UPDATE
  SET archetype = EXCLUDED.archetype,
      template_export = EXCLUDED.template_export,
      props = COALESCE(dos.ui_route_template_binding.props, '{}'::jsonb) || EXCLUDED.props;

-- =====================================================================
-- 4. Sanity guard — every new component_key must be present + approved +
--    carbon-vendor; every new dedicated route must be active and bound.
-- =====================================================================
DO $$
DECLARE
  expected_keys TEXT[] := ARRAY[
    'module.user_profile.page','module.tenant_profile.page',
    'module.tenant_settings.page','module.tenant_services.page',
    'platform.platform_settings.page',
    'platform.dauth.console','platform.dnoc.console','platform.dsoc.console'
  ];
  expected_routes TEXT[] := ARRAY[
    '/tenant-services','/admin/platform-settings'
  ];
  missing_keys INTEGER;
  missing_routes INTEGER;
  unbound_routes INTEGER;
BEGIN
  SELECT count(*) INTO missing_keys
  FROM unnest(expected_keys) AS k(key)
  WHERE NOT EXISTS (
    SELECT 1 FROM dos.dynamic_ui_component_registry r
    WHERE r.component_key = k.key
      AND r.vendor = 'ibm-carbon'
      AND r.approval_status = 'approved'
  );
  IF missing_keys > 0 THEN
    RAISE EXCEPTION '[utility-pages] % expected component_key rows missing or not approved/carbon', missing_keys;
  END IF;

  SELECT count(*) INTO missing_routes
  FROM unnest(expected_routes) AS p(path)
  WHERE NOT EXISTS (
    SELECT 1 FROM dos.dynamic_ui_routes r
    WHERE r.path_pattern = p.path
      AND r.tenant_id IS NULL
      AND r.readiness = 'active'
  );
  IF missing_routes > 0 THEN
    RAISE EXCEPTION '[utility-pages] % expected dynamic_ui_routes rows missing or not active', missing_routes;
  END IF;

  SELECT count(*) INTO unbound_routes
  FROM unnest(expected_routes) AS p(path)
  WHERE NOT EXISTS (
    SELECT 1 FROM dos.ui_route_template_binding b WHERE b.route = p.path
  );
  IF unbound_routes > 0 THEN
    RAISE EXCEPTION '[utility-pages] % expected routes missing binding row', unbound_routes;
  END IF;
END $$;

COMMIT;

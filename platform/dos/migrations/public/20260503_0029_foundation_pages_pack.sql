-- =====================================================================
-- 0029 — Foundation Pages Pack: register the 21 canonical Foundation
--        pages in the Dynamic UI runtime and enroll every tenant.
--
-- This migration is the platform-side projection of
-- `FOUNDATION_CONTRACT.pages` / `.nav` defined in
-- `platform/foundation/contracts/foundation.module-contract.ts`.
-- It is the single source of registry data; never edit dos.dynamic_ui_*
-- from inside a module.
--
-- Effects (all idempotent, forward-only):
--   ① Upsert `foundation` row in dos.dynamic_ui_modules.
--   ② Register 21 `foundation.<x>.page` component_keys in
--      dos.dynamic_ui_component_registry, all vendor='ibm-carbon',
--      approval_status='approved', carbon_key referencing a runtime-active
--      row in dos.ui_carbon_components (enforced by trg_carbon_only_runtime).
--   ③ Insert 21 dos.dynamic_ui_routes rows with tenant_id IS NULL —
--      platform-projected so every tenant resolves them via
--      COALESCE(tenant_id,'*').
--   ④ Insert 21 dos.dynamic_ui_navigation child rows under the
--      `foundation` root nav node.
--   ⑤ Backfill dos.dynamic_ui_module_status for every tenant currently
--      in platform_dos.tenants_registry (status='active') so the
--      module surfaces in their navigation immediately.
--
-- Carbon-only contract: every carbon_key below is one of
-- {grid, tiles, table, tabs, data-table, modal, accordion} which all
-- exist in dos.ui_carbon_components per the 0148/0149/0150 catalog seeds.
-- =====================================================================
BEGIN;

-- =====================================================================
-- 1. Module registration.
-- =====================================================================
INSERT INTO dos.dynamic_ui_modules
  (module_code, platform_key, product_key, display_name, default_route,
   registry_status, default_tenant_enrollment_status, canonical_source)
VALUES
  ('foundation', 'foundation', 'shahin-ai',
   'Foundation — Organization Hierarchy', '/foundation/overview',
   'active', 'enabled', 'platform/foundation')
ON CONFLICT (module_code) DO UPDATE
   SET platform_key                     = EXCLUDED.platform_key,
       product_key                      = EXCLUDED.product_key,
       display_name                     = EXCLUDED.display_name,
       default_route                    = EXCLUDED.default_route,
       registry_status                  = EXCLUDED.registry_status,
       default_tenant_enrollment_status = EXCLUDED.default_tenant_enrollment_status,
       canonical_source                 = EXCLUDED.canonical_source,
       updated_at                       = NOW();

-- =====================================================================
-- 2. Component registry — 21 page composers.
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, approved_at,
   schema_version, metadata)
VALUES
  ('foundation.overview.page',        'ibm-carbon', 'approved', 'tiles',      NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"overview"}'::jsonb),
  ('foundation.organization.page',    'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"organization"}'::jsonb),
  ('foundation.business-units.page',  'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"business-units"}'::jsonb),
  ('foundation.departments.page',     'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"departments"}'::jsonb),
  ('foundation.positions.page',       'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"positions"}'::jsonb),
  ('foundation.locations.page',       'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"locations"}'::jsonb),
  ('foundation.users.page',           'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"users"}'::jsonb),
  ('foundation.teams.page',           'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"teams"}'::jsonb),
  ('foundation.roles.page',           'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"roles"}'::jsonb),
  ('foundation.permissions.page',     'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"permissions"}'::jsonb),
  ('foundation.committees.page',      'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"committees"}'::jsonb),
  ('foundation.delegations.page',     'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"delegations"}'::jsonb),
  ('foundation.access-review.page',   'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"access-review"}'::jsonb),
  ('foundation.policies.page',        'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"policies"}'::jsonb),
  ('foundation.audit.page',           'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"audit"}'::jsonb),
  ('foundation.ownership.page',       'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"ownership"}'::jsonb),
  ('foundation.sod.page',             'ibm-carbon', 'approved', 'tabs',       NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"sod"}'::jsonb),
  ('foundation.hierarchy-viz.page',   'ibm-carbon', 'approved', 'tiles',      NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"hierarchy-viz"}'::jsonb),
  ('foundation.user-lifecycle.page',  'ibm-carbon', 'approved', 'tabs',       NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"user-lifecycle"}'::jsonb),
  ('foundation.reference-data.page',  'ibm-carbon', 'approved', 'data-table', NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"reference-data"}'::jsonb),
  ('foundation.diagnostics.page',     'ibm-carbon', 'approved', 'tiles',      NOW(), '1', '{"source":"foundation-pages-pack-0029","page":"diagnostics"}'::jsonb)
ON CONFLICT (component_key) DO UPDATE
   SET vendor          = EXCLUDED.vendor,
       approval_status = EXCLUDED.approval_status,
       carbon_key      = EXCLUDED.carbon_key,
       schema_version  = EXCLUDED.schema_version,
       metadata        = EXCLUDED.metadata,
       approved_at     = NOW();

-- =====================================================================
-- 3. Routes (tenant_id IS NULL — platform-projected to every tenant).
--    Maps directly to FOUNDATION_CONTRACT.pages[*].
-- =====================================================================
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, title_key, subtitle_key,
   data_resource_key, default_view, audit_enabled, realtime_enabled)
SELECT NULL, 'foundation', v.path, v.component_key, v.permission,
       v.sort_order, 'active', v.page_type, v.layout, v.kpi_scope, v.intent,
       'tenant', FALSE, v.title_key, v.subtitle_key,
       v.resource_key, v.default_view, TRUE, FALSE
  FROM (VALUES
    ('/foundation/overview',        'foundation.overview.page',       'foundation.read',       10,  'overview', 'dashboard', 'module-overview', 'monitor',     'foundation.overview.title',       'foundation.overview.subtitle',       'foundation.overview.snapshot',       'cards'),
    ('/foundation/organization',    'foundation.organization.page',   'foundation.read',       20,  'list',     'full-page', 'page-local',      'manage',      'foundation.organization.title',   NULL,                                  'foundation.organizations.list',      'table'),
    ('/foundation/business-units',  'foundation.business-units.page', 'foundation.read',       30,  'list',     'full-page', 'page-local',      'manage',      'foundation.businessUnits.title',  NULL,                                  'foundation.businessUnits.list',      'table'),
    ('/foundation/departments',     'foundation.departments.page',    'foundation.read',       40,  'list',     'full-page', 'page-local',      'manage',      'foundation.departments.title',    NULL,                                  'foundation.departments.list',        'table'),
    ('/foundation/positions',       'foundation.positions.page',      'foundation.read',       50,  'list',     'full-page', 'page-local',      'manage',      'foundation.positions.title',      NULL,                                  'foundation.positions.list',          'table'),
    ('/foundation/locations',       'foundation.locations.page',      'foundation.read',       60,  'list',     'full-page', 'page-local',      'manage',      'foundation.locations.title',      NULL,                                  'foundation.locations.list',          'table'),
    ('/foundation/users',           'foundation.users.page',          'foundation.user.read',  70,  'list',     'full-page', 'page-local',      'manage',      'foundation.users.title',          NULL,                                  'foundation.users.list',              'table'),
    ('/foundation/teams',           'foundation.teams.page',          'foundation.read',       80,  'list',     'full-page', 'page-local',      'manage',      'foundation.teams.title',          NULL,                                  'foundation.teams.list',              'table'),
    ('/foundation/roles',           'foundation.roles.page',          'foundation.admin.read', 90,  'list',     'full-page', 'page-local',      'manage',      'foundation.roles.title',          NULL,                                  'foundation.roles.list',              'table'),
    ('/foundation/permissions',     'foundation.permissions.page',    'foundation.admin.read', 100, 'list',     'full-page', 'page-local',      'manage',      'foundation.permissions.title',    NULL,                                  'foundation.permissions.list',        'table'),
    ('/foundation/committees',      'foundation.committees.page',     'foundation.read',       110, 'list',     'full-page', 'page-local',      'manage',      'foundation.committees.title',     NULL,                                  'foundation.committees.list',         'table'),
    ('/foundation/delegations',     'foundation.delegations.page',    'foundation.read',       120, 'list',     'full-page', 'page-local',      'manage',      'foundation.delegations.title',    NULL,                                  'foundation.delegations.list',        'table'),
    ('/foundation/access-review',   'foundation.access-review.page',  'access_review.read',    130, 'list',     'full-page', 'page-local',      'review',      'foundation.accessReview.title',   NULL,                                  'foundation.accessReview.list',       'table'),
    ('/foundation/policies',        'foundation.policies.page',       'foundation.read',       140, 'list',     'full-page', 'page-local',      'review',      'foundation.policies.title',       NULL,                                  'foundation.policies.list',           'table'),
    ('/foundation/audit',           'foundation.audit.page',          'audit_trail.read',      150, 'audit',    'full-page', 'none',            'review',      'foundation.audit.title',          NULL,                                  'foundation.audit.timeline',          'timeline'),
    ('/foundation/ownership',       'foundation.ownership.page',      'foundation.read',       160, 'list',     'full-page', 'page-local',      'manage',      'foundation.ownership.title',      NULL,                                  'foundation.ownership.list',          'table'),
    ('/foundation/sod',             'foundation.sod.page',            'foundation.write',      170, 'workflow', 'full-page', 'page-local',      'configure',   'foundation.sod.title',            NULL,                                  'foundation.sod.snapshot',            'tabs'),
    ('/foundation/hierarchy-viz',   'foundation.hierarchy-viz.page',  'organization.read',     180, 'analytics','dashboard', 'module-overview', 'investigate', 'foundation.hierarchyViz.title',   NULL,                                  'foundation.orgHierarchy.tree',       'cards'),
    ('/foundation/user-lifecycle',  'foundation.user-lifecycle.page', 'user.write',            190, 'workflow', 'full-page', 'page-local',      'manage',      'foundation.userLifecycle.title',  NULL,                                  'foundation.userLifecycle.snapshot',  'tabs'),
    ('/foundation/reference-data',  'foundation.reference-data.page', 'foundation.read',       200, 'list',     'full-page', 'none',            'configure',   'foundation.referenceData.title',  NULL,                                  'foundation.referenceData.list',      'table'),
    ('/foundation/diagnostics',     'foundation.diagnostics.page',    'foundation.read',       210, 'overview', 'dashboard', 'module-overview', 'monitor',     'foundation.diagnostics.title',    NULL,                                  'foundation.health.snapshot',         'cards')
  ) AS v(path, component_key, permission, sort_order, page_type, layout, kpi_scope, intent, title_key, subtitle_key, resource_key, default_view)
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_routes r
    WHERE r.tenant_id IS NULL
      AND r.module_code = 'foundation'
      AND r.path_pattern = v.path
 );

-- Update existing rows so a re-run aligns drift to the contract.
UPDATE dos.dynamic_ui_routes r
   SET component_key  = v.component_key,
       permission_key = v.permission,
       sort_order     = v.sort_order,
       readiness      = 'active',
       page_type      = v.page_type,
       layout         = v.layout,
       kpi_scope      = v.kpi_scope,
       user_intent    = v.intent,
       title_key      = v.title_key,
       data_resource_key = v.resource_key,
       default_view   = v.default_view
  FROM (VALUES
    ('/foundation/overview',        'foundation.overview.page',       'foundation.read',       10,  'overview', 'dashboard', 'module-overview', 'monitor',     'foundation.overview.title',       'foundation.overview.snapshot',       'cards'),
    ('/foundation/organization',    'foundation.organization.page',   'foundation.read',       20,  'list',     'full-page', 'page-local',      'manage',      'foundation.organization.title',   'foundation.organizations.list',      'table'),
    ('/foundation/business-units',  'foundation.business-units.page', 'foundation.read',       30,  'list',     'full-page', 'page-local',      'manage',      'foundation.businessUnits.title',  'foundation.businessUnits.list',      'table'),
    ('/foundation/departments',     'foundation.departments.page',    'foundation.read',       40,  'list',     'full-page', 'page-local',      'manage',      'foundation.departments.title',    'foundation.departments.list',        'table'),
    ('/foundation/positions',       'foundation.positions.page',      'foundation.read',       50,  'list',     'full-page', 'page-local',      'manage',      'foundation.positions.title',      'foundation.positions.list',          'table'),
    ('/foundation/locations',       'foundation.locations.page',      'foundation.read',       60,  'list',     'full-page', 'page-local',      'manage',      'foundation.locations.title',      'foundation.locations.list',          'table'),
    ('/foundation/users',           'foundation.users.page',          'foundation.user.read',  70,  'list',     'full-page', 'page-local',      'manage',      'foundation.users.title',          'foundation.users.list',              'table'),
    ('/foundation/teams',           'foundation.teams.page',          'foundation.read',       80,  'list',     'full-page', 'page-local',      'manage',      'foundation.teams.title',          'foundation.teams.list',              'table'),
    ('/foundation/roles',           'foundation.roles.page',          'foundation.admin.read', 90,  'list',     'full-page', 'page-local',      'manage',      'foundation.roles.title',          'foundation.roles.list',              'table'),
    ('/foundation/permissions',     'foundation.permissions.page',    'foundation.admin.read', 100, 'list',     'full-page', 'page-local',      'manage',      'foundation.permissions.title',    'foundation.permissions.list',        'table'),
    ('/foundation/committees',      'foundation.committees.page',     'foundation.read',       110, 'list',     'full-page', 'page-local',      'manage',      'foundation.committees.title',     'foundation.committees.list',         'table'),
    ('/foundation/delegations',     'foundation.delegations.page',    'foundation.read',       120, 'list',     'full-page', 'page-local',      'manage',      'foundation.delegations.title',    'foundation.delegations.list',        'table'),
    ('/foundation/access-review',   'foundation.access-review.page',  'access_review.read',    130, 'list',     'full-page', 'page-local',      'review',      'foundation.accessReview.title',   'foundation.accessReview.list',       'table'),
    ('/foundation/policies',        'foundation.policies.page',       'foundation.read',       140, 'list',     'full-page', 'page-local',      'review',      'foundation.policies.title',       'foundation.policies.list',           'table'),
    ('/foundation/audit',           'foundation.audit.page',          'audit_trail.read',      150, 'audit',    'full-page', 'none',            'review',      'foundation.audit.title',          'foundation.audit.timeline',          'timeline'),
    ('/foundation/ownership',       'foundation.ownership.page',      'foundation.read',       160, 'list',     'full-page', 'page-local',      'manage',      'foundation.ownership.title',      'foundation.ownership.list',          'table'),
    ('/foundation/sod',             'foundation.sod.page',            'foundation.write',      170, 'workflow', 'full-page', 'page-local',      'configure',   'foundation.sod.title',            'foundation.sod.snapshot',            'tabs'),
    ('/foundation/hierarchy-viz',   'foundation.hierarchy-viz.page',  'organization.read',     180, 'analytics','dashboard', 'module-overview', 'investigate', 'foundation.hierarchyViz.title',   'foundation.orgHierarchy.tree',       'cards'),
    ('/foundation/user-lifecycle',  'foundation.user-lifecycle.page', 'user.write',            190, 'workflow', 'full-page', 'page-local',      'manage',      'foundation.userLifecycle.title',  'foundation.userLifecycle.snapshot',  'tabs'),
    ('/foundation/reference-data',  'foundation.reference-data.page', 'foundation.read',       200, 'list',     'full-page', 'none',            'configure',   'foundation.referenceData.title',  'foundation.referenceData.list',      'table'),
    ('/foundation/diagnostics',     'foundation.diagnostics.page',    'foundation.read',       210, 'overview', 'dashboard', 'module-overview', 'monitor',     'foundation.diagnostics.title',    'foundation.health.snapshot',         'cards')
  ) AS v(path, component_key, permission, sort_order, page_type, layout, kpi_scope, intent, title_key, resource_key, default_view)
 WHERE r.tenant_id IS NULL
   AND r.module_code = 'foundation'
   AND r.path_pattern = v.path;

-- =====================================================================
-- 4. Navigation children — anchored under the /foundation root row.
-- =====================================================================
WITH root AS (
  SELECT id
    FROM dos.dynamic_ui_navigation
   WHERE tenant_id IS NULL
     AND parent_id IS NULL
     AND module_code = 'foundation'
     AND route = '/foundation'
   LIMIT 1
), root_ensured AS (
  INSERT INTO dos.dynamic_ui_navigation
    (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
  SELECT NULL, 'foundation', 'Foundation', '/foundation', 0, NULL, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM root)
  RETURNING id
), root_id AS (
  SELECT id FROM root
  UNION ALL
  SELECT id FROM root_ensured
)
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT NULL, 'foundation', x.label, x.route, x.sort_order,
       (SELECT id FROM root_id LIMIT 1), 'active'
  FROM (VALUES
    ('Overview',        '/foundation/overview',        10),
    ('Organization',    '/foundation/organization',    20),
    ('Business Units',  '/foundation/business-units',  30),
    ('Departments',     '/foundation/departments',     40),
    ('Positions',       '/foundation/positions',       50),
    ('Locations',       '/foundation/locations',       60),
    ('Users',           '/foundation/users',           70),
    ('Teams',           '/foundation/teams',           80),
    ('Roles',           '/foundation/roles',           90),
    ('Permissions',     '/foundation/permissions',     100),
    ('Committees',      '/foundation/committees',      110),
    ('Delegations',     '/foundation/delegations',     120),
    ('Access Review',   '/foundation/access-review',   130),
    ('Policies',        '/foundation/policies',        140),
    ('Audit',           '/foundation/audit',           150),
    ('Ownership',       '/foundation/ownership',       160),
    ('Segregation of Duties', '/foundation/sod',       170),
    ('Hierarchy Viz',   '/foundation/hierarchy-viz',   180),
    ('User Lifecycle',  '/foundation/user-lifecycle',  190),
    ('Reference Data',  '/foundation/reference-data',  200),
    ('Diagnostics',     '/foundation/diagnostics',     210)
  ) AS x(label, route, sort_order)
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_navigation n
    WHERE n.tenant_id IS NULL
      AND n.module_code = 'foundation'
      AND n.route = x.route
 );

-- =====================================================================
-- 5. Per-tenant enrollment — every existing active tenant gets the
--    new foundation module turned on. New tenants inherit
--    default_tenant_enrollment_status='enabled' from §1.
-- =====================================================================
INSERT INTO dos.dynamic_ui_module_status (tenant_id, module_code, enrollment_status)
SELECT t.tenant_id, 'foundation', 'enabled'
  FROM platform_dos.tenants_registry t
 WHERE t.status = 'active'
ON CONFLICT (tenant_id, module_code) DO UPDATE
   SET enrollment_status = 'enabled',
       updated_at        = NOW();

-- =====================================================================
-- 6. Sanity guard.
-- =====================================================================
DO $$
DECLARE
  expected_pages TEXT[] := ARRAY[
    'foundation.overview.page','foundation.organization.page',
    'foundation.business-units.page','foundation.departments.page',
    'foundation.positions.page','foundation.locations.page',
    'foundation.users.page','foundation.teams.page','foundation.roles.page',
    'foundation.permissions.page','foundation.committees.page',
    'foundation.delegations.page','foundation.access-review.page',
    'foundation.policies.page','foundation.audit.page',
    'foundation.ownership.page','foundation.sod.page',
    'foundation.hierarchy-viz.page','foundation.user-lifecycle.page',
    'foundation.reference-data.page','foundation.diagnostics.page'
  ];
  cnt INT;
BEGIN
  SELECT count(*) INTO cnt
    FROM dos.dynamic_ui_component_registry
   WHERE component_key = ANY(expected_pages)
     AND vendor = 'ibm-carbon' AND approval_status = 'approved';
  IF cnt < array_length(expected_pages,1) THEN
    RAISE EXCEPTION '[0029] foundation page component_keys missing: have %, want %',
      cnt, array_length(expected_pages,1);
  END IF;

  SELECT count(*) INTO cnt
    FROM dos.dynamic_ui_routes
   WHERE tenant_id IS NULL AND module_code = 'foundation'
     AND component_key = ANY(expected_pages);
  IF cnt < array_length(expected_pages,1) THEN
    RAISE EXCEPTION '[0029] expected % foundation routes, have %',
      array_length(expected_pages,1), cnt;
  END IF;

  SELECT count(*) INTO cnt
    FROM dos.dynamic_ui_modules
   WHERE module_code = 'foundation' AND registry_status = 'active';
  IF cnt <> 1 THEN
    RAISE EXCEPTION '[0029] foundation module registry row missing/inactive';
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- Validation (read-only):
--   SELECT path_pattern, component_key, permission_key
--     FROM dos.dynamic_ui_routes
--    WHERE module_code='foundation' AND tenant_id IS NULL
--    ORDER BY sort_order;
--   -- expected 21 rows
--
--   SELECT count(*) FROM dos.dynamic_ui_module_status
--    WHERE module_code='foundation' AND enrollment_status='enabled';
--   -- expected = count(*) FROM platform_dos.tenants_registry WHERE status='active'
-- =====================================================================

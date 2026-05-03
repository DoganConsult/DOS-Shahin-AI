-- =====================================================================
-- 0040 — Foundation Template-Only Routing
--
-- Enforces rule §3.1 ("no pages outside the 32-template roster"):
-- every dos.dynamic_ui_routes row whose module_code='foundation' is
-- rewritten to point at one of the 32 archetype component_keys, so the
-- Shahin SPA can resolve the page via DynamicTemplatePageComponent
-- without referencing any bespoke Foundation*Component class.
--
-- Companion FE patch: products/shahin-ai/app/src/app/app.routes.ts
-- foundation children block reduced to a single `**` →
-- DynamicTemplatePageComponent.
--
-- Effects (idempotent, forward-only):
--   1. Update dos.dynamic_ui_routes.component_key for the 21 foundation
--      pages from `Foundation*Component` strings to the matching
--      ARCHETYPE_REGISTRY component_key.
--   2. Insert missing template binding for `/foundation/roles/:id`
--      (record-story).
--   3. Set permission_key on `/profile`, `/tenant-profile` (currently NULL).
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 1. Foundation routes → archetype component_keys.
-- ---------------------------------------------------------------------
WITH archetype_map(path_pattern, component_key) AS (VALUES
  ('/foundation',                     'module.entry.page'),
  ('/foundation/overview',            'module.entry.page'),
  ('/foundation/records',             'module.records.page'),
  ('/foundation/workflows',           'module.workflows.page'),
  ('/foundation/reports',             'module.reports.page'),
  ('/foundation/settings',            'module.settings.page'),
  ('/foundation/organization',        'module.org_chart.page'),
  ('/foundation/business-units',      'module.org_chart.page'),
  ('/foundation/departments',         'module.org_chart.page'),
  ('/foundation/positions',           'module.records.page'),
  ('/foundation/locations',           'module.records.page'),
  ('/foundation/users',               'module.records.page'),
  ('/foundation/teams',               'module.org_chart.page'),
  ('/foundation/roles',               'module.records.page'),
  ('/foundation/roles/:id',           'module.record.detail.page'),
  ('/foundation/committees',          'module.records.page'),
  ('/foundation/delegations',         'module.delegation_center.page'),
  ('/foundation/ownership-mapping',   'module.ownership_map.page'),
  ('/foundation/permissions',         'module.ownership_map.page'),
  ('/foundation/access-review',       'module.workflows.page'),
  ('/foundation/policies',            'module.records.page'),
  ('/foundation/data-processing',     'module.records.page'),
  ('/foundation/reference-data',      'module.records.page'),
  ('/foundation/audit',               'module.audit_trail_ledger.page'),
  ('/foundation/operations-readiness','module.posture.page')
)
UPDATE dos.dynamic_ui_routes r
   SET component_key = m.component_key
  FROM archetype_map m
 WHERE r.path_pattern = m.path_pattern
   AND r.module_code  = 'foundation'
   AND r.component_key <> m.component_key;

-- ---------------------------------------------------------------------
-- 2. Missing binding: `/foundation/roles/:id` → record-story.
-- ---------------------------------------------------------------------
INSERT INTO dos.ui_route_template_binding
  (route, archetype, template_export, props, version, updated_at)
VALUES
  ('/foundation/roles/:id', 'record-story', 'RecordStoryTemplateComponent',
   '{}'::jsonb, 1, now())
ON CONFLICT (route) DO UPDATE
  SET archetype       = EXCLUDED.archetype,
      template_export = EXCLUDED.template_export,
      version         = dos.ui_route_template_binding.version + 1,
      updated_at      = now();

-- ---------------------------------------------------------------------
-- 3. Permission keys on workspace-shipped foundation surfaces.
-- ---------------------------------------------------------------------
UPDATE dos.dynamic_ui_routes
   SET permission_key = 'foundation.read'
 WHERE path_pattern IN ('/profile', '/tenant-profile')
   AND permission_key IS NULL;

COMMIT;

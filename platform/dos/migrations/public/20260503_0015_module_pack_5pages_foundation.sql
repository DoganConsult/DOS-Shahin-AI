-- =====================================================================
-- 0015 — Universal 5-page Module Pack: register reusable page keys
--        + bind Foundation pilot routes.
--
-- Wave-1 deliverable: every business module gets the same five pages
--   /{moduleCode}/overview
--   /{moduleCode}/records
--   /{moduleCode}/workflows
--   /{moduleCode}/reports
--   /{moduleCode}/settings
-- powered by reusable Carbon-only components keyed:
--   module.overview.page
--   module.records.page
--   module.workflows.page
--   module.reports.page
--   module.settings.page
--
-- This migration registers the 5 component keys (vendor='ibm-carbon',
-- approval_status='approved', carbon_key bound to a real Carbon
-- primitive present in dos.ui_carbon_components) and binds the 5
-- Foundation routes (the pilot module). Other modules are bound by a
-- subsequent projector run once their manifest cites the 5-page pack.
--
-- Constraints:
--   * Platform-owned writer (no module migrates dos.dynamic_ui_*).
--   * No deletes. No trigger weakening.
--   * trg_carbon_only_runtime is satisfied because every carbon_key
--     references an active row in dos.ui_carbon_components.
--   * tenant_id IS NULL (platform-projected, applies to every tenant).
--
-- Idempotent.
-- =====================================================================
BEGIN;

-- 1) Register the 5 reusable page keys.
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, approved_at,
   schema_version, metadata)
VALUES
  ('module.overview.page',  'ibm-carbon', 'approved', 'grid',  NOW(), '1',
   '{"source":"module-pack-0015","kind":"page","reusable":true,"page":"overview"}'::jsonb),
  ('module.records.page',   'ibm-carbon', 'approved', 'table', NOW(), '1',
   '{"source":"module-pack-0015","kind":"page","reusable":true,"page":"records"}'::jsonb),
  ('module.workflows.page', 'ibm-carbon', 'approved', 'tabs',  NOW(), '1',
   '{"source":"module-pack-0015","kind":"page","reusable":true,"page":"workflows"}'::jsonb),
  ('module.reports.page',   'ibm-carbon', 'approved', 'tiles', NOW(), '1',
   '{"source":"module-pack-0015","kind":"page","reusable":true,"page":"reports"}'::jsonb),
  ('module.settings.page',  'ibm-carbon', 'approved', 'tabs',  NOW(), '1',
   '{"source":"module-pack-0015","kind":"page","reusable":true,"page":"settings"}'::jsonb)
ON CONFLICT (component_key) DO UPDATE
  SET vendor          = EXCLUDED.vendor,
      approval_status = EXCLUDED.approval_status,
      carbon_key      = EXCLUDED.carbon_key,
      schema_version  = EXCLUDED.schema_version,
      metadata        = EXCLUDED.metadata,
      approved_at     = NOW();

-- 2) Bind the 5 Foundation pilot routes to the reusable page keys.
DO $$
DECLARE
  m text := 'foundation';
  p record;
  pages text[][] := ARRAY[
    ['overview',  'module.overview.page',  'overview',  'dashboard',  'module-overview',  'monitor'],
    ['records',   'module.records.page',   'list',      'full-page',  'page-local',       'manage'],
    ['workflows', 'module.workflows.page', 'workflow',  'full-page',  'page-local',       'approve'],
    ['reports',   'module.reports.page',   'analytics', 'report',     'module-overview',  'investigate'],
    ['settings',  'module.settings.page',  'settings',  'full-page',  'none',             'configure']
  ];
  v_perm text;
  v_path text;
  v_id   uuid;
  i      int;
BEGIN
  FOR i IN 1 .. array_length(pages, 1) LOOP
    v_path := '/' || m || '/' || pages[i][1];

    SELECT permission_code INTO v_perm
      FROM platform_dauth.permissions
     WHERE module_code = m
       AND action_type = CASE pages[i][1]
                           WHEN 'settings' THEN 'manage'
                           WHEN 'workflows' THEN 'approve'
                           ELSE 'read'
                         END
     ORDER BY permission_code
     LIMIT 1;
    IF v_perm IS NULL THEN
      SELECT permission_code INTO v_perm
        FROM platform_dauth.permissions
       WHERE module_code = m
         AND action_type = 'read'
       ORDER BY permission_code
       LIMIT 1;
    END IF;
    IF v_perm IS NULL THEN
      SELECT permission_code INTO v_perm
        FROM platform_dauth.permissions
       WHERE module_code = m
       ORDER BY permission_code
       LIMIT 1;
    END IF;
    IF v_perm IS NULL THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_id
      FROM dos.dynamic_ui_routes
     WHERE tenant_id IS NULL
       AND module_code = m
       AND path_pattern = v_path
     LIMIT 1;

    IF v_id IS NULL THEN
      INSERT INTO dos.dynamic_ui_routes
        (tenant_id, module_code, path_pattern, component_key, permission_key,
         sort_order, readiness, page_type, layout, kpi_scope, user_intent,
         data_scope_mode, evidence_required, title_key, subtitle_key)
      VALUES
        (NULL, m, v_path, pages[i][2], v_perm,
         i * 10, 'ready', pages[i][3], pages[i][4], pages[i][5], pages[i][6],
         'tenant', false,
         m || '.' || pages[i][1] || '.title',
         m || '.' || pages[i][1] || '.subtitle');
    ELSE
      UPDATE dos.dynamic_ui_routes
         SET component_key  = pages[i][2],
             permission_key = v_perm,
             page_type      = pages[i][3],
             layout         = pages[i][4],
             kpi_scope      = pages[i][5],
             user_intent    = pages[i][6],
             readiness      = 'ready',
             title_key      = m || '.' || pages[i][1] || '.title',
             subtitle_key   = m || '.' || pages[i][1] || '.subtitle'
       WHERE id = v_id;
    END IF;
  END LOOP;
END $$;

-- 3) Seed dos.dynamic_ui_navigation children for the Foundation pilot.
--    Each child sits under the platform-projected root row inserted by
--    migration 0014. Idempotent.
WITH root AS (
  SELECT id, module_code
    FROM dos.dynamic_ui_navigation
   WHERE tenant_id IS NULL
     AND parent_id IS NULL
     AND module_code = 'foundation'
     AND route = '/foundation'
   LIMIT 1
)
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT NULL, 'foundation', x.label, x.route, x.sort_order, root.id, 'ready'
  FROM root
  CROSS JOIN (VALUES
    ('Overview',  '/foundation/overview',  10),
    ('Records',   '/foundation/records',   20),
    ('Workflows', '/foundation/workflows', 30),
    ('Reports',   '/foundation/reports',   40),
    ('Settings',  '/foundation/settings',  50)
  ) AS x(label, route, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_navigation n
   WHERE n.tenant_id IS NULL
     AND n.module_code = 'foundation'
     AND n.route = x.route
);

COMMIT;

-- =====================================================================
-- Validation (read-only):
--   SELECT component_key, carbon_key, approval_status
--     FROM dos.dynamic_ui_component_registry
--    WHERE component_key LIKE 'module.%.page' ORDER BY 1;
--   -- expected 5 rows, all approved/ibm-carbon
--
--   SELECT path_pattern, component_key, page_type, readiness
--     FROM dos.dynamic_ui_routes
--    WHERE module_code='foundation' AND tenant_id IS NULL
--      AND path_pattern LIKE '/foundation/%'
--    ORDER BY sort_order;
--   -- expected 5 rows
-- =====================================================================

-- =====================================================================
-- 0016 — Universal 5-page Module Pack: bind Risk module routes + nav.
--
-- Adds the same 5 routes the Foundation pilot uses (migration 0015) for
-- the Risk module, powered by the same reusable `module.*.page`
-- components registered in 0015. Differs only by moduleCode/permission.
--
-- Constraints:
--   * Platform-owned writer (no module migrates dos.dynamic_ui_*).
--   * No deletes. No trigger weakening.
--   * trg_carbon_only_runtime is satisfied (component keys already
--     registered as ibm-carbon by migration 0015).
--   * Permissions used (verified to exist in platform_dauth.permissions):
--       - risk.record.read
--       - risk.record.approve
--       - risk.manage
--   * tenant_id IS NULL (platform-projected, applies to every tenant).
--
-- Idempotent.
-- =====================================================================
BEGIN;

-- 1) Bind the 5 Risk routes to the reusable page keys.
DO $$
DECLARE
  m text := 'risk';
  pages text[][] := ARRAY[
    ['overview',  'module.overview.page',  'overview',  'dashboard',  'module-overview',  'monitor',     'risk.record.read'],
    ['records',   'module.records.page',   'list',      'full-page',  'page-local',       'manage',      'risk.record.read'],
    ['workflows', 'module.workflows.page', 'workflow',  'full-page',  'page-local',       'approve',     'risk.record.approve'],
    ['reports',   'module.reports.page',   'analytics', 'report',     'module-overview',  'investigate', 'risk.record.read'],
    ['settings',  'module.settings.page',  'settings',  'full-page',  'none',             'configure',   'risk.manage']
  ];
  v_perm text;
  v_path text;
  v_id   uuid;
  i      int;
BEGIN
  -- Ensure dynamic_ui_modules has 'risk' (required by FK on routes/nav).
  INSERT INTO dos.dynamic_ui_modules
    (module_code, product_key, platform_key, display_name, default_route,
     registry_status, default_tenant_enrollment_status)
  VALUES (m, 'shahin-ai', 'dos', 'Risk', '/risk/overview', 'active', 'active')
  ON CONFLICT (module_code) DO NOTHING;

  FOR i IN 1 .. array_length(pages, 1) LOOP
    v_path := '/' || m || '/' || pages[i][1];
    v_perm := pages[i][7];

    -- Verify the chosen permission exists; otherwise skip the row to
    -- preserve fk_perm_catalog_dynamic_ui_routes.
    IF NOT EXISTS (SELECT 1 FROM platform_dauth.permissions WHERE permission_code = v_perm) THEN
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

-- 2) Ensure the Risk root navigation row exists (migration 0014 covers
--    this for every module bound to module.entry.page; do it explicitly
--    here in case 0014 has not been applied yet for the risk module).
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT NULL, 'risk', 'Risk', '/risk', 100, NULL, 'ready'
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_navigation
   WHERE tenant_id IS NULL AND parent_id IS NULL
     AND module_code = 'risk' AND route = '/risk'
);

-- 3) Seed the 5 child nav rows for Risk under the platform-owned root.
WITH root AS (
  SELECT id
    FROM dos.dynamic_ui_navigation
   WHERE tenant_id IS NULL
     AND parent_id IS NULL
     AND module_code = 'risk'
     AND route = '/risk'
   LIMIT 1
)
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT NULL, 'risk', x.label, x.route, x.sort_order, root.id, 'ready'
  FROM root
  CROSS JOIN (VALUES
    ('Overview',  '/risk/overview',  10),
    ('Records',   '/risk/records',   20),
    ('Workflows', '/risk/workflows', 30),
    ('Reports',   '/risk/reports',   40),
    ('Settings',  '/risk/settings',  50)
  ) AS x(label, route, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_navigation n
   WHERE n.tenant_id IS NULL
     AND n.module_code = 'risk'
     AND n.route = x.route
);

COMMIT;

-- =====================================================================
-- Validation (read-only):
--   SELECT path_pattern, component_key, permission_key, page_type
--     FROM dos.dynamic_ui_routes
--    WHERE tenant_id IS NULL AND module_code='risk'
--      AND path_pattern LIKE '/risk/%'
--    ORDER BY sort_order;
--   -- expected 5 rows
--
--   SELECT label, route, sort_order, parent_id IS NOT NULL AS has_parent
--     FROM dos.dynamic_ui_navigation
--    WHERE tenant_id IS NULL AND module_code='risk'
--    ORDER BY sort_order;
--   -- expected 6 rows (1 root + 5 children)
-- =====================================================================

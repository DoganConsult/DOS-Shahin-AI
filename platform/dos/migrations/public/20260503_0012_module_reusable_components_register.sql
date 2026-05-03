-- =====================================================================
-- 0012 — Reusable platform-owned `module.*` Dynamic-UI components.
--
-- Registers the 20 standard Module-* building-block keys + the single
-- reusable `module.entry.page` template. Every business module's root
-- route binds to `module.entry.page` via dos.dynamic_ui_routes; the
-- page reads `moduleCode` from the route data and renders the same
-- 12-block command-center layout — no per-module page component, no
-- per-module shell, no fallback rendering.
--
-- Constraints (Carbon-only runtime trigger trg_carbon_only_runtime):
--   * vendor='ibm-carbon'
--   * carbon_key references dos.ui_carbon_components (active /
--     wrapper-required only).
--
-- Idempotent. Platform-owned writer. Module manifests MUST NOT INSERT
-- into dos.dynamic_ui_component_registry directly.
-- =====================================================================
BEGIN;

-- 1) Register the reusable page template + 20 standard module.* keys.
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, approved_at, schema_version, metadata)
VALUES
  ('module.entry.page',     'ibm-carbon', 'approved', 'grid',             NOW(), '1',
   '{"source":"reusable-template-0012","kind":"page","reusable":true,"layout":"module-gateway"}'::jsonb),
  ('module.entry',          'ibm-carbon', 'approved', 'grid',             NOW(), '1',
   '{"source":"reusable-template-0012","kind":"page-shell","reusable":true}'::jsonb),
  ('module.overview',       'ibm-carbon', 'approved', 'tiles',            NOW(), '1',
   '{"source":"reusable-template-0012","kind":"page","reusable":true}'::jsonb),
  ('module.page_header',    'ibm-carbon', 'approved', 'wc.page-header',   NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.health_strip',   'ibm-carbon', 'approved', 'notification',     NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.kpi_grid',       'ibm-carbon', 'approved', 'grid',             NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.kpi_card',       'ibm-carbon', 'approved', 'tiles',            NOW(), '1',
   '{"source":"reusable-template-0012","kind":"widget","reusable":true}'::jsonb),
  ('module.quick_actions',  'ibm-carbon', 'approved', 'combo-button',     NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.tabs',           'ibm-carbon', 'approved', 'tabs',             NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.work_queue',     'ibm-carbon', 'approved', 'table',            NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.alerts_panel',   'ibm-carbon', 'approved', 'notification',     NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.data_preview',   'ibm-carbon', 'approved', 'table',            NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.recent_activity','ibm-carbon', 'approved', 'structured-list',  NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.filters_bar',    'ibm-carbon', 'approved', 'dropdown',         NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.search_bar',     'ibm-carbon', 'approved', 'search',           NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.records_table',  'ibm-carbon', 'approved', 'table',            NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.empty_state',    'ibm-carbon', 'approved', 'tiles',            NOW(), '1',
   '{"source":"reusable-template-0012","kind":"state","reusable":true}'::jsonb),
  ('module.loading_state',  'ibm-carbon', 'approved', 'loading',          NOW(), '1',
   '{"source":"reusable-template-0012","kind":"state","reusable":true}'::jsonb),
  ('module.error_state',    'ibm-carbon', 'approved', 'notification',     NOW(), '1',
   '{"source":"reusable-template-0012","kind":"state","reusable":true}'::jsonb),
  ('module.audit_trail',    'ibm-carbon', 'approved', 'table',            NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb),
  ('module.copilot_panel',  'ibm-carbon', 'approved', 'aichat.container', NOW(), '1',
   '{"source":"reusable-template-0012","kind":"section","reusable":true}'::jsonb)
ON CONFLICT (component_key) DO UPDATE
  SET vendor          = EXCLUDED.vendor,
      approval_status = EXCLUDED.approval_status,
      carbon_key      = EXCLUDED.carbon_key,
      schema_version  = EXCLUDED.schema_version,
      metadata        = EXCLUDED.metadata,
      approved_at     = NOW();

-- 2) Ensure a unique index exists for platform-owned (tenant_id IS NULL)
--    module-root routes so the projector can idempotently upsert.
CREATE UNIQUE INDEX IF NOT EXISTS uq_dynamic_ui_routes_platform_module_path
  ON dos.dynamic_ui_routes (module_code, path_pattern)
  WHERE tenant_id IS NULL;

-- 3) Bind every business module root route to `module.entry.page`.
--    The page reads `moduleCode` from the route data and renders the
--    same gateway layout for all modules. Idempotent: existing rows are
--    updated; missing rows are inserted.
DO $$
DECLARE
  m text;
  module_codes text[] := ARRAY[
    'foundation','risk','compliance','audit','workflow','policy',
    'evidence','vendor','assets','incidents','controls','reporting',
    'knowledge','access','ai-os','ai-platform','config-center','dauth',
    'dnoc','dos-platform','dsoc','foundation-admin','multi-tenant-mgmt',
    'runtime','tenant-management','ui-system'
  ];
  ck_perm text;
  v_path  text;
  v_id    uuid;
BEGIN
  FOREACH m IN ARRAY module_codes LOOP
    -- Skip modules that are not yet registered in dos.dynamic_ui_modules
    -- (FK constraint). Platform projector will add them as they enroll.
    IF NOT EXISTS (SELECT 1 FROM dos.dynamic_ui_modules WHERE module_code = m) THEN
      CONTINUE;
    END IF;
    v_path := '/' || m;

    -- Pick a permission that exists for this module (read preferred,
    -- otherwise any). The FK fk_perm_catalog_dynamic_ui_routes requires
    -- permission_key to exist in platform_dauth.permissions.
    ck_perm := NULL;
    SELECT permission_code INTO ck_perm
      FROM platform_dauth.permissions
     WHERE module_code = m
       AND action_type = 'read'
     ORDER BY permission_code
     LIMIT 1;
    IF ck_perm IS NULL THEN
      SELECT permission_code INTO ck_perm
        FROM platform_dauth.permissions
       WHERE module_code = m
       ORDER BY permission_code
       LIMIT 1;
    END IF;
    IF ck_perm IS NULL THEN
      -- No permission registered yet for this module; the platform
      -- projector will bind the route once permissions land. Skip.
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
        (NULL, m, v_path, 'module.entry.page', ck_perm,
         0, 'ready', 'overview', 'dashboard', 'module-overview', 'monitor',
         'tenant', false, m || '.entry.title', m || '.entry.subtitle');
    ELSE
      UPDATE dos.dynamic_ui_routes
         SET component_key  = 'module.entry.page',
             permission_key = ck_perm,
             page_type      = 'overview',
             layout         = 'dashboard',
             kpi_scope      = 'module-overview',
             user_intent    = 'monitor',
             title_key      = m || '.entry.title',
             subtitle_key   = m || '.entry.subtitle'
       WHERE id = v_id;
    END IF;
  END LOOP;
END $$;

COMMIT;

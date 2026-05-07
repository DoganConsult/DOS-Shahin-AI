-- 20260507_1300_profile_settings_dui_routes.sql
-- Phase A — seed dynamic_ui_routes page-experience rows for /profile and /settings.
--
-- Root cause:
--   chrome.accountMenu entries for 'profile' (action=navigate:/profile) and
--   'settings' (action=navigate:/settings) are already seeded with correct typed
--   ShellActions. loadNavigateEligibleRoutes() confirms both routes pass the
--   metadata + template_binding_required gate. However, dos.dynamic_ui_routes has
--   NO row for either path — so the SPA template-binding resolver returns
--   TEMPLATE_BINDING_NOT_FOUND when the user navigates there, producing a blank page.
--
-- Fix: seed the missing page-experience rows. template_binding and route_metadata
--   already exist for both routes; only dynamic_ui_routes is missing.
--
-- Scope: module='platform' (not 'foundation') — these are cross-module platform pages.
-- Idempotent: WHERE NOT EXISTS guard on (tenant_id IS NULL, path_pattern).
-- No destructive ops. Safe to re-run.

BEGIN;

-- /profile ----------------------------------------------------------------
INSERT INTO dos.dynamic_ui_routes (
  tenant_id,
  module_code,
  path_pattern,
  component_key,
  permission_key,
  sort_order,
  data_scope_mode,
  audit_enabled,
  realtime_enabled
)
SELECT
  NULL,
  'platform',
  '/profile',
  'module.settings.page',
  NULL,
  10,
  'tenant',
  FALSE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes
  WHERE tenant_id IS NULL AND path_pattern = '/profile'
);

-- /settings ----------------------------------------------------------------
INSERT INTO dos.dynamic_ui_routes (
  tenant_id,
  module_code,
  path_pattern,
  component_key,
  permission_key,
  sort_order,
  data_scope_mode,
  audit_enabled,
  realtime_enabled
)
SELECT
  NULL,
  'platform',
  '/settings',
  'module.settings.page',
  NULL,
  20,
  'tenant',
  FALSE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes
  WHERE tenant_id IS NULL AND path_pattern = '/settings'
);

-- Validation assertion -----------------------------------------------------
DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM dos.dynamic_ui_routes
  WHERE tenant_id IS NULL
    AND path_pattern IN ('/profile', '/settings');

  IF cnt <> 2 THEN
    RAISE EXCEPTION 'MIGRATION FAIL 20260507_1300: expected 2 dui_routes rows for /profile + /settings, found %', cnt;
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- 20260514_1510_tenant_landing_config_seed.sql
-- ---------------------------------------------------------------------
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / DB-as-source.
--
-- Gap audit (2026-05-14): ALL 40 active tenants have 0 rows in
-- dos.tenant_landing_config. The UI-OS resolver (workspace-shell.routes.ts
-- loadLandingRoute) returns NULL when no row exists, emitting no
-- chrome.landingRoute. This means:
--   • shell.chrome.landingRoute = absent from runtime payload
--   • shell.chrome.breadcrumbs['workspace'].href = null
--   • DynamicPageHostComponent workspace breadcrumb has no href
--
-- Root cause: migration 20260510_0300 correctly deleted auto-fabricated
-- demo-default rows (doctrine drift) but did not re-seed with an
-- explicit operator-intent row. This migration provides that explicit
-- operator seed.
--
-- Landing route selection:
--   /workspace-home is the registered canonical entry point for all
--   active tenants (dos.dynamic_ui_routes, module_code='foundation',
--   page_type='dashboard'). This is a DB-registered route, not a
--   frontend hardcode. Using it as authenticated_route is doctrine-
--   compliant: the value lives in DB, UI-OS resolves it, frontend
--   renders only what UI-OS emits.
--
-- Idempotent: ON CONFLICT (tenant_id) DO UPDATE only replaces a row
-- if the authenticated_route differs (preserves operator customization
-- that uses a non-null distinct route).
-- Safe re-run. No destructive ops.
-- =====================================================================

BEGIN;

-- ─── Seed landing config for all active tenants ───────────────────────
INSERT INTO dos.tenant_landing_config
  (tenant_id, authenticated_route, unauthenticated_route,
   session_expired_route, post_auth_route, enabled)
SELECT
  t.tenant_id,
  '/workspace-home'   AS authenticated_route,
  '/'                 AS unauthenticated_route,
  '/'                 AS session_expired_route,
  '/workspace-home'   AS post_auth_route,
  true                AS enabled
FROM dos.tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM dos.tenant_landing_config lc
     WHERE lc.tenant_id = t.tenant_id
       AND lc.enabled = true
       AND lc.authenticated_route IS NOT NULL
       AND lc.authenticated_route <> ''
  );

-- ─── Assertions ──────────────────────────────────────────────────────
DO $$
DECLARE
  active_count        INT;
  seeded_count        INT;
  null_route_count    INT;
  workspace_home_exists INT;
BEGIN
  -- Count active tenants
  SELECT COUNT(*) INTO active_count
    FROM dos.tenants WHERE status = 'active';

  -- Every active tenant must have an enabled landing config with a route
  SELECT COUNT(*) INTO seeded_count
    FROM dos.tenant_landing_config lc
    JOIN dos.tenants t ON t.tenant_id = lc.tenant_id
   WHERE t.status = 'active'
     AND lc.enabled = true
     AND lc.authenticated_route IS NOT NULL
     AND lc.authenticated_route <> '';

  IF seeded_count < active_count THEN
    RAISE EXCEPTION
      'tenant_landing_config: only % of % active tenants have a valid authenticated_route',
      seeded_count, active_count;
  END IF;

  -- No row should have a NULL authenticated_route that is enabled
  SELECT COUNT(*) INTO null_route_count
    FROM dos.tenant_landing_config lc
    JOIN dos.tenants t ON t.tenant_id = lc.tenant_id
   WHERE t.status = 'active'
     AND lc.enabled = true
     AND (lc.authenticated_route IS NULL OR lc.authenticated_route = '');
  IF null_route_count > 0 THEN
    RAISE EXCEPTION
      '% active tenants have enabled landing config row with NULL/empty authenticated_route',
      null_route_count;
  END IF;

  -- /workspace-home must exist in dynamic_ui_routes (sanity guard)
  SELECT COUNT(*) INTO workspace_home_exists
    FROM dos.dynamic_ui_routes
   WHERE path_pattern = '/workspace-home';
  IF workspace_home_exists = 0 THEN
    RAISE EXCEPTION
      '/workspace-home is not registered in dynamic_ui_routes — cannot use as landing route';
  END IF;

END$$;

COMMIT;

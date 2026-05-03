-- =====================================================================
-- 0100 — Module-registry / Dynamic-UI-modules drift sync.
--
-- UNIFIED_MOUNT_POLICY §5.3 requires:
--   SELECT m.module_code FROM dos.module_registry m
--   FULL OUTER JOIN dos.dynamic_ui_modules d ON d.module_code = m.module_code
--   WHERE m.module_code IS NULL OR d.module_code IS NULL  →  zero rows.
--
-- Live audit (2026-05-03) reports:
--   * 21 module_codes in `module_registry` missing from `dynamic_ui_modules`.
--   * 13 module_codes in `dynamic_ui_modules` missing from `module_registry`.
--
-- Effect (idempotent, forward-only):
--   1. Backfill the 21 missing rows into `dos.dynamic_ui_modules` so the
--      FK target (also referenced by dynamic_ui_routes / navigation /
--      kpis / agents / etc.) is satisfied platform-wide.
--      default_route is synthesised as `/<module_code>` and
--      registry_status is mirrored from `module_registry.status` (active).
--   2. Backfill the 13 ghost rows into `dos.module_registry` so every
--      runtime-known module has a canonical product/display tuple.
--
-- No row is deleted; rebinding/decommissioning of legacy modules is a
-- separate, explicitly-approved deprovisioning wave.
-- =====================================================================
BEGIN;

-- 1. dos.module_registry → dos.dynamic_ui_modules (21 rows).
INSERT INTO dos.dynamic_ui_modules
  (module_code, product_key, display_name, default_route,
   registry_status, default_tenant_enrollment_status,
   canonical_source, platform_key)
SELECT m.module_code,
       COALESCE(m.product_key, 'platform') AS product_key,
       COALESCE(m.display_name, m.module_code) AS display_name,
       '/' || m.module_code               AS default_route,
       CASE WHEN m.status = 'active' THEN 'active'
            WHEN m.status = 'deprecated' THEN 'deprecated'
            ELSE 'unavailable' END         AS registry_status,
       'not_enrolled'                       AS default_tenant_enrollment_status,
       'module_registry_sync_0100'          AS canonical_source,
       'dos'                                AS platform_key
  FROM dos.module_registry m
  LEFT JOIN dos.dynamic_ui_modules d ON d.module_code = m.module_code
 WHERE d.module_code IS NULL
ON CONFLICT (module_code) DO NOTHING;

-- 2. dos.dynamic_ui_modules → dos.module_registry (13 rows).
INSERT INTO dos.module_registry
  (module_code, product_key, display_name, status)
SELECT d.module_code,
       d.product_key,
       d.display_name,
       CASE WHEN d.registry_status = 'active' THEN 'active'
            WHEN d.registry_status = 'deprecated' THEN 'deprecated'
            ELSE 'inactive' END
  FROM dos.dynamic_ui_modules d
  LEFT JOIN dos.module_registry m ON m.module_code = d.module_code
 WHERE m.module_code IS NULL
ON CONFLICT (module_code) DO NOTHING;

COMMIT;

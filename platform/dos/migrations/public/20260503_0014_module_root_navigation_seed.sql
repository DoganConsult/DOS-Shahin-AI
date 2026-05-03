-- =====================================================================
-- 0014 — Seed dos.dynamic_ui_navigation root entries for every module
-- whose root route is bound to `module.entry.page`.
--
-- Why: WorkspaceNavigationAdapter merges 6 sources. L1 (DynamicUiNavSource)
-- returns null because the dynamic-ui workspace endpoint is .skipped, and
-- L4 (product composition) only emits items declared in the bundled
-- product.manifest.json. Modules entitled but not in the manifest fall
-- to L5 (AccessStoreNavSource) which marks them `route-not-wired` —
-- visibly disabled. To surface the platform-projected module roots in
-- the sidenav with real routes, every module that has a row in
-- dos.dynamic_ui_modules AND a public root route in dos.dynamic_ui_routes
-- must also have a corresponding `dos.dynamic_ui_navigation` row.
--
-- Idempotent. Pure projector pattern — readiness is set to 'ready' only
-- when both the route row exists and the module row exists.
--
-- Constraints:
--   * No deletes.
--   * No trigger weakening.
--   * tenant_id IS NULL (platform-owned, applies to every tenant).
--   * Label is humanised module_code; runtime overrides via i18n key
--     `<module_code>.entry.title` if present.
-- =====================================================================
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dynamic_ui_navigation_platform_module_route
  ON dos.dynamic_ui_navigation (module_code, route)
  WHERE tenant_id IS NULL AND parent_id IS NULL;

WITH module_roots AS (
  SELECT
    m.module_code,
    rt.path_pattern AS route,
    -- Humanise: foundation -> Foundation, ai-os -> Ai Os
    initcap(replace(m.module_code, '-', ' ')) AS label
  FROM dos.dynamic_ui_modules m
  INNER JOIN dos.dynamic_ui_routes rt
    ON  rt.module_code = m.module_code
    AND rt.tenant_id IS NULL
    AND rt.component_key = 'module.entry.page'
)
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT
  NULL,
  mr.module_code,
  mr.label,
  mr.route,
  100,
  NULL,
  'ready'
FROM module_roots mr
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_navigation n
   WHERE n.tenant_id IS NULL
     AND n.parent_id IS NULL
     AND n.module_code = mr.module_code
     AND n.route       = mr.route
);

COMMIT;

-- =====================================================================
-- Validation (read-only). After apply, expect:
--   1. Every module in dos.dynamic_ui_modules with a module.entry.page
--      route has at least one platform-owned (tenant_id IS NULL) root
--      navigation row.
--      SELECT m.module_code
--        FROM dos.dynamic_ui_modules m
--        JOIN dos.dynamic_ui_routes  rt
--          ON rt.module_code = m.module_code
--         AND rt.tenant_id IS NULL
--         AND rt.component_key = 'module.entry.page'
--       WHERE NOT EXISTS (
--         SELECT 1 FROM dos.dynamic_ui_navigation n
--          WHERE n.module_code = m.module_code
--            AND n.tenant_id IS NULL
--            AND n.parent_id IS NULL);
--      -- expected: 0 rows
--
--   2. No row was emitted for a module not present in dos.dynamic_ui_modules.
--      SELECT count(*) FROM dos.dynamic_ui_navigation n
--       LEFT JOIN dos.dynamic_ui_modules m USING (module_code)
--       WHERE n.tenant_id IS NULL AND m.module_code IS NULL;
--      -- expected: prior unrelated rows only; this migration adds none.
-- =====================================================================

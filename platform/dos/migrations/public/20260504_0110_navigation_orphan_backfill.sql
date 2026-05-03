-- =====================================================================
-- 0110 — Backfill navigation rows for customer-bound nav-orphan routes.
--
-- UNIFIED_MOUNT_POLICY §5.2 requires every active route with a non-null
-- permission_key to have at least one row in dos.dynamic_ui_navigation
-- (so AccessStore + workspace-shell can resolve a sidebar entry instead
-- of leaving the page reachable only by URL guess).
--
-- Live audit (2026-05-03) reports 72 nav-orphan routes spanning:
--   * /admin/*  (access, ai, config-center, dauth, dnoc, dos, dsoc,
--                foundation, multi-tenant, runtime, tenants, ui-system)
--   * /foundation/*  (workspace foundation pages)
--   * /compliance/controls/:id  (workspace compliance detail)
--   * /profile, /tenant-profile, /tenant-settings  (foundation utility)
--
-- Effect (idempotent, forward-only): for every route in the orphan set,
-- insert one platform-default navigation row (tenant_id NULL, parent_id
-- NULL). The route's module_code already references a real
-- dynamic_ui_modules row (verified by the FK probe in PR notes), so
-- the FK constraint is satisfied. Sort order is deterministic via
-- row_number() within each module ordered by path_pattern.
--
-- Label generation rule: take the last path segment, strip leading ':',
-- replace '-' / '_' with spaces and title-case via initcap(). Detail
-- routes ('/foo/:id') receive label 'Detail'. This is a system-default
-- label; tenants can override per row via a future tenant-scoped insert.
-- =====================================================================
BEGIN;

WITH orphan AS (
  SELECT r.path_pattern,
         r.module_code,
         CASE
           WHEN regexp_replace(r.path_pattern, '.*/', '') LIKE ':%' THEN 'Detail'
           ELSE initcap(replace(replace(regexp_replace(r.path_pattern, '.*/', ''), '-', ' '), '_', ' '))
         END                                                       AS label
    FROM dos.dynamic_ui_routes r
    LEFT JOIN dos.dynamic_ui_navigation n
      ON n.route = r.path_pattern
     AND n.tenant_id IS NULL
     AND n.parent_id IS NULL
   WHERE r.permission_key IS NOT NULL
     AND n.route IS NULL
), ordered AS (
  SELECT path_pattern,
         module_code,
         label,
         row_number() OVER (PARTITION BY module_code ORDER BY path_pattern) AS sort_order
    FROM orphan
)
INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT NULL, o.module_code, o.label, o.path_pattern, o.sort_order, NULL, 'PARTIAL'
  FROM ordered o
ON CONFLICT (module_code, route) WHERE tenant_id IS NULL AND parent_id IS NULL
DO NOTHING;

COMMIT;

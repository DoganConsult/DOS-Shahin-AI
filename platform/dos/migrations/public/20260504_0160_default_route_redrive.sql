-- =====================================================================
-- 0160 — Re-derive `default_route` in dos.dynamic_ui_modules.
--
-- Phase F-F7-7 — migration 0100 synthesised default_route as
-- `/<module_code>` for every module backfilled into dynamic_ui_modules.
-- For ~14 of the 25 modules this is wrong because their actual routes
-- live under `/admin/...`, `/ops/...`, `/ai-os/...`, etc. Workspace
-- "Open Module" affordances therefore navigate to a 404 / dynamic
-- template fallback instead of the module's real landing page.
--
-- Effect (idempotent, forward-only): for every module with at least
-- one row in dos.dynamic_ui_routes, set default_route to the
-- alphabetically-min path_pattern (deterministic + stable across runs).
-- Modules with zero routes keep their existing default_route.
-- =====================================================================
BEGIN;

WITH min_route AS (
  SELECT module_code, min(path_pattern) AS min_path
    FROM dos.dynamic_ui_routes
   GROUP BY module_code
)
UPDATE dos.dynamic_ui_modules d
   SET default_route = mr.min_path
  FROM min_route mr
 WHERE d.module_code = mr.module_code
   AND d.default_route IS DISTINCT FROM mr.min_path;

COMMIT;

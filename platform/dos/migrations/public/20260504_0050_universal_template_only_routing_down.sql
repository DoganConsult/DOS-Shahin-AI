-- =====================================================================
-- 0050_down — Reverse universal component_key normalisation.
--
-- 0050 derived component_key from ui_route_template_binding.archetype
-- using the canonical archetype-to-key map. The pre-image was the
-- per-route component_key as it stood after 0040. Because the original
-- pre-image has no single source of truth (each module pack chose its
-- own legacy key), this down-migration is intentionally a NO-OP that
-- documents the recovery procedure:
--
--   1. Restore the affected `dos.dynamic_ui_routes` rows from a backup
--      taken before 0050 (production DBA action).
--   2. Re-apply 0050 if rollback is partial.
--
-- Forward-only safety: every active route's component_key still
-- resolves via component-map.ts whether it is legacy or canonical, so
-- skipping the rewrite does NOT break runtime rendering.
-- =====================================================================
BEGIN;
-- intentional no-op; see header comment.
SELECT 1;
COMMIT;

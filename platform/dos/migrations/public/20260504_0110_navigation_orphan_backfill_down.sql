-- =====================================================================
-- 0110_down — Reverse navigation orphan backfill.
-- Removes every system-default (tenant_id NULL, parent_id NULL,
-- readiness='PARTIAL') navigation row whose route is currently in the
-- orphan-eligible set defined by §5.2.
-- =====================================================================
BEGIN;

DELETE FROM dos.dynamic_ui_navigation n
 USING dos.dynamic_ui_routes r
 WHERE n.route = r.path_pattern
   AND n.tenant_id IS NULL
   AND n.parent_id IS NULL
   AND n.readiness = 'PARTIAL'
   AND r.permission_key IS NOT NULL;

COMMIT;

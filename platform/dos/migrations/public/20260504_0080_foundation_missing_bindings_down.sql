-- =====================================================================
-- 0080_down — Reverse the 5 missing-foundation bindings.
-- Removes ui_route_template_binding rows added by 0080. Does not
-- restore the previous component_key on dynamic_ui_routes because the
-- archetype keys remain valid; rerunning 0050/0080 is idempotent.
-- =====================================================================
BEGIN;

DELETE FROM dos.ui_route_template_binding
 WHERE route IN (
   '/foundation/ownership',
   '/foundation/sod',
   '/foundation/hierarchy-viz',
   '/foundation/user-lifecycle',
   '/foundation/diagnostics'
 );

COMMIT;

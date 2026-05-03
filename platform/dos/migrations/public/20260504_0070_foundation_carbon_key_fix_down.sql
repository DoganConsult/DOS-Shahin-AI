-- =====================================================================
-- 0070_down — Remove the deprecated `data-table` carbon catalog alias.
-- Safe only when no `dos.dynamic_ui_component_registry` row references
-- carbon_key='data-table'. Migration 0040 rewrote all reachable rows
-- away from foundation.*.page keys, so the alias is referenced only by
-- the legacy 16 foundation rows (unreachable from any URL).
-- =====================================================================
BEGIN;

DELETE FROM dos.ui_carbon_components
 WHERE carbon_key = 'data-table'
   AND integration_mode = 'deprecated-alias';

COMMIT;

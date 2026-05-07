-- =====================================================================
-- Wave 17 — Disable workspace.shell.empty-state surface
--
-- Root cause:
--   Shell-host renders every workspace_shell_binding row in zones.main
--   alongside the router-outlet's dynamic-template-page. For routes that
--   ARE bound to a template (all 21 foundation routes via
--   dos.ui_route_template_binding), the user sees both the actual page
--   AND the "Workspace ready / Module surfaces will appear here once
--   activated" placeholder — a duplicated render path that contradicts
--   the page-level dos-empty-state fallback in
--   platform/core/platform/shell/dynamic-template-page.component.ts.
--
-- Doctrine fix:
--   The page-level component already renders the only legitimate
--   empty-state ("dos-tpl-fallback") when no template binding exists.
--   The shell-level empty-state surface is redundant and produces a
--   misleading placeholder on bound routes.
--   Disable it at the DB layer (idempotent, no destructive drop).
-- =====================================================================

BEGIN;

UPDATE dos.workspace_shell_binding
   SET enabled = false, updated_at = NOW(), version = version + 1
 WHERE component_key = 'workspace.shell.empty-state'
   AND enabled = true;

DO $$
DECLARE remaining INT;
BEGIN
  SELECT count(*) INTO remaining
    FROM dos.workspace_shell_binding
   WHERE component_key='workspace.shell.empty-state' AND enabled=true;
  IF remaining > 0 THEN
    RAISE EXCEPTION 'wave17: % shell empty-state rows still enabled', remaining;
  END IF;
  RAISE NOTICE 'wave17 proof: shell empty-state surfaces disabled';
END$$;

COMMIT;

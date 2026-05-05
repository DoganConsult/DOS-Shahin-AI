-- =============================================================================
-- Migration: 20260505_2000_workspace_shell_zone_metadata.sql
-- Purpose:   Stamp metadata.zone on every workspace.* row in
--            dos.dynamic_ui_component_registry so the resolver
--            (services/ui-os-service/src/routes/workspace-shell.routes.ts)
--            can be fully DB-driven and stop hardcoding the 60-key array
--            and the FRAME_ZONE_PREFIXES table.
--
-- Zone derivation rules (one-time, deterministic):
--   workspace.frame.header*           -> 'header'
--   workspace.frame.side-nav*         -> 'sidebar'
--   workspace.frame.ui-shell          -> 'main'
--   workspace.frame.content           -> 'content'
--   workspace.frame.* (catch-all)     -> 'main'
--   workspace.{nav,data,input,
--              action,polish}.*       -> 'content'
--
-- Tenant-level overrides remain available via
--   dos.workspace_shell_binding.props->>'zone'
-- which always wins over registry metadata at resolver time.
--
-- Idempotent: stamps zone only on rows where it is currently missing or
-- different. Safe to re-run.
-- =============================================================================

BEGIN;

UPDATE dos.dynamic_ui_component_registry
   SET metadata = metadata || jsonb_build_object('zone', zone_value)
  FROM (
    SELECT component_key,
           CASE
             WHEN component_key LIKE 'workspace.frame.header%'   THEN 'header'
             WHEN component_key LIKE 'workspace.frame.side-nav%' THEN 'sidebar'
             WHEN component_key  =   'workspace.frame.ui-shell'  THEN 'main'
             WHEN component_key  =   'workspace.frame.content'   THEN 'content'
             WHEN component_key LIKE 'workspace.frame.%'         THEN 'main'
             WHEN component_key LIKE 'workspace.%'               THEN 'content'
             ELSE NULL
           END AS zone_value
      FROM dos.dynamic_ui_component_registry
     WHERE component_key LIKE 'workspace.%'
       AND approval_status = 'approved'
  ) AS z
 WHERE dos.dynamic_ui_component_registry.component_key = z.component_key
   AND z.zone_value IS NOT NULL
   AND COALESCE(dos.dynamic_ui_component_registry.metadata->>'zone', '') <> z.zone_value;

-- Self-assertion: every approved workspace.* row now carries metadata.zone.
DO $$
DECLARE
  missing int;
BEGIN
  SELECT count(*) INTO missing
    FROM dos.dynamic_ui_component_registry
   WHERE component_key LIKE 'workspace.%'
     AND approval_status = 'approved'
     AND (metadata->>'zone') IS NULL;
  IF missing > 0 THEN
    RAISE EXCEPTION 'workspace zone backfill incomplete: % rows missing metadata.zone', missing;
  END IF;
  RAISE NOTICE 'workspace zone backfill OK — 0 rows missing metadata.zone';
END $$;

COMMIT;

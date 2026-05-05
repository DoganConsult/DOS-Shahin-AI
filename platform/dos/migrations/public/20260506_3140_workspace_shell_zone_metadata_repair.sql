-- =============================================================================
-- Migration: 20260506_3140_workspace_shell_zone_metadata_repair.sql
-- Purpose:   Repair metadata.zone on approved workspace.* registry rows where
--            metadata IS NULL or zone missing/wrong. Older migration
--            20260505_2000 used `metadata || jsonb` without COALESCE — in
--            PostgreSQL NULL || jsonb yields NULL, so zones were never stamped.
--
-- Zone rules (narrow CASE; no blind `workspace.%` → content catch-all):
--   workspace.frame.header%           -> 'header'
--   workspace.frame.side-nav%         -> 'sidebar'
--   workspace.frame.ui-shell          -> 'main'
--   workspace.frame.content           -> 'content'
--   workspace.frame.%                 -> 'main'
--   workspace.nav.%                   -> 'content'
--   workspace.data.%                  -> 'content'
--   workspace.input.%                 -> 'content'
--   workspace.action.%                -> 'content'
--   workspace.polish.%                -> 'content'
--   ELSE                              -> NULL (legacy keys must be handled explicitly)
--
-- Resolver: services/ui-os-service/src/routes/workspace-shell.routes.ts
-- =============================================================================

BEGIN;

WITH zone_map AS (
  SELECT r.component_key,
         CASE
           WHEN r.component_key LIKE 'workspace.frame.header%' THEN 'header'
           WHEN r.component_key LIKE 'workspace.frame.side-nav%' THEN 'sidebar'
           WHEN r.component_key = 'workspace.frame.ui-shell' THEN 'main'
           WHEN r.component_key = 'workspace.frame.content' THEN 'content'
           WHEN r.component_key LIKE 'workspace.frame.%' THEN 'main'
           WHEN r.component_key LIKE 'workspace.nav.%' THEN 'content'
           WHEN r.component_key LIKE 'workspace.data.%' THEN 'content'
           WHEN r.component_key LIKE 'workspace.input.%' THEN 'content'
           WHEN r.component_key LIKE 'workspace.action.%' THEN 'content'
           WHEN r.component_key LIKE 'workspace.polish.%' THEN 'content'
           ELSE NULL
         END AS zone_value
    FROM dos.dynamic_ui_component_registry r
   WHERE r.component_key LIKE 'workspace.%'
     AND r.approval_status = 'approved'
)
UPDATE dos.dynamic_ui_component_registry r
   SET metadata = COALESCE(r.metadata, '{}'::jsonb)
                  || jsonb_build_object('zone', z.zone_value)
  FROM zone_map z
 WHERE r.component_key = z.component_key
   AND z.zone_value IS NOT NULL
   AND COALESCE(NULLIF(trim(r.metadata->>'zone'), ''), '') <> z.zone_value;

DO $$
DECLARE
  missing int;
BEGIN
  SELECT count(*) INTO missing
    FROM dos.dynamic_ui_component_registry
   WHERE component_key LIKE 'workspace.%'
     AND approval_status = 'approved'
     AND (
           metadata IS NULL
        OR NULLIF(trim(metadata->>'zone'), '') IS NULL
         );
  IF missing > 0 THEN
    RAISE EXCEPTION
      'workspace zone repair incomplete: % approved workspace.* rows missing metadata.zone',
      missing;
  END IF;
  RAISE NOTICE 'workspace zone repair OK — 0 approved workspace.* rows missing metadata.zone';
END $$;

COMMIT;

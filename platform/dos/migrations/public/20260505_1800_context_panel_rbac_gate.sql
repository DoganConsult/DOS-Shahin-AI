-- =============================================================================
-- Migration: 20260505_1800_context_panel_rbac_gate
-- Purpose:   Add RBAC gate to workspace.context-panel surface.
--
-- Issue:     The context-panel surface was seeded with empty permissions
--            (ARRAY[]::text[]) in 20260504_0010_workspace_shell_registry.sql,
--            allowing anyone with shell access to see it regardless of their
--            actual permissions. This is a security gap.
--
-- Fix:       Update all workspace.context-panel rows in
--            dos.workspace_shell_binding to require workspace.read permission.
--            This ensures only users with workspace.read access can view the
--            context panel (which shows record details, audit info, and AI insights).
--
-- Idempotent: YES — UPDATE matches only rows with empty perms_required.
--             Re-runs become no-ops once the RBAC gate is applied.
-- =============================================================================

BEGIN;

-- Add RBAC gate to workspace.context-panel for all tenants
UPDATE dos.workspace_shell_binding
   SET perms_required = ARRAY['workspace.read']
 WHERE component_key = 'workspace.context-panel'
   AND perms_required = '{}'::text[];

-- Self-assertion: zero context-panel rows should still have empty perms_required
DO $$
DECLARE
  empty_count integer;
BEGIN
  SELECT count(*)
    INTO empty_count
    FROM dos.workspace_shell_binding
   WHERE component_key = 'workspace.context-panel'
     AND perms_required = '{}'::text[];
  IF empty_count <> 0 THEN
    RAISE EXCEPTION
      'context-panel RBAC gate migration left % tenants with empty perms_required',
      empty_count;
  END IF;
END $$;

COMMIT;

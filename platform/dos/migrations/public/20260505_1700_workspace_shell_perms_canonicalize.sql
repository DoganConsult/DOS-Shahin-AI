-- =============================================================================
-- Migration: 20260505_1700_workspace_shell_perms_canonicalize
-- Purpose:   Forward-only canonicalization of `dos.workspace_shell_binding`
--            `perms_required` to the long-form `workspace.*` permission
--            namespace.
--
--            Drift origin: the original backfill in
--            20260504_0010_workspace_shell_registry.sql §3 used short-form
--            permission names (`search.use`, `inbox.read`, `records.create`,
--            `workqueue.read`, `agents.observe`). The auto-seed trigger in
--            20260505_1500_tenant_dna_auto_seed_trigger.sql canonicalized to
--            long-form (`workspace.search.use`, `workspace.inbox.read`,
--            `workspace.records.create`, `workspace.workqueue.read`,
--            `workspace.agents.observe`). New tenants are clean; tenants
--            seeded between 2026-05-04 and 2026-05-05 may carry mixed forms.
--
--            This migration normalizes any remaining short-form rows to the
--            canonical long-form so `WorkspaceShellBindingService.isSurfaceAllowed`
--            and `AccessStore.hasPermission` agree on a single namespace
--            for surface gating across the fleet.
--
-- Idempotent: YES — UPDATE matches only short-form rows; re-runs become
--             no-ops once canonicalized.
--
-- PnP discipline (Doctrine Article 11): additive — perm names rotated
--             from short-form to long-form; no row deletion, no schema
--             change, no constraint drop.
-- =============================================================================

BEGIN;

UPDATE dos.workspace_shell_binding
   SET perms_required = ARRAY['workspace.search.use']
 WHERE component_key = 'workspace.command-search'
   AND perms_required <@ ARRAY['search.use']
   AND NOT (perms_required @> ARRAY['workspace.search.use']);

UPDATE dos.workspace_shell_binding
   SET perms_required = ARRAY['workspace.inbox.read']
 WHERE component_key = 'workspace.inbox-center'
   AND perms_required <@ ARRAY['inbox.read']
   AND NOT (perms_required @> ARRAY['workspace.inbox.read']);

UPDATE dos.workspace_shell_binding
   SET perms_required = ARRAY['workspace.records.create']
 WHERE component_key = 'workspace.quick-create'
   AND perms_required <@ ARRAY['records.create']
   AND NOT (perms_required @> ARRAY['workspace.records.create']);

UPDATE dos.workspace_shell_binding
   SET perms_required = ARRAY['workspace.workqueue.read']
 WHERE component_key = 'workspace.action-queue'
   AND perms_required <@ ARRAY['workqueue.read']
   AND NOT (perms_required @> ARRAY['workspace.workqueue.read']);

UPDATE dos.workspace_shell_binding
   SET perms_required = ARRAY['workspace.agents.observe']
 WHERE component_key = 'workspace.agent-strip'
   AND perms_required <@ ARRAY['agents.observe']
   AND NOT (perms_required @> ARRAY['workspace.agents.observe']);

-- Self-assertion: zero rows still carry the short-form perm namespace.
DO $$
DECLARE
  drift_count integer;
BEGIN
  SELECT count(*)
    INTO drift_count
    FROM dos.workspace_shell_binding
   WHERE perms_required && ARRAY[
           'search.use','inbox.read','records.create',
           'workqueue.read','agents.observe'
         ];
  IF drift_count <> 0 THEN
    RAISE EXCEPTION
      'workspace_shell_binding perm canonicalization left % short-form rows',
      drift_count;
  END IF;
END $$;

COMMIT;

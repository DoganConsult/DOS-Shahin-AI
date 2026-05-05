-- =============================================================================
-- Migration: 20260505_1200_grant_workspace_shell_perms_baseline_roles
-- Purpose:   Close the workspace-shell permission void identified in the
--            tenant-completeness audit (2026-05-04). Five workspace.* perms
--            are written into dos.workspace_shell_binding.perms_required[]
--            but NO functional role in platform_dauth.functional_roles.permissions[]
--            holds them, so isSurfaceAllowed() returns false for every surface
--            even for fully-bundled tenants.
--
-- Effect:    Append the 5 workspace.* perms to the permissions[] array of
--            standard_user, tenant_admin, tenant_owner, platform_super_admin
--            (idempotent — uses array_append-on-not-exists pattern).
--
-- Idempotent: YES. Safe to run multiple times. Uses array deduplication.
--
-- Risk:      LOW. Read-only shell perms — does not unlock any record write
--            path. Pure additive grant.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  baseline_role_codes text[] := ARRAY['standard_user','tenant_admin','tenant_owner','platform_super_admin'];
  shell_perms         text[] := ARRAY[
    'workspace.search.use',
    'workspace.workqueue.read',
    'workspace.agents.observe',
    'workspace.inbox.read',
    'workspace.records.create'
  ];
  rc text;
  pc text;
BEGIN
  FOREACH rc IN ARRAY baseline_role_codes LOOP
    FOREACH pc IN ARRAY shell_perms LOOP
      UPDATE platform_dauth.functional_roles
         SET permissions = (
           SELECT ARRAY(
             SELECT DISTINCT unnest(COALESCE(permissions, '{}'::text[]) || ARRAY[pc])
           )
         )
       WHERE role_code = rc
         AND NOT (pc = ANY(COALESCE(permissions, '{}'::text[])));
    END LOOP;
  END LOOP;
END $$;

-- Assertion: every shell perm now grantable through ≥1 baseline role.
DO $$
DECLARE
  missing_count int;
BEGIN
  SELECT count(*) INTO missing_count
    FROM unnest(ARRAY[
      'workspace.search.use',
      'workspace.workqueue.read',
      'workspace.agents.observe',
      'workspace.inbox.read',
      'workspace.records.create'
    ]) AS perm
   WHERE NOT EXISTS (
     SELECT 1 FROM platform_dauth.functional_roles
      WHERE role_code IN ('standard_user','tenant_admin','tenant_owner','platform_super_admin')
        AND perm = ANY(permissions)
   );
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'workspace-shell perm grant FAILED: % perms still ungranted', missing_count;
  END IF;
END $$;

COMMIT;

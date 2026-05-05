-- =============================================================================
-- 20260508_0001 — Grant direct-seed Foundation permissions to baseline roles
--
-- Purpose:
--   Align live baseline roles with the Foundation direct-seed contract used by
--   dos.ui_route_template_binding.permission_key and the dynamic template host.
--
-- Problem:
--   Active tenant users are bulk-promoted to tenant_admin, but the live
--   baseline role arrays still carry the legacy Foundation vocabulary
--   (foundation.read / foundation:read / foundation.record.* / foundation.org.*)
--   rather than the new direct-seed page permissions
--   (foundation.module.read / foundation.data.read / ...). That leaves the
--   outer Foundation guard and per-page permission gate out of sync with the
--   actual grants returned by tenant-service /permissions.
--
-- Fix:
--   Append the full direct-seed Foundation permission set to the baseline
--   roles that can operate the Foundation workspace today when those role
--   rows exist in platform_dauth.functional_roles:
--     - tenant_admin
--     - tenant_owner
--     - platform_super_admin
--
-- Notes:
--   platform_dauth.functional_roles.permissions[] is the canonical source
--   for tenant-service /permissions. The sync trigger keeps
--   platform_dauth.role_permissions aligned on UPDATE.
--
-- Idempotent: YES.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  baseline_role_codes text[] := ARRAY['tenant_admin', 'tenant_owner', 'platform_super_admin'];
  required_codes text[] := ARRAY[
    'foundation.module.read',
    'foundation.data.read',
    'foundation.data.write',
    'foundation.user.read',
    'foundation.user.write',
    'foundation.rbac.read',
    'foundation.review.read',
    'foundation.audit.read',
    'foundation.sod.write',
    'foundation.hierarchy.read',
    'foundation.module.admin',
    'foundation.record.read',
    'foundation.record.write',
    'foundation.record.delete',
    'foundation.record.approve',
    'foundation.org.read',
    'foundation.org.write',
    'foundation.system.manage'
  ];
  missing_codes text[];
BEGIN
  SELECT array_agg(code ORDER BY code)
    INTO missing_codes
  FROM unnest(required_codes) AS code
  WHERE NOT EXISTS (
    SELECT 1
      FROM platform_dauth.permissions p
     WHERE p.permission_code = code
  );

  IF missing_codes IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Foundation permission codes: %', missing_codes;
  END IF;

  UPDATE platform_dauth.functional_roles fr
     SET permissions = (
       SELECT array_agg(code ORDER BY code)
       FROM (
         SELECT DISTINCT unnest(COALESCE(fr.permissions, ARRAY[]::text[]) || required_codes) AS code
       ) dedup
     )
   WHERE fr.role_code = ANY(baseline_role_codes);
END $$;

DO $$
DECLARE
  baseline_role_codes text[] := ARRAY['tenant_admin', 'tenant_owner', 'platform_super_admin'];
  required_codes text[] := ARRAY[
    'foundation.module.read',
    'foundation.data.read',
    'foundation.data.write',
    'foundation.user.read',
    'foundation.user.write',
    'foundation.rbac.read',
    'foundation.review.read',
    'foundation.audit.read',
    'foundation.sod.write',
    'foundation.hierarchy.read',
    'foundation.module.admin',
    'foundation.record.read',
    'foundation.record.write',
    'foundation.record.delete',
    'foundation.record.approve',
    'foundation.org.read',
    'foundation.org.write',
    'foundation.system.manage'
  ];
  v_role_code text;
  missing_count integer;
BEGIN
  FOREACH v_role_code IN ARRAY baseline_role_codes LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM platform_dauth.functional_roles fr
       WHERE fr.role_code = v_role_code
    ) THEN
      CONTINUE;
    END IF;

    SELECT count(*)
      INTO missing_count
    FROM unnest(required_codes) AS code
    WHERE NOT EXISTS (
      SELECT 1
        FROM platform_dauth.functional_roles fr
       WHERE fr.role_code = v_role_code
         AND code = ANY(COALESCE(fr.permissions, ARRAY[]::text[]))
    );

    IF missing_count <> 0 THEN
      RAISE EXCEPTION 'Foundation baseline role grant incomplete for % (% missing)', v_role_code, missing_count;
    END IF;
  END LOOP;
END $$;

COMMIT;
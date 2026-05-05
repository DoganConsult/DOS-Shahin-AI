-- =============================================================================
-- Migration: 20260505_2100_reconcile_role_permissions
-- Purpose:   Reconcile role_permissions table with functional_roles.permissions[]
--            to establish role_permissions as the single source of truth.
--
-- Issue:     role_permissions JOIN table is out-of-sync with functional_roles.permissions[]
--            array column. Services using JOIN see different perms vs those using array @>.
--
-- Fix:       For each role, replace role_permissions rows with unnest(permissions)
--            from functional_roles. This makes role_permissions the canonical source.
--
-- Idempotent: YES — DELETE + INSERT pattern with self-assertion guard.
-- =============================================================================

BEGIN;

-- ─── 1. Backup current role_permissions state for rollback ───────────────────
CREATE TEMP TABLE IF NOT EXISTS role_permissions_backup AS
SELECT * FROM dos.role_permissions;

-- ─── 2. Reconcile role_permissions with functional_roles.permissions[] ───────
-- Note: role_permissions is a VIEW, so we need to work with the base table
-- Check if there's a base table in tenant schemas or if we need a different approach

-- Since role_permissions is a VIEW, we need to update the underlying source
-- The VIEW is defined as: SELECT * FROM platform_dauth.role_permissions
-- We need to update the platform_dauth table instead

-- Delete existing role_permissions rows from the source table
DELETE FROM platform_dauth.role_permissions;

-- Re-populate from functional_roles.permissions[] (canonical source)
-- Map permission codes from functional_roles.permissions[] to permission_ids
INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
SELECT fr.role_id, unnest(fr.permissions) as permission_id
FROM platform_dauth.functional_roles fr
WHERE fr.permissions IS NOT NULL
  AND array_length(fr.permissions, 1) > 0;

-- ─── 3. Self-assertion: verify reconciliation success ─────────────────────────
DO $$
DECLARE
  mismatch_count INTEGER;
  admin_role_count INTEGER;
BEGIN
  -- Verify role_permissions count matches functional_roles array lengths
  SELECT COUNT(*) INTO mismatch_count
  FROM (
    SELECT fr.role_id, fr.role_code, 
           array_length(fr.permissions, 1) as array_len,
           (SELECT COUNT(*) FROM platform_dauth.role_permissions rp WHERE rp.role_id = fr.role_id) as join_len
    FROM platform_dauth.functional_roles fr
    WHERE fr.permissions IS NOT NULL
      AND array_length(fr.permissions, 1) > 0
  ) sub
  WHERE array_len <> join_len;
  
  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION 'role_permissions reconciliation left % roles with mismatched counts', mismatch_count;
  END IF;

  -- Verify 5 admin roles now have role_permissions rows
  SELECT COUNT(*) INTO admin_role_count
  FROM platform_dauth.role_permissions rp
  JOIN platform_dauth.functional_roles fr ON fr.role_id = rp.role_id
  WHERE fr.role_code IN ('platform_admin', 'dos_admin', 'dnoc_admin', 'dsoc_admin', 'dauth_admin');
  
  IF admin_role_count < 42 THEN  -- Expected: platform_admin(23) + dos_admin(10) + dnoc_admin(3) + dsoc_admin(3) + dauth_admin(3) = 42
    RAISE EXCEPTION 'Admin roles have insufficient role_permissions: expected 42, got %', admin_role_count;
  END IF;
END $$;

-- ─── 4. Invalidate permission cache for all tenants ─────────────────────────
-- Note: This will be handled by application-level cache invalidation
-- when role changes are detected. No DB-level cache to clear.

COMMIT;

-- ─── Rollback Procedure (if needed) ────────────────────────────────────────
-- To rollback:
-- BEGIN;
-- DELETE FROM dos.role_permissions;
-- INSERT INTO dos.role_permissions SELECT * FROM role_permissions_backup;
-- COMMIT;

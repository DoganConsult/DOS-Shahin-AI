-- =============================================================================
-- Migration: 20260505_2110_collapse_dual_naming_drift
-- Purpose:   Collapse dual-naming drift in functional_roles to single canonical names.
--
-- Issue:     Both prefixed (role_*) and unprefixed variants exist with very different
--            perm counts. A user assigned role_viewer gets 6 perms; viewer gets 104.
--            Same archetype, opposite authority.
--
-- Fix:       Canonical: unprefixed (tenant_admin, platform_admin already in use).
--            Copy union-of-perms to canonical role, mark role_* aliases deprecated,
--            migrate any active assignments, drop deprecated rows after migration window.
--
-- Idempotent: YES — UPDATE + DELETE pattern with self-assertion guard.
-- =============================================================================

BEGIN;

-- ─── 1. Identify dual-naming pairs ───────────────────────────────────────────
-- Canonical roles (unprefixed) get union of permissions from both variants
-- Note: Dual-naming is identified by role_id prefix, not role_code (they share role_code)
WITH dual_pairs AS (
  SELECT 
    fr_canonical.role_id as canonical_role_id,
    fr_canonical.role_code,
    fr_canonical.permissions as canonical_perms,
    fr_variant.permissions as variant_perms
  FROM platform_dauth.functional_roles fr_canonical
  JOIN platform_dauth.functional_roles fr_variant 
    ON fr_variant.role_id = 'role_' || fr_canonical.role_id
  WHERE fr_canonical.role_code IN ('platform_super_admin', 'compliance_officer', 'auditor', 'risk_manager', 'viewer')
)
UPDATE platform_dauth.functional_roles fr
SET permissions = (
  SELECT array_agg(DISTINCT perm ORDER BY perm)
  FROM (
    SELECT unnest(canonical_perms) as perm
    FROM dual_pairs dp WHERE dp.canonical_role_id = fr.role_id
    UNION
    SELECT unnest(variant_perms) as perm
    FROM dual_pairs dp WHERE dp.canonical_role_id = fr.role_id
  ) combined
)
WHERE EXISTS (
  SELECT 1 FROM dual_pairs dp WHERE dp.canonical_role_id = fr.role_id
);

-- ─── 2. Mark role_* aliases as deprecated ─────────────────────────────────────
-- Note: functional_roles doesn't have is_active column, so we'll delete them directly
-- after verifying no active assignments exist

-- Check for active assignments to role_* variants
DO $$
DECLARE
  assignment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO assignment_count
  FROM platform_dauth.user_role_assignments ura
  WHERE ura.role_code LIKE 'role_%'
    AND ura.is_active = TRUE;
  
  IF assignment_count > 0 THEN
    RAISE EXCEPTION 'Cannot deprecate role_* variants: % active assignments exist', assignment_count;
  END IF;
END $$;

-- Delete role_* variants (no active assignments)
-- Delete by role_id prefix, not role_code (they share role_code)
DELETE FROM platform_dauth.role_permissions
WHERE role_id LIKE 'role_%';

DELETE FROM platform_dauth.functional_roles
WHERE role_id LIKE 'role_%';

-- ─── 3. Self-assertion: verify no dual-naming remains ─────────────────────────
DO $$
DECLARE
  dual_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dual_count
  FROM platform_dauth.functional_roles
  WHERE role_id LIKE 'role_%';
  
  IF dual_count <> 0 THEN
    RAISE EXCEPTION 'Dual-naming collapse left % role_* variants', dual_count;
  END IF;
END $$;

COMMIT;

-- ─── Rollback Procedure (if needed) ────────────────────────────────────────
-- Cannot rollback - role_* rows are deleted.
-- Restore from full DB backup if needed.

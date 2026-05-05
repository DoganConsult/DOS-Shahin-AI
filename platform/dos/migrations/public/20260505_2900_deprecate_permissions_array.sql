-- =============================================================================
-- Migration: 20260505_2900_deprecate_permissions_array
-- Purpose:   Deprecate functional_roles.permissions[] column in favor of
--            role_permissions table as the single source of truth.
--
-- Issue:     Phase 1B reconciled role_permissions with functional_roles.permissions[],
--            but the array column still exists and could cause confusion or drift.
--
-- Fix:       Add comment documenting deprecation. Column remains for read-only
--            compatibility during transition period. Future phase will drop it.
--
-- Idempotent: YES — COMMENT ON COLUMN is idempotent.
-- =============================================================================

BEGIN;

-- ─── 1. Add deprecation comment to permissions[] column ─────────────────────
COMMENT ON COLUMN platform_dauth.functional_roles.permissions IS 
'DEPRECATED: This array column is deprecated in favor of the role_permissions table.
Phase 1B reconciliation (20260505_2100) made role_permissions the single source of truth.
This column is kept for read-only compatibility during transition period.
Do NOT write to this column directly. Use role_permissions table instead.
Future migration will drop this column after all code paths are migrated.';

-- ─── 2. Add comment to role_permissions table documenting canonical status ───
COMMENT ON TABLE platform_dauth.role_permissions IS 
'CANONICAL SOURCE: This table is the single source of truth for role-permission mappings.
Replaces functional_roles.permissions[] array column (deprecated).
Always sync changes to this table first. CI guard (rbac-role-permissions-sync-check.mjs) verifies sync.';

COMMIT;

-- ─── Rollback Procedure (if needed) ────────────────────────────────────────
-- COMMENT ON COLUMN platform_dauth.functional_roles.permissions IS NULL;
-- COMMENT ON TABLE platform_dauth.role_permissions IS NULL;

-- ============================================================================
-- Foundation Reconciliation Phase 2B — RECONCILED — CLEARED FOR APPLY (Foundation Gate 2A.1 verdict signed)
-- File: 20260430_0001_foundation_tenant_schema_status.sql
-- Source gate: DOS-AIO-Specs/audit/modules/_phase1-foundation-gate-2a-1.md
-- Companion review: docs/db/foundation-gate-2b-review.md
--
-- INTENT
--   Additive-only widening of platform_dos.tenants_registry so the
--   registry can carry a reconciliation status without breaking any
--   existing reader. No row is altered. No column type is changed. No
--   constraint is added that could cause a pre-existing row to fail.
--
-- SAFETY CONTRACT
--   - Every column is added with IF NOT EXISTS.
--   - Every column has a safe DEFAULT (or is nullable) so existing rows
--     pass without UPDATE.
--   - The CHECK constraint on schema_status is added with NOT VALID so
--     it does NOT scan or reject existing rows; it only enforces future
--     writes. A separate VALIDATE CONSTRAINT statement is provided as a
--     comment and is NOT applied in this draft.
--   - No UPDATE / DELETE / ALTER on existing data.
--   - No RLS change. No privilege change.
--   - Idempotent: re-running is a no-op.
--
-- APPROVAL STATUS
--   This file is APPROVED to apply until the companion review document
--   foundation-gate-2b-review.md is approved and the Phase 2A.1 gate
--   verdict is signed off by Foundation owner.
-- ============================================================================

BEGIN;

-- 1. Additive columns ---------------------------------------------------------
ALTER TABLE platform_dos.tenants_registry
  ADD COLUMN IF NOT EXISTS schema_status            text        NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS schema_status_reason     text        NULL,
  ADD COLUMN IF NOT EXISTS schema_checked_at        timestamptz NULL,
  ADD COLUMN IF NOT EXISTS duplicate_of_tenant_id   text        NULL,
  ADD COLUMN IF NOT EXISTS archived_at              timestamptz NULL;

COMMENT ON COLUMN platform_dos.tenants_registry.schema_status IS
  'Reconciliation status of this tenant relative to its physical schema.
   Source contract: DOS-AIO-Specs/audit/modules/_phase1-foundation-gate-2a.md §7.8.
   Allowed values listed in the schema_status_check CHECK constraint.';
COMMENT ON COLUMN platform_dos.tenants_registry.schema_status_reason IS
  'Human-readable reason set whenever schema_status changes. Free text.';
COMMENT ON COLUMN platform_dos.tenants_registry.schema_checked_at IS
  'Timestamp of the last reconciliation pass that examined this row.';
COMMENT ON COLUMN platform_dos.tenants_registry.duplicate_of_tenant_id IS
  'When schema_status=''active_duplicate'', the tenant_id of the canonical
   sibling kept in service. Otherwise NULL.';
COMMENT ON COLUMN platform_dos.tenants_registry.archived_at IS
  'When schema_status=''archived'', the time the physical schema was dropped.';

-- 2. CHECK constraint on enum domain (NOT VALID — does NOT scan existing rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_registry_schema_status_check'
      AND conrelid = 'platform_dos.tenants_registry'::regclass
  ) THEN
    ALTER TABLE platform_dos.tenants_registry
      ADD CONSTRAINT tenants_registry_schema_status_check
      CHECK (schema_status IN (
        'active',
        'active_partial',
        'active_duplicate',
        'orphan_provisioning_failed',
        'test_stub',
        'test',
        'visitor_sandbox',
        'legacy',
        'dangling_schema_backfilled_test',
        'legacy_dev_sandbox',
        'manual_review_poc',
        'validation_schema',
        'quarantined',
        'archived'
      )) NOT VALID;
  END IF;
END$$;

-- 3. Optional self-consistency: duplicate_of_tenant_id must point at a real id
--    Added NOT VALID so existing NULLs/legacy rows pass.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_registry_duplicate_of_fk'
      AND conrelid = 'platform_dos.tenants_registry'::regclass
  ) THEN
    ALTER TABLE platform_dos.tenants_registry
      ADD CONSTRAINT tenants_registry_duplicate_of_fk
      FOREIGN KEY (duplicate_of_tenant_id)
      REFERENCES platform_dos.tenants_registry (tenant_id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED
      NOT VALID;
  END IF;
END$$;

-- 4. Helpful index for reconciliation queries
CREATE INDEX IF NOT EXISTS tenants_registry_schema_status_idx
  ON platform_dos.tenants_registry (schema_status);

COMMIT;

-- ----------------------------------------------------------------------------
-- POST-DEPLOY (NOT IN THIS MIGRATION; documented for reviewer):
--   Once Phase 2B mark/backfill scripts have run and no offending rows
--   remain, the constraints can be promoted to VALID with:
--
--     ALTER TABLE platform_dos.tenants_registry
--       VALIDATE CONSTRAINT tenants_registry_schema_status_check;
--     ALTER TABLE platform_dos.tenants_registry
--       VALIDATE CONSTRAINT tenants_registry_duplicate_of_fk;
--
--   Both are no-op locks if all rows already comply; safe to schedule in
--   a quiet window.
-- ----------------------------------------------------------------------------

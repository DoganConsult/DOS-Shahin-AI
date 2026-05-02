-- =====================================================================
-- dos.ownership_mappings soft-delete columns (20260425_0007)
--
-- services/user-service/src/domain/foundation/ownership-mapping.service.ts
-- filters every SELECT with `deleted_at IS NULL` and performs soft-delete
-- updates via `SET deleted_at = NOW(), updated_at = NOW()`. Table was
-- created without those columns → GET /api/ownership-mapping/* returned
-- 500 42703 column "deleted_at" does not exist.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

ALTER TABLE dos.ownership_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE dos.ownership_mappings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dos_ownership_mappings_tenant_not_deleted
  ON dos.ownership_mappings(tenant_id, entity_type) WHERE deleted_at IS NULL;

COMMIT;

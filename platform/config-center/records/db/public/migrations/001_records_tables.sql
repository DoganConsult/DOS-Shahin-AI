-- records-service owned tables
--
-- Phase 3A: reconcile schema drift with ops/migrations/009b which creates
-- dos.records with column `type`; records-service uses `record_type`.
-- Idempotent column-backfill; index creations always find their columns.
BEGIN;

CREATE TABLE IF NOT EXISTS dos.records (
  record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  record_type VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  retention_until DATE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Backfill columns missing from the 009b table shape.
ALTER TABLE dos.records ADD COLUMN IF NOT EXISTS record_type     VARCHAR(100);
ALTER TABLE dos.records ADD COLUMN IF NOT EXISTS content         JSONB DEFAULT '{}';
ALTER TABLE dos.records ADD COLUMN IF NOT EXISTS retention_until DATE;
ALTER TABLE dos.records ADD COLUMN IF NOT EXISTS created_by      VARCHAR(64);

-- If legacy 'type' column exists (009b) and record_type is empty, backfill.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'records' AND column_name = 'type'
  ) THEN
    UPDATE dos.records SET record_type = type WHERE record_type IS NULL AND type IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_records_tenant ON dos.records (tenant_id);
CREATE INDEX IF NOT EXISTS idx_records_type ON dos.records (tenant_id, record_type);

COMMIT;

-- asset-service owned tables
--
-- Phase 3A: reconcile schema drift with ops/migrations/009b_service_domain_tables.sql
-- which creates dos.assets with a different column shape. We CREATE TABLE
-- IF NOT EXISTS for greenfield, then idempotently add the columns this
-- service needs so later indexes always find them.
BEGIN;

CREATE TABLE IF NOT EXISTS dos.assets (
  asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  name TEXT NOT NULL,
  asset_type VARCHAR(100),
  classification VARCHAR(50),
  owner_user_id VARCHAR(64),
  department_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  criticality VARCHAR(20) DEFAULT 'medium',
  location TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Backfill columns that the legacy ops/009b table shape is missing.
ALTER TABLE dos.assets ADD COLUMN IF NOT EXISTS asset_type VARCHAR(100);
ALTER TABLE dos.assets ADD COLUMN IF NOT EXISTS criticality VARCHAR(20) DEFAULT 'medium';
ALTER TABLE dos.assets ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE dos.assets ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
ALTER TABLE dos.assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE dos.assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- If legacy 'type' column exists (from 009b) and asset_type is empty, backfill.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'assets' AND column_name = 'type'
  ) THEN
    UPDATE dos.assets SET asset_type = type WHERE asset_type IS NULL AND type IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assets_tenant ON dos.assets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON dos.assets (tenant_id, asset_type);

COMMIT;

-- Module: remediation | Migration: 001
-- TODO: Full schema — baseline tables follow
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__."remediation_records" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  data            JSONB NOT NULL DEFAULT '{}',
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.remediation_records
ALTER TABLE __TENANT_SCHEMA__.remediation_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.remediation_records ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.remediation_records ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.remediation_records ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.remediation_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.remediation_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS "idx_remediation_records_tenant" ON __TENANT_SCHEMA__."remediation_records"(tenant_id, status);

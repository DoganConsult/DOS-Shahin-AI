-- Module: ai-governance | Migration: 001
-- TODO: Full schema — baseline tables follow
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__."ai_governance_records" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  data            JSONB NOT NULL DEFAULT '{}',
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_ai_governance_records_tenant" ON __TENANT_SCHEMA__."ai_governance_records"(tenant_id, status);

-- bcp-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.bcp_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  rto_hours INTEGER,
  rpo_hours INTEGER,
  owner_user_id VARCHAR(64),
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_bcp_plans_tenant ON dos.bcp_plans (tenant_id);

COMMIT;

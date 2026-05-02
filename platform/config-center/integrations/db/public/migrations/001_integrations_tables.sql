-- integrations-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.integrations (
  integration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  name TEXT NOT NULL,
  provider VARCHAR(100) NOT NULL,
  integration_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'inactive',
  config JSONB DEFAULT '{}',
  credentials_ref VARCHAR(255),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON dos.integrations (tenant_id);

COMMIT;

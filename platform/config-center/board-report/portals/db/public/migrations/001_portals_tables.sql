-- portals-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.portals (
  portal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  name TEXT NOT NULL,
  portal_type VARCHAR(50) NOT NULL DEFAULT 'vendor',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  config JSONB DEFAULT '{}',
  custom_domain VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_portals_tenant ON dos.portals (tenant_id);

COMMIT;

-- vendor-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.vendors (
  vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  name TEXT NOT NULL,
  category VARCHAR(100),
  tier VARCHAR(20) DEFAULT 'standard',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  risk_rating VARCHAR(20),
  last_assessment_date DATE,
  contract_expiry DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON dos.vendors (tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON dos.vendors (tenant_id, status);

COMMIT;

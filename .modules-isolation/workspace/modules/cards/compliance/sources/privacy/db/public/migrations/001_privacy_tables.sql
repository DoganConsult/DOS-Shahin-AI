-- privacy-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.privacy_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assessment_type VARCHAR(50) DEFAULT 'dpia',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  data_categories TEXT[],
  processing_purposes TEXT[],
  risk_level VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_privacy_tenant ON dos.privacy_assessments (tenant_id);

COMMIT;

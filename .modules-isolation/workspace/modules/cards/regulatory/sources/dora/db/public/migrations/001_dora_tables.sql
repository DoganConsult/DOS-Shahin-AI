-- dora-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.dora_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  score INTEGER,
  findings JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_dora_tenant ON dos.dora_assessments (tenant_id);

COMMIT;

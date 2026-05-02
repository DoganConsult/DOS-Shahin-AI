-- training-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.training_programs (
  program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  mandatory BOOLEAN DEFAULT FALSE,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_training_tenant ON dos.training_programs (tenant_id);

COMMIT;

-- executive-intelligence-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.executive_briefings (
  briefing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  briefing_type VARCHAR(50) DEFAULT 'weekly',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  target_audience TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_briefings_tenant ON dos.executive_briefings (tenant_id);

COMMIT;

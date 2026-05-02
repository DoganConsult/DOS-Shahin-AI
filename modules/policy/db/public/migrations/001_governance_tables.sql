-- governance-policy-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  effective_date DATE,
  review_date DATE,
  owner_user_id VARCHAR(64),
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_policies_tenant ON dos.policies (tenant_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON dos.policies (tenant_id, status);

COMMIT;

-- Foundation: governance_policies table
-- Backs GET/POST/PUT/DELETE /api/governance/policies and the
-- /foundation/overview "Policies" stat card. Service queries
-- dos.governance_policies in interface/http/governance-policies.service.ts.

CREATE TABLE IF NOT EXISTS dos.governance_policies (
  policy_id       UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  title_en        TEXT NOT NULL,
  title_ar        TEXT,
  code            TEXT,
  category        TEXT,
  scope           TEXT,
  description     TEXT,
  effective_date  DATE,
  review_date     DATE,
  status          TEXT NOT NULL DEFAULT 'draft',
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_governance_policies_tenant
  ON dos.governance_policies (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_governance_policies_tenant_status
  ON dos.governance_policies (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_governance_policies_tenant_code
  ON dos.governance_policies (tenant_id, code)
  WHERE deleted_at IS NULL AND code IS NOT NULL;

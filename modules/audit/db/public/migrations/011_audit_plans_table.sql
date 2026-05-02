-- ═══════════════════════════════════════════════════════════════════
-- 011: Audit Plans table
-- Referenced by: audit module, seed-demo-data, tenant-isolation tests
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dos.audit_plans (
  plan_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  name          TEXT NOT NULL,
  audit_type    TEXT,
  scope         TEXT,
  frequency     TEXT,
  year          INT,
  status        TEXT DEFAULT 'planning',
  owner_id      TEXT,
  is_deleted    BOOLEAN DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_plans_tenant ON dos.audit_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_plans_year ON dos.audit_plans(tenant_id, year);

-- Module: audit | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_trail (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  actor_id        UUID NOT NULL,
  actor_role      TEXT,
  changes         JSONB NOT NULL DEFAULT '{}',
  metadata        JSONB NOT NULL DEFAULT '{}',
  ip_address      INET,
  user_agent      TEXT,
  session_id      TEXT,
  correlation_id  UUID,
  severity        TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_trail
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS changes JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical'));
ALTER TABLE __TENANT_SCHEMA__.audit_trail ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  audit_type      TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  severity        TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_remediation','closed','accepted')),
  entity_type     TEXT,
  entity_id       UUID,
  assigned_to     UUID,
  due_date        DATE,
  evidence_refs   JSONB NOT NULL DEFAULT '[]',
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_findings
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS audit_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('low','medium','high','critical'));
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_remediation','closed','accepted'));
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_findings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_retention_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL,
  retention_days  INTEGER NOT NULL DEFAULT 2555,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_retention_policies
ALTER TABLE __TENANT_SCHEMA__.audit_retention_policies ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_retention_policies ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_retention_policies ADD COLUMN IF NOT EXISTS retention_days INTEGER NOT NULL DEFAULT 2555;
ALTER TABLE __TENANT_SCHEMA__.audit_retention_policies ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.audit_retention_policies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_audit_trail_tenant ON __TENANT_SCHEMA__.audit_trail(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON __TENANT_SCHEMA__.audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_actor ON __TENANT_SCHEMA__.audit_trail(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_tenant ON __TENANT_SCHEMA__.audit_findings(tenant_id, status);

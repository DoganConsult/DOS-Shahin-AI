-- Module: controls | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  control_ref     TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  control_type    TEXT NOT NULL CHECK (control_type IN ('preventive','detective','corrective','deterrent','compensating')),
  control_family  TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deprecated','testing')),
  effectiveness   TEXT CHECK (effectiveness IN ('effective','partially_effective','ineffective','not_tested')),
  automation_level TEXT NOT NULL DEFAULT 'manual' CHECK (automation_level IN ('manual','semi_automated','fully_automated')),
  owner_id        UUID,
  frequency       TEXT NOT NULL DEFAULT 'monthly',
  last_tested_at  TIMESTAMPTZ,
  next_review_date DATE,
  framework_refs  JSONB NOT NULL DEFAULT '[]',
  risk_refs       JSONB NOT NULL DEFAULT '[]',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS control_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS control_type TEXT CHECK (control_type IN ('preventive','detective','corrective','deterrent','compensating'));
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS control_family TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deprecated','testing'));
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS effectiveness TEXT CHECK (effectiveness IN ('effective','partially_effective','ineffective','not_tested'));
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS automation_level TEXT NOT NULL DEFAULT 'manual' CHECK (automation_level IN ('manual','semi_automated','fully_automated'));
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS framework_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS risk_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.control_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  control_id      UUID NOT NULL REFERENCES __TENANT_SCHEMA__.controls(id) ON DELETE CASCADE,
  test_type       TEXT NOT NULL DEFAULT 'design',
  status          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','failed')),
  result          TEXT CHECK (result IN ('pass','fail','exception')),
  tester_id       UUID,
  test_date       DATE,
  evidence_refs   JSONB NOT NULL DEFAULT '[]',
  findings        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.control_tests
ALTER TABLE __TENANT_SCHEMA__.control_tests ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.control_tests ADD COLUMN IF NOT EXISTS control_id UUID REFERENCES __TENANT_SCHEMA__.controls(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.control_tests ADD COLUMN IF NOT EXISTS test_type TEXT NOT NULL DEFAULT 'design';
ALTER TABLE __TENANT_SCHEMA__.control_tests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','failed'));
ALTER TABLE __TENANT_SCHEMA__.control_tests ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('pass','fail','exception'));
ALTER TABLE __TENANT_SCHEMA__.control_tests ADD COLUMN IF NOT EXISTS tester_id UUID;
ALTER TABLE __TENANT_SCHEMA__.control_tests ADD COLUMN IF NOT EXISTS test_date DATE;
ALTER TABLE __TENANT_SCHEMA__.control_tests ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.control_tests ADD COLUMN IF NOT EXISTS findings TEXT;
ALTER TABLE __TENANT_SCHEMA__.control_tests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_controls_tenant ON __TENANT_SCHEMA__.controls(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_control_tests_control ON __TENANT_SCHEMA__.control_tests(control_id);

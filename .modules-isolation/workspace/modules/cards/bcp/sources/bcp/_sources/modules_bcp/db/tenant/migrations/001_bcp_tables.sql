-- Module: bcp | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL,
  title TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','approved','active','archived')),
  plan_type TEXT NOT NULL DEFAULT 'business_continuity',
  scope TEXT, owner_id UUID, approved_by UUID, approved_at TIMESTAMPTZ,
  rto_hours INTEGER, rpo_hours INTEGER,
  last_tested_at TIMESTAMPTZ, next_test_date DATE,
  created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_plans
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','approved','active','archived'));
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'business_continuity';
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS rto_hours INTEGER;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS rpo_hours INTEGER;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS next_test_date DATE;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES __TENANT_SCHEMA__.bcp_plans(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL, impact_level TEXT NOT NULL,
  recovery_procedures JSONB NOT NULL DEFAULT '[]', contact_tree JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_scenarios
ALTER TABLE __TENANT_SCHEMA__.bcp_scenarios ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_scenarios ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES __TENANT_SCHEMA__.bcp_plans(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.bcp_scenarios ADD COLUMN IF NOT EXISTS scenario_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_scenarios ADD COLUMN IF NOT EXISTS impact_level TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_scenarios ADD COLUMN IF NOT EXISTS recovery_procedures JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.bcp_scenarios ADD COLUMN IF NOT EXISTS contact_tree JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.bcp_scenarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES __TENANT_SCHEMA__.bcp_plans(id),
  test_type TEXT NOT NULL DEFAULT 'tabletop', test_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned', result TEXT, lessons_learned TEXT,
  conducted_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_tests
ALTER TABLE __TENANT_SCHEMA__.bcp_tests ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_tests ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES __TENANT_SCHEMA__.bcp_plans(id);
ALTER TABLE __TENANT_SCHEMA__.bcp_tests ADD COLUMN IF NOT EXISTS test_type TEXT NOT NULL DEFAULT 'tabletop';
ALTER TABLE __TENANT_SCHEMA__.bcp_tests ADD COLUMN IF NOT EXISTS test_date DATE;
ALTER TABLE __TENANT_SCHEMA__.bcp_tests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE __TENANT_SCHEMA__.bcp_tests ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_tests ADD COLUMN IF NOT EXISTS lessons_learned TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_tests ADD COLUMN IF NOT EXISTS conducted_by UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_tests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_bcp_plans_tenant ON __TENANT_SCHEMA__.bcp_plans(tenant_id, status);

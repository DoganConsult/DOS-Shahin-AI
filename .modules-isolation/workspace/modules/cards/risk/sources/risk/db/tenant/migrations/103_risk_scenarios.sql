-- ============================================================================
-- 103_risk_scenarios.sql
-- Ported from monolith: backend/src/migrations/tenant/118_risk_scenarios.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- F03: Risk Quantification — scenario analysis + Monte Carlo storage
--
-- Phase 3A: tenant/027 creates a minimal risk_scenarios (id UUID PK +
-- tenant_id/status/metadata/timestamps). The CREATE below no-ops; we
-- backfill every column this file's index requires.
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_scenarios (
  scenario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL,
  scenario_name VARCHAR(200) NOT NULL,
  baseline_score NUMERIC,
  scenario_score NUMERIC,
  assumptions JSONB DEFAULT '[]',
  mc_mean_loss NUMERIC,
  mc_p95_loss NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100) DEFAULT 'system'
);
ALTER TABLE __TENANT_SCHEMA__.risk_scenarios ADD COLUMN IF NOT EXISTS scenario_id    UUID;
ALTER TABLE __TENANT_SCHEMA__.risk_scenarios ADD COLUMN IF NOT EXISTS risk_id        UUID;
ALTER TABLE __TENANT_SCHEMA__.risk_scenarios ADD COLUMN IF NOT EXISTS scenario_name  VARCHAR(200);
ALTER TABLE __TENANT_SCHEMA__.risk_scenarios ADD COLUMN IF NOT EXISTS baseline_score NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.risk_scenarios ADD COLUMN IF NOT EXISTS scenario_score NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.risk_scenarios ADD COLUMN IF NOT EXISTS assumptions    JSONB DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.risk_scenarios ADD COLUMN IF NOT EXISTS mc_mean_loss   NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.risk_scenarios ADD COLUMN IF NOT EXISTS mc_p95_loss    NUMERIC;
CREATE INDEX IF NOT EXISTS idx_risk_scenarios_risk ON __TENANT_SCHEMA__.risk_scenarios(risk_id);

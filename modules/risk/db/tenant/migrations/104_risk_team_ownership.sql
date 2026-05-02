-- ============================================================================
-- 104_risk_team_ownership.sql
-- Ported from monolith: backend/src/migrations/tenant/131_risk_team_ownership.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
ALTER TABLE risks ADD COLUMN IF NOT EXISTS owner_team_id UUID REFERENCES teams(team_id);
CREATE INDEX IF NOT EXISTS idx_risks_owner_team ON risks (owner_team_id);

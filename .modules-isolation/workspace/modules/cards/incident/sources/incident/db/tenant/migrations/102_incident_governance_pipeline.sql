-- ============================================================================
-- 102_incident_governance_pipeline.sql
-- Ported from monolith: backend/src/migrations/tenant/114_incident_governance_pipeline.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
CREATE TABLE IF NOT EXISTS incident_root_causes (
  root_cause_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id         UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  category            VARCHAR(100) NOT NULL,
  description         TEXT NOT NULL,
  contributing_factors TEXT DEFAULT '',
  corrective_action   TEXT DEFAULT '',
  preventive_action   TEXT DEFAULT '',
  identified_by       VARCHAR(255),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incident_root_causes_incident ON incident_root_causes(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_root_causes_category ON incident_root_causes(category) WHERE deleted_at IS NULL;

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS owner VARCHAR(255);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS escalation_state VARCHAR(50);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS board_attention BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sla_hours INT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolution_action TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON TABLE incident_root_causes IS 'Root cause analysis records linked to incidents — 5-Why, fishbone, etc.';

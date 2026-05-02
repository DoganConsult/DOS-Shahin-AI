-- Wave 13 — Disaster Recovery drill records.
-- Quarterly DR test outcomes. Wave 9 promotion checklist requires the
-- most recent successful drill be within 90 days.

CREATE TABLE IF NOT EXISTS dos.dr_drill_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario TEXT NOT NULL CHECK (scenario IN ('replica-promote', 'pitr-restore', 'region-failover', 'tenant-restore')),
  from_region TEXT NOT NULL,
  to_region TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('scheduled', 'in_progress', 'passed', 'failed', 'aborted')),
  rpo_actual_seconds INTEGER,
  rto_actual_seconds INTEGER,
  rpo_target_seconds INTEGER NOT NULL DEFAULT 3600,
  rto_target_seconds INTEGER NOT NULL DEFAULT 14400,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_dr_drill_runs_completed
  ON dos.dr_drill_runs (completed_at DESC) WHERE status = 'passed';

CREATE INDEX IF NOT EXISTS idx_dr_drill_runs_status
  ON dos.dr_drill_runs (status, started_at DESC);

COMMENT ON TABLE dos.dr_drill_runs IS
  'Wave 13: cross-region DR drill records. Quarterly cadence required for production promotion.';

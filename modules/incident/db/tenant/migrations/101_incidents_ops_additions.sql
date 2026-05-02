-- ============================================================================
-- 101_incidents_ops_additions.sql
-- Ported from monolith: backend/src/migrations/tenant/042_incidents_ops_additions.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- ============================================
-- AGRC-OS Tenant Migration 042
-- Domain J: Incidents / Ops Additions
-- Phase 6 — 3 new tables
-- (incidents, vulnerabilities, enforcement_gate_log,
--  telemetry_signals, ccm_cycle_log, agrc_os_cycle_log,
--  sop_procedures, agrc_runbooks, sla_breaches
--  already exist)
-- ============================================

-- ── J1. incident_updates ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_updates (
  update_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id        UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  update_type        VARCHAR(50) NOT NULL,
  update_text        TEXT,
  updated_by         VARCHAR(64),
  status_change_from VARCHAR(30),
  status_change_to   VARCHAR(30),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON incident_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_updates_type     ON incident_updates(update_type)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_updates_by       ON incident_updates(updated_by)   WHERE updated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incident_updates_created  ON incident_updates(created_at DESC);

-- ── J2. incident_response_actions ─────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_response_actions (
  action_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  action_type  VARCHAR(50) NOT NULL,
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  assigned_to  VARCHAR(64),
  due_date     DATE,
  status       VARCHAR(30) NOT NULL DEFAULT 'pending',
  priority     VARCHAR(20),
  outcome      TEXT,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incident_actions_incident  ON incident_response_actions(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_actions_status    ON incident_response_actions(status)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_actions_assigned  ON incident_response_actions(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incident_actions_due       ON incident_response_actions(due_date)    WHERE due_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_actions_priority  ON incident_response_actions(priority)    WHERE deleted_at IS NULL;

-- ── J3. vulnerability_findings_map ────────────────────────────────

CREATE TABLE IF NOT EXISTS vulnerability_findings_map (
  map_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vulnerability_id UUID NOT NULL REFERENCES vulnerabilities(vulnerability_id) ON DELETE CASCADE,
  finding_id       UUID NOT NULL REFERENCES findings(finding_id) ON DELETE CASCADE,
  mapping_type     VARCHAR(30),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vuln_findings_vuln    ON vulnerability_findings_map(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_vuln_findings_finding ON vulnerability_findings_map(finding_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vuln_finding_pair
  ON vulnerability_findings_map(vulnerability_id, finding_id) WHERE deleted_at IS NULL;

-- ── TABLE DOCUMENTATION ───────────────────────────────────────────

COMMENT ON TABLE incident_updates          IS 'Chronological updates and status changes for incidents';
COMMENT ON TABLE incident_response_actions IS 'Response actions assigned during incident handling';
COMMENT ON TABLE vulnerability_findings_map IS 'Mapping between vulnerabilities and audit/assessment findings';

-- ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 042: Incidents / Ops Additions created successfully';
  RAISE NOTICE '- Incident lifecycle: 2 tables (incident_updates, incident_response_actions)';
  RAISE NOTICE '- Cross-reference: 1 table (vulnerability_findings_map)';
  RAISE NOTICE '- Total: 3 new tables (existing incidents, vulnerabilities preserved)';
END $$;

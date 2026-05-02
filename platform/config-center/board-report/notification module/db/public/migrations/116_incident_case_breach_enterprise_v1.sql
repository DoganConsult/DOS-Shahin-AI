-- ============================================================================
-- 116_incident_case_breach_enterprise_v1.sql
-- Ported from monolith: backend/src/migrations/tenant/723_incident_case_breach_enterprise.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- 723: Incident / Case / Breach Management Enterprise Uplift
-- Adds cases, triage decisions, structured impact/lessons, breach reporting,
-- asset/vendor/evidence/policy linking, and notification log.

-- ═══════════════════════════════════════════════════════════════════
-- 1. cases — group related incidents under a single investigation
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cases (
  case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(60) UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  case_type VARCHAR(40) DEFAULT 'investigation',
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(30) DEFAULT 'open',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to VARCHAR(64),
  assigned_team_id UUID,
  lead_investigator VARCHAR(64),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  resolution_summary TEXT,
  root_cause_category VARCHAR(60),
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_cases_status ON cases (status);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_cases_severity ON cases (severity);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_cases_assigned ON cases (assigned_to);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_cases_opened ON cases (opened_at DESC);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 2. case_incidents — link incidents to cases (M:N)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS case_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(case_id),
  incident_id UUID NOT NULL,
  linked_at TIMESTAMPTZ DEFAULT now(),
  linked_by VARCHAR(64),
  notes TEXT,
  UNIQUE (case_id, incident_id)
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_case_incidents_case ON case_incidents (case_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_case_incidents_incident ON case_incidents (incident_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. case_notes — timestamped notes on a case
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS case_notes (
  note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(case_id),
  author_id VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  note_type VARCHAR(30) DEFAULT 'general',
  visibility VARCHAR(20) DEFAULT 'internal',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_case_notes_case ON case_notes (case_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. incident_triage_decisions — structured triage outcome
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS incident_triage_decisions (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  triaged_by VARCHAR(64) NOT NULL,
  triaged_at TIMESTAMPTZ DEFAULT now(),
  severity_assigned VARCHAR(20),
  priority_assigned VARCHAR(20),
  category_assigned VARCHAR(60),
  assigned_to VARCHAR(64),
  assigned_team_id UUID,
  sla_target_hours NUMERIC,
  triage_notes TEXT,
  auto_triage BOOLEAN DEFAULT false,
  confidence_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 10J: 117 redefines incident_triage_decisions with a different
-- column set (triage_officer vs triaged_by, sla_clock_started_at vs
-- triaged_at, etc). On upgrade replay the table already exists at the
-- 117 shape so CREATE INDEX (triaged_at) fails with undefined_column.
-- Wrap both indexes so the validator is idempotent across replays.
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_triage_incident ON incident_triage_decisions (incident_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_triage_at ON incident_triage_decisions (triaged_at DESC);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. incident_impacts — structured impact records
-- ═══════════════════════════════════════════════════════════════════
-- Phase 3A: tenant/027 creates a minimal incident_impacts (id UUID PK,
-- tenant_id, status, metadata) without impact_id / incident_id. The
-- CREATE below no-ops on that stub and the subsequent CREATE INDEX
-- on incident_id fails. The stub holds no production data, so
-- drop-and-recreate is safe.
DROP TABLE IF EXISTS __TENANT_SCHEMA__.incident_impacts CASCADE;
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_impacts (
  impact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  impact_area VARCHAR(60) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  description TEXT,
  financial_impact NUMERIC(15,2),
  financial_currency VARCHAR(3) DEFAULT 'SAR',
  affected_users_count INTEGER,
  affected_services JSONB DEFAULT '[]',
  affected_departments JSONB DEFAULT '[]',
  duration_hours NUMERIC,
  data_records_affected INTEGER,
  regulatory_impact BOOLEAN DEFAULT false,
  reputational_impact BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_impact_incident ON __TENANT_SCHEMA__.incident_impacts (incident_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_impact_area ON __TENANT_SCHEMA__.incident_impacts (impact_area);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 6. incident_lessons_learned — structured lessons
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS incident_lessons_learned (
  lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  lesson_type VARCHAR(40) DEFAULT 'process_improvement',
  category VARCHAR(60),
  recommendation TEXT,
  action_taken TEXT,
  status VARCHAR(30) DEFAULT 'identified',
  assigned_to VARCHAR(64),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_lessons_incident ON incident_lessons_learned (incident_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_lessons_status ON incident_lessons_learned (status);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 7. breach_reporting_records — privacy/data breach state machine
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS breach_reporting_records (
  breach_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  breach_type VARCHAR(40) DEFAULT 'personal_data',
  severity VARCHAR(20) DEFAULT 'high',
  status VARCHAR(30) DEFAULT 'detected',
  data_subjects_count INTEGER,
  data_categories JSONB DEFAULT '[]',
  notification_required BOOLEAN DEFAULT false,
  authority_name VARCHAR(255),
  authority_deadline TIMESTAMPTZ,
  authority_notified_at TIMESTAMPTZ,
  authority_reference VARCHAR(255),
  subject_notification_required BOOLEAN DEFAULT false,
  subject_notified_at TIMESTAMPTZ,
  containment_actions TEXT,
  remediation_actions TEXT,
  risk_assessment TEXT,
  dpo_notes TEXT,
  draft_notification TEXT,
  submitted_at TIMESTAMPTZ,
  submitted_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_breach_incident ON breach_reporting_records (incident_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_breach_status ON breach_reporting_records (status);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_breach_deadline ON breach_reporting_records (authority_deadline);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 8. incident_assets — link incidents to assets
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS incident_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  asset_id UUID NOT NULL,
  relationship_type VARCHAR(30) DEFAULT 'affected',
  notes TEXT,
  linked_at TIMESTAMPTZ DEFAULT now(),
  linked_by VARCHAR(64),
  UNIQUE (incident_id, asset_id)
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_incident_assets_incident ON incident_assets (incident_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_incident_assets_asset ON incident_assets (asset_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 9. incident_vendors — link incidents to vendors
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS incident_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  relationship_type VARCHAR(30) DEFAULT 'involved',
  notes TEXT,
  linked_at TIMESTAMPTZ DEFAULT now(),
  linked_by VARCHAR(64),
  UNIQUE (incident_id, vendor_id)
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_incident_vendors_incident ON incident_vendors (incident_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 10. incident_evidence — link incidents to evidence artifacts
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS incident_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  evidence_id UUID,
  evidence_type VARCHAR(40) DEFAULT 'document',
  title VARCHAR(500),
  description TEXT,
  file_path TEXT,
  file_hash VARCHAR(128),
  collected_by VARCHAR(64),
  collected_at TIMESTAMPTZ DEFAULT now(),
  chain_of_custody JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_incident_evidence_incident ON incident_evidence (incident_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 11. incident_policies — link incidents to policies
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS incident_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  policy_id UUID NOT NULL,
  violation_type VARCHAR(40),
  notes TEXT,
  linked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (incident_id, policy_id)
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_incident_policies_incident ON incident_policies (incident_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 12. notifications_log — all outgoing notifications
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications_log (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID NOT NULL,
  channel VARCHAR(30) DEFAULT 'email',
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications_log (entity_type, entity_id);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications_log (status);
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

-- ============================================================================
-- 117_incident_case_breach_enterprise_v2.sql
-- Ported from monolith: backend/src/migrations/tenant/726_incident_case_breach_enterprise.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- ============================================
-- Tenant Migration 726: Incident/Case/Breach Enterprise
-- A. Cases (separate entity, multi-incident grouping)
-- B. Triage decisions (audit trail + auto-scoring)
-- C. Structured impact records
-- D. Structured lessons learned
-- E. Breach reporting records (regulatory state machine)
-- F. Cross-entity linkage (assets, vendors, evidence, policies)
-- G. Notification log
-- H. Navigation seeds for new pages
-- ============================================

BEGIN;

-- Phase 3A: this file is v2 of the incident/case/breach schema. tenant/116
-- is v1 and creates the same 11 tables with an older column shape that
-- differs (e.g. triaged_by vs triage_officer). Since the v1/v2 pair is
-- clearly a supersede relationship and the v1 tables have no production
-- data, drop the v1 shapes here so the v2 CREATE TABLE statements below
-- apply cleanly.
DROP TABLE IF EXISTS incident_triage_decisions CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.incident_impacts          CASCADE;
DROP TABLE IF EXISTS incident_lessons_learned  CASCADE;
DROP TABLE IF EXISTS breach_reporting_records  CASCADE;
DROP TABLE IF EXISTS incident_assets           CASCADE;
DROP TABLE IF EXISTS incident_vendors          CASCADE;
DROP TABLE IF EXISTS incident_evidence         CASCADE;
DROP TABLE IF EXISTS incident_policies         CASCADE;
DROP TABLE IF EXISTS case_notes                CASCADE;
DROP TABLE IF EXISTS case_incidents            CASCADE;
DROP TABLE IF EXISTS cases                     CASCADE;

-- ═══════════════════════════════════════════════
-- A. CASES — Separate entity for multi-incident grouping
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cases (
  case_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number       SERIAL,
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  case_type         VARCHAR(40) NOT NULL DEFAULT 'operational'
    CHECK (case_type IN ('operational','compliance','security','fraud','regulatory','privacy')),
  status            VARCHAR(30) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','active','under_review','closed','archived')),
  priority          VARCHAR(20) DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  severity          VARCHAR(20) DEFAULT 'medium'
    CHECK (severity IN ('critical','high','medium','low')),
  assigned_to       VARCHAR(64),
  lead_investigator VARCHAR(64),
  department_id     UUID,
  opened_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at         TIMESTAMPTZ,
  resolution_summary TEXT,
  created_by        VARCHAR(64) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cases_status
  ON cases(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_type
  ON cases(case_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_assigned
  ON cases(assigned_to) WHERE assigned_to IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_priority
  ON cases(priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_created
  ON cases(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_lead
  ON cases(lead_investigator) WHERE lead_investigator IS NOT NULL AND deleted_at IS NULL;

-- Junction: cases ↔ incidents (many-to-many)
CREATE TABLE IF NOT EXISTS case_incidents (
  case_id     UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  linked_by   VARCHAR(64),
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (case_id, incident_id)
);

CREATE INDEX IF NOT EXISTS idx_case_incidents_incident
  ON case_incidents(incident_id);

-- Case notes
CREATE TABLE IF NOT EXISTS case_notes (
  note_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id    UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  author_id  VARCHAR(64) NOT NULL,
  content    TEXT NOT NULL,
  note_type  VARCHAR(30) NOT NULL DEFAULT 'update'
    CHECK (note_type IN ('investigation','decision','update','legal','escalation')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_case_notes_case
  ON case_notes(case_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_case_notes_author
  ON case_notes(author_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_case_notes_type
  ON case_notes(note_type) WHERE deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- B. INCIDENT TRIAGE DECISIONS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incident_triage_decisions (
  decision_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id        UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  triage_officer     VARCHAR(64) NOT NULL,
  severity_assessed  VARCHAR(20)
    CHECK (severity_assessed IN ('critical','high','medium','low')),
  priority_assigned  VARCHAR(20)
    CHECK (priority_assigned IN ('critical','high','medium','low')),
  category_assigned  VARCHAR(60),
  assignment_decision JSONB DEFAULT '{}',
  rationale          TEXT,
  sla_clock_started_at TIMESTAMPTZ,
  auto_scored        BOOLEAN NOT NULL DEFAULT FALSE,
  score_factors      JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_incident
  ON incident_triage_decisions(incident_id);
CREATE INDEX IF NOT EXISTS idx_triage_officer
  ON incident_triage_decisions(triage_officer);
CREATE INDEX IF NOT EXISTS idx_triage_created
  ON incident_triage_decisions(created_at DESC);


-- ═══════════════════════════════════════════════
-- C. INCIDENT IMPACTS (structured)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_impacts (
  impact_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id        UUID NOT NULL REFERENCES __TENANT_SCHEMA__.incidents(incident_id) ON DELETE CASCADE,
  impact_type        VARCHAR(30) NOT NULL
    CHECK (impact_type IN ('financial','operational','reputational','regulatory','safety','legal')),
  severity           VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('critical','high','medium','low')),
  description        TEXT,
  estimated_cost     DECIMAL(15,2),
  affected_systems   TEXT[] DEFAULT '{}',
  affected_users_count INT,
  duration_hours     DECIMAL(10,2),
  mitigation_applied TEXT,
  assessed_by        VARCHAR(64),
  assessed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_impacts_incident
  ON __TENANT_SCHEMA__.incident_impacts(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_impacts_type
  ON __TENANT_SCHEMA__.incident_impacts(impact_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_impacts_severity
  ON incident_impacts(severity) WHERE deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- D. INCIDENT LESSONS LEARNED (structured table)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incident_lessons_learned (
  lesson_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id           UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  category              VARCHAR(40) NOT NULL DEFAULT 'process'
    CHECK (category IN ('process','technology','people','communication','governance')),
  title                 VARCHAR(500) NOT NULL,
  description           TEXT,
  recommendation        TEXT,
  implementation_status VARCHAR(30) NOT NULL DEFAULT 'identified'
    CHECK (implementation_status IN ('identified','planned','in_progress','implemented','verified')),
  responsible_party     VARCHAR(64),
  target_date           DATE,
  created_by            VARCHAR(64) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lessons_incident
  ON incident_lessons_learned(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_status
  ON incident_lessons_learned(implementation_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_category
  ON incident_lessons_learned(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_responsible
  ON incident_lessons_learned(responsible_party) WHERE responsible_party IS NOT NULL AND deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- E. BREACH REPORTING RECORDS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS breach_reporting_records (
  record_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id              UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  breach_type              VARCHAR(40) NOT NULL
    CHECK (breach_type IN ('data_breach','security_breach','privacy_breach','regulatory_breach')),
  reporting_authority      VARCHAR(60) NOT NULL
    CHECK (reporting_authority IN ('NCA','SAMA','SDAIA','NDMO','DPA','CITC')),
  reporting_deadline       TIMESTAMPTZ,
  reported_at              TIMESTAMPTZ,
  report_reference         VARCHAR(100),
  status                   VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_review','submitted','acknowledged','under_investigation','closed')),
  notification_content     JSONB DEFAULT '{}',
  affected_individuals_count INT,
  data_categories_affected TEXT[] DEFAULT '{}',
  cross_border             BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_by             VARCHAR(64),
  reviewer_id              VARCHAR(64),
  created_by               VARCHAR(64) NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_breach_incident
  ON breach_reporting_records(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_breach_status
  ON breach_reporting_records(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_breach_authority
  ON breach_reporting_records(reporting_authority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_breach_deadline
  ON breach_reporting_records(reporting_deadline)
  WHERE reporting_deadline IS NOT NULL AND status NOT IN ('submitted','acknowledged','closed') AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_breach_type
  ON breach_reporting_records(breach_type) WHERE deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- F. CROSS-ENTITY LINKAGE (assets, vendors, evidence, policies)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incident_assets (
  incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  asset_id    UUID NOT NULL,
  linked_by   VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (incident_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_assets_asset
  ON incident_assets(asset_id);

CREATE TABLE IF NOT EXISTS incident_vendors (
  incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  vendor_id   UUID NOT NULL,
  vendor_role VARCHAR(100),
  linked_by   VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (incident_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_vendors_vendor
  ON incident_vendors(vendor_id);

CREATE TABLE IF NOT EXISTS incident_evidence (
  incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL,
  linked_by   VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (incident_id, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_evidence_evidence
  ON incident_evidence(evidence_id);

CREATE TABLE IF NOT EXISTS incident_policies (
  incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  policy_id   UUID NOT NULL,
  linked_by   VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (incident_id, policy_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_policies_policy
  ON incident_policies(policy_id);


-- ═══════════════════════════════════════════════
-- G. INCIDENT NOTIFICATIONS LOG
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incident_notifications_log (
  notification_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id       UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  notification_type VARCHAR(40) NOT NULL
    CHECK (notification_type IN ('escalation','sla_warning','sla_breach','assignment','status_change','regulatory_deadline','triage','breach_submitted')),
  recipient_id      VARCHAR(64) NOT NULL,
  channel           VARCHAR(20) NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('email','in_app','sms')),
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at   TIMESTAMPTZ,
  content_summary   TEXT
);

CREATE INDEX IF NOT EXISTS idx_notif_log_incident
  ON incident_notifications_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_recipient
  ON incident_notifications_log(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_type
  ON incident_notifications_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notif_log_unacked
  ON incident_notifications_log(recipient_id, acknowledged_at)
  WHERE acknowledged_at IS NULL;


-- ═══════════════════════════════════════════════
-- H. NAVIGATION SEEDS — new incident pages
-- ═══════════════════════════════════════════════
-- Phase 3A: same platform-scope guard as 106/A and 107/C.
DO $$
BEGIN
  IF to_regclass('navigation_registry') IS NULL THEN
    RAISE NOTICE 'skip 117/H: navigation_registry not on search_path (platform-scope seed not applied per-tenant)';
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'navigation_registry' AND column_name = 'nav_key'
  ) THEN
    RAISE NOTICE 'skip 117/H: modern navigation_registry uses code/parent_code; platform bootstrap owns the seed';
    RETURN;
  END IF;

  INSERT INTO navigation_registry
    (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
  VALUES
    ('incidents-cases',          'incidents', 'Case Register',             'سجل القضايا',          '/incidents/cases',          null, 'incident', 'link', 661, true, true),
    ('incidents-triage',         'incidents', 'Triage Board',              'لوحة الفرز',           '/incidents/triage',         null, 'incident', 'link', 662, true, true),
    ('incidents-breach',         'incidents', 'Breach Reporting',          'الإبلاغ عن الانتهاكات', '/incidents/breach',         null, 'incident', 'link', 663, true, true),
    ('incidents-notifications',  'incidents', 'Notifications & Escalations','الإشعارات والتصعيد',  '/incidents/notifications',  null, 'incident', 'link', 664, true, true),
    ('incidents-reports',        'incidents', 'Reports',                   'التقارير',              '/incidents/reports',        null, 'incident', 'link', 665, true, true),
    ('incidents-admin',          'incidents', 'Admin',                     'الإدارة',               '/incidents/admin',          null, 'incident', 'link', 666, true, true)
  ON CONFLICT (nav_key) DO UPDATE SET
    parent_nav_key = EXCLUDED.parent_nav_key,
    label_en       = EXCLUDED.label_en,
    label_ar       = EXCLUDED.label_ar,
    route          = EXCLUDED.route,
    module_code    = EXCLUDED.module_code,
    sort_order     = EXCLUDED.sort_order,
    is_active      = true;
END $$;


-- ═══════════════════════════════════════════════
-- TABLE DOCUMENTATION
-- ═══════════════════════════════════════════════

COMMENT ON TABLE cases IS 'Separate case entity for grouping related incidents into investigations';
COMMENT ON TABLE case_incidents IS 'Many-to-many junction between cases and incidents';
COMMENT ON TABLE case_notes IS 'Chronological notes attached to cases (investigation, decision, legal)';
COMMENT ON TABLE incident_triage_decisions IS 'Audit trail of triage decisions including auto-scoring factors';
COMMENT ON TABLE incident_impacts IS 'Structured impact records per incident (financial, operational, reputational, etc.)';
COMMENT ON TABLE incident_lessons_learned IS 'Discrete lesson records with implementation tracking';
COMMENT ON TABLE breach_reporting_records IS 'Regulatory breach reporting state machine (NCA, SAMA, SDAIA, NDMO, DPA, CITC)';
COMMENT ON TABLE incident_assets IS 'Junction: incidents ↔ assets';
COMMENT ON TABLE incident_vendors IS 'Junction: incidents ↔ vendors with role attribution';
COMMENT ON TABLE incident_evidence IS 'Junction: incidents ↔ evidence items';
COMMENT ON TABLE incident_policies IS 'Junction: incidents ↔ policies';
COMMENT ON TABLE incident_notifications_log IS 'Audit log of all incident-related notifications sent';

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'Migration 726: Incident/Case/Breach Enterprise created successfully';
  RAISE NOTICE '- Cases: 3 tables (cases, case_incidents, case_notes)';
  RAISE NOTICE '- Triage: 1 table (incident_triage_decisions)';
  RAISE NOTICE '- Impact: 1 table (incident_impacts)';
  RAISE NOTICE '- Lessons: 1 table (incident_lessons_learned)';
  RAISE NOTICE '- Breach: 1 table (breach_reporting_records)';
  RAISE NOTICE '- Linkage: 4 tables (incident_assets, incident_vendors, incident_evidence, incident_policies)';
  RAISE NOTICE '- Notifications: 1 table (incident_notifications_log)';
  RAISE NOTICE '- Navigation: 6 new child items seeded';
  RAISE NOTICE '- Total: 12 new tables';
END $$;

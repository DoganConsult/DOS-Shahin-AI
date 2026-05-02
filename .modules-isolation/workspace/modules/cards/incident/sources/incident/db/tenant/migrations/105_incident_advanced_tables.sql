-- ============================================================================
-- 105_incident_advanced_tables.sql
-- Ported from monolith: backend/src/migrations/tenant/150_incident_advanced_tables.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- ============================================
-- Tenant Migration 150: Incident Advanced Tables
-- Taxonomy tree, near-miss reporting, PIR workflow,
-- regulatory notifications, trend cache
-- ============================================

-- ═══════════════════════════════════════════════
-- A. INCIDENT TAXONOMY TREE
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incident_taxonomy (
  node_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID REFERENCES incident_taxonomy(node_id) ON DELETE SET NULL,
  code            VARCHAR(60)  NOT NULL,
  name_en         VARCHAR(255) NOT NULL,
  name_ar         VARCHAR(255),
  node_type       VARCHAR(30)  NOT NULL DEFAULT 'category'
    CHECK (node_type IN ('root','category','subcategory','type')),
  severity_hint   VARCHAR(20)  DEFAULT 'medium'
    CHECK (severity_hint IN ('low','medium','high','critical')),
  regulatory_flag BOOLEAN NOT NULL DEFAULT FALSE,
  display_order   INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_taxonomy_code
  ON incident_taxonomy(code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_taxonomy_parent
  ON incident_taxonomy(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_taxonomy_type
  ON incident_taxonomy(node_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_taxonomy_regulatory
  ON incident_taxonomy(regulatory_flag) WHERE regulatory_flag = TRUE AND deleted_at IS NULL;

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS taxonomy_node_id UUID;
CREATE INDEX IF NOT EXISTS idx_incidents_taxonomy
  ON incidents(taxonomy_node_id) WHERE taxonomy_node_id IS NOT NULL;


-- ═══════════════════════════════════════════════
-- B. NEAR-MISS REPORTING
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS near_miss_reports (
  near_miss_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(500) NOT NULL,
  description      TEXT NOT NULL,
  taxonomy_node_id UUID REFERENCES incident_taxonomy(node_id),
  reported_by      VARCHAR(64) NOT NULL,
  reported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location         VARCHAR(255),
  department_id    UUID,
  severity_estimate VARCHAR(20) DEFAULT 'low'
    CHECK (severity_estimate IN ('low','medium','high','critical')),
  potential_impact  TEXT,
  root_cause_hint   TEXT,
  preventive_action TEXT,
  status           VARCHAR(30) NOT NULL DEFAULT 'reported'
    CHECK (status IN ('reported','under_review','action_taken','converted','closed','dismissed')),
  converted_to_incident_id UUID,
  reviewer_id      VARCHAR(64),
  reviewed_at      TIMESTAMPTZ,
  review_notes     TEXT,
  tags             TEXT[] DEFAULT '{}',
  attachments      JSONB DEFAULT '[]',
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_near_miss_status
  ON near_miss_reports(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_near_miss_reporter
  ON near_miss_reports(reported_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_near_miss_taxonomy
  ON near_miss_reports(taxonomy_node_id) WHERE taxonomy_node_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_near_miss_severity
  ON near_miss_reports(severity_estimate) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_near_miss_dept
  ON near_miss_reports(department_id) WHERE department_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_near_miss_converted
  ON near_miss_reports(converted_to_incident_id)
  WHERE converted_to_incident_id IS NOT NULL AND deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- C. POST-INCIDENT REVIEW (PIR) WORKFLOW
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incident_pir (
  pir_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id      UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  title            VARCHAR(500) NOT NULL,
  pir_type         VARCHAR(30)  NOT NULL DEFAULT 'standard'
    CHECK (pir_type IN ('standard','major','regulatory','executive')),
  status           VARCHAR(30)  NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_progress','review','sign_off','completed','archived')),
  lead_id          VARCHAR(64),
  facilitator_id   VARCHAR(64),
  scheduled_date   DATE,
  completed_date   DATE,
  timeline_summary TEXT,
  what_happened    TEXT,
  root_causes      JSONB DEFAULT '[]',
  contributing_factors JSONB DEFAULT '[]',
  impact_analysis  JSONB DEFAULT '{}',
  lessons_learned  JSONB DEFAULT '[]',
  recommendations  JSONB DEFAULT '[]',
  action_items     JSONB DEFAULT '[]',
  attendees        JSONB DEFAULT '[]',
  effectiveness_review_date DATE,
  effectiveness_status VARCHAR(30) DEFAULT 'pending'
    CHECK (effectiveness_status IN ('pending','effective','partially_effective','ineffective','not_reviewed')),
  sign_off_by      VARCHAR(64),
  sign_off_at      TIMESTAMPTZ,
  sign_off_notes   TEXT,
  attachments      JSONB DEFAULT '[]',
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pir_incident
  ON incident_pir(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pir_status
  ON incident_pir(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pir_lead
  ON incident_pir(lead_id) WHERE lead_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pir_type
  ON incident_pir(pir_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pir_effectiveness
  ON incident_pir(effectiveness_status)
  WHERE effectiveness_status != 'pending' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS pir_sign_offs (
  sign_off_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pir_id       UUID NOT NULL REFERENCES incident_pir(pir_id) ON DELETE CASCADE,
  signer_id    VARCHAR(64) NOT NULL,
  signer_role  VARCHAR(60),
  decision     VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (decision IN ('pending','approved','rejected','deferred')),
  comments     TEXT,
  signed_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pir_signoffs_pir
  ON pir_sign_offs(pir_id);
CREATE INDEX IF NOT EXISTS idx_pir_signoffs_signer
  ON pir_sign_offs(signer_id);


-- ═══════════════════════════════════════════════
-- D. REGULATORY NOTIFICATIONS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incident_regulatory_notifications (
  notification_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id        UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  regulation_code    VARCHAR(60)  NOT NULL,
  regulation_name    VARCHAR(255) NOT NULL,
  authority_name     VARCHAR(255) NOT NULL,
  authority_contact  JSONB DEFAULT '{}',
  notification_type  VARCHAR(30)  NOT NULL DEFAULT 'initial'
    CHECK (notification_type IN ('initial','update','final','withdrawal')),
  status             VARCHAR(30)  NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','drafted','submitted','acknowledged','follow_up_required','closed')),
  deadline           TIMESTAMPTZ,
  submitted_at       TIMESTAMPTZ,
  submitted_by       VARCHAR(64),
  acknowledged_at    TIMESTAMPTZ,
  reference_number   VARCHAR(100),
  content_summary    TEXT,
  content_full       JSONB DEFAULT '{}',
  response_received  TEXT,
  follow_up_actions  JSONB DEFAULT '[]',
  sla_hours          INT,
  sla_breached       BOOLEAN DEFAULT FALSE,
  attachments        JSONB DEFAULT '[]',
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reg_notif_incident
  ON incident_regulatory_notifications(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reg_notif_regulation
  ON incident_regulatory_notifications(regulation_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reg_notif_status
  ON incident_regulatory_notifications(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reg_notif_deadline
  ON incident_regulatory_notifications(deadline)
  WHERE deadline IS NOT NULL AND status NOT IN ('closed','acknowledged') AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reg_notif_sla_breach
  ON incident_regulatory_notifications(sla_breached)
  WHERE sla_breached = TRUE AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS incident_reportable_criteria (
  criteria_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_code  VARCHAR(60)  NOT NULL,
  criteria_name    VARCHAR(255) NOT NULL,
  criteria_rule    JSONB NOT NULL DEFAULT '{}',
  sla_hours        INT NOT NULL DEFAULT 72,
  authority_name   VARCHAR(255),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reportable_criteria_reg
  ON incident_reportable_criteria(regulation_code) WHERE deleted_at IS NULL AND is_active = TRUE;


-- ═══════════════════════════════════════════════
-- E. TREND ANALYTICS CACHE
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incident_trend_cache (
  cache_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_type       VARCHAR(60)  NOT NULL,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  granularity      VARCHAR(20)  NOT NULL DEFAULT 'month'
    CHECK (granularity IN ('day','week','month','quarter','year')),
  dimension_key    VARCHAR(100),
  dimension_value  VARCHAR(255),
  metric_name      VARCHAR(100) NOT NULL,
  metric_value     NUMERIC NOT NULL DEFAULT 0,
  previous_value   NUMERIC,
  change_pct       NUMERIC,
  trend_direction  VARCHAR(10) DEFAULT 'flat'
    CHECK (trend_direction IN ('up','down','flat')),
  sample_size      INT DEFAULT 0,
  metadata         JSONB DEFAULT '{}',
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trend_cache_type
  ON incident_trend_cache(trend_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_trend_cache_dimension
  ON incident_trend_cache(dimension_key, dimension_value)
  WHERE dimension_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trend_cache_metric
  ON incident_trend_cache(metric_name, trend_direction);

CREATE TABLE IF NOT EXISTS incident_recurring_patterns (
  pattern_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type     VARCHAR(60)  NOT NULL,
  pattern_key      VARCHAR(255) NOT NULL,
  description      TEXT,
  occurrence_count INT NOT NULL DEFAULT 0,
  first_seen       TIMESTAMPTZ NOT NULL,
  last_seen        TIMESTAMPTZ NOT NULL,
  avg_resolution_hours NUMERIC,
  affected_systems JSONB DEFAULT '[]',
  taxonomy_nodes   JSONB DEFAULT '[]',
  severity_distribution JSONB DEFAULT '{}',
  recommended_action TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  metadata         JSONB DEFAULT '{}',
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_patterns_type
  ON incident_recurring_patterns(pattern_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_key
  ON incident_recurring_patterns(pattern_key);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_count
  ON incident_recurring_patterns(occurrence_count DESC) WHERE is_active = TRUE;


-- ═══════════════════════════════════════════════
-- F. INCIDENT ↔ RISK LINKAGE
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incident_risk_links (
  link_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id      UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  risk_id          VARCHAR(100) NOT NULL,
  link_type        VARCHAR(30) NOT NULL DEFAULT 'materialized'
    CHECK (link_type IN ('materialized','contributing','affected','mitigated_by')),
  impact_on_risk   VARCHAR(30) DEFAULT 'increase'
    CHECK (impact_on_risk IN ('increase','decrease','neutral','reassess')),
  risk_score_delta NUMERIC,
  auto_linked      BOOLEAN DEFAULT FALSE,
  linked_by        VARCHAR(64),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incident_risk_link_incident
  ON incident_risk_links(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_risk_link_risk
  ON incident_risk_links(risk_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_risk_link_type
  ON incident_risk_links(link_type) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_risk_link
  ON incident_risk_links(incident_id, risk_id, link_type) WHERE deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- G. INCIDENT AUDIT LOG (module-specific)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incident_audit_log (
  log_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      VARCHAR(40)  NOT NULL,
  entity_id        UUID NOT NULL,
  action           VARCHAR(40)  NOT NULL,
  actor_id         VARCHAR(64),
  actor_role       VARCHAR(60),
  before_state     JSONB,
  after_state      JSONB,
  change_summary   TEXT,
  ip_address       VARCHAR(45),
  user_agent       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_audit_entity
  ON incident_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_incident_audit_actor
  ON incident_audit_log(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incident_audit_action
  ON incident_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_incident_audit_created
  ON incident_audit_log(created_at DESC);


-- ═══════════════════════════════════════════════
-- H. SEED: DEFAULT TAXONOMY TREE
-- ═══════════════════════════════════════════════

INSERT INTO incident_taxonomy (code, name_en, name_ar, node_type, severity_hint, regulatory_flag, display_order)
VALUES
  ('INC_ROOT',        'All Incidents',         'جميع الحوادث',          'root',        'medium', FALSE, 0),
  ('INC_CYBER',       'Cybersecurity',         'الأمن السيبراني',       'category',    'high',   TRUE,  1),
  ('INC_CYBER_MALW',  'Malware',               'برمجيات خبيثة',        'subcategory', 'high',   TRUE,  1),
  ('INC_CYBER_PHISH', 'Phishing',              'تصيد إلكتروني',        'subcategory', 'high',   TRUE,  2),
  ('INC_CYBER_RANSOM','Ransomware',            'فدية إلكترونية',       'subcategory', 'critical',TRUE, 3),
  ('INC_CYBER_DDOS',  'DDoS',                  'هجوم حجب الخدمة',      'subcategory', 'high',   TRUE,  4),
  ('INC_CYBER_UNAUTH','Unauthorized Access',   'وصول غير مصرح',        'subcategory', 'critical',TRUE, 5),
  ('INC_DATA',        'Data Breach',           'خرق البيانات',          'category',    'critical',TRUE, 2),
  ('INC_DATA_PII',    'PII Exposure',          'تسريب بيانات شخصية',   'subcategory', 'critical',TRUE, 1),
  ('INC_DATA_CONF',   'Confidential Leak',     'تسريب بيانات سرية',    'subcategory', 'critical',TRUE, 2),
  ('INC_OPS',         'Operational',           'تشغيلية',               'category',    'medium', FALSE, 3),
  ('INC_OPS_OUTAGE',  'System Outage',         'انقطاع الأنظمة',       'subcategory', 'high',   FALSE, 1),
  ('INC_OPS_PROCESS', 'Process Failure',       'فشل العملية',           'subcategory', 'medium', FALSE, 2),
  ('INC_OPS_HUMAN',   'Human Error',           'خطأ بشري',             'subcategory', 'low',    FALSE, 3),
  ('INC_COMPLIANCE',  'Compliance Violation',  'مخالفة امتثال',         'category',    'high',   TRUE,  4),
  ('INC_COMPLIANCE_REG','Regulatory Breach',   'مخالفة تنظيمية',       'subcategory', 'critical',TRUE, 1),
  ('INC_COMPLIANCE_POL','Policy Violation',    'مخالفة سياسة',         'subcategory', 'medium', FALSE, 2),
  ('INC_PHYSICAL',    'Physical Security',     'أمن مادي',              'category',    'medium', FALSE, 5),
  ('INC_PHYSICAL_ACC','Unauthorized Physical Access','دخول مادي غير مصرح','subcategory','high', FALSE, 1),
  ('INC_THIRD_PARTY', 'Third-Party',           'طرف ثالث',              'category',    'high',   FALSE, 6),
  ('INC_THIRD_PARTY_BREACH','Vendor Breach',   'خرق مورد',             'subcategory', 'high',   TRUE,  1)
ON CONFLICT DO NOTHING;

UPDATE incident_taxonomy SET parent_id = (SELECT node_id FROM incident_taxonomy WHERE code = 'INC_ROOT')
WHERE code IN ('INC_CYBER','INC_DATA','INC_OPS','INC_COMPLIANCE','INC_PHYSICAL','INC_THIRD_PARTY')
  AND parent_id IS NULL AND code != 'INC_ROOT';

UPDATE incident_taxonomy SET parent_id = (SELECT node_id FROM incident_taxonomy WHERE code = 'INC_CYBER')
WHERE code IN ('INC_CYBER_MALW','INC_CYBER_PHISH','INC_CYBER_RANSOM','INC_CYBER_DDOS','INC_CYBER_UNAUTH')
  AND parent_id IS NULL;

UPDATE incident_taxonomy SET parent_id = (SELECT node_id FROM incident_taxonomy WHERE code = 'INC_DATA')
WHERE code IN ('INC_DATA_PII','INC_DATA_CONF') AND parent_id IS NULL;

UPDATE incident_taxonomy SET parent_id = (SELECT node_id FROM incident_taxonomy WHERE code = 'INC_OPS')
WHERE code IN ('INC_OPS_OUTAGE','INC_OPS_PROCESS','INC_OPS_HUMAN') AND parent_id IS NULL;

UPDATE incident_taxonomy SET parent_id = (SELECT node_id FROM incident_taxonomy WHERE code = 'INC_COMPLIANCE')
WHERE code IN ('INC_COMPLIANCE_REG','INC_COMPLIANCE_POL') AND parent_id IS NULL;

UPDATE incident_taxonomy SET parent_id = (SELECT node_id FROM incident_taxonomy WHERE code = 'INC_PHYSICAL')
WHERE code IN ('INC_PHYSICAL_ACC') AND parent_id IS NULL;

UPDATE incident_taxonomy SET parent_id = (SELECT node_id FROM incident_taxonomy WHERE code = 'INC_THIRD_PARTY')
WHERE code IN ('INC_THIRD_PARTY_BREACH') AND parent_id IS NULL;


-- SEED: Default reportable criteria (NCA-ECC / SAMA)
INSERT INTO incident_reportable_criteria (regulation_code, criteria_name, criteria_rule, sla_hours, authority_name)
VALUES
  ('NCA-ECC', 'Critical cyber incident', '{"severity":["critical"],"taxonomy_codes":["INC_CYBER","INC_DATA"]}', 2, 'National Cybersecurity Authority'),
  ('NCA-ECC', 'Data breach involving PII', '{"taxonomy_codes":["INC_DATA_PII"],"severity":["high","critical"]}', 72, 'National Cybersecurity Authority'),
  ('SAMA-BCF','Financial system incident', '{"severity":["critical","high"],"taxonomy_codes":["INC_OPS_OUTAGE","INC_CYBER"]}', 24, 'Saudi Arabian Monetary Authority'),
  ('NDMO',   'Personal data breach (PDPL)', '{"taxonomy_codes":["INC_DATA_PII","INC_DATA_CONF"]}', 72, 'National Data Management Office')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE incident_taxonomy IS 'Hierarchical incident classification tree — supports multi-level categorization';
COMMENT ON TABLE near_miss_reports IS 'Near-miss event reports that may be converted to formal incidents';
COMMENT ON TABLE incident_pir IS 'Post-Incident Review records with structured RCA, lessons learned, and sign-off workflow';
COMMENT ON TABLE incident_regulatory_notifications IS 'Regulatory notification tracking for reportable incidents (NCA, SAMA, NDMO)';
COMMENT ON TABLE incident_trend_cache IS 'Pre-computed trend analytics for incident dashboards and reporting';
COMMENT ON TABLE incident_recurring_patterns IS 'Detected recurring incident patterns for proactive prevention';
COMMENT ON TABLE incident_risk_links IS 'Bidirectional linkage between incidents and risk register entries';
COMMENT ON TABLE incident_audit_log IS 'Module-specific audit trail for all incident-related entities';

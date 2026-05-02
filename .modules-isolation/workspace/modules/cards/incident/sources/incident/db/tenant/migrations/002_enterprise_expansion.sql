-- Module: incident | Migration: 002
-- Enterprise expansion: cross-cutting standard tables + domain-specific tables

-- 1. incident_versions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  entity_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL,
  version         INT NOT NULL,
  data            JSONB NOT NULL DEFAULT '{}',
  changed_by      UUID NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_versions
ALTER TABLE __TENANT_SCHEMA__.incident_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.incident_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.incident_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. incident_change_log
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_change_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  entity_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL,
  field_name      TEXT NOT NULL,
  old_value       TEXT,
  new_value       TEXT,
  changed_by      UUID NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_change_log
ALTER TABLE __TENANT_SCHEMA__.incident_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. incident_settings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  config_key      TEXT NOT NULL,
  config_value    JSONB NOT NULL DEFAULT '{}',
  scope           TEXT NOT NULL DEFAULT 'tenant',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, config_key)
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_settings
ALTER TABLE __TENANT_SCHEMA__.incident_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.incident_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.incident_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.incident_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. incident_kpis
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_kpis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  kpi_code        TEXT NOT NULL,
  name            TEXT NOT NULL,
  current_value   NUMERIC,
  target_value    NUMERIC,
  unit            TEXT,
  period_start    DATE,
  period_end      DATE,
  trend           TEXT,
  computed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_kpis
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. incident_report_snapshots
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_report_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  report_type     TEXT NOT NULL,
  title           TEXT NOT NULL,
  parameters      JSONB NOT NULL DEFAULT '{}',
  result_data     JSONB NOT NULL DEFAULT '{}',
  generated_by    UUID NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.incident_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.incident_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.incident_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incident_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 6. incident_ai_suggestions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_ai_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  suggestion_type TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  confidence      NUMERIC(5,4),
  model_used      TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. incident_external_mappings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_external_mappings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  external_system TEXT NOT NULL,
  external_id     TEXT NOT NULL,
  sync_status     TEXT NOT NULL DEFAULT 'synced',
  last_synced_at  TIMESTAMPTZ,
  mapping_config  JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_external_mappings
ALTER TABLE __TENANT_SCHEMA__.incident_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.incident_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incident_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.incident_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 8. incident_attachments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  file_name       TEXT NOT NULL,
  file_type       TEXT,
  file_size       BIGINT,
  storage_path    TEXT NOT NULL,
  uploaded_by     UUID NOT NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_attachments
ALTER TABLE __TENANT_SCHEMA__.incident_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.incident_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 9. incident_comments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  parent_id       UUID,
  content         TEXT NOT NULL,
  author_id       UUID NOT NULL,
  is_internal     BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_comments
ALTER TABLE __TENANT_SCHEMA__.incident_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.incident_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.incident_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 10. incident_tags
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  tag_key         TEXT NOT NULL,
  tag_value       TEXT,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_tags
ALTER TABLE __TENANT_SCHEMA__.incident_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Domain-specific tables

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_investigations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  incident_id         UUID NOT NULL REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE,
  lead_investigator   UUID NOT NULL,
  investigation_type  TEXT NOT NULL,
  methodology         TEXT,
  status              TEXT NOT NULL DEFAULT 'open',
  findings            JSONB NOT NULL DEFAULT '{}',
  root_cause          TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_investigations
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS lead_investigator UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS investigation_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS methodology TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS findings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_investigations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_timelines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  incident_id     UUID NOT NULL REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE,
  event_time      TIMESTAMPTZ NOT NULL,
  event_type      TEXT NOT NULL,
  description     TEXT NOT NULL,
  recorded_by     UUID,
  evidence_refs   JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_timelines
ALTER TABLE __TENANT_SCHEMA__.incident_timelines ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_timelines ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.incident_timelines ADD COLUMN IF NOT EXISTS event_time TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incident_timelines ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_timelines ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_timelines ADD COLUMN IF NOT EXISTS recorded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_timelines ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.incident_timelines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_timelines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_post_incident_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  incident_id      UUID NOT NULL REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE,
  review_date      DATE,
  facilitator_id   UUID,
  attendees        JSONB NOT NULL DEFAULT '[]',
  lessons_learned  TEXT,
  action_items     JSONB NOT NULL DEFAULT '[]',
  status           TEXT NOT NULL DEFAULT 'scheduled',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_post_incident_reviews
ALTER TABLE __TENANT_SCHEMA__.incident_post_incident_reviews ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_post_incident_reviews ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.incident_post_incident_reviews ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE __TENANT_SCHEMA__.incident_post_incident_reviews ADD COLUMN IF NOT EXISTS facilitator_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_post_incident_reviews ADD COLUMN IF NOT EXISTS attendees JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.incident_post_incident_reviews ADD COLUMN IF NOT EXISTS lessons_learned TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_post_incident_reviews ADD COLUMN IF NOT EXISTS action_items JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.incident_post_incident_reviews ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE __TENANT_SCHEMA__.incident_post_incident_reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_post_incident_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_near_misses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  category            TEXT,
  detected_by         UUID NOT NULL,
  detected_at         TIMESTAMPTZ NOT NULL,
  potential_severity  TEXT,
  preventive_action   TEXT,
  status              TEXT NOT NULL DEFAULT 'reported',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_near_misses
ALTER TABLE __TENANT_SCHEMA__.incident_near_misses ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_near_misses ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_near_misses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_near_misses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_near_misses ADD COLUMN IF NOT EXISTS detected_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_near_misses ADD COLUMN IF NOT EXISTS detected_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incident_near_misses ADD COLUMN IF NOT EXISTS potential_severity TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_near_misses ADD COLUMN IF NOT EXISTS preventive_action TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_near_misses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'reported';
ALTER TABLE __TENANT_SCHEMA__.incident_near_misses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_near_misses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_categories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  code              TEXT NOT NULL,
  name              TEXT NOT NULL,
  parent_id         UUID,
  severity_default  TEXT,
  sla_hours         INT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_categories
ALTER TABLE __TENANT_SCHEMA__.incident_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_categories ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_categories ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_categories ADD COLUMN IF NOT EXISTS severity_default TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_categories ADD COLUMN IF NOT EXISTS sla_hours INT;
ALTER TABLE __TENANT_SCHEMA__.incident_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.incident_categories ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.incident_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_escalation_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL,
  incident_id        UUID NOT NULL REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE,
  escalated_to       UUID NOT NULL,
  escalated_by       UUID NOT NULL,
  escalation_level   INT NOT NULL,
  reason             TEXT,
  escalated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_escalation_log
ALTER TABLE __TENANT_SCHEMA__.incident_escalation_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_escalation_log ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.incident_escalation_log ADD COLUMN IF NOT EXISTS escalated_to UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_escalation_log ADD COLUMN IF NOT EXISTS escalated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_escalation_log ADD COLUMN IF NOT EXISTS escalation_level INT;
ALTER TABLE __TENANT_SCHEMA__.incident_escalation_log ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_escalation_log ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_escalation_log ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incident_escalation_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_escalation_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_regulatory_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  incident_id     UUID NOT NULL REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE,
  regulation      TEXT NOT NULL,
  report_ref      TEXT,
  submitted_at    TIMESTAMPTZ,
  submitted_by    UUID,
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'pending',
  report_data     JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_regulatory_reports
ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_reports ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_reports ADD COLUMN IF NOT EXISTS regulation TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_reports ADD COLUMN IF NOT EXISTS report_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_reports ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_reports ADD COLUMN IF NOT EXISTS submitted_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_reports ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_reports ADD COLUMN IF NOT EXISTS report_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.incident_lessons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  incident_id     UUID NOT NULL REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE,
  lesson_type     TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  recommendations TEXT,
  applies_to      JSONB NOT NULL DEFAULT '[]',
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.incident_lessons
ALTER TABLE __TENANT_SCHEMA__.incident_lessons ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_lessons ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES __TENANT_SCHEMA__.incidents(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.incident_lessons ADD COLUMN IF NOT EXISTS lesson_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_lessons ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_lessons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_lessons ADD COLUMN IF NOT EXISTS recommendations TEXT;
ALTER TABLE __TENANT_SCHEMA__.incident_lessons ADD COLUMN IF NOT EXISTS applies_to JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.incident_lessons ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.incident_lessons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.incident_lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incident_versions_entity ON __TENANT_SCHEMA__.incident_versions(tenant_id, entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_incident_change_log_entity ON __TENANT_SCHEMA__.incident_change_log(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_incident_kpis_tenant ON __TENANT_SCHEMA__.incident_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_incident_ai_suggestions_entity ON __TENANT_SCHEMA__.incident_ai_suggestions(tenant_id, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_incident_attachments_entity ON __TENANT_SCHEMA__.incident_attachments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_incident_comments_entity ON __TENANT_SCHEMA__.incident_comments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_incident_tags_entity ON __TENANT_SCHEMA__.incident_tags(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_incident_investigations_incident ON __TENANT_SCHEMA__.incident_investigations(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_timelines_incident ON __TENANT_SCHEMA__.incident_timelines(incident_id, event_time);
CREATE INDEX IF NOT EXISTS idx_incident_near_misses_tenant ON __TENANT_SCHEMA__.incident_near_misses(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_incident_escalation_log_incident ON __TENANT_SCHEMA__.incident_escalation_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_regulatory_reports_incident ON __TENANT_SCHEMA__.incident_regulatory_reports(incident_id);

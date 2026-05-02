-- Module: vendor | Migration: 002
-- Enterprise expansion: cross-cutting standard tables + domain-specific tables

-- 1. vendor_versions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_versions
ALTER TABLE __TENANT_SCHEMA__.vendor_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.vendor_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.vendor_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. vendor_change_log
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_change_log
ALTER TABLE __TENANT_SCHEMA__.vendor_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. vendor_settings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_settings
ALTER TABLE __TENANT_SCHEMA__.vendor_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.vendor_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.vendor_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.vendor_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. vendor_kpis
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_kpis
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. vendor_report_snapshots
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.vendor_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.vendor_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.vendor_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 6. vendor_ai_suggestions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. vendor_external_mappings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_external_mappings
ALTER TABLE __TENANT_SCHEMA__.vendor_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.vendor_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.vendor_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 8. vendor_attachments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_attachments
ALTER TABLE __TENANT_SCHEMA__.vendor_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.vendor_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 9. vendor_comments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_comments
ALTER TABLE __TENANT_SCHEMA__.vendor_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.vendor_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.vendor_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 10. vendor_tags
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_tags
ALTER TABLE __TENANT_SCHEMA__.vendor_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Domain-specific tables

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  vendor_id         UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
  assessment_type   TEXT NOT NULL,
  assessor_id       UUID NOT NULL,
  assessment_date   DATE,
  overall_score     NUMERIC(5,2),
  risk_rating       TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',
  findings          JSONB NOT NULL DEFAULT '{}',
  next_assessment   DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_assessments
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS assessment_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS assessor_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS assessment_date DATE;
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS overall_score NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS risk_rating TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS findings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS next_assessment DATE;
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  vendor_id           UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
  contract_ref        TEXT NOT NULL,
  title               TEXT NOT NULL,
  start_date          DATE,
  end_date            DATE,
  value               NUMERIC(15,2),
  currency            TEXT NOT NULL DEFAULT 'SAR',
  status              TEXT NOT NULL DEFAULT 'active',
  auto_renewal        BOOLEAN NOT NULL DEFAULT FALSE,
  notice_period_days  INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_contracts
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS contract_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS value NUMERIC(15,2);
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'SAR';
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS notice_period_days INT;
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_due_diligence_ext (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  vendor_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
  check_type      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  result          TEXT,
  performed_by    UUID,
  performed_at    TIMESTAMPTZ,
  evidence_refs   JSONB NOT NULL DEFAULT '[]',
  next_check      DATE,
  risk_findings   JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_due_diligence_ext
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS check_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS performed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS performed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS next_check DATE;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS risk_findings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence_ext ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_sla_tracking (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  vendor_id           UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
  sla_metric          TEXT NOT NULL,
  target_value        NUMERIC,
  actual_value        NUMERIC,
  measurement_period  TEXT,
  status              TEXT NOT NULL DEFAULT 'met',
  breach_count        INT NOT NULL DEFAULT 0,
  last_measured       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_sla_tracking
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_tracking ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_tracking ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_tracking ADD COLUMN IF NOT EXISTS sla_metric TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_tracking ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_tracking ADD COLUMN IF NOT EXISTS actual_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_tracking ADD COLUMN IF NOT EXISTS measurement_period TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_tracking ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'met';
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_tracking ADD COLUMN IF NOT EXISTS breach_count INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_tracking ADD COLUMN IF NOT EXISTS last_measured TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_tracking ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_tracking ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_fourth_party (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  vendor_id           UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
  sub_vendor_name     TEXT NOT NULL,
  service_description TEXT,
  risk_level          TEXT,
  data_access         BOOLEAN NOT NULL DEFAULT FALSE,
  location            TEXT,
  assessment_status   TEXT NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_fourth_party
ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party ADD COLUMN IF NOT EXISTS sub_vendor_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party ADD COLUMN IF NOT EXISTS service_description TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party ADD COLUMN IF NOT EXISTS data_access BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party ADD COLUMN IF NOT EXISTS assessment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_concentration (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  vendor_id           UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
  service_category    TEXT NOT NULL,
  spend_percentage    NUMERIC(5,2),
  criticality         TEXT,
  alternative_count   INT,
  risk_score          NUMERIC(5,2),
  computed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_concentration
ALTER TABLE __TENANT_SCHEMA__.vendor_concentration ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_concentration ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_concentration ADD COLUMN IF NOT EXISTS service_category TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_concentration ADD COLUMN IF NOT EXISTS spend_percentage NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.vendor_concentration ADD COLUMN IF NOT EXISTS criticality TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_concentration ADD COLUMN IF NOT EXISTS alternative_count INT;
ALTER TABLE __TENANT_SCHEMA__.vendor_concentration ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.vendor_concentration ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_concentration ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_concentration ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_offboarding (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  vendor_id           UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
  reason              TEXT,
  initiated_by        UUID NOT NULL,
  initiated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status              TEXT NOT NULL DEFAULT 'initiated',
  checklist           JSONB NOT NULL DEFAULT '[]',
  data_return_status  TEXT,
  access_revoked      BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_offboarding
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS initiated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'initiated';
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS data_return_status TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS access_revoked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_monitoring (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  vendor_id         UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
  monitor_type      TEXT NOT NULL,
  check_frequency   TEXT,
  last_checked      TIMESTAMPTZ,
  status            TEXT,
  alerts            JSONB NOT NULL DEFAULT '[]',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_monitoring
ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring ADD COLUMN IF NOT EXISTS monitor_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring ADD COLUMN IF NOT EXISTS check_frequency TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring ADD COLUMN IF NOT EXISTS alerts JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_versions_entity ON __TENANT_SCHEMA__.vendor_versions(tenant_id, entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_vendor_change_log_entity ON __TENANT_SCHEMA__.vendor_change_log(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_vendor_kpis_tenant ON __TENANT_SCHEMA__.vendor_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_vendor_ai_suggestions_entity ON __TENANT_SCHEMA__.vendor_ai_suggestions(tenant_id, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_attachments_entity ON __TENANT_SCHEMA__.vendor_attachments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_vendor_comments_entity ON __TENANT_SCHEMA__.vendor_comments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_vendor_tags_entity ON __TENANT_SCHEMA__.vendor_tags(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_vendor_assessments_vendor ON __TENANT_SCHEMA__.vendor_assessments(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor ON __TENANT_SCHEMA__.vendor_contracts(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_sla_tracking_vendor ON __TENANT_SCHEMA__.vendor_sla_tracking(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_monitoring_vendor ON __TENANT_SCHEMA__.vendor_monitoring(vendor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_offboarding_vendor ON __TENANT_SCHEMA__.vendor_offboarding(vendor_id, status);

-- Module: controls | Migration: 002 | Enterprise Expansion

-- ─── Standard Cross-Cutting Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_versions
ALTER TABLE __TENANT_SCHEMA__.controls_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.controls_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.controls_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_change_log
ALTER TABLE __TENANT_SCHEMA__.controls_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_settings
ALTER TABLE __TENANT_SCHEMA__.controls_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.controls_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.controls_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.controls_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_kpis (
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
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_kpis
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.controls_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.controls_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.controls_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.controls_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_external_mappings
ALTER TABLE __TENANT_SCHEMA__.controls_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.controls_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.controls_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.controls_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_attachments
ALTER TABLE __TENANT_SCHEMA__.controls_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.controls_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_comments
ALTER TABLE __TENANT_SCHEMA__.controls_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.controls_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.controls_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  tag_key         TEXT NOT NULL,
  tag_value       TEXT NOT NULL,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_tags
ALTER TABLE __TENANT_SCHEMA__.controls_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Module-Specific Domain Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_library (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  control_ref         TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  control_type        TEXT NOT NULL CHECK (control_type IN ('preventive','detective','corrective','directive')),
  implementation_type TEXT NOT NULL CHECK (implementation_type IN ('manual','automated','semi_automated')),
  domain              TEXT,
  category            TEXT,
  is_key_control      BOOLEAN NOT NULL DEFAULT FALSE,
  owner_id            UUID,
  status              TEXT NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, control_ref)
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_library
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS control_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS control_type TEXT CHECK (control_type IN ('preventive','detective','corrective','directive'));
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS implementation_type TEXT CHECK (implementation_type IN ('manual','automated','semi_automated'));
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS is_key_control BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_library ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_testing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  control_id      UUID NOT NULL,
  test_type       TEXT NOT NULL,
  test_date       DATE NOT NULL,
  tester_id       UUID NOT NULL,
  result          TEXT NOT NULL CHECK (result IN ('effective','partially_effective','ineffective','not_tested')),
  evidence_refs   JSONB NOT NULL DEFAULT '[]',
  notes           TEXT,
  next_test_date  DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_testing
ALTER TABLE __TENANT_SCHEMA__.controls_testing ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_testing ADD COLUMN IF NOT EXISTS control_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_testing ADD COLUMN IF NOT EXISTS test_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_testing ADD COLUMN IF NOT EXISTS test_date DATE;
ALTER TABLE __TENANT_SCHEMA__.controls_testing ADD COLUMN IF NOT EXISTS tester_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_testing ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('effective','partially_effective','ineffective','not_tested'));
ALTER TABLE __TENANT_SCHEMA__.controls_testing ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.controls_testing ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_testing ADD COLUMN IF NOT EXISTS next_test_date DATE;
ALTER TABLE __TENANT_SCHEMA__.controls_testing ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_testing ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_deficiencies (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL,
  control_id              UUID NOT NULL,
  deficiency_type         TEXT NOT NULL CHECK (deficiency_type IN ('design','operating','both')),
  severity                TEXT NOT NULL,
  description             TEXT NOT NULL,
  root_cause              TEXT,
  remediation_plan        TEXT,
  status                  TEXT NOT NULL DEFAULT 'open',
  identified_date         DATE,
  target_resolution_date  DATE,
  owner_id                UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_deficiencies
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS control_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS deficiency_type TEXT CHECK (deficiency_type IN ('design','operating','both'));
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS remediation_plan TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS identified_date DATE;
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS target_resolution_date DATE;
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_deficiencies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_certifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  control_id        UUID NOT NULL,
  certifier_id      UUID NOT NULL,
  certification_date DATE NOT NULL,
  period_start      DATE,
  period_end        DATE,
  status            TEXT NOT NULL DEFAULT 'certified',
  notes             TEXT,
  evidence_refs     JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_certifications
ALTER TABLE __TENANT_SCHEMA__.controls_certifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_certifications ADD COLUMN IF NOT EXISTS control_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_certifications ADD COLUMN IF NOT EXISTS certifier_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_certifications ADD COLUMN IF NOT EXISTS certification_date DATE;
ALTER TABLE __TENANT_SCHEMA__.controls_certifications ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.controls_certifications ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.controls_certifications ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'certified';
ALTER TABLE __TENANT_SCHEMA__.controls_certifications ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_certifications ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.controls_certifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_certifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_mapping (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  control_id      UUID NOT NULL,
  framework_id    UUID NOT NULL,
  requirement_ref TEXT NOT NULL,
  mapping_type    TEXT NOT NULL DEFAULT 'direct',
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_mapping
ALTER TABLE __TENANT_SCHEMA__.controls_mapping ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_mapping ADD COLUMN IF NOT EXISTS control_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_mapping ADD COLUMN IF NOT EXISTS framework_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_mapping ADD COLUMN IF NOT EXISTS requirement_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_mapping ADD COLUMN IF NOT EXISTS mapping_type TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE __TENANT_SCHEMA__.controls_mapping ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.controls_mapping ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_mapping ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_mapping ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_monitoring (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  control_id      UUID NOT NULL,
  metric_name     TEXT NOT NULL,
  metric_value    NUMERIC,
  threshold_amber NUMERIC,
  threshold_red   NUMERIC,
  status          TEXT NOT NULL DEFAULT 'green',
  last_checked    TIMESTAMPTZ,
  check_frequency TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_monitoring
ALTER TABLE __TENANT_SCHEMA__.controls_monitoring ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_monitoring ADD COLUMN IF NOT EXISTS control_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_monitoring ADD COLUMN IF NOT EXISTS metric_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_monitoring ADD COLUMN IF NOT EXISTS metric_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.controls_monitoring ADD COLUMN IF NOT EXISTS threshold_amber NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.controls_monitoring ADD COLUMN IF NOT EXISTS threshold_red NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.controls_monitoring ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'green';
ALTER TABLE __TENANT_SCHEMA__.controls_monitoring ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.controls_monitoring ADD COLUMN IF NOT EXISTS check_frequency TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_monitoring ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_monitoring ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_risk_mapping (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  control_id          UUID NOT NULL,
  risk_id             UUID NOT NULL,
  effectiveness_rating TEXT,
  contribution_type   TEXT NOT NULL DEFAULT 'mitigating',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_risk_mapping
ALTER TABLE __TENANT_SCHEMA__.controls_risk_mapping ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_risk_mapping ADD COLUMN IF NOT EXISTS control_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_risk_mapping ADD COLUMN IF NOT EXISTS risk_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_risk_mapping ADD COLUMN IF NOT EXISTS effectiveness_rating TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_risk_mapping ADD COLUMN IF NOT EXISTS contribution_type TEXT NOT NULL DEFAULT 'mitigating';
ALTER TABLE __TENANT_SCHEMA__.controls_risk_mapping ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_risk_mapping ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_risk_mapping ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.controls_automation (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  control_id   UUID NOT NULL,
  automation_type TEXT NOT NULL,
  script_ref   TEXT,
  schedule     TEXT,
  last_run     TIMESTAMPTZ,
  last_result  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  config       JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.controls_automation
ALTER TABLE __TENANT_SCHEMA__.controls_automation ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_automation ADD COLUMN IF NOT EXISTS control_id UUID;
ALTER TABLE __TENANT_SCHEMA__.controls_automation ADD COLUMN IF NOT EXISTS automation_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_automation ADD COLUMN IF NOT EXISTS script_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_automation ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_automation ADD COLUMN IF NOT EXISTS last_run TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.controls_automation ADD COLUMN IF NOT EXISTS last_result TEXT;
ALTER TABLE __TENANT_SCHEMA__.controls_automation ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.controls_automation ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.controls_automation ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.controls_automation ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ctrl_versions_tenant_entity ON __TENANT_SCHEMA__.controls_versions(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_change_log_tenant ON __TENANT_SCHEMA__.controls_change_log(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_settings_tenant ON __TENANT_SCHEMA__.controls_settings(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ctrl_kpis_tenant ON __TENANT_SCHEMA__.controls_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_ctrl_report_snapshots_tenant ON __TENANT_SCHEMA__.controls_report_snapshots(tenant_id, report_type);
CREATE INDEX IF NOT EXISTS idx_ctrl_ai_suggestions_tenant ON __TENANT_SCHEMA__.controls_ai_suggestions(tenant_id, entity_type, status);
CREATE INDEX IF NOT EXISTS idx_ctrl_external_mappings_tenant ON __TENANT_SCHEMA__.controls_external_mappings(tenant_id, external_system);
CREATE INDEX IF NOT EXISTS idx_ctrl_attachments_entity ON __TENANT_SCHEMA__.controls_attachments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_comments_entity ON __TENANT_SCHEMA__.controls_comments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_tags_entity ON __TENANT_SCHEMA__.controls_tags(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_library_tenant ON __TENANT_SCHEMA__.controls_library(tenant_id, status, control_type);
CREATE INDEX IF NOT EXISTS idx_ctrl_library_domain ON __TENANT_SCHEMA__.controls_library(tenant_id, domain, category);
CREATE INDEX IF NOT EXISTS idx_ctrl_testing_control ON __TENANT_SCHEMA__.controls_testing(tenant_id, control_id, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_ctrl_deficiencies_control ON __TENANT_SCHEMA__.controls_deficiencies(tenant_id, control_id, status);
CREATE INDEX IF NOT EXISTS idx_ctrl_certifications_control ON __TENANT_SCHEMA__.controls_certifications(tenant_id, control_id, status);
CREATE INDEX IF NOT EXISTS idx_ctrl_mapping_control ON __TENANT_SCHEMA__.controls_mapping(tenant_id, control_id, framework_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_monitoring_control ON __TENANT_SCHEMA__.controls_monitoring(tenant_id, control_id, status);
CREATE INDEX IF NOT EXISTS idx_ctrl_risk_mapping_control ON __TENANT_SCHEMA__.controls_risk_mapping(tenant_id, control_id, risk_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_automation_control ON __TENANT_SCHEMA__.controls_automation(tenant_id, control_id, is_active);

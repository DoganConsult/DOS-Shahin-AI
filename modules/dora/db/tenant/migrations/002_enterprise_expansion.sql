-- Module: dora | Migration: 002
-- Enterprise expansion: cross-cutting standard tables + domain-specific tables

-- 1. dora_versions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_versions
ALTER TABLE __TENANT_SCHEMA__.dora_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.dora_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.dora_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. dora_change_log
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_change_log
ALTER TABLE __TENANT_SCHEMA__.dora_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. dora_settings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_settings
ALTER TABLE __TENANT_SCHEMA__.dora_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.dora_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.dora_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.dora_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. dora_kpis
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_kpis
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. dora_report_snapshots
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.dora_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.dora_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.dora_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.dora_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 6. dora_ai_suggestions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. dora_external_mappings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_external_mappings
ALTER TABLE __TENANT_SCHEMA__.dora_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.dora_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.dora_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.dora_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 8. dora_attachments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_attachments
ALTER TABLE __TENANT_SCHEMA__.dora_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.dora_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 9. dora_comments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_comments
ALTER TABLE __TENANT_SCHEMA__.dora_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.dora_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.dora_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 10. dora_tags
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_tags
ALTER TABLE __TENANT_SCHEMA__.dora_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Domain-specific tables

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_ict_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  asset_ref       TEXT NOT NULL,
  name            TEXT NOT NULL,
  asset_type      TEXT NOT NULL,
  classification  TEXT,
  criticality     TEXT,
  owner_id        UUID,
  provider        TEXT,
  location        TEXT,
  dependencies    JSONB NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_ict_assets
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS asset_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS asset_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS criticality TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS dependencies JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_ict_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_resilience_tests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  test_ref          TEXT NOT NULL,
  title             TEXT NOT NULL,
  test_type         TEXT NOT NULL CHECK (test_type IN ('vulnerability','penetration','scenario','tabletop','red_team')),
  ict_asset_id      UUID,
  planned_date      DATE,
  actual_date       DATE,
  status            TEXT NOT NULL DEFAULT 'planned',
  tester            TEXT,
  results           JSONB NOT NULL DEFAULT '{}',
  findings_count    INT NOT NULL DEFAULT 0,
  recommendations   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_resilience_tests
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS test_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS test_type TEXT CHECK (test_type IN ('vulnerability','penetration','scenario','tabletop','red_team'));
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS ict_asset_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS planned_date DATE;
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS actual_date DATE;
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS tester TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS results JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS findings_count INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS recommendations TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_resilience_tests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_major_incidents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL,
  incident_ref            TEXT NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT,
  classification          TEXT,
  ict_assets_affected     JSONB NOT NULL DEFAULT '[]',
  impact_assessment       JSONB NOT NULL DEFAULT '{}',
  detection_time          TIMESTAMPTZ,
  resolution_time         TIMESTAMPTZ,
  root_cause              TEXT,
  regulatory_reported     BOOLEAN NOT NULL DEFAULT FALSE,
  report_date             DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_major_incidents
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS incident_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS ict_assets_affected JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS impact_assessment JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS detection_time TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS resolution_time TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS regulatory_reported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS report_date DATE;
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_major_incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_threat_intelligence (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  threat_ref        TEXT NOT NULL,
  title             TEXT NOT NULL,
  threat_type       TEXT,
  source            TEXT,
  severity          TEXT,
  affected_assets   JSONB NOT NULL DEFAULT '[]',
  indicators        JSONB NOT NULL DEFAULT '[]',
  status            TEXT NOT NULL DEFAULT 'new',
  mitigations       TEXT,
  shared_with       JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_threat_intelligence
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS threat_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS threat_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS affected_assets JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS indicators JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS mitigations TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS shared_with JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_threat_intelligence ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_third_party_ict (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  provider_name       TEXT NOT NULL,
  service_type        TEXT,
  criticality         TEXT,
  contract_ref        TEXT,
  sub_outsourcing     BOOLEAN NOT NULL DEFAULT FALSE,
  data_location       TEXT,
  exit_strategy       TEXT,
  monitoring_status   TEXT NOT NULL DEFAULT 'active',
  last_assessment     DATE,
  risk_rating         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_third_party_ict
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS provider_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS criticality TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS contract_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS sub_outsourcing BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS data_location TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS exit_strategy TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS monitoring_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS last_assessment DATE;
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS risk_rating TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_third_party_ict ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_information_register (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  register_type         TEXT NOT NULL,
  entry_ref             TEXT NOT NULL,
  description           TEXT,
  ict_service           TEXT,
  provider              TEXT,
  start_date            DATE,
  end_date              DATE,
  annual_cost           NUMERIC(15,2),
  data_classification   TEXT,
  sub_outsourced        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_information_register
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS register_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS entry_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS ict_service TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS annual_cost NUMERIC(15,2);
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS data_classification TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS sub_outsourced BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_information_register ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_testing_program (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  program_ref       TEXT NOT NULL,
  year              INT NOT NULL,
  scope             TEXT,
  methodology       TEXT,
  tlpt_required     BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'planned',
  budget            NUMERIC(15,2),
  approved_by       UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_testing_program
ALTER TABLE __TENANT_SCHEMA__.dora_testing_program ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_testing_program ADD COLUMN IF NOT EXISTS program_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_testing_program ADD COLUMN IF NOT EXISTS year INT;
ALTER TABLE __TENANT_SCHEMA__.dora_testing_program ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_testing_program ADD COLUMN IF NOT EXISTS methodology TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_testing_program ADD COLUMN IF NOT EXISTS tlpt_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.dora_testing_program ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE __TENANT_SCHEMA__.dora_testing_program ADD COLUMN IF NOT EXISTS budget NUMERIC(15,2);
ALTER TABLE __TENANT_SCHEMA__.dora_testing_program ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_testing_program ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_testing_program ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.dora_backup_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  asset_id        UUID,
  backup_type     TEXT NOT NULL,
  frequency       TEXT NOT NULL,
  retention_days  INT NOT NULL,
  location        TEXT,
  encryption      BOOLEAN NOT NULL DEFAULT TRUE,
  last_tested     DATE,
  rpo_hours       INT,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.dora_backup_policies
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS asset_id UUID;
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS backup_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS retention_days INT;
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS encryption BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS last_tested DATE;
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS rpo_hours INT;
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.dora_backup_policies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dora_versions_entity ON __TENANT_SCHEMA__.dora_versions(tenant_id, entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_dora_change_log_entity ON __TENANT_SCHEMA__.dora_change_log(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_dora_kpis_tenant ON __TENANT_SCHEMA__.dora_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_dora_ai_suggestions_entity ON __TENANT_SCHEMA__.dora_ai_suggestions(tenant_id, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_dora_attachments_entity ON __TENANT_SCHEMA__.dora_attachments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_dora_comments_entity ON __TENANT_SCHEMA__.dora_comments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_dora_tags_entity ON __TENANT_SCHEMA__.dora_tags(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_dora_ict_assets_tenant ON __TENANT_SCHEMA__.dora_ict_assets(tenant_id, criticality, status);
CREATE INDEX IF NOT EXISTS idx_dora_resilience_tests_tenant ON __TENANT_SCHEMA__.dora_resilience_tests(tenant_id, status, test_type);
CREATE INDEX IF NOT EXISTS idx_dora_major_incidents_tenant ON __TENANT_SCHEMA__.dora_major_incidents(tenant_id, regulatory_reported);
CREATE INDEX IF NOT EXISTS idx_dora_threat_intelligence_tenant ON __TENANT_SCHEMA__.dora_threat_intelligence(tenant_id, severity, status);
CREATE INDEX IF NOT EXISTS idx_dora_third_party_ict_tenant ON __TENANT_SCHEMA__.dora_third_party_ict(tenant_id, criticality, monitoring_status);
CREATE INDEX IF NOT EXISTS idx_dora_information_register_tenant ON __TENANT_SCHEMA__.dora_information_register(tenant_id, register_type);
CREATE INDEX IF NOT EXISTS idx_dora_backup_policies_tenant ON __TENANT_SCHEMA__.dora_backup_policies(tenant_id, status);

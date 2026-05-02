-- Module: compliance | Migration: 002 | Enterprise Expansion

-- ─── Standard Cross-Cutting Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_versions
ALTER TABLE __TENANT_SCHEMA__.compliance_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.compliance_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.compliance_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_change_log
ALTER TABLE __TENANT_SCHEMA__.compliance_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_settings
ALTER TABLE __TENANT_SCHEMA__.compliance_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.compliance_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.compliance_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.compliance_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_kpis
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.compliance_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.compliance_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.compliance_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.compliance_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_external_mappings
ALTER TABLE __TENANT_SCHEMA__.compliance_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.compliance_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.compliance_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.compliance_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_attachments
ALTER TABLE __TENANT_SCHEMA__.compliance_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.compliance_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_comments
ALTER TABLE __TENANT_SCHEMA__.compliance_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.compliance_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.compliance_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_tags
ALTER TABLE __TENANT_SCHEMA__.compliance_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Module-Specific Domain Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_programs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  program_type TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  owner_id     UUID,
  start_date   DATE,
  end_date     DATE,
  budget       NUMERIC(15,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_programs
ALTER TABLE __TENANT_SCHEMA__.compliance_programs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_programs ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_programs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_programs ADD COLUMN IF NOT EXISTS program_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_programs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.compliance_programs ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_programs ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_programs ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_programs ADD COLUMN IF NOT EXISTS budget NUMERIC(15,2);
ALTER TABLE __TENANT_SCHEMA__.compliance_programs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_programs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_controls_mapping (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  requirement_id UUID NOT NULL REFERENCES __TENANT_SCHEMA__.compliance_requirements(id) ON DELETE CASCADE,
  control_id     UUID NOT NULL,
  mapping_status TEXT NOT NULL DEFAULT 'active',
  effectiveness  TEXT,
  last_tested    DATE,
  next_test_date DATE,
  tester_id      UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_controls_mapping
ALTER TABLE __TENANT_SCHEMA__.compliance_controls_mapping ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_controls_mapping ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES __TENANT_SCHEMA__.compliance_requirements(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.compliance_controls_mapping ADD COLUMN IF NOT EXISTS control_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_controls_mapping ADD COLUMN IF NOT EXISTS mapping_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.compliance_controls_mapping ADD COLUMN IF NOT EXISTS effectiveness TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_controls_mapping ADD COLUMN IF NOT EXISTS last_tested DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_controls_mapping ADD COLUMN IF NOT EXISTS next_test_date DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_controls_mapping ADD COLUMN IF NOT EXISTS tester_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_controls_mapping ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_controls_mapping ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_evidence_links (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  requirement_id UUID NOT NULL REFERENCES __TENANT_SCHEMA__.compliance_requirements(id) ON DELETE CASCADE,
  evidence_id    UUID NOT NULL,
  link_type      TEXT NOT NULL DEFAULT 'supporting',
  verified_at    TIMESTAMPTZ,
  verified_by    UUID,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_evidence_links
ALTER TABLE __TENANT_SCHEMA__.compliance_evidence_links ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_evidence_links ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES __TENANT_SCHEMA__.compliance_requirements(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.compliance_evidence_links ADD COLUMN IF NOT EXISTS evidence_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_evidence_links ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'supporting';
ALTER TABLE __TENANT_SCHEMA__.compliance_evidence_links ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.compliance_evidence_links ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_evidence_links ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_evidence_links ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_evidence_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_attestations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  framework_id    UUID NOT NULL REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id) ON DELETE CASCADE,
  attestation_type TEXT NOT NULL,
  attested_by     UUID NOT NULL,
  attested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start    DATE,
  period_end      DATE,
  status          TEXT NOT NULL DEFAULT 'active',
  declaration     TEXT,
  evidence_refs   JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_attestations
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS framework_id UUID REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS attestation_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS attested_by UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS attested_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS declaration TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_attestations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_exceptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL,
  requirement_id         UUID NOT NULL REFERENCES __TENANT_SCHEMA__.compliance_requirements(id) ON DELETE CASCADE,
  exception_type         TEXT NOT NULL,
  justification          TEXT,
  risk_assessment        TEXT,
  compensating_controls  TEXT,
  approved_by            UUID,
  approved_at            TIMESTAMPTZ,
  valid_from             DATE,
  valid_to               DATE,
  status                 TEXT NOT NULL DEFAULT 'pending',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_exceptions
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES __TENANT_SCHEMA__.compliance_requirements(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS exception_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS risk_assessment TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS compensating_controls TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS valid_to DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_exceptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_regulatory_changes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  regulation_name  TEXT NOT NULL,
  change_type      TEXT NOT NULL,
  description      TEXT,
  effective_date   DATE,
  impact_assessment TEXT,
  status           TEXT NOT NULL DEFAULT 'new',
  assigned_to      UUID,
  action_items     JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_regulatory_changes
ALTER TABLE __TENANT_SCHEMA__.compliance_regulatory_changes ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_regulatory_changes ADD COLUMN IF NOT EXISTS regulation_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_regulatory_changes ADD COLUMN IF NOT EXISTS change_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_regulatory_changes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_regulatory_changes ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_regulatory_changes ADD COLUMN IF NOT EXISTS impact_assessment TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_regulatory_changes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE __TENANT_SCHEMA__.compliance_regulatory_changes ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_regulatory_changes ADD COLUMN IF NOT EXISTS action_items JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.compliance_regulatory_changes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_regulatory_changes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_monitoring (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  requirement_id   UUID NOT NULL REFERENCES __TENANT_SCHEMA__.compliance_requirements(id) ON DELETE CASCADE,
  monitoring_type  TEXT NOT NULL,
  frequency        TEXT,
  last_checked     TIMESTAMPTZ,
  next_check       TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'active',
  automated        BOOLEAN NOT NULL DEFAULT FALSE,
  alert_threshold  JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_monitoring
ALTER TABLE __TENANT_SCHEMA__.compliance_monitoring ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_monitoring ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES __TENANT_SCHEMA__.compliance_requirements(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.compliance_monitoring ADD COLUMN IF NOT EXISTS monitoring_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_monitoring ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_monitoring ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.compliance_monitoring ADD COLUMN IF NOT EXISTS next_check TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.compliance_monitoring ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.compliance_monitoring ADD COLUMN IF NOT EXISTS automated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.compliance_monitoring ADD COLUMN IF NOT EXISTS alert_threshold JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.compliance_monitoring ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_monitoring ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_posture_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  framework_id        UUID NOT NULL REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id) ON DELETE CASCADE,
  score               NUMERIC(5,2) NOT NULL,
  total_requirements  INT NOT NULL DEFAULT 0,
  compliant           INT NOT NULL DEFAULT 0,
  partially_compliant INT NOT NULL DEFAULT 0,
  non_compliant       INT NOT NULL DEFAULT 0,
  not_applicable      INT NOT NULL DEFAULT 0,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_posture_scores
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS framework_id UUID REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS total_requirements INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS compliant INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS partially_compliant INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS non_compliant INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS not_applicable INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS period TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_posture_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_roadmap (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  milestone_type  TEXT NOT NULL,
  target_date     DATE,
  actual_date     DATE,
  status          TEXT NOT NULL DEFAULT 'planned',
  dependencies    JSONB NOT NULL DEFAULT '[]',
  owner_id        UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_roadmap
ALTER TABLE __TENANT_SCHEMA__.compliance_roadmap ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_roadmap ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_roadmap ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_roadmap ADD COLUMN IF NOT EXISTS milestone_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_roadmap ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_roadmap ADD COLUMN IF NOT EXISTS actual_date DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_roadmap ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE __TENANT_SCHEMA__.compliance_roadmap ADD COLUMN IF NOT EXISTS dependencies JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.compliance_roadmap ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_roadmap ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_roadmap ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_calendar (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  title        TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  framework_id UUID REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id),
  start_date   DATE NOT NULL,
  end_date     DATE,
  recurrence   TEXT,
  owner_id     UUID,
  status       TEXT NOT NULL DEFAULT 'scheduled',
  reminders    JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_calendar
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS framework_id UUID REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id);
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS recurrence TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS reminders JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_calendar ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_comp_versions_tenant_entity ON __TENANT_SCHEMA__.compliance_versions(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comp_change_log_tenant ON __TENANT_SCHEMA__.compliance_change_log(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comp_settings_tenant ON __TENANT_SCHEMA__.compliance_settings(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_comp_kpis_tenant ON __TENANT_SCHEMA__.compliance_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_comp_report_snapshots_tenant ON __TENANT_SCHEMA__.compliance_report_snapshots(tenant_id, report_type);
CREATE INDEX IF NOT EXISTS idx_comp_ai_suggestions_tenant ON __TENANT_SCHEMA__.compliance_ai_suggestions(tenant_id, entity_type, status);
CREATE INDEX IF NOT EXISTS idx_comp_external_mappings_tenant ON __TENANT_SCHEMA__.compliance_external_mappings(tenant_id, external_system);
CREATE INDEX IF NOT EXISTS idx_comp_attachments_entity ON __TENANT_SCHEMA__.compliance_attachments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comp_comments_entity ON __TENANT_SCHEMA__.compliance_comments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comp_tags_entity ON __TENANT_SCHEMA__.compliance_tags(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comp_programs_tenant ON __TENANT_SCHEMA__.compliance_programs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_comp_controls_mapping_req ON __TENANT_SCHEMA__.compliance_controls_mapping(tenant_id, requirement_id);
CREATE INDEX IF NOT EXISTS idx_comp_evidence_links_req ON __TENANT_SCHEMA__.compliance_evidence_links(tenant_id, requirement_id);
CREATE INDEX IF NOT EXISTS idx_comp_attestations_framework ON __TENANT_SCHEMA__.compliance_attestations(tenant_id, framework_id, status);
CREATE INDEX IF NOT EXISTS idx_comp_exceptions_req ON __TENANT_SCHEMA__.compliance_exceptions(tenant_id, requirement_id, status);
CREATE INDEX IF NOT EXISTS idx_comp_regulatory_changes_tenant ON __TENANT_SCHEMA__.compliance_regulatory_changes(tenant_id, status, effective_date);
CREATE INDEX IF NOT EXISTS idx_comp_monitoring_req ON __TENANT_SCHEMA__.compliance_monitoring(tenant_id, requirement_id, next_check);
CREATE INDEX IF NOT EXISTS idx_comp_posture_scores_framework ON __TENANT_SCHEMA__.compliance_posture_scores(tenant_id, framework_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_comp_roadmap_tenant ON __TENANT_SCHEMA__.compliance_roadmap(tenant_id, status, target_date);
CREATE INDEX IF NOT EXISTS idx_comp_calendar_tenant ON __TENANT_SCHEMA__.compliance_calendar(tenant_id, status, start_date);

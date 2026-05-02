-- Module: policy | Migration: 002 | Enterprise Expansion

-- ─── Standard Cross-Cutting Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_versions_meta (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_versions_meta
ALTER TABLE __TENANT_SCHEMA__.policy_versions_meta ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_versions_meta ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_versions_meta ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_versions_meta ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.policy_versions_meta ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.policy_versions_meta ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_versions_meta ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_versions_meta ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_versions_meta ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_change_log
ALTER TABLE __TENANT_SCHEMA__.policy_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_settings
ALTER TABLE __TENANT_SCHEMA__.policy_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.policy_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.policy_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.policy_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_kpis
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.policy_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.policy_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.policy_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.policy_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_external_mappings
ALTER TABLE __TENANT_SCHEMA__.policy_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.policy_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.policy_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.policy_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_attachments
ALTER TABLE __TENANT_SCHEMA__.policy_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.policy_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_comments
ALTER TABLE __TENANT_SCHEMA__.policy_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.policy_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.policy_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_tags
ALTER TABLE __TENANT_SCHEMA__.policy_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Module-Specific Domain Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  policy_id       UUID NOT NULL,
  version_number  INT NOT NULL,
  title           TEXT NOT NULL,
  content         TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  effective_date  DATE,
  review_date     DATE,
  change_summary  TEXT,
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_versions
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS policy_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS version_number INT;
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS change_summary TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  policy_id       UUID NOT NULL,
  version_id      UUID REFERENCES __TENANT_SCHEMA__.policy_versions(id),
  approver_id     UUID NOT NULL,
  approval_level  INT NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'pending',
  decision        TEXT,
  comments        TEXT,
  decided_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_approvals
ALTER TABLE __TENANT_SCHEMA__.policy_approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_approvals ADD COLUMN IF NOT EXISTS policy_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_approvals ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES __TENANT_SCHEMA__.policy_versions(id);
ALTER TABLE __TENANT_SCHEMA__.policy_approvals ADD COLUMN IF NOT EXISTS approver_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_approvals ADD COLUMN IF NOT EXISTS approval_level INT NOT NULL DEFAULT 1;
ALTER TABLE __TENANT_SCHEMA__.policy_approvals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.policy_approvals ADD COLUMN IF NOT EXISTS decision TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_approvals ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_approvals ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.policy_approvals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_approvals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_acknowledgements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  policy_id       UUID NOT NULL,
  version_id      UUID REFERENCES __TENANT_SCHEMA__.policy_versions(id),
  user_id         UUID NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method          TEXT NOT NULL DEFAULT 'electronic',
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_acknowledgements
ALTER TABLE __TENANT_SCHEMA__.policy_acknowledgements ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_acknowledgements ADD COLUMN IF NOT EXISTS policy_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_acknowledgements ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES __TENANT_SCHEMA__.policy_versions(id);
ALTER TABLE __TENANT_SCHEMA__.policy_acknowledgements ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_acknowledgements ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_acknowledgements ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'electronic';
ALTER TABLE __TENANT_SCHEMA__.policy_acknowledgements ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE __TENANT_SCHEMA__.policy_acknowledgements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_acknowledgements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_exceptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL,
  policy_id              UUID NOT NULL,
  requestor_id           UUID NOT NULL,
  justification          TEXT,
  risk_impact            TEXT,
  compensating_controls  TEXT,
  approved_by            UUID,
  approved_at            TIMESTAMPTZ,
  valid_from             DATE,
  valid_to               DATE,
  status                 TEXT NOT NULL DEFAULT 'pending',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_exceptions
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS policy_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS requestor_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS risk_impact TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS compensating_controls TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS valid_to DATE;
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_exceptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_review_cycles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  policy_id        UUID NOT NULL,
  review_frequency TEXT NOT NULL,
  last_reviewed    DATE,
  next_review      DATE,
  reviewer_id      UUID,
  status           TEXT NOT NULL DEFAULT 'scheduled',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_review_cycles
ALTER TABLE __TENANT_SCHEMA__.policy_review_cycles ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_review_cycles ADD COLUMN IF NOT EXISTS policy_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_review_cycles ADD COLUMN IF NOT EXISTS review_frequency TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_review_cycles ADD COLUMN IF NOT EXISTS last_reviewed DATE;
ALTER TABLE __TENANT_SCHEMA__.policy_review_cycles ADD COLUMN IF NOT EXISTS next_review DATE;
ALTER TABLE __TENANT_SCHEMA__.policy_review_cycles ADD COLUMN IF NOT EXISTS reviewer_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_review_cycles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE __TENANT_SCHEMA__.policy_review_cycles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_review_cycles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_distribution (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  policy_id           UUID NOT NULL,
  version_id          UUID REFERENCES __TENANT_SCHEMA__.policy_versions(id),
  target_type         TEXT NOT NULL,
  target_id           UUID NOT NULL,
  distributed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  distribution_method TEXT NOT NULL,
  acknowledged_count  INT NOT NULL DEFAULT 0,
  total_recipients    INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_distribution
ALTER TABLE __TENANT_SCHEMA__.policy_distribution ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_distribution ADD COLUMN IF NOT EXISTS policy_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_distribution ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES __TENANT_SCHEMA__.policy_versions(id);
ALTER TABLE __TENANT_SCHEMA__.policy_distribution ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_distribution ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_distribution ADD COLUMN IF NOT EXISTS distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_distribution ADD COLUMN IF NOT EXISTS distribution_method TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_distribution ADD COLUMN IF NOT EXISTS acknowledged_count INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.policy_distribution ADD COLUMN IF NOT EXISTS total_recipients INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.policy_distribution ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_distribution ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_framework_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  policy_id       UUID NOT NULL,
  framework_id    UUID NOT NULL,
  requirement_ref TEXT,
  link_type       TEXT NOT NULL DEFAULT 'supporting',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_framework_links
ALTER TABLE __TENANT_SCHEMA__.policy_framework_links ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_framework_links ADD COLUMN IF NOT EXISTS policy_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_framework_links ADD COLUMN IF NOT EXISTS framework_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_framework_links ADD COLUMN IF NOT EXISTS requirement_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_framework_links ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'supporting';
ALTER TABLE __TENANT_SCHEMA__.policy_framework_links ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_framework_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pol_versions_meta_tenant_entity ON __TENANT_SCHEMA__.policy_versions_meta(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pol_change_log_tenant ON __TENANT_SCHEMA__.policy_change_log(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pol_settings_tenant ON __TENANT_SCHEMA__.policy_settings(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pol_kpis_tenant ON __TENANT_SCHEMA__.policy_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_pol_report_snapshots_tenant ON __TENANT_SCHEMA__.policy_report_snapshots(tenant_id, report_type);
CREATE INDEX IF NOT EXISTS idx_pol_ai_suggestions_tenant ON __TENANT_SCHEMA__.policy_ai_suggestions(tenant_id, entity_type, status);
CREATE INDEX IF NOT EXISTS idx_pol_external_mappings_tenant ON __TENANT_SCHEMA__.policy_external_mappings(tenant_id, external_system);
CREATE INDEX IF NOT EXISTS idx_pol_attachments_entity ON __TENANT_SCHEMA__.policy_attachments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pol_comments_entity ON __TENANT_SCHEMA__.policy_comments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pol_tags_entity ON __TENANT_SCHEMA__.policy_tags(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pol_versions_policy ON __TENANT_SCHEMA__.policy_versions(tenant_id, policy_id, status);
CREATE INDEX IF NOT EXISTS idx_pol_versions_effective ON __TENANT_SCHEMA__.policy_versions(tenant_id, effective_date, review_date);
CREATE INDEX IF NOT EXISTS idx_pol_approvals_policy ON __TENANT_SCHEMA__.policy_approvals(tenant_id, policy_id, status);
CREATE INDEX IF NOT EXISTS idx_pol_approvals_approver ON __TENANT_SCHEMA__.policy_approvals(tenant_id, approver_id, status);
CREATE INDEX IF NOT EXISTS idx_pol_acknowledgements_policy ON __TENANT_SCHEMA__.policy_acknowledgements(tenant_id, policy_id, user_id);
CREATE INDEX IF NOT EXISTS idx_pol_exceptions_policy ON __TENANT_SCHEMA__.policy_exceptions(tenant_id, policy_id, status);
CREATE INDEX IF NOT EXISTS idx_pol_review_cycles_policy ON __TENANT_SCHEMA__.policy_review_cycles(tenant_id, policy_id, next_review);
CREATE INDEX IF NOT EXISTS idx_pol_distribution_policy ON __TENANT_SCHEMA__.policy_distribution(tenant_id, policy_id, distributed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pol_framework_links_policy ON __TENANT_SCHEMA__.policy_framework_links(tenant_id, policy_id, framework_id);

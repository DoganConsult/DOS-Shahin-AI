-- Module: evidence | Migration: 002 | Enterprise Expansion

-- ─── Standard Cross-Cutting Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_versions
ALTER TABLE __TENANT_SCHEMA__.evidence_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.evidence_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.evidence_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_change_log
ALTER TABLE __TENANT_SCHEMA__.evidence_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_settings
ALTER TABLE __TENANT_SCHEMA__.evidence_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.evidence_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.evidence_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.evidence_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_kpis
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.evidence_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.evidence_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.evidence_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.evidence_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_external_mappings
ALTER TABLE __TENANT_SCHEMA__.evidence_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.evidence_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.evidence_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.evidence_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_attachments
ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_comments
ALTER TABLE __TENANT_SCHEMA__.evidence_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.evidence_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.evidence_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_tags
ALTER TABLE __TENANT_SCHEMA__.evidence_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Module-Specific Domain Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_vault (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  evidence_ref    TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  evidence_type   TEXT NOT NULL,
  source          TEXT,
  collected_by    UUID NOT NULL,
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date     DATE,
  status          TEXT NOT NULL DEFAULT 'valid',
  file_refs       JSONB NOT NULL DEFAULT '[]',
  hash            TEXT,
  classification  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, evidence_ref)
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_vault
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS evidence_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS evidence_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS collected_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'valid';
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS file_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS hash TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_vault ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  evidence_id     UUID NOT NULL,
  reviewer_id     UUID NOT NULL,
  review_date     DATE NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('approved','rejected','needs_revision')),
  comments        TEXT,
  quality_score   NUMERIC(5,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_reviews
ALTER TABLE __TENANT_SCHEMA__.evidence_reviews ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_reviews ADD COLUMN IF NOT EXISTS evidence_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_reviews ADD COLUMN IF NOT EXISTS reviewer_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_reviews ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE __TENANT_SCHEMA__.evidence_reviews ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('approved','rejected','needs_revision'));
ALTER TABLE __TENANT_SCHEMA__.evidence_reviews ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_reviews ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.evidence_reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  control_id      UUID,
  requirement_id  UUID,
  requested_by    UUID NOT NULL,
  assigned_to     UUID,
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'pending',
  priority        TEXT,
  description     TEXT NOT NULL,
  evidence_type   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_requests
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS control_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS requirement_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS requested_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS evidence_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_collection_rules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL,
  control_id           UUID,
  evidence_type        TEXT NOT NULL,
  frequency            TEXT NOT NULL,
  auto_collect         BOOLEAN NOT NULL DEFAULT FALSE,
  source_config        JSONB NOT NULL DEFAULT '{}',
  notification_config  JSONB NOT NULL DEFAULT '{}',
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_collection_rules
ALTER TABLE __TENANT_SCHEMA__.evidence_collection_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_collection_rules ADD COLUMN IF NOT EXISTS control_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_collection_rules ADD COLUMN IF NOT EXISTS evidence_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_collection_rules ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_collection_rules ADD COLUMN IF NOT EXISTS auto_collect BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.evidence_collection_rules ADD COLUMN IF NOT EXISTS source_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.evidence_collection_rules ADD COLUMN IF NOT EXISTS notification_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.evidence_collection_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.evidence_collection_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_collection_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_freshness (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  evidence_id      UUID NOT NULL,
  freshness_status TEXT NOT NULL DEFAULT 'fresh',
  last_validated   TIMESTAMPTZ,
  next_validation  TIMESTAMPTZ,
  days_until_stale INT,
  auto_refresh     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_freshness
ALTER TABLE __TENANT_SCHEMA__.evidence_freshness ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_freshness ADD COLUMN IF NOT EXISTS evidence_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_freshness ADD COLUMN IF NOT EXISTS freshness_status TEXT NOT NULL DEFAULT 'fresh';
ALTER TABLE __TENANT_SCHEMA__.evidence_freshness ADD COLUMN IF NOT EXISTS last_validated TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.evidence_freshness ADD COLUMN IF NOT EXISTS next_validation TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.evidence_freshness ADD COLUMN IF NOT EXISTS days_until_stale INT;
ALTER TABLE __TENANT_SCHEMA__.evidence_freshness ADD COLUMN IF NOT EXISTS auto_refresh BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.evidence_freshness ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_freshness ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_control_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  evidence_id         UUID NOT NULL,
  control_id          UUID NOT NULL,
  link_type           TEXT NOT NULL DEFAULT 'supporting',
  is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
  coverage_percentage NUMERIC(5,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_control_links
ALTER TABLE __TENANT_SCHEMA__.evidence_control_links ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_control_links ADD COLUMN IF NOT EXISTS evidence_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_control_links ADD COLUMN IF NOT EXISTS control_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_control_links ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'supporting';
ALTER TABLE __TENANT_SCHEMA__.evidence_control_links ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.evidence_control_links ADD COLUMN IF NOT EXISTS coverage_percentage NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.evidence_control_links ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_control_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_automated_collection (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  rule_id           UUID NOT NULL,
  collection_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status            TEXT NOT NULL DEFAULT 'pending',
  collected_data    JSONB NOT NULL DEFAULT '{}',
  source            TEXT,
  processing_notes  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_automated_collection
ALTER TABLE __TENANT_SCHEMA__.evidence_automated_collection ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_automated_collection ADD COLUMN IF NOT EXISTS rule_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_automated_collection ADD COLUMN IF NOT EXISTS collection_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_automated_collection ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.evidence_automated_collection ADD COLUMN IF NOT EXISTS collected_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.evidence_automated_collection ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_automated_collection ADD COLUMN IF NOT EXISTS processing_notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_automated_collection ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_automated_collection ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_evid_versions_tenant_entity ON __TENANT_SCHEMA__.evidence_versions(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_evid_change_log_tenant ON __TENANT_SCHEMA__.evidence_change_log(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_evid_settings_tenant ON __TENANT_SCHEMA__.evidence_settings(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_evid_kpis_tenant ON __TENANT_SCHEMA__.evidence_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_evid_report_snapshots_tenant ON __TENANT_SCHEMA__.evidence_report_snapshots(tenant_id, report_type);
CREATE INDEX IF NOT EXISTS idx_evid_ai_suggestions_tenant ON __TENANT_SCHEMA__.evidence_ai_suggestions(tenant_id, entity_type, status);
CREATE INDEX IF NOT EXISTS idx_evid_external_mappings_tenant ON __TENANT_SCHEMA__.evidence_external_mappings(tenant_id, external_system);
CREATE INDEX IF NOT EXISTS idx_evid_attachments_entity ON __TENANT_SCHEMA__.evidence_attachments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_evid_comments_entity ON __TENANT_SCHEMA__.evidence_comments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_evid_tags_entity ON __TENANT_SCHEMA__.evidence_tags(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_evid_vault_tenant ON __TENANT_SCHEMA__.evidence_vault(tenant_id, status, evidence_type);
CREATE INDEX IF NOT EXISTS idx_evid_vault_expiry ON __TENANT_SCHEMA__.evidence_vault(tenant_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_evid_reviews_evidence ON __TENANT_SCHEMA__.evidence_reviews(tenant_id, evidence_id, status);
CREATE INDEX IF NOT EXISTS idx_evid_requests_tenant ON __TENANT_SCHEMA__.evidence_requests(tenant_id, status, assigned_to);
CREATE INDEX IF NOT EXISTS idx_evid_collection_rules_tenant ON __TENANT_SCHEMA__.evidence_collection_rules(tenant_id, is_active, auto_collect);
CREATE INDEX IF NOT EXISTS idx_evid_freshness_evidence ON __TENANT_SCHEMA__.evidence_freshness(tenant_id, evidence_id, freshness_status);
CREATE INDEX IF NOT EXISTS idx_evid_freshness_validation ON __TENANT_SCHEMA__.evidence_freshness(tenant_id, next_validation);
CREATE INDEX IF NOT EXISTS idx_evid_control_links_evidence ON __TENANT_SCHEMA__.evidence_control_links(tenant_id, evidence_id, control_id);
CREATE INDEX IF NOT EXISTS idx_evid_automated_collection_rule ON __TENANT_SCHEMA__.evidence_automated_collection(tenant_id, rule_id, status);

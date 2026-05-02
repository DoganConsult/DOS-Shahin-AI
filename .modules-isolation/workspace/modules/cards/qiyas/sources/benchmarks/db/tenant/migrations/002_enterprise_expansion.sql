-- Module: benchmarks | Migration: 002 | Enterprise Expansion

-- ─── Standard Cross-Cutting Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_versions
ALTER TABLE __TENANT_SCHEMA__.benchmarks_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.benchmarks_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_change_log
ALTER TABLE __TENANT_SCHEMA__.benchmarks_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_settings
ALTER TABLE __TENANT_SCHEMA__.benchmarks_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.benchmarks_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.benchmarks_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_kpis
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.benchmarks_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.benchmarks_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.benchmarks_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_external_mappings
ALTER TABLE __TENANT_SCHEMA__.benchmarks_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.benchmarks_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.benchmarks_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_attachments
ALTER TABLE __TENANT_SCHEMA__.benchmarks_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_comments
ALTER TABLE __TENANT_SCHEMA__.benchmarks_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmarks_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmarks_tags
ALTER TABLE __TENANT_SCHEMA__.benchmarks_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmarks_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmarks_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Module-Specific Domain Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmark_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  profile_type     TEXT NOT NULL DEFAULT 'industry',
  industry         TEXT,
  region           TEXT,
  peer_group       TEXT,
  metric_config    JSONB NOT NULL DEFAULT '{}',
  source           TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmark_profiles
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS profile_type TEXT NOT NULL DEFAULT 'industry';
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS peer_group TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS metric_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmark_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmark_comparisons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  profile_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.benchmark_profiles(id) ON DELETE CASCADE,
  comparison_date  DATE NOT NULL,
  metric_code      TEXT NOT NULL,
  tenant_value     NUMERIC,
  peer_median      NUMERIC,
  peer_p25         NUMERIC,
  peer_p75         NUMERIC,
  percentile_rank  NUMERIC(5,2),
  trend_direction  TEXT,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmark_comparisons
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES __TENANT_SCHEMA__.benchmark_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS comparison_date DATE;
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS metric_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS tenant_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS peer_median NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS peer_p25 NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS peer_p75 NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS percentile_rank NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS trend_direction TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmark_comparisons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.benchmark_datasets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  dataset_type     TEXT NOT NULL DEFAULT 'external',
  source_url       TEXT,
  raw_data         JSONB NOT NULL DEFAULT '{}',
  processed_data   JSONB NOT NULL DEFAULT '{}',
  last_refreshed   TIMESTAMPTZ,
  refresh_config   JSONB NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.benchmark_datasets
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS dataset_type TEXT NOT NULL DEFAULT 'external';
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS processed_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS last_refreshed TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS refresh_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.benchmark_datasets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_benchmarks_versions_tenant_entity ON __TENANT_SCHEMA__.benchmarks_versions(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_change_log_tenant ON __TENANT_SCHEMA__.benchmarks_change_log(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_settings_tenant ON __TENANT_SCHEMA__.benchmarks_settings(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_benchmarks_kpis_tenant ON __TENANT_SCHEMA__.benchmarks_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_benchmarks_report_snapshots_tenant ON __TENANT_SCHEMA__.benchmarks_report_snapshots(tenant_id, report_type);
CREATE INDEX IF NOT EXISTS idx_benchmarks_ai_suggestions_tenant ON __TENANT_SCHEMA__.benchmarks_ai_suggestions(tenant_id, entity_type, status);
CREATE INDEX IF NOT EXISTS idx_benchmarks_external_mappings_tenant ON __TENANT_SCHEMA__.benchmarks_external_mappings(tenant_id, external_system);
CREATE INDEX IF NOT EXISTS idx_benchmarks_attachments_entity ON __TENANT_SCHEMA__.benchmarks_attachments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_comments_entity ON __TENANT_SCHEMA__.benchmarks_comments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_tags_entity ON __TENANT_SCHEMA__.benchmarks_tags(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_profiles_tenant ON __TENANT_SCHEMA__.benchmark_profiles(tenant_id, profile_type, is_active);
CREATE INDEX IF NOT EXISTS idx_benchmark_comparisons_profile ON __TENANT_SCHEMA__.benchmark_comparisons(tenant_id, profile_id, comparison_date DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_comparisons_metric ON __TENANT_SCHEMA__.benchmark_comparisons(tenant_id, metric_code, comparison_date DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_datasets_tenant ON __TENANT_SCHEMA__.benchmark_datasets(tenant_id, dataset_type, is_active);

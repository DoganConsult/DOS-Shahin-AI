-- Module: reporting | Migration: 002
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  version INT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_versions
ALTER TABLE __TENANT_SCHEMA__.reporting_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.reporting_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.reporting_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_change_log
ALTER TABLE __TENANT_SCHEMA__.reporting_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}',
  scope TEXT NOT NULL DEFAULT 'tenant',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, config_key)
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_settings
ALTER TABLE __TENANT_SCHEMA__.reporting_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.reporting_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.reporting_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.reporting_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  kpi_code TEXT NOT NULL,
  name TEXT NOT NULL,
  current_value NUMERIC,
  target_value NUMERIC,
  unit TEXT,
  period_start DATE,
  period_end DATE,
  trend TEXT,
  computed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_kpis
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  result_data JSONB NOT NULL DEFAULT '{}',
  generated_by UUID NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.reporting_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.reporting_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.reporting_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.reporting_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  confidence NUMERIC(5,4),
  model_used TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_external_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  external_system TEXT NOT NULL,
  external_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ,
  mapping_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_external_mappings
ALTER TABLE __TENANT_SCHEMA__.reporting_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.reporting_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.reporting_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.reporting_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_attachments
ALTER TABLE __TENANT_SCHEMA__.reporting_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.reporting_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  parent_id UUID,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_comments
ALTER TABLE __TENANT_SCHEMA__.reporting_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.reporting_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.reporting_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  tag_key TEXT NOT NULL,
  tag_value TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_tags
ALTER TABLE __TENANT_SCHEMA__.reporting_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  template_ref TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,
  category TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  parameters JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_templates
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS template_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS template_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_scheduled (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  template_id UUID NOT NULL,
  schedule TEXT NOT NULL,
  recipients JSONB NOT NULL DEFAULT '[]',
  format TEXT NOT NULL DEFAULT 'pdf',
  filters JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_generated TIMESTAMPTZ,
  next_generation TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_scheduled
ALTER TABLE __TENANT_SCHEMA__.reporting_scheduled ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_scheduled ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_scheduled ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_scheduled ADD COLUMN IF NOT EXISTS recipients JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.reporting_scheduled ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'pdf';
ALTER TABLE __TENANT_SCHEMA__.reporting_scheduled ADD COLUMN IF NOT EXISTS filters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.reporting_scheduled ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.reporting_scheduled ADD COLUMN IF NOT EXISTS last_generated TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.reporting_scheduled ADD COLUMN IF NOT EXISTS next_generation TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.reporting_scheduled ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_scheduled ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_generated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  template_id UUID,
  title TEXT NOT NULL,
  format TEXT NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  parameters JSONB NOT NULL DEFAULT '{}',
  generated_by UUID NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_generated
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS format TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_generated ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  report_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  delivery_method TEXT NOT NULL,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_distribution
ALTER TABLE __TENANT_SCHEMA__.reporting_distribution ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_distribution ADD COLUMN IF NOT EXISTS report_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_distribution ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_distribution ADD COLUMN IF NOT EXISTS delivery_method TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_distribution ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.reporting_distribution ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.reporting_distribution ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.reporting_distribution ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_distribution ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.reporting_data_extracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  extract_name TEXT NOT NULL,
  query_definition JSONB NOT NULL DEFAULT '{}',
  format TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  row_count INT,
  file_path TEXT,
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.reporting_data_extracts
ALTER TABLE __TENANT_SCHEMA__.reporting_data_extracts ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_data_extracts ADD COLUMN IF NOT EXISTS extract_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_data_extracts ADD COLUMN IF NOT EXISTS query_definition JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.reporting_data_extracts ADD COLUMN IF NOT EXISTS format TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_data_extracts ADD COLUMN IF NOT EXISTS filters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.reporting_data_extracts ADD COLUMN IF NOT EXISTS row_count INT;
ALTER TABLE __TENANT_SCHEMA__.reporting_data_extracts ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.reporting_data_extracts ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.reporting_data_extracts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.reporting_data_extracts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.reporting_data_extracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_reporting_versions_entity ON __TENANT_SCHEMA__.reporting_versions(tenant_id, entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_reporting_change_log_entity ON __TENANT_SCHEMA__.reporting_change_log(tenant_id, entity_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_reporting_kpis_tenant ON __TENANT_SCHEMA__.reporting_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_reporting_ai_suggestions_entity ON __TENANT_SCHEMA__.reporting_ai_suggestions(tenant_id, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_reporting_attachments_entity ON __TENANT_SCHEMA__.reporting_attachments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_reporting_comments_entity ON __TENANT_SCHEMA__.reporting_comments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_reporting_tags_entity ON __TENANT_SCHEMA__.reporting_tags(tenant_id, entity_id, tag_key);
CREATE INDEX IF NOT EXISTS idx_reporting_templates_tenant ON __TENANT_SCHEMA__.reporting_templates(tenant_id, is_active, category);
CREATE INDEX IF NOT EXISTS idx_reporting_scheduled_tenant ON __TENANT_SCHEMA__.reporting_scheduled(tenant_id, is_active, next_generation);
CREATE INDEX IF NOT EXISTS idx_reporting_generated_tenant ON __TENANT_SCHEMA__.reporting_generated(tenant_id, generated_at);
CREATE INDEX IF NOT EXISTS idx_reporting_distribution_report ON __TENANT_SCHEMA__.reporting_distribution(tenant_id, report_id, status);
CREATE INDEX IF NOT EXISTS idx_reporting_data_extracts_tenant ON __TENANT_SCHEMA__.reporting_data_extracts(tenant_id, created_by);

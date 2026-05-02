-- Module: records | Migration: 002
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_versions
ALTER TABLE __TENANT_SCHEMA__.records_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.records_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.records_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.records_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_change_log
ALTER TABLE __TENANT_SCHEMA__.records_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.records_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_settings
ALTER TABLE __TENANT_SCHEMA__.records_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.records_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.records_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.records_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_kpis
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.records_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.records_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.records_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.records_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.records_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_external_mappings
ALTER TABLE __TENANT_SCHEMA__.records_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.records_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.records_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.records_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_attachments
ALTER TABLE __TENANT_SCHEMA__.records_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.records_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.records_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_comments
ALTER TABLE __TENANT_SCHEMA__.records_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.records_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.records_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_tags
ALTER TABLE __TENANT_SCHEMA__.records_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.records_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  record_type TEXT NOT NULL,
  retention_period_days INT NOT NULL,
  action_on_expiry TEXT NOT NULL CHECK (action_on_expiry IN ('archive','delete','review')),
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  regulatory_basis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_retention_policies
ALTER TABLE __TENANT_SCHEMA__.records_retention_policies ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_retention_policies ADD COLUMN IF NOT EXISTS record_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_retention_policies ADD COLUMN IF NOT EXISTS retention_period_days INT;
ALTER TABLE __TENANT_SCHEMA__.records_retention_policies ADD COLUMN IF NOT EXISTS action_on_expiry TEXT CHECK (action_on_expiry IN ('archive','delete','review'));
ALTER TABLE __TENANT_SCHEMA__.records_retention_policies ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.records_retention_policies ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.records_retention_policies ADD COLUMN IF NOT EXISTS regulatory_basis TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_retention_policies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_retention_policies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  record_id UUID NOT NULL,
  record_type TEXT NOT NULL,
  phase TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  action TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_lifecycle
ALTER TABLE __TENANT_SCHEMA__.records_lifecycle ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_lifecycle ADD COLUMN IF NOT EXISTS record_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_lifecycle ADD COLUMN IF NOT EXISTS record_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_lifecycle ADD COLUMN IF NOT EXISTS phase TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_lifecycle ADD COLUMN IF NOT EXISTS entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_lifecycle ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.records_lifecycle ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_lifecycle ADD COLUMN IF NOT EXISTS performed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.records_lifecycle ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_lifecycle ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.records_legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  record_id UUID NOT NULL,
  hold_ref TEXT NOT NULL,
  reason TEXT,
  placed_by UUID NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.records_legal_holds
ALTER TABLE __TENANT_SCHEMA__.records_legal_holds ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_legal_holds ADD COLUMN IF NOT EXISTS record_id UUID;
ALTER TABLE __TENANT_SCHEMA__.records_legal_holds ADD COLUMN IF NOT EXISTS hold_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_legal_holds ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE __TENANT_SCHEMA__.records_legal_holds ADD COLUMN IF NOT EXISTS placed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.records_legal_holds ADD COLUMN IF NOT EXISTS placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_legal_holds ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.records_legal_holds ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.records_legal_holds ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.records_legal_holds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_records_versions_entity ON __TENANT_SCHEMA__.records_versions(tenant_id, entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_records_change_log_entity ON __TENANT_SCHEMA__.records_change_log(tenant_id, entity_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_records_kpis_tenant ON __TENANT_SCHEMA__.records_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_records_ai_suggestions_entity ON __TENANT_SCHEMA__.records_ai_suggestions(tenant_id, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_records_attachments_entity ON __TENANT_SCHEMA__.records_attachments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_records_comments_entity ON __TENANT_SCHEMA__.records_comments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_records_tags_entity ON __TENANT_SCHEMA__.records_tags(tenant_id, entity_id, tag_key);
CREATE INDEX IF NOT EXISTS idx_records_retention_policies_tenant ON __TENANT_SCHEMA__.records_retention_policies(tenant_id, record_type, is_active);
CREATE INDEX IF NOT EXISTS idx_records_lifecycle_record ON __TENANT_SCHEMA__.records_lifecycle(tenant_id, record_id, phase, entered_at);
CREATE INDEX IF NOT EXISTS idx_records_legal_holds_record ON __TENANT_SCHEMA__.records_legal_holds(tenant_id, record_id, status);

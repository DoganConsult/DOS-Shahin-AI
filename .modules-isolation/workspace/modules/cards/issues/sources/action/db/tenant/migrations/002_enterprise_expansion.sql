-- Module: action | Migration: 002
-- Enterprise expansion: cross-cutting standard tables + domain-specific tables

-- 1. action_versions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_versions
ALTER TABLE __TENANT_SCHEMA__.action_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.action_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.action_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.action_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. action_change_log
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_change_log
ALTER TABLE __TENANT_SCHEMA__.action_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.action_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. action_settings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_settings
ALTER TABLE __TENANT_SCHEMA__.action_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.action_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.action_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.action_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. action_kpis
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_kpis
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. action_report_snapshots
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.action_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.action_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.action_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.action_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.action_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 6. action_ai_suggestions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. action_external_mappings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_external_mappings
ALTER TABLE __TENANT_SCHEMA__.action_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.action_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.action_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.action_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 8. action_attachments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_attachments
ALTER TABLE __TENANT_SCHEMA__.action_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.action_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.action_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 9. action_comments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_comments
ALTER TABLE __TENANT_SCHEMA__.action_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.action_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.action_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 10. action_tags
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_tags
ALTER TABLE __TENANT_SCHEMA__.action_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.action_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Domain-specific tables

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_register (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  action_ref      TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  action_type     TEXT,
  source_type     TEXT,
  source_id       UUID,
  priority        TEXT NOT NULL DEFAULT 'medium',
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','overdue','cancelled')),
  assigned_to     UUID,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  effectiveness   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_register
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS action_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','overdue','cancelled'));
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS effectiveness TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_register ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  objective         TEXT,
  start_date        DATE,
  end_date          DATE,
  owner_id          UUID,
  status            TEXT NOT NULL DEFAULT 'draft',
  progress          NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_items       INT NOT NULL DEFAULT 0,
  completed_items   INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_plans
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS progress NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS total_items INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS completed_items INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  action_id       UUID NOT NULL,
  update_type     TEXT NOT NULL,
  description     TEXT,
  progress        NUMERIC(5,2),
  updated_by      UUID NOT NULL,
  evidence_refs   JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_tracking
ALTER TABLE __TENANT_SCHEMA__.action_tracking ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_tracking ADD COLUMN IF NOT EXISTS action_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_tracking ADD COLUMN IF NOT EXISTS update_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_tracking ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_tracking ADD COLUMN IF NOT EXISTS progress NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.action_tracking ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.action_tracking ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.action_tracking ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_tracking ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  parent_id       UUID,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_categories
ALTER TABLE __TENANT_SCHEMA__.action_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_categories ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_categories ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.action_categories ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.action_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_dependencies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  action_id         UUID NOT NULL,
  depends_on_id     UUID NOT NULL,
  dependency_type   TEXT NOT NULL DEFAULT 'finish_to_start',
  is_blocking       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_dependencies
ALTER TABLE __TENANT_SCHEMA__.action_dependencies ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_dependencies ADD COLUMN IF NOT EXISTS action_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_dependencies ADD COLUMN IF NOT EXISTS depends_on_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_dependencies ADD COLUMN IF NOT EXISTS dependency_type TEXT NOT NULL DEFAULT 'finish_to_start';
ALTER TABLE __TENANT_SCHEMA__.action_dependencies ADD COLUMN IF NOT EXISTS is_blocking BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.action_dependencies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_dependencies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.action_reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  action_id       UUID NOT NULL,
  reminder_date   TIMESTAMPTZ NOT NULL,
  reminder_type   TEXT NOT NULL,
  recipient_id    UUID NOT NULL,
  sent            BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.action_reminders
ALTER TABLE __TENANT_SCHEMA__.action_reminders ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_reminders ADD COLUMN IF NOT EXISTS action_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_reminders ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.action_reminders ADD COLUMN IF NOT EXISTS reminder_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.action_reminders ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE __TENANT_SCHEMA__.action_reminders ADD COLUMN IF NOT EXISTS sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.action_reminders ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.action_reminders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.action_reminders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_versions_entity ON __TENANT_SCHEMA__.action_versions(tenant_id, entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_action_change_log_entity ON __TENANT_SCHEMA__.action_change_log(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_kpis_tenant ON __TENANT_SCHEMA__.action_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_action_ai_suggestions_entity ON __TENANT_SCHEMA__.action_ai_suggestions(tenant_id, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_action_attachments_entity ON __TENANT_SCHEMA__.action_attachments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_comments_entity ON __TENANT_SCHEMA__.action_comments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_tags_entity ON __TENANT_SCHEMA__.action_tags(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_register_tenant ON __TENANT_SCHEMA__.action_register(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_action_register_assigned ON __TENANT_SCHEMA__.action_register(tenant_id, assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_action_plans_tenant ON __TENANT_SCHEMA__.action_plans(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_action_tracking_action ON __TENANT_SCHEMA__.action_tracking(action_id);
CREATE INDEX IF NOT EXISTS idx_action_reminders_action ON __TENANT_SCHEMA__.action_reminders(action_id, sent, reminder_date);

-- Module: workflow | Migration: 002
-- Enterprise expansion: cross-cutting standard tables + domain-specific tables

-- 1. workflow_versions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_versions
ALTER TABLE __TENANT_SCHEMA__.workflow_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.workflow_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. workflow_change_log
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_change_log
ALTER TABLE __TENANT_SCHEMA__.workflow_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. workflow_settings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_settings
ALTER TABLE __TENANT_SCHEMA__.workflow_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.workflow_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.workflow_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. workflow_kpis
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_kpis
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. workflow_report_snapshots
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.workflow_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 6. workflow_ai_suggestions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. workflow_external_mappings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_external_mappings
ALTER TABLE __TENANT_SCHEMA__.workflow_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.workflow_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 8. workflow_attachments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_attachments
ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 9. workflow_comments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_comments
ALTER TABLE __TENANT_SCHEMA__.workflow_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.workflow_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.workflow_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 10. workflow_tags
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_tags
ALTER TABLE __TENANT_SCHEMA__.workflow_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Domain-specific tables

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_task_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  instance_id     UUID NOT NULL REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE,
  step_id         UUID REFERENCES __TENANT_SCHEMA__.workflow_steps(id),
  assignee_id     UUID NOT NULL,
  assigned_by     UUID NOT NULL,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'assigned',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_task_assignments
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS step_id UUID REFERENCES __TENANT_SCHEMA__.workflow_steps(id);
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS assignee_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS assigned_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'assigned';
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_delegation_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  workflow_type   TEXT NOT NULL,
  delegator_id    UUID NOT NULL,
  delegate_id     UUID NOT NULL,
  conditions      JSONB NOT NULL DEFAULT '{}',
  valid_from      DATE,
  valid_to        DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_delegation_rules
ALTER TABLE __TENANT_SCHEMA__.workflow_delegation_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_delegation_rules ADD COLUMN IF NOT EXISTS workflow_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_delegation_rules ADD COLUMN IF NOT EXISTS delegator_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_delegation_rules ADD COLUMN IF NOT EXISTS delegate_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_delegation_rules ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_delegation_rules ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE __TENANT_SCHEMA__.workflow_delegation_rules ADD COLUMN IF NOT EXISTS valid_to DATE;
ALTER TABLE __TENANT_SCHEMA__.workflow_delegation_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.workflow_delegation_rules ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_delegation_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_delegation_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_metrics (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL,
  workflow_type           TEXT NOT NULL,
  period                  TEXT NOT NULL,
  total_instances         INT,
  avg_completion_hours    NUMERIC,
  sla_compliance_rate     NUMERIC(5,2),
  bottleneck_step         TEXT,
  computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_metrics
ALTER TABLE __TENANT_SCHEMA__.workflow_metrics ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_metrics ADD COLUMN IF NOT EXISTS workflow_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_metrics ADD COLUMN IF NOT EXISTS period TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_metrics ADD COLUMN IF NOT EXISTS total_instances INT;
ALTER TABLE __TENANT_SCHEMA__.workflow_metrics ADD COLUMN IF NOT EXISTS avg_completion_hours NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.workflow_metrics ADD COLUMN IF NOT EXISTS sla_compliance_rate NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.workflow_metrics ADD COLUMN IF NOT EXISTS bottleneck_step TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_metrics ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_metrics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_metrics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.workflow_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  instance_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE,
  step_id           UUID REFERENCES __TENANT_SCHEMA__.workflow_steps(id),
  notification_type TEXT NOT NULL,
  recipient_id      UUID NOT NULL,
  channel           TEXT,
  sent_at           TIMESTAMPTZ,
  read_at           TIMESTAMPTZ,
  template_code     TEXT,
  payload           JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.workflow_notifications
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES __TENANT_SCHEMA__.workflow_instances(instance_id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS step_id UUID REFERENCES __TENANT_SCHEMA__.workflow_steps(id);
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS notification_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS template_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.workflow_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_versions_entity ON __TENANT_SCHEMA__.workflow_versions(tenant_id, entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_change_log_entity ON __TENANT_SCHEMA__.workflow_change_log(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_kpis_tenant ON __TENANT_SCHEMA__.workflow_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_workflow_ai_suggestions_entity ON __TENANT_SCHEMA__.workflow_ai_suggestions(tenant_id, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_attachments_entity ON __TENANT_SCHEMA__.workflow_attachments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_entity ON __TENANT_SCHEMA__.workflow_comments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tags_entity ON __TENANT_SCHEMA__.workflow_tags(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_task_assignments_instance ON __TENANT_SCHEMA__.workflow_task_assignments(instance_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_task_assignments_assignee ON __TENANT_SCHEMA__.workflow_task_assignments(tenant_id, assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_delegation_rules_tenant ON __TENANT_SCHEMA__.workflow_delegation_rules(tenant_id, delegator_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_tenant ON __TENANT_SCHEMA__.workflow_metrics(tenant_id, workflow_type, period);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_instance ON __TENANT_SCHEMA__.workflow_notifications(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_recipient ON __TENANT_SCHEMA__.workflow_notifications(tenant_id, recipient_id, sent_at);

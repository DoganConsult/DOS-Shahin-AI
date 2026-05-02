-- Module: bcp | Migration: 002
-- Enterprise expansion: cross-cutting standard tables + domain-specific tables

-- 1. bcp_versions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_versions
ALTER TABLE __TENANT_SCHEMA__.bcp_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.bcp_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.bcp_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. bcp_change_log
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_change_log
ALTER TABLE __TENANT_SCHEMA__.bcp_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. bcp_settings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_settings
ALTER TABLE __TENANT_SCHEMA__.bcp_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.bcp_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.bcp_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.bcp_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. bcp_kpis
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_kpis
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. bcp_report_snapshots
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.bcp_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.bcp_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.bcp_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.bcp_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 6. bcp_ai_suggestions
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. bcp_external_mappings
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_external_mappings
ALTER TABLE __TENANT_SCHEMA__.bcp_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.bcp_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.bcp_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.bcp_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 8. bcp_attachments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_attachments
ALTER TABLE __TENANT_SCHEMA__.bcp_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.bcp_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 9. bcp_comments
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_comments
ALTER TABLE __TENANT_SCHEMA__.bcp_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.bcp_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.bcp_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 10. bcp_tags
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_tags
ALTER TABLE __TENANT_SCHEMA__.bcp_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Domain-specific tables

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_plan_details (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  plan_ref          TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  plan_type         TEXT NOT NULL DEFAULT 'business_continuity',
  status            TEXT NOT NULL DEFAULT 'draft',
  owner_id          UUID,
  department_id     UUID,
  effective_date    DATE,
  review_date       DATE,
  rto_hours         INT,
  rpo_hours         INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_plan_details
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS plan_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'business_continuity';
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS rto_hours INT;
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS rpo_hours INT;
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_plan_details ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_impact_analysis (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL,
  process_name              TEXT NOT NULL,
  department_id             UUID,
  criticality               TEXT,
  rto_hours                 INT,
  rpo_hours                 INT,
  max_tolerable_downtime    INT,
  financial_impact          NUMERIC(15,2),
  operational_impact        TEXT,
  dependencies              JSONB NOT NULL DEFAULT '[]',
  status                    TEXT NOT NULL DEFAULT 'draft',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_impact_analysis
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS process_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS criticality TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS rto_hours INT;
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS rpo_hours INT;
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS max_tolerable_downtime INT;
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS financial_impact NUMERIC(15,2);
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS operational_impact TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS dependencies JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_impact_analysis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_exercises (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  exercise_ref      TEXT NOT NULL,
  title             TEXT NOT NULL,
  exercise_type     TEXT NOT NULL CHECK (exercise_type IN ('tabletop','walkthrough','simulation','full_test')),
  planned_date      DATE,
  actual_date       DATE,
  status            TEXT NOT NULL DEFAULT 'planned',
  participants      JSONB NOT NULL DEFAULT '[]',
  objectives        JSONB NOT NULL DEFAULT '[]',
  results           JSONB NOT NULL DEFAULT '{}',
  lessons_learned   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_exercises
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS exercise_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS exercise_type TEXT CHECK (exercise_type IN ('tabletop','walkthrough','simulation','full_test'));
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS planned_date DATE;
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS actual_date DATE;
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS participants JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS objectives JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS results JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS lessons_learned TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_crisis_communications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  plan_id               UUID NOT NULL REFERENCES __TENANT_SCHEMA__.bcp_plans(id) ON DELETE CASCADE,
  stakeholder_type      TEXT NOT NULL,
  contact_info          JSONB NOT NULL DEFAULT '{}',
  message_template      TEXT,
  escalation_order      INT,
  notification_method   TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_crisis_communications
ALTER TABLE __TENANT_SCHEMA__.bcp_crisis_communications ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_crisis_communications ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES __TENANT_SCHEMA__.bcp_plans(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.bcp_crisis_communications ADD COLUMN IF NOT EXISTS stakeholder_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_crisis_communications ADD COLUMN IF NOT EXISTS contact_info JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.bcp_crisis_communications ADD COLUMN IF NOT EXISTS message_template TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_crisis_communications ADD COLUMN IF NOT EXISTS escalation_order INT;
ALTER TABLE __TENANT_SCHEMA__.bcp_crisis_communications ADD COLUMN IF NOT EXISTS notification_method TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_crisis_communications ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.bcp_crisis_communications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_crisis_communications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_recovery_strategies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  plan_id               UUID NOT NULL REFERENCES __TENANT_SCHEMA__.bcp_plans(id) ON DELETE CASCADE,
  strategy_type         TEXT NOT NULL,
  description           TEXT,
  resource_requirements JSONB NOT NULL DEFAULT '{}',
  estimated_cost        NUMERIC(15,2),
  priority              INT,
  status                TEXT NOT NULL DEFAULT 'planned',
  tested_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_recovery_strategies
ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_strategies ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_strategies ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES __TENANT_SCHEMA__.bcp_plans(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_strategies ADD COLUMN IF NOT EXISTS strategy_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_strategies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_strategies ADD COLUMN IF NOT EXISTS resource_requirements JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_strategies ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(15,2);
ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_strategies ADD COLUMN IF NOT EXISTS priority INT;
ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_strategies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_strategies ADD COLUMN IF NOT EXISTS tested_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_strategies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_strategies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_activation_log (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL,
  plan_id                   UUID NOT NULL REFERENCES __TENANT_SCHEMA__.bcp_plans(id) ON DELETE CASCADE,
  activated_by              UUID NOT NULL,
  activated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at            TIMESTAMPTZ,
  trigger_event             TEXT,
  status                    TEXT,
  actions_taken             JSONB NOT NULL DEFAULT '[]',
  post_activation_review    TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_activation_log
ALTER TABLE __TENANT_SCHEMA__.bcp_activation_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_activation_log ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES __TENANT_SCHEMA__.bcp_plans(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.bcp_activation_log ADD COLUMN IF NOT EXISTS activated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_activation_log ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_activation_log ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.bcp_activation_log ADD COLUMN IF NOT EXISTS trigger_event TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_activation_log ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_activation_log ADD COLUMN IF NOT EXISTS actions_taken JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.bcp_activation_log ADD COLUMN IF NOT EXISTS post_activation_review TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_activation_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_activation_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_dependencies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  process_id          UUID NOT NULL,
  dependency_type     TEXT NOT NULL,
  dependency_name     TEXT NOT NULL,
  provider            TEXT,
  criticality         TEXT,
  alternative         TEXT,
  recovery_sequence   INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_dependencies
ALTER TABLE __TENANT_SCHEMA__.bcp_dependencies ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_dependencies ADD COLUMN IF NOT EXISTS process_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_dependencies ADD COLUMN IF NOT EXISTS dependency_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_dependencies ADD COLUMN IF NOT EXISTS dependency_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_dependencies ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_dependencies ADD COLUMN IF NOT EXISTS criticality TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_dependencies ADD COLUMN IF NOT EXISTS alternative TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_dependencies ADD COLUMN IF NOT EXISTS recovery_sequence INT;
ALTER TABLE __TENANT_SCHEMA__.bcp_dependencies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_dependencies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.bcp_maturity_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  dimension         TEXT NOT NULL,
  score             NUMERIC(5,2),
  max_score         NUMERIC(5,2),
  assessment_date   DATE,
  assessed_by       UUID,
  evidence_refs     JSONB NOT NULL DEFAULT '[]',
  recommendations   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.bcp_maturity_scores
ALTER TABLE __TENANT_SCHEMA__.bcp_maturity_scores ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_maturity_scores ADD COLUMN IF NOT EXISTS dimension TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_maturity_scores ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.bcp_maturity_scores ADD COLUMN IF NOT EXISTS max_score NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.bcp_maturity_scores ADD COLUMN IF NOT EXISTS assessment_date DATE;
ALTER TABLE __TENANT_SCHEMA__.bcp_maturity_scores ADD COLUMN IF NOT EXISTS assessed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.bcp_maturity_scores ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.bcp_maturity_scores ADD COLUMN IF NOT EXISTS recommendations TEXT;
ALTER TABLE __TENANT_SCHEMA__.bcp_maturity_scores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.bcp_maturity_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bcp_versions_entity ON __TENANT_SCHEMA__.bcp_versions(tenant_id, entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_bcp_change_log_entity ON __TENANT_SCHEMA__.bcp_change_log(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_bcp_kpis_tenant ON __TENANT_SCHEMA__.bcp_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_bcp_ai_suggestions_entity ON __TENANT_SCHEMA__.bcp_ai_suggestions(tenant_id, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_bcp_attachments_entity ON __TENANT_SCHEMA__.bcp_attachments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_bcp_comments_entity ON __TENANT_SCHEMA__.bcp_comments(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_bcp_tags_entity ON __TENANT_SCHEMA__.bcp_tags(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_bcp_impact_analysis_tenant ON __TENANT_SCHEMA__.bcp_impact_analysis(tenant_id, criticality);
CREATE INDEX IF NOT EXISTS idx_bcp_exercises_tenant ON __TENANT_SCHEMA__.bcp_exercises(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bcp_activation_log_plan ON __TENANT_SCHEMA__.bcp_activation_log(plan_id);
CREATE INDEX IF NOT EXISTS idx_bcp_maturity_scores_tenant ON __TENANT_SCHEMA__.bcp_maturity_scores(tenant_id, assessment_date);

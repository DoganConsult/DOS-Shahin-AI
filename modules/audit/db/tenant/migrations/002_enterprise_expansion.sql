-- Module: audit | Migration: 002 | Enterprise Expansion

-- ─── Standard Cross-Cutting Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_versions
ALTER TABLE __TENANT_SCHEMA__.audit_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.audit_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.audit_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_change_log
ALTER TABLE __TENANT_SCHEMA__.audit_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_settings
ALTER TABLE __TENANT_SCHEMA__.audit_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.audit_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.audit_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.audit_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_kpis
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.audit_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.audit_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.audit_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.audit_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_external_mappings
ALTER TABLE __TENANT_SCHEMA__.audit_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.audit_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.audit_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.audit_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_attachments
ALTER TABLE __TENANT_SCHEMA__.audit_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.audit_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_comments
ALTER TABLE __TENANT_SCHEMA__.audit_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.audit_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.audit_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_tags
ALTER TABLE __TENANT_SCHEMA__.audit_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Module-Specific Domain Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  plan_year    INT NOT NULL,
  name         TEXT NOT NULL,
  objective    TEXT,
  methodology  TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',
  risk_based   BOOLEAN NOT NULL DEFAULT TRUE,
  total_hours  INT,
  approved_by  UUID,
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_plans
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS plan_year INT;
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS methodology TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS risk_based BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS total_hours INT;
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_engagements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  plan_id         UUID REFERENCES __TENANT_SCHEMA__.audit_plans(id),
  engagement_ref  TEXT NOT NULL,
  title           TEXT NOT NULL,
  audit_type      TEXT NOT NULL,
  scope           TEXT,
  status          TEXT NOT NULL DEFAULT 'planned',
  lead_auditor_id UUID,
  start_date      DATE,
  end_date        DATE,
  entity_type     TEXT,
  entity_id       UUID,
  budget_hours    INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_engagements
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES __TENANT_SCHEMA__.audit_plans(id);
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS engagement_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS audit_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS lead_auditor_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS budget_hours INT;
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_engagements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_working_papers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  engagement_id UUID NOT NULL REFERENCES __TENANT_SCHEMA__.audit_engagements(id) ON DELETE CASCADE,
  wp_ref        TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       JSONB NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'draft',
  prepared_by   UUID NOT NULL,
  reviewed_by   UUID,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_working_papers
ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES __TENANT_SCHEMA__.audit_engagements(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ADD COLUMN IF NOT EXISTS wp_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ADD COLUMN IF NOT EXISTS prepared_by UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_universe (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL,
  entity_name          TEXT NOT NULL,
  entity_type          TEXT NOT NULL,
  risk_rating          TEXT NOT NULL DEFAULT 'medium',
  last_audited_at      TIMESTAMPTZ,
  next_audit_date      DATE,
  audit_frequency      TEXT,
  inherent_risk_score  NUMERIC,
  residual_risk_score  NUMERIC,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_universe
ALTER TABLE __TENANT_SCHEMA__.audit_universe ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_universe ADD COLUMN IF NOT EXISTS entity_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_universe ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_universe ADD COLUMN IF NOT EXISTS risk_rating TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE __TENANT_SCHEMA__.audit_universe ADD COLUMN IF NOT EXISTS last_audited_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.audit_universe ADD COLUMN IF NOT EXISTS next_audit_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_universe ADD COLUMN IF NOT EXISTS audit_frequency TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_universe ADD COLUMN IF NOT EXISTS inherent_risk_score NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.audit_universe ADD COLUMN IF NOT EXISTS residual_risk_score NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.audit_universe ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_universe ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_capa (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  finding_id            UUID NOT NULL REFERENCES __TENANT_SCHEMA__.audit_findings(id) ON DELETE CASCADE,
  capa_ref              TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  capa_type             TEXT NOT NULL CHECK (capa_type IN ('corrective','preventive')),
  status                TEXT NOT NULL DEFAULT 'open',
  assigned_to           UUID,
  due_date              DATE,
  root_cause            TEXT,
  effectiveness_criteria TEXT,
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_capa
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS finding_id UUID REFERENCES __TENANT_SCHEMA__.audit_findings(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS capa_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS capa_type TEXT CHECK (capa_type IN ('corrective','preventive'));
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS effectiveness_criteria TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_capa ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_team_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  engagement_id   UUID NOT NULL REFERENCES __TENANT_SCHEMA__.audit_engagements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  role            TEXT NOT NULL DEFAULT 'auditor',
  hours_allocated INT,
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_team_assignments
ALTER TABLE __TENANT_SCHEMA__.audit_team_assignments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_team_assignments ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES __TENANT_SCHEMA__.audit_engagements(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.audit_team_assignments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_team_assignments ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'auditor';
ALTER TABLE __TENANT_SCHEMA__.audit_team_assignments ADD COLUMN IF NOT EXISTS hours_allocated INT;
ALTER TABLE __TENANT_SCHEMA__.audit_team_assignments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_team_assignments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_team_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_team_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_risk_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  entity_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL,
  risk_factors    JSONB NOT NULL DEFAULT '{}',
  risk_score      NUMERIC,
  assessment_date DATE,
  assessed_by     UUID,
  methodology     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_risk_assessments
ALTER TABLE __TENANT_SCHEMA__.audit_risk_assessments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_risk_assessments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_risk_assessments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_risk_assessments ADD COLUMN IF NOT EXISTS risk_factors JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.audit_risk_assessments ADD COLUMN IF NOT EXISTS risk_score NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.audit_risk_assessments ADD COLUMN IF NOT EXISTS assessment_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_risk_assessments ADD COLUMN IF NOT EXISTS assessed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_risk_assessments ADD COLUMN IF NOT EXISTS methodology TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_risk_assessments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_risk_assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  engagement_id UUID NOT NULL REFERENCES __TENANT_SCHEMA__.audit_engagements(id) ON DELETE CASCADE,
  activity      TEXT NOT NULL,
  planned_start DATE,
  planned_end   DATE,
  actual_start  DATE,
  actual_end    DATE,
  status        TEXT NOT NULL DEFAULT 'planned',
  assigned_to   UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_schedules
ALTER TABLE __TENANT_SCHEMA__.audit_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_schedules ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES __TENANT_SCHEMA__.audit_engagements(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.audit_schedules ADD COLUMN IF NOT EXISTS activity TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_schedules ADD COLUMN IF NOT EXISTS planned_start DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_schedules ADD COLUMN IF NOT EXISTS planned_end DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_schedules ADD COLUMN IF NOT EXISTS actual_start DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_schedules ADD COLUMN IF NOT EXISTS actual_end DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_schedules ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE __TENANT_SCHEMA__.audit_schedules ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_schedules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_qa_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  engagement_id UUID NOT NULL REFERENCES __TENANT_SCHEMA__.audit_engagements(id) ON DELETE CASCADE,
  review_type   TEXT NOT NULL,
  reviewer_id   UUID NOT NULL,
  review_date   DATE,
  rating        TEXT,
  comments      TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_qa_reviews
ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES __TENANT_SCHEMA__.audit_engagements(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews ADD COLUMN IF NOT EXISTS review_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews ADD COLUMN IF NOT EXISTS reviewer_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews ADD COLUMN IF NOT EXISTS rating TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_repeat_findings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL,
  original_finding_id  UUID NOT NULL REFERENCES __TENANT_SCHEMA__.audit_findings(id),
  repeat_finding_id    UUID NOT NULL REFERENCES __TENANT_SCHEMA__.audit_findings(id),
  repeat_count         INT NOT NULL DEFAULT 1,
  identified_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  root_cause_analysis  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_repeat_findings
ALTER TABLE __TENANT_SCHEMA__.audit_repeat_findings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_repeat_findings ADD COLUMN IF NOT EXISTS original_finding_id UUID REFERENCES __TENANT_SCHEMA__.audit_findings(id);
ALTER TABLE __TENANT_SCHEMA__.audit_repeat_findings ADD COLUMN IF NOT EXISTS repeat_finding_id UUID REFERENCES __TENANT_SCHEMA__.audit_findings(id);
ALTER TABLE __TENANT_SCHEMA__.audit_repeat_findings ADD COLUMN IF NOT EXISTS repeat_count INT NOT NULL DEFAULT 1;
ALTER TABLE __TENANT_SCHEMA__.audit_repeat_findings ADD COLUMN IF NOT EXISTS identified_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_repeat_findings ADD COLUMN IF NOT EXISTS root_cause_analysis TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_repeat_findings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_repeat_findings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_external (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  provider        TEXT NOT NULL,
  engagement_type TEXT NOT NULL,
  scope           TEXT,
  start_date      DATE,
  end_date        DATE,
  status          TEXT NOT NULL DEFAULT 'planned',
  findings_count  INT NOT NULL DEFAULT 0,
  report_ref      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_external
ALTER TABLE __TENANT_SCHEMA__.audit_external ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_external ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_external ADD COLUMN IF NOT EXISTS engagement_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_external ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_external ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_external ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_external ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE __TENANT_SCHEMA__.audit_external ADD COLUMN IF NOT EXISTS findings_count INT NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.audit_external ADD COLUMN IF NOT EXISTS report_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_external ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_external ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.audit_regulatory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  regulation  TEXT NOT NULL,
  requirement TEXT NOT NULL,
  audit_date  DATE,
  status      TEXT NOT NULL DEFAULT 'pending',
  findings    JSONB NOT NULL DEFAULT '{}',
  next_audit  DATE,
  regulator   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.audit_regulatory
ALTER TABLE __TENANT_SCHEMA__.audit_regulatory ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.audit_regulatory ADD COLUMN IF NOT EXISTS regulation TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_regulatory ADD COLUMN IF NOT EXISTS requirement TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_regulatory ADD COLUMN IF NOT EXISTS audit_date DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_regulatory ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.audit_regulatory ADD COLUMN IF NOT EXISTS findings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.audit_regulatory ADD COLUMN IF NOT EXISTS next_audit DATE;
ALTER TABLE __TENANT_SCHEMA__.audit_regulatory ADD COLUMN IF NOT EXISTS regulator TEXT;
ALTER TABLE __TENANT_SCHEMA__.audit_regulatory ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.audit_regulatory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_versions_tenant_entity ON __TENANT_SCHEMA__.audit_versions(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_change_log_tenant ON __TENANT_SCHEMA__.audit_change_log(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_settings_tenant ON __TENANT_SCHEMA__.audit_settings(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_kpis_tenant ON __TENANT_SCHEMA__.audit_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_audit_report_snapshots_tenant ON __TENANT_SCHEMA__.audit_report_snapshots(tenant_id, report_type);
CREATE INDEX IF NOT EXISTS idx_audit_ai_suggestions_tenant ON __TENANT_SCHEMA__.audit_ai_suggestions(tenant_id, entity_type, status);
CREATE INDEX IF NOT EXISTS idx_audit_external_mappings_tenant ON __TENANT_SCHEMA__.audit_external_mappings(tenant_id, external_system);
CREATE INDEX IF NOT EXISTS idx_audit_attachments_entity ON __TENANT_SCHEMA__.audit_attachments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_comments_entity ON __TENANT_SCHEMA__.audit_comments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_tags_entity ON __TENANT_SCHEMA__.audit_tags(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_plans_tenant ON __TENANT_SCHEMA__.audit_plans(tenant_id, plan_year, status);
CREATE INDEX IF NOT EXISTS idx_audit_engagements_plan ON __TENANT_SCHEMA__.audit_engagements(tenant_id, plan_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_engagements_lead ON __TENANT_SCHEMA__.audit_engagements(tenant_id, lead_auditor_id);
CREATE INDEX IF NOT EXISTS idx_audit_working_papers_engagement ON __TENANT_SCHEMA__.audit_working_papers(tenant_id, engagement_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_universe_tenant ON __TENANT_SCHEMA__.audit_universe(tenant_id, risk_rating, next_audit_date);
CREATE INDEX IF NOT EXISTS idx_audit_capa_finding ON __TENANT_SCHEMA__.audit_capa(tenant_id, finding_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_team_assignments_engagement ON __TENANT_SCHEMA__.audit_team_assignments(tenant_id, engagement_id, user_id);
CREATE INDEX IF NOT EXISTS idx_audit_schedules_engagement ON __TENANT_SCHEMA__.audit_schedules(tenant_id, engagement_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_qa_reviews_engagement ON __TENANT_SCHEMA__.audit_qa_reviews(tenant_id, engagement_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_repeat_findings_original ON __TENANT_SCHEMA__.audit_repeat_findings(tenant_id, original_finding_id);
CREATE INDEX IF NOT EXISTS idx_audit_external_tenant ON __TENANT_SCHEMA__.audit_external(tenant_id, status, start_date);
CREATE INDEX IF NOT EXISTS idx_audit_regulatory_tenant ON __TENANT_SCHEMA__.audit_regulatory(tenant_id, status, next_audit);

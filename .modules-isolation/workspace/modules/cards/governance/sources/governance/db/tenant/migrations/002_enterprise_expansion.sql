-- Module: governance | Migration: 002 | Enterprise Expansion

-- ─── Standard Cross-Cutting Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_versions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_versions
ALTER TABLE __TENANT_SCHEMA__.governance_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_versions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_versions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_versions ADD COLUMN IF NOT EXISTS version INT;
ALTER TABLE __TENANT_SCHEMA__.governance_versions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.governance_versions ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_versions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_change_log (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_change_log
ALTER TABLE __TENANT_SCHEMA__.governance_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_change_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_change_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_change_log ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_change_log ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_change_log ADD COLUMN IF NOT EXISTS new_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_change_log ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_change_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_change_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_change_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_change_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_settings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_settings
ALTER TABLE __TENANT_SCHEMA__.governance_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_settings ADD COLUMN IF NOT EXISTS config_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_settings ADD COLUMN IF NOT EXISTS config_value JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.governance_settings ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE __TENANT_SCHEMA__.governance_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.governance_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_kpis (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_kpis
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS kpi_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS trend TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_kpis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_report_snapshots (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_report_snapshots
ALTER TABLE __TENANT_SCHEMA__.governance_report_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_report_snapshots ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_report_snapshots ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_report_snapshots ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.governance_report_snapshots ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.governance_report_snapshots ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_report_snapshots ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_report_snapshots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.governance_report_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_report_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_ai_suggestions (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_ai_suggestions
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,4);
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_external_mappings (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_external_mappings
ALTER TABLE __TENANT_SCHEMA__.governance_external_mappings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_external_mappings ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_external_mappings ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_external_mappings ADD COLUMN IF NOT EXISTS external_system TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_external_mappings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_external_mappings ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE __TENANT_SCHEMA__.governance_external_mappings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.governance_external_mappings ADD COLUMN IF NOT EXISTS mapping_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.governance_external_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_external_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_attachments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_attachments
ALTER TABLE __TENANT_SCHEMA__.governance_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_attachments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_attachments ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_attachments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_attachments ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.governance_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_attachments ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_comments (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_comments
ALTER TABLE __TENANT_SCHEMA__.governance_comments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_comments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.governance_comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.governance_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_tags (
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
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_tags
ALTER TABLE __TENANT_SCHEMA__.governance_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_tags ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_tags ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_tags ADD COLUMN IF NOT EXISTS tag_key TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_tags ADD COLUMN IF NOT EXISTS tag_value TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Module-Specific Domain Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_charters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  board_id         UUID NOT NULL REFERENCES __TENANT_SCHEMA__.governance_boards(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  purpose          TEXT,
  scope            TEXT,
  authority_level  TEXT,
  approval_status  TEXT NOT NULL DEFAULT 'draft',
  approved_by      UUID,
  effective_date   DATE,
  review_date      DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_charters
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES __TENANT_SCHEMA__.governance_boards(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS authority_level TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_charters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_mandates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL,
  title                TEXT NOT NULL,
  mandate_type         TEXT NOT NULL,
  issuing_body         TEXT,
  description          TEXT,
  effective_date       DATE,
  expiry_date          DATE,
  status               TEXT NOT NULL DEFAULT 'active',
  owner_id             UUID,
  compliance_deadline  DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_mandates
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS mandate_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS issuing_body TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS compliance_deadline DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_mandates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_delegations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  delegator_id    UUID NOT NULL,
  delegate_id     UUID NOT NULL,
  authority_type  TEXT NOT NULL,
  scope           TEXT,
  conditions      JSONB NOT NULL DEFAULT '{}',
  effective_from  DATE NOT NULL,
  effective_to    DATE,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_delegations
ALTER TABLE __TENANT_SCHEMA__.governance_delegations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_delegations ADD COLUMN IF NOT EXISTS delegator_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_delegations ADD COLUMN IF NOT EXISTS delegate_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_delegations ADD COLUMN IF NOT EXISTS authority_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_delegations ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_delegations ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.governance_delegations ADD COLUMN IF NOT EXISTS effective_from DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_delegations ADD COLUMN IF NOT EXISTS effective_to DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_delegations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.governance_delegations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_delegations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_escalation_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  rule_name             TEXT NOT NULL,
  trigger_condition     JSONB NOT NULL DEFAULT '{}',
  escalation_target     UUID,
  escalation_level      INT NOT NULL DEFAULT 1,
  time_threshold_hours  INT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_escalation_rules
ALTER TABLE __TENANT_SCHEMA__.governance_escalation_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_escalation_rules ADD COLUMN IF NOT EXISTS rule_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_escalation_rules ADD COLUMN IF NOT EXISTS trigger_condition JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.governance_escalation_rules ADD COLUMN IF NOT EXISTS escalation_target UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_escalation_rules ADD COLUMN IF NOT EXISTS escalation_level INT NOT NULL DEFAULT 1;
ALTER TABLE __TENANT_SCHEMA__.governance_escalation_rules ADD COLUMN IF NOT EXISTS time_threshold_hours INT;
ALTER TABLE __TENANT_SCHEMA__.governance_escalation_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.governance_escalation_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_escalation_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  review_type      TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        UUID NOT NULL,
  reviewer_id      UUID NOT NULL,
  review_date      DATE,
  status           TEXT NOT NULL DEFAULT 'pending',
  findings         JSONB NOT NULL DEFAULT '{}',
  recommendations  TEXT,
  next_review_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_reviews
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS review_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS reviewer_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS findings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS recommendations TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_acknowledgements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL,
  entity_type          TEXT NOT NULL,
  entity_id            UUID NOT NULL,
  user_id              UUID NOT NULL,
  acknowledged_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledgement_type TEXT NOT NULL,
  ip_address           INET,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_acknowledgements
ALTER TABLE __TENANT_SCHEMA__.governance_acknowledgements ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_acknowledgements ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_acknowledgements ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_acknowledgements ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_acknowledgements ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_acknowledgements ADD COLUMN IF NOT EXISTS acknowledgement_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_acknowledgements ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE __TENANT_SCHEMA__.governance_acknowledgements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_acknowledgements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_objectives (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  target_date DATE,
  status      TEXT NOT NULL DEFAULT 'active',
  progress    NUMERIC(5,2) NOT NULL DEFAULT 0,
  owner_id    UUID,
  parent_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_objectives
ALTER TABLE __TENANT_SCHEMA__.governance_objectives ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_objectives ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_objectives ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_objectives ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_objectives ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_objectives ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.governance_objectives ADD COLUMN IF NOT EXISTS progress NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE __TENANT_SCHEMA__.governance_objectives ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_objectives ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_objectives ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_objectives ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_responsibilities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  role_code      TEXT NOT NULL,
  responsibility TEXT NOT NULL,
  module_code    TEXT,
  scope          TEXT,
  is_mandatory   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_responsibilities
ALTER TABLE __TENANT_SCHEMA__.governance_responsibilities ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_responsibilities ADD COLUMN IF NOT EXISTS role_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_responsibilities ADD COLUMN IF NOT EXISTS responsibility TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_responsibilities ADD COLUMN IF NOT EXISTS module_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_responsibilities ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_responsibilities ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.governance_responsibilities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_responsibilities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_compliance_map (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL,
  governance_item_id        UUID NOT NULL,
  compliance_requirement_id UUID NOT NULL,
  mapping_type              TEXT NOT NULL,
  mapping_status            TEXT NOT NULL DEFAULT 'active',
  verified_at               TIMESTAMPTZ,
  verified_by               UUID,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_compliance_map
ALTER TABLE __TENANT_SCHEMA__.governance_compliance_map ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_compliance_map ADD COLUMN IF NOT EXISTS governance_item_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_compliance_map ADD COLUMN IF NOT EXISTS compliance_requirement_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_compliance_map ADD COLUMN IF NOT EXISTS mapping_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_compliance_map ADD COLUMN IF NOT EXISTS mapping_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.governance_compliance_map ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.governance_compliance_map ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_compliance_map ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_compliance_map ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  task_type    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open',
  priority     TEXT NOT NULL DEFAULT 'medium',
  assigned_to  UUID,
  due_date     DATE,
  entity_type  TEXT,
  entity_id    UUID,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_tasks
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.governance_raci_matrix (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  process_name TEXT NOT NULL,
  activity     TEXT NOT NULL,
  responsible  UUID,
  accountable  UUID,
  consulted    JSONB NOT NULL DEFAULT '[]',
  informed     JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.governance_raci_matrix
ALTER TABLE __TENANT_SCHEMA__.governance_raci_matrix ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_raci_matrix ADD COLUMN IF NOT EXISTS process_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_raci_matrix ADD COLUMN IF NOT EXISTS activity TEXT;
ALTER TABLE __TENANT_SCHEMA__.governance_raci_matrix ADD COLUMN IF NOT EXISTS responsible UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_raci_matrix ADD COLUMN IF NOT EXISTS accountable UUID;
ALTER TABLE __TENANT_SCHEMA__.governance_raci_matrix ADD COLUMN IF NOT EXISTS consulted JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.governance_raci_matrix ADD COLUMN IF NOT EXISTS informed JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.governance_raci_matrix ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.governance_raci_matrix ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_gov_versions_tenant_entity ON __TENANT_SCHEMA__.governance_versions(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gov_change_log_tenant ON __TENANT_SCHEMA__.governance_change_log(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gov_settings_tenant ON __TENANT_SCHEMA__.governance_settings(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_gov_kpis_tenant ON __TENANT_SCHEMA__.governance_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_gov_report_snapshots_tenant ON __TENANT_SCHEMA__.governance_report_snapshots(tenant_id, report_type);
CREATE INDEX IF NOT EXISTS idx_gov_ai_suggestions_tenant ON __TENANT_SCHEMA__.governance_ai_suggestions(tenant_id, entity_type, status);
CREATE INDEX IF NOT EXISTS idx_gov_external_mappings_tenant ON __TENANT_SCHEMA__.governance_external_mappings(tenant_id, external_system);
CREATE INDEX IF NOT EXISTS idx_gov_attachments_entity ON __TENANT_SCHEMA__.governance_attachments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gov_comments_entity ON __TENANT_SCHEMA__.governance_comments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gov_tags_entity ON __TENANT_SCHEMA__.governance_tags(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gov_charters_board ON __TENANT_SCHEMA__.governance_charters(tenant_id, board_id);
CREATE INDEX IF NOT EXISTS idx_gov_mandates_tenant ON __TENANT_SCHEMA__.governance_mandates(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_gov_delegations_tenant ON __TENANT_SCHEMA__.governance_delegations(tenant_id, delegate_id, status);
CREATE INDEX IF NOT EXISTS idx_gov_reviews_entity ON __TENANT_SCHEMA__.governance_reviews(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gov_tasks_tenant ON __TENANT_SCHEMA__.governance_tasks(tenant_id, status, assigned_to);
CREATE INDEX IF NOT EXISTS idx_gov_objectives_tenant ON __TENANT_SCHEMA__.governance_objectives(tenant_id, status, parent_id);
CREATE INDEX IF NOT EXISTS idx_gov_compliance_map_tenant ON __TENANT_SCHEMA__.governance_compliance_map(tenant_id, governance_item_id);

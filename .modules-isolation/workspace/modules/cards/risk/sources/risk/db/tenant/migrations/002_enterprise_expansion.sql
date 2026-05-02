-- Module: risk | Migration: 002 | Enterprise Expansion

-- ─── Standard Cross-Cutting Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_versions (
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

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_change_log (
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

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_settings (
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

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_kpis (
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

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_report_snapshots (
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

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_ai_suggestions (
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

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_external_mappings (
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

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_attachments (
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

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_comments (
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

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_tags (
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

-- ─── Module-Specific Domain Tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  parent_id   UUID,
  risk_type   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_scenarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  risk_id         UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risks(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  likelihood      INT CHECK (likelihood BETWEEN 1 AND 5),
  impact          INT CHECK (impact BETWEEN 1 AND 5),
  scenario_type   TEXT NOT NULL,
  trigger_events  JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_indicators_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  kri_id          UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risk_kris(id) ON DELETE CASCADE,
  collected_value NUMERIC NOT NULL,
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          TEXT,
  collector_id    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_control_mappings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  risk_id      UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risks(id) ON DELETE CASCADE,
  control_id   UUID NOT NULL,
  mapping_type TEXT NOT NULL DEFAULT 'mitigating',
  effectiveness TEXT,
  verified_at  TIMESTAMPTZ,
  verified_by  UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_heat_map_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  name              TEXT NOT NULL,
  matrix_size       INT NOT NULL DEFAULT 5,
  likelihood_labels JSONB NOT NULL DEFAULT '[]',
  impact_labels     JSONB NOT NULL DEFAULT '[]',
  color_scheme      JSONB NOT NULL DEFAULT '{}',
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_treatment_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  risk_id     UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risks(id) ON DELETE CASCADE,
  plan_name   TEXT NOT NULL,
  objective   TEXT,
  strategy    TEXT,
  timeline    JSONB NOT NULL DEFAULT '{}',
  budget      NUMERIC(15,2),
  owner_id    UUID,
  status      TEXT NOT NULL DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_treatment_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  treatment_id  UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risk_treatments(id) ON DELETE CASCADE,
  milestone     TEXT NOT NULL,
  target_date   DATE,
  actual_date   DATE,
  status        TEXT NOT NULL DEFAULT 'pending',
  notes         TEXT,
  reported_by   UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_tolerance_bands (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  category         TEXT NOT NULL,
  appetite_level   TEXT NOT NULL,
  lower_bound      NUMERIC NOT NULL,
  upper_bound      NUMERIC NOT NULL,
  action_required  TEXT,
  color            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_scoring_models (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  model_name  TEXT NOT NULL,
  model_type  TEXT NOT NULL DEFAULT 'matrix',
  config      JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_aggregation (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  aggregation_type TEXT NOT NULL,
  scope_type       TEXT NOT NULL,
  scope_id         UUID,
  total_risks      INT NOT NULL DEFAULT 0,
  avg_score        NUMERIC,
  max_score        NUMERIC,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  breakdown        JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  risk_id           UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risks(id) ON DELETE CASCADE,
  event_type        TEXT NOT NULL,
  description       TEXT,
  severity          TEXT NOT NULL,
  occurred_at       TIMESTAMPTZ,
  detected_at       TIMESTAMPTZ,
  reported_by       UUID,
  impact_assessment JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_correlations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  risk_a_id        UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risks(id) ON DELETE CASCADE,
  risk_b_id        UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risks(id) ON DELETE CASCADE,
  correlation_type TEXT NOT NULL,
  strength         NUMERIC(5,4),
  description      TEXT,
  identified_by    UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_bowtie (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL,
  risk_id              UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risks(id) ON DELETE CASCADE,
  causes               JSONB NOT NULL DEFAULT '[]',
  preventive_controls  JSONB NOT NULL DEFAULT '[]',
  consequences         JSONB NOT NULL DEFAULT '[]',
  mitigating_controls  JSONB NOT NULL DEFAULT '[]',
  diagram_data         JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_register_views (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  view_name      TEXT NOT NULL,
  filter_config  JSONB NOT NULL DEFAULT '{}',
  column_config  JSONB NOT NULL DEFAULT '[]',
  sort_config    JSONB NOT NULL DEFAULT '{}',
  owner_id       UUID,
  is_shared      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_risk_versions_tenant_entity ON __TENANT_SCHEMA__.risk_versions(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_change_log_tenant ON __TENANT_SCHEMA__.risk_change_log(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_settings_tenant ON __TENANT_SCHEMA__.risk_settings(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_risk_kpis_tenant ON __TENANT_SCHEMA__.risk_kpis(tenant_id, kpi_code);
CREATE INDEX IF NOT EXISTS idx_risk_report_snapshots_tenant ON __TENANT_SCHEMA__.risk_report_snapshots(tenant_id, report_type);
CREATE INDEX IF NOT EXISTS idx_risk_ai_suggestions_tenant ON __TENANT_SCHEMA__.risk_ai_suggestions(tenant_id, entity_type, status);
CREATE INDEX IF NOT EXISTS idx_risk_external_mappings_tenant ON __TENANT_SCHEMA__.risk_external_mappings(tenant_id, external_system);
CREATE INDEX IF NOT EXISTS idx_risk_attachments_entity ON __TENANT_SCHEMA__.risk_attachments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_comments_entity ON __TENANT_SCHEMA__.risk_comments(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_tags_entity ON __TENANT_SCHEMA__.risk_tags(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_categories_tenant ON __TENANT_SCHEMA__.risk_categories(tenant_id, parent_id, is_active);
CREATE INDEX IF NOT EXISTS idx_risk_scenarios_risk ON __TENANT_SCHEMA__.risk_scenarios(tenant_id, risk_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_indicators_history_kri ON __TENANT_SCHEMA__.risk_indicators_history(tenant_id, kri_id, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_control_mappings_risk ON __TENANT_SCHEMA__.risk_control_mappings(tenant_id, risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_treatment_plans_risk ON __TENANT_SCHEMA__.risk_treatment_plans(tenant_id, risk_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_treatment_progress_treatment ON __TENANT_SCHEMA__.risk_treatment_progress(tenant_id, treatment_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_events_risk ON __TENANT_SCHEMA__.risk_events(tenant_id, risk_id, severity);
CREATE INDEX IF NOT EXISTS idx_risk_correlations_risks ON __TENANT_SCHEMA__.risk_correlations(tenant_id, risk_a_id, risk_b_id);
CREATE INDEX IF NOT EXISTS idx_risk_bowtie_risk ON __TENANT_SCHEMA__.risk_bowtie(tenant_id, risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_aggregation_tenant ON __TENANT_SCHEMA__.risk_aggregation(tenant_id, aggregation_type, scope_type);
CREATE INDEX IF NOT EXISTS idx_risk_register_views_owner ON __TENANT_SCHEMA__.risk_register_views(tenant_id, owner_id, is_shared);

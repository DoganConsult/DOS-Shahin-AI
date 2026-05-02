-- dos:draft
-- =====================================================================
-- UI-OS — §17 Feature flags / experiments / rollout / kill switches  (20260502_0125)
--
-- Tables (7) — DKNF via dos.ui_flag_target_kind_t.
-- 1NF: rollout_rules and kill_switches use UUID FK to flag/experiment, not TEXT.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_feature_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  flag_code       VARCHAR(150) NOT NULL,
  description_key VARCHAR(200),
  default_value   JSONB NOT NULL DEFAULT 'false'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      VARCHAR(64),
  updated_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_feature_flags_uk
    UNIQUE (tenant_id, flag_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_feature_flags_tenant
  ON dos.ui_feature_flags (tenant_id);

CREATE TABLE IF NOT EXISTS dos.ui_feature_flag_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  flag_id         UUID NOT NULL,
  target_kind     dos.ui_flag_target_kind_t NOT NULL,
  target_id       VARCHAR(120) NOT NULL,
  value           JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_feature_flag_assignments_flag_fk
    FOREIGN KEY (flag_id) REFERENCES dos.ui_feature_flags(id) ON DELETE CASCADE,
  CONSTRAINT ui_feature_flag_assignments_uk
    UNIQUE (flag_id, target_kind, target_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_feature_flag_assignments_target
  ON dos.ui_feature_flag_assignments (tenant_id, target_kind, target_id);

CREATE TABLE IF NOT EXISTS dos.ui_experiments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  experiment_code VARCHAR(150) NOT NULL,
  hypothesis      TEXT,
  metric_keys     TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_experiments_uk
    UNIQUE (tenant_id, experiment_code)
);

COMMENT ON COLUMN dos.ui_experiments.metric_keys IS
  'Free-form metric tags. Promote to child table if a metric registry is added (1NF).';

CREATE TABLE IF NOT EXISTS dos.ui_experiment_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  experiment_id   UUID NOT NULL,
  variant_code    VARCHAR(60) NOT NULL,
  description_key VARCHAR(200),
  traffic_pct     INTEGER NOT NULL DEFAULT 0,
  is_control      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_experiment_variants_experiment_fk
    FOREIGN KEY (experiment_id) REFERENCES dos.ui_experiments(id) ON DELETE CASCADE,
  CONSTRAINT ui_experiment_variants_uk
    UNIQUE (experiment_id, variant_code),
  CONSTRAINT ui_experiment_variants_traffic_chk
    CHECK (traffic_pct BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS dos.ui_experiment_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  experiment_id   UUID NOT NULL,
  user_id         VARCHAR(64) NOT NULL,
  variant_id      UUID NOT NULL,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_experiment_assignments_experiment_fk
    FOREIGN KEY (experiment_id) REFERENCES dos.ui_experiments(id) ON DELETE CASCADE,
  CONSTRAINT ui_experiment_assignments_variant_fk
    FOREIGN KEY (variant_id) REFERENCES dos.ui_experiment_variants(id) ON DELETE CASCADE,
  CONSTRAINT ui_experiment_assignments_uk
    UNIQUE (experiment_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_experiment_assignments_user
  ON dos.ui_experiment_assignments (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS dos.ui_rollout_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  flag_id       UUID,
  experiment_id UUID,
  rule_kind     VARCHAR(60) NOT NULL,
  rule_payload  JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority      INTEGER NOT NULL DEFAULT 100,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_rollout_rules_owner_chk
    CHECK ((flag_id IS NOT NULL)::int + (experiment_id IS NOT NULL)::int = 1),
  CONSTRAINT ui_rollout_rules_flag_fk
    FOREIGN KEY (flag_id) REFERENCES dos.ui_feature_flags(id) ON DELETE CASCADE,
  CONSTRAINT ui_rollout_rules_experiment_fk
    FOREIGN KEY (experiment_id) REFERENCES dos.ui_experiments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_ui_rollout_rules_flag
  ON dos.ui_rollout_rules (flag_id) WHERE flag_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ui_rollout_rules_experiment
  ON dos.ui_rollout_rules (experiment_id) WHERE experiment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS dos.ui_kill_switches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  switch_code   VARCHAR(150) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  reason        TEXT,
  triggered_by  VARCHAR(64),
  triggered_at  TIMESTAMPTZ,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_kill_switches_uk
    UNIQUE (tenant_id, switch_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_kill_switches_active
  ON dos.ui_kill_switches (tenant_id, switch_code) WHERE is_active = TRUE;

COMMIT;

-- dos:draft
-- =====================================================================
-- UI-OS — §16 Governance — drafts, rollback, validation, drift, admin audit  (20260502_0124)
-- Tables (5) — DKNF via dos.ui_target_kind_t.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_draft_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150) NOT NULL,
  version       VARCHAR(40) NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  author_id     VARCHAR(64) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_draft_versions_uk
    UNIQUE (tenant_id, target_kind, target_id, version)
);

CREATE INDEX IF NOT EXISTS ix_ui_draft_versions_target_active
  ON dos.ui_draft_versions (tenant_id, target_kind, target_id) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS dos.ui_rollback_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150) NOT NULL,
  version       VARCHAR(40) NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason        TEXT,
  created_by    VARCHAR(64) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_rollback_points_uk
    UNIQUE (tenant_id, target_kind, target_id, version)
);

CREATE INDEX IF NOT EXISTS ix_ui_rollback_points_target
  ON dos.ui_rollback_points (tenant_id, target_kind, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_schema_validation_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  subject_kind  dos.ui_target_kind_t NOT NULL,
  subject_id    VARCHAR(150) NOT NULL,
  passed        BOOLEAN NOT NULL,
  findings      JSONB NOT NULL DEFAULT '[]'::jsonb,
  validator_version VARCHAR(40),
  validated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_schema_validation_results_subject
  ON dos.ui_schema_validation_results (tenant_id, subject_kind, subject_id, validated_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_contract_drift_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  subject_kind  dos.ui_target_kind_t NOT NULL,
  subject_id    VARCHAR(150) NOT NULL,
  drift_kind    VARCHAR(60) NOT NULL,
  delta         JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_ui_contract_drift_results_subject
  ON dos.ui_contract_drift_results (tenant_id, subject_kind, subject_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_contract_drift_results_open
  ON dos.ui_contract_drift_results (tenant_id, detected_at DESC) WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.ui_admin_activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  actor_id      VARCHAR(64) NOT NULL,
  action_code   VARCHAR(150) NOT NULL,
  target_kind   dos.ui_target_kind_t,
  target_id     VARCHAR(150),
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_admin_activity_log_actor_time
  ON dos.ui_admin_activity_log (tenant_id, actor_id, occurred_at DESC);

COMMIT;

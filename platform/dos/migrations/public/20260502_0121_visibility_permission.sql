-- dos:draft
-- =====================================================================
-- UI-OS — §15 Security — visibility/permission/policy/denied audit  (20260502_0121)
--
-- Tables (4) — DKNF via dos.ui_target_kind_t / dos.ui_perm_effect_t /
--                            dos.ui_visibility_rule_kind_t.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_visibility_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150) NOT NULL,
  rule_kind     dos.ui_visibility_rule_kind_t NOT NULL,
  rule_payload  JSONB NOT NULL DEFAULT '{}'::jsonb,
  effect        dos.ui_visibility_effect_t NOT NULL DEFAULT 'show',
  priority      INTEGER NOT NULL DEFAULT 100,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_visibility_rules_target
  ON dos.ui_visibility_rules (tenant_id, target_kind, target_id);

CREATE TABLE IF NOT EXISTS dos.ui_permission_bindings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  target_kind     dos.ui_target_kind_t NOT NULL,
  target_id       VARCHAR(150) NOT NULL,
  permission_code VARCHAR(150) NOT NULL,
  effect          dos.ui_perm_effect_t NOT NULL DEFAULT 'allow',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_permission_bindings_uk
    UNIQUE (tenant_id, target_kind, target_id, permission_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_permission_bindings_target
  ON dos.ui_permission_bindings (tenant_id, target_kind, target_id);

CREATE TABLE IF NOT EXISTS dos.ui_policy_evaluation_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  policy_kind   VARCHAR(60) NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150) NOT NULL,
  effect        dos.ui_perm_effect_t NOT NULL,
  reason_code   VARCHAR(150),
  evaluated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_policy_evaluation_log_user_time
  ON dos.ui_policy_evaluation_log (tenant_id, user_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_policy_evaluation_log_target
  ON dos.ui_policy_evaluation_log (tenant_id, target_kind, target_id);

CREATE TABLE IF NOT EXISTS dos.ui_denied_render_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150) NOT NULL,
  reason_code   VARCHAR(150) NOT NULL,
  denied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_denied_render_log_user_time
  ON dos.ui_denied_render_log (tenant_id, user_id, denied_at DESC);

COMMIT;

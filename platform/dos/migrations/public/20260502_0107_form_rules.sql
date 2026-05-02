-- dos:draft
-- =====================================================================
-- UI-OS — §7 Forms — field rules, validation rules, defaults  (20260502_0107)
--
-- Tables created (3) — DKNF via dos.ui_form_rule_kind_t /
-- dos.ui_form_validator_kind_t / dos.ui_form_default_kind_t.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_form_field_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  form_field_id   UUID NOT NULL,
  rule_kind       dos.ui_form_rule_kind_t NOT NULL,
  expression      JSONB NOT NULL DEFAULT '{}'::jsonb,
  message_key     VARCHAR(150),
  priority        INTEGER NOT NULL DEFAULT 100,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      VARCHAR(64),
  updated_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_form_field_rules_field_fk
    FOREIGN KEY (form_field_id) REFERENCES dos.ui_form_fields(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_ui_form_field_rules_tenant
  ON dos.ui_form_field_rules (tenant_id);

CREATE INDEX IF NOT EXISTS ix_ui_form_field_rules_field
  ON dos.ui_form_field_rules (form_field_id);

CREATE TABLE IF NOT EXISTS dos.ui_form_validation_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  form_field_id   UUID NOT NULL,
  validator_kind  dos.ui_form_validator_kind_t NOT NULL,
  params          JSONB NOT NULL DEFAULT '{}'::jsonb,
  message_key     VARCHAR(150),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_form_validation_rules_field_fk
    FOREIGN KEY (form_field_id) REFERENCES dos.ui_form_fields(id) ON DELETE CASCADE,
  CONSTRAINT ui_form_validation_rules_uk
    UNIQUE (form_field_id, validator_kind)
);

CREATE INDEX IF NOT EXISTS ix_ui_form_validation_rules_tenant
  ON dos.ui_form_validation_rules (tenant_id);

CREATE TABLE IF NOT EXISTS dos.ui_form_default_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  form_field_id   UUID NOT NULL,
  default_kind    dos.ui_form_default_kind_t NOT NULL,
  value           JSONB,
  expression      JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_form_default_values_field_fk
    FOREIGN KEY (form_field_id) REFERENCES dos.ui_form_fields(id) ON DELETE CASCADE,
  CONSTRAINT ui_form_default_values_uk
    UNIQUE (form_field_id),
  CONSTRAINT ui_form_default_values_payload_chk
    CHECK (
      (default_kind = 'static'     AND value IS NOT NULL AND expression IS NULL) OR
      (default_kind = 'expression' AND expression IS NOT NULL) OR
      (default_kind IN ('from_user','from_tenant','from_workflow'))
    )
);

CREATE INDEX IF NOT EXISTS ix_ui_form_default_values_tenant
  ON dos.ui_form_default_values (tenant_id);

COMMIT;

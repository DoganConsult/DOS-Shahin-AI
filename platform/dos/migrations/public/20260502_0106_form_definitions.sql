-- dos:draft
-- =====================================================================
-- UI-OS — §7 Forms — definitions, sections, fields  (20260502_0106)
--
-- Tables created (3) — DKNF via dos.ui_form_field_kind_t:
--   1. dos.ui_form_definitions
--   2. dos.ui_form_sections
--   3. dos.ui_form_fields
--
-- Normalization:
--   - DKNF: field_kind uses dos.ui_form_field_kind_t.
--   - 3NF: section/form FKs use UUID, never embedded code; display_order is
--          a column, not derived from FK ordering.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_form_definitions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             VARCHAR(64) NOT NULL,
  form_key              VARCHAR(150) NOT NULL,
  version               INTEGER NOT NULL DEFAULT 1,
  module_code           VARCHAR(100),
  product_code          VARCHAR(100),
  entity_kind           VARCHAR(100),
  submit_workflow_code  VARCHAR(150),
  title_key             VARCHAR(150),
  description_key       VARCHAR(200),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            VARCHAR(64),
  updated_by            VARCHAR(64),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_form_definitions_uk
    UNIQUE (tenant_id, form_key, version),
  CONSTRAINT ui_form_definitions_version_chk
    CHECK (version > 0)
);

CREATE INDEX IF NOT EXISTS ix_ui_form_definitions_tenant
  ON dos.ui_form_definitions (tenant_id);

CREATE INDEX IF NOT EXISTS ix_ui_form_definitions_module
  ON dos.ui_form_definitions (tenant_id, module_code) WHERE module_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS dos.ui_form_sections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  form_definition_id  UUID NOT NULL,
  section_key         VARCHAR(150) NOT NULL,
  display_order       INTEGER NOT NULL DEFAULT 0,
  title_key           VARCHAR(150),
  description_key     VARCHAR(200),
  is_collapsible      BOOLEAN NOT NULL DEFAULT FALSE,
  default_collapsed   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_form_sections_form_fk
    FOREIGN KEY (form_definition_id) REFERENCES dos.ui_form_definitions(id) ON DELETE CASCADE,
  CONSTRAINT ui_form_sections_uk
    UNIQUE (form_definition_id, section_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_form_sections_tenant
  ON dos.ui_form_sections (tenant_id);

CREATE INDEX IF NOT EXISTS ix_ui_form_sections_form
  ON dos.ui_form_sections (form_definition_id);

CREATE TABLE IF NOT EXISTS dos.ui_form_fields (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  form_section_id   UUID NOT NULL,
  field_key         VARCHAR(150) NOT NULL,
  field_kind        dos.ui_form_field_kind_t NOT NULL,
  display_order     INTEGER NOT NULL DEFAULT 0,
  label_key         VARCHAR(150),
  help_key          VARCHAR(200),
  placeholder_key   VARCHAR(150),
  width_units       INTEGER NOT NULL DEFAULT 12,
  is_readonly       BOOLEAN NOT NULL DEFAULT FALSE,
  is_required       BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_form_fields_section_fk
    FOREIGN KEY (form_section_id) REFERENCES dos.ui_form_sections(id) ON DELETE CASCADE,
  CONSTRAINT ui_form_fields_uk
    UNIQUE (form_section_id, field_key),
  CONSTRAINT ui_form_fields_width_chk
    CHECK (width_units BETWEEN 1 AND 12)
);

CREATE INDEX IF NOT EXISTS ix_ui_form_fields_tenant
  ON dos.ui_form_fields (tenant_id);

CREATE INDEX IF NOT EXISTS ix_ui_form_fields_section
  ON dos.ui_form_fields (form_section_id);

COMMIT;

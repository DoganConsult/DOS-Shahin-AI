-- dos:draft
-- =====================================================================
-- UI-OS — §5 Widgets — visibility rules, personalization, catalog grouping  (20260502_0102)
--
-- Tables created (3) — DKNF compliant via ENUMs from 20260502_0099:
--   1. dos.ui_widget_visibility_rules   — show/hide logic per instance
--   2. dos.ui_widget_personalization    — per-user widget settings
--   3. dos.ui_widget_catalog_categories — admin grouping (3NF: parent FK on self)
--
-- Normalization decisions:
--   - DKNF: rule_kind / effect promoted to ENUMs
--          (dos.ui_visibility_rule_kind_t, dos.ui_visibility_effect_t).
--   - 3NF: ui_widget_catalog_categories.parent_category_id is now a UUID FK
--          on the same table, instead of a redundant parent_category_code TEXT
--          (which would have been a transitive id->code dependency).
--
-- Parent: dos.ui_widget_instances (20260502_0100)
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ---------------------------------------------------------------------
-- 1. dos.ui_widget_visibility_rules
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_widget_visibility_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  widget_instance_id  UUID NOT NULL,
  rule_kind           dos.ui_visibility_rule_kind_t NOT NULL,
  rule_payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  effect              dos.ui_visibility_effect_t NOT NULL DEFAULT 'show',
  priority            INTEGER NOT NULL DEFAULT 100,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          VARCHAR(64),
  updated_by          VARCHAR(64),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_widget_vis_rule_inst_fk
    FOREIGN KEY (widget_instance_id) REFERENCES dos.ui_widget_instances(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_ui_widget_visibility_rules_tenant
  ON dos.ui_widget_visibility_rules (tenant_id);

CREATE INDEX IF NOT EXISTS ix_ui_widget_visibility_rules_instance
  ON dos.ui_widget_visibility_rules (widget_instance_id);

-- ---------------------------------------------------------------------
-- 2. dos.ui_widget_personalization
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_widget_personalization (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  widget_instance_id  UUID NOT NULL,
  user_id             VARCHAR(64) NOT NULL,
  personalization     JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_collapsed        BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned           BOOLEAN NOT NULL DEFAULT FALSE,
  display_order       INTEGER,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_widget_personalization_inst_fk
    FOREIGN KEY (widget_instance_id) REFERENCES dos.ui_widget_instances(id) ON DELETE CASCADE,
  CONSTRAINT ui_widget_personalization_unique
    UNIQUE (widget_instance_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_widget_personalization_tenant_user
  ON dos.ui_widget_personalization (tenant_id, user_id);

-- ---------------------------------------------------------------------
-- 3. dos.ui_widget_catalog_categories  (3NF: parent FK on self by id, not code)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_widget_catalog_categories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  category_code       VARCHAR(100) NOT NULL,
  parent_category_id  UUID,
  display_name_key    VARCHAR(150),
  description_key     VARCHAR(200),
  display_order       INTEGER NOT NULL DEFAULT 0,
  icon_key            VARCHAR(150),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          VARCHAR(64),
  updated_by          VARCHAR(64),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_widget_catalog_categories_tenant_code_uk
    UNIQUE (tenant_id, category_code),
  CONSTRAINT ui_widget_catalog_categories_parent_fk
    FOREIGN KEY (parent_category_id) REFERENCES dos.ui_widget_catalog_categories(id) ON DELETE SET NULL,
  CONSTRAINT ui_widget_catalog_categories_no_self_parent
    CHECK (parent_category_id IS NULL OR parent_category_id <> id)
);

CREATE INDEX IF NOT EXISTS ix_ui_widget_catalog_categories_tenant
  ON dos.ui_widget_catalog_categories (tenant_id);

CREATE INDEX IF NOT EXISTS ix_ui_widget_catalog_categories_parent
  ON dos.ui_widget_catalog_categories (parent_category_id) WHERE parent_category_id IS NOT NULL;

COMMENT ON TABLE  dos.ui_widget_catalog_categories IS
  'Hierarchical catalog grouping. parent_category_id is FK to id on this table (3NF — no parent_code redundancy).';

COMMIT;

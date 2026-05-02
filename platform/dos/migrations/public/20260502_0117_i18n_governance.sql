-- dos:draft
-- =====================================================================
-- UI-OS — §12 i18n — namespaces, versions, overrides, user prefs, RTL audit  (20260502_0117)
--
-- Tables (5) — DKNF via dos.ui_locale_direction_t.
-- 3NF: ui_translation_versions FK to namespace by id, never code.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_translation_namespaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  namespace_code  VARCHAR(100) NOT NULL,
  description_key VARCHAR(200),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_translation_namespaces_uk
    UNIQUE (tenant_id, namespace_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_translation_namespaces_tenant
  ON dos.ui_translation_namespaces (tenant_id);

CREATE TABLE IF NOT EXISTS dos.ui_translation_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  namespace_id  UUID NOT NULL,
  locale        VARCHAR(20) NOT NULL,
  version       VARCHAR(40) NOT NULL,
  is_current    BOOLEAN NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  source_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_translation_versions_ns_fk
    FOREIGN KEY (namespace_id) REFERENCES dos.ui_translation_namespaces(id) ON DELETE CASCADE,
  CONSTRAINT ui_translation_versions_uk
    UNIQUE (namespace_id, locale, version)
);

CREATE INDEX IF NOT EXISTS ix_ui_translation_versions_current
  ON dos.ui_translation_versions (namespace_id, locale) WHERE is_current = TRUE;

CREATE TABLE IF NOT EXISTS dos.ui_translation_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  namespace_id    UUID NOT NULL,
  locale          VARCHAR(20) NOT NULL,
  translation_key VARCHAR(200) NOT NULL,
  override_value  TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      VARCHAR(64),
  updated_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_translation_overrides_ns_fk
    FOREIGN KEY (namespace_id) REFERENCES dos.ui_translation_namespaces(id) ON DELETE CASCADE,
  CONSTRAINT ui_translation_overrides_uk
    UNIQUE (tenant_id, namespace_id, locale, translation_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_translation_overrides_tenant_locale
  ON dos.ui_translation_overrides (tenant_id, locale);

CREATE TABLE IF NOT EXISTS dos.ui_locale_user_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   VARCHAR(64) NOT NULL,
  user_id     VARCHAR(64) NOT NULL,
  locale      VARCHAR(20) NOT NULL,
  direction   dos.ui_locale_direction_t NOT NULL DEFAULT 'ltr',
  timezone    VARCHAR(64) NOT NULL DEFAULT 'Asia/Riyadh',
  date_format VARCHAR(40),
  time_format VARCHAR(40),
  number_format VARCHAR(40),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_locale_user_preferences_uk
    UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS dos.ui_rtl_validation_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  subject_kind  VARCHAR(40) NOT NULL,
  subject_id    VARCHAR(150) NOT NULL,
  passed        BOOLEAN NOT NULL,
  findings      JSONB NOT NULL DEFAULT '[]'::jsonb,
  validator_version VARCHAR(40),
  validated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_rtl_validation_results_uk
    UNIQUE (tenant_id, subject_kind, subject_id, validated_at)
);

CREATE INDEX IF NOT EXISTS ix_ui_rtl_validation_results_subject
  ON dos.ui_rtl_validation_results (tenant_id, subject_kind, subject_id, validated_at DESC);

COMMIT;

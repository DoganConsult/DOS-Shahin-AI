-- dos:draft
-- =====================================================================
-- F.1a — i18n catalog (20260502_0135)
--
-- Foundation tables for DB-driven UI localization. Every UI string
-- (labels, eyebrows, titles, subtitles, empty/error/help messages, CTA
-- copy, status pills, role names) resolves through these tables — never
-- from hardcoded TS literals or product-local i18n bundles.
--
-- Tables:
--   1. dos.i18n_namespaces    — top-level partitioning (workspace,
--                               tenant-settings, foundation, etc.)
--   2. dos.i18n_keys          — canonical key registry (one row per
--                               translatable surface). Default locale
--                               value is mandatory.
--   3. dos.i18n_translations  — locale-specific values, with a 3-tier
--                               source precedence (platform → tenant →
--                               user). Last-write-wins per source.
--
-- Usage shape:
--   ResolvedUiString(key) =
--     coalesce(
--       user_translation(key, locale, user_id),
--       tenant_translation(key, locale, tenant_id),
--       platform_translation(key, locale),
--       platform_translation(key, fallback_locale='en'),
--       key  -- raw key as last-resort visible fallback
--     )
--
-- Doctrine: keys are stable identifiers (`workspace.hero.title`),
-- never the English text itself. Pluralization via plural_forms JSONB
-- (CLDR plural categories: zero, one, two, few, many, other).
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. namespaces ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.i18n_namespaces (
  ns_key          VARCHAR(100) PRIMARY KEY,
  description     TEXT,
  owner_module    VARCHAR(100),                       -- nullable for cross-cutting
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. keys ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.i18n_keys (
  key_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  ns_key          VARCHAR(100) NOT NULL REFERENCES dos.i18n_namespaces(ns_key) ON DELETE CASCADE,
  key             VARCHAR(300) NOT NULL,              -- e.g. 'hero.title'
  default_locale  VARCHAR(10)  NOT NULL DEFAULT 'en',
  notes           TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT i18n_keys_ns_key_uk UNIQUE (ns_key, key)
);

-- Fully-qualified key lookup: 'workspace.hero.title'
CREATE INDEX IF NOT EXISTS ix_i18n_keys_ns
  ON dos.i18n_keys (ns_key, is_active);

-- ── 3. translations ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.i18n_translations (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id          UUID         NOT NULL REFERENCES dos.i18n_keys(key_id) ON DELETE CASCADE,
  locale          VARCHAR(10)  NOT NULL,              -- BCP-47 e.g. 'en', 'ar', 'ar-SA'
  value           TEXT         NOT NULL,
  plural_forms    JSONB        NOT NULL DEFAULT '{}'::jsonb,
                                                       -- CLDR { zero, one, two, few, many, other }
  source          VARCHAR(20)  NOT NULL,
                                                       -- 'platform' | 'tenant' | 'user'
  tenant_id       VARCHAR(64),                         -- required when source='tenant' or 'user'
  user_id         VARCHAR(64),                         -- required when source='user'
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by      VARCHAR(64),
  updated_by      VARCHAR(64),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT i18n_translations_source_chk CHECK (source IN ('platform','tenant','user')),
  CONSTRAINT i18n_translations_tenant_chk CHECK (
    (source = 'platform' AND tenant_id IS NULL AND user_id IS NULL) OR
    (source = 'tenant'   AND tenant_id IS NOT NULL AND user_id IS NULL) OR
    (source = 'user'     AND tenant_id IS NOT NULL AND user_id IS NOT NULL)
  )
);

-- One translation per (key, locale, source-scope) — NULLS NOT DISTINCT
-- so the platform default is enforced as a single row.
CREATE UNIQUE INDEX IF NOT EXISTS ux_i18n_translations_scope
  ON dos.i18n_translations (key_id, locale, source, COALESCE(tenant_id,''), COALESCE(user_id,''))
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS ix_i18n_translations_key_locale
  ON dos.i18n_translations (key_id, locale)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS ix_i18n_translations_tenant
  ON dos.i18n_translations (tenant_id)
  WHERE tenant_id IS NOT NULL AND is_active = TRUE;

-- ── Seed: canonical workspace + tenant-settings + status namespaces ──
INSERT INTO dos.i18n_namespaces (ns_key, description, owner_module) VALUES
  ('workspace',       'Workspace home + workspace-shell surfaces', 'foundation'),
  ('tenant-settings', 'Tenant administration page + sub-sections', 'foundation'),
  ('foundation',      'Foundation module surfaces (general)',      'foundation'),
  ('status',          'Status enum labels (active/expired/...)',   NULL),
  ('role',            'Role label registry (owner/admin/...)',     NULL),
  ('common',          'Cross-cutting verbs/nouns (Open, Save, Cancel, Loading)', NULL)
ON CONFLICT (ns_key) DO NOTHING;

COMMIT;

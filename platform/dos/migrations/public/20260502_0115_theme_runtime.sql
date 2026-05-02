-- dos:draft
-- =====================================================================
-- UI-OS — §11 Branding — theme profiles, tokens, assignments  (20260502_0115)
--
-- Tables (3) — DKNF via dos.ui_theme_token_kind_t / dos.ui_theme_target_kind_t.
-- 3NF: parent_profile_id is FK on self (id), not parent_profile_code.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_theme_profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  profile_code       VARCHAR(100) NOT NULL,
  parent_profile_id  UUID,
  display_name_key   VARCHAR(150),
  description_key    VARCHAR(200),
  is_default         BOOLEAN NOT NULL DEFAULT FALSE,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_theme_profiles_uk
    UNIQUE (tenant_id, profile_code),
  CONSTRAINT ui_theme_profiles_parent_fk
    FOREIGN KEY (parent_profile_id) REFERENCES dos.ui_theme_profiles(id) ON DELETE SET NULL,
  CONSTRAINT ui_theme_profiles_no_self_parent
    CHECK (parent_profile_id IS NULL OR parent_profile_id <> id)
);

CREATE INDEX IF NOT EXISTS ix_ui_theme_profiles_tenant
  ON dos.ui_theme_profiles (tenant_id);

CREATE TABLE IF NOT EXISTS dos.ui_theme_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  theme_profile_id UUID NOT NULL,
  token_key       VARCHAR(150) NOT NULL,
  token_kind      dos.ui_theme_token_kind_t NOT NULL,
  token_value     TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_theme_tokens_profile_fk
    FOREIGN KEY (theme_profile_id) REFERENCES dos.ui_theme_profiles(id) ON DELETE CASCADE,
  CONSTRAINT ui_theme_tokens_uk
    UNIQUE (theme_profile_id, token_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_theme_tokens_tenant
  ON dos.ui_theme_tokens (tenant_id);

CREATE TABLE IF NOT EXISTS dos.ui_theme_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  target_kind       dos.ui_theme_target_kind_t NOT NULL,
  target_id         VARCHAR(120) NOT NULL,
  theme_profile_id  UUID NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_theme_assignments_profile_fk
    FOREIGN KEY (theme_profile_id) REFERENCES dos.ui_theme_profiles(id) ON DELETE CASCADE,
  CONSTRAINT ui_theme_assignments_uk
    UNIQUE (tenant_id, target_kind, target_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_theme_assignments_target
  ON dos.ui_theme_assignments (tenant_id, target_kind, target_id);

COMMIT;

-- dos:draft
-- =====================================================================
-- UI-OS — §13 Accessibility/device — prefs + device session/viewport  (20260502_0118)
--
-- Tables (7) — DKNF via dos.ui_contrast_mode_t / dos.ui_device_kind_t /
--                            dos.ui_viewport_breakpoint_t.
-- 4NF: a11y prefs are split per-concern (motion, contrast, font_scale) — each
-- a separate independent dimension; a single "preferences" row would conflate
-- multivalued dimensions.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_accessibility_preferences (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                VARCHAR(64) NOT NULL,
  user_id                  VARCHAR(64) NOT NULL,
  screen_reader_optimized  BOOLEAN NOT NULL DEFAULT FALSE,
  keyboard_only            BOOLEAN NOT NULL DEFAULT FALSE,
  caption_required         BOOLEAN NOT NULL DEFAULT FALSE,
  tab_order_strict         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_accessibility_preferences_uk UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS dos.ui_reduced_motion_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  user_id           VARCHAR(64) NOT NULL,
  reduce_motion     BOOLEAN NOT NULL DEFAULT FALSE,
  disable_parallax  BOOLEAN NOT NULL DEFAULT FALSE,
  disable_autoplay  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_reduced_motion_preferences_uk UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS dos.ui_contrast_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  contrast_mode dos.ui_contrast_mode_t NOT NULL DEFAULT 'default',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_contrast_preferences_uk UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS dos.ui_font_scale_preferences (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  user_id        VARCHAR(64) NOT NULL,
  scale_percent  INTEGER NOT NULL DEFAULT 100,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_font_scale_preferences_uk UNIQUE (tenant_id, user_id),
  CONSTRAINT ui_font_scale_preferences_range_chk
    CHECK (scale_percent BETWEEN 75 AND 200)
);

CREATE TABLE IF NOT EXISTS dos.ui_device_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  user_id         VARCHAR(64) NOT NULL,
  device_kind     dos.ui_device_kind_t NOT NULL,
  prefers_compact BOOLEAN NOT NULL DEFAULT FALSE,
  prefers_dark    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_device_preferences_uk
    UNIQUE (tenant_id, user_id, device_kind)
);

CREATE TABLE IF NOT EXISTS dos.ui_device_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  device_id     VARCHAR(120) NOT NULL,
  device_kind   dos.ui_device_kind_t,
  user_agent    TEXT,
  ip_hash       VARCHAR(128),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_device_sessions_uk UNIQUE (tenant_id, device_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_device_sessions_user
  ON dos.ui_device_sessions (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS dos.ui_viewport_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  profile_code    VARCHAR(40) NOT NULL,
  breakpoint_kind dos.ui_viewport_breakpoint_t NOT NULL,
  min_width_px    INTEGER NOT NULL,
  max_width_px    INTEGER,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_viewport_profiles_uk
    UNIQUE (tenant_id, profile_code),
  CONSTRAINT ui_viewport_profiles_width_chk
    CHECK (
      min_width_px > 0 AND
      (max_width_px IS NULL OR max_width_px > min_width_px)
    )
);

COMMIT;

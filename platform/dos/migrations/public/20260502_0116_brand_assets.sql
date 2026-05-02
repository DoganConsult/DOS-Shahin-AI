-- dos:draft
-- =====================================================================
-- UI-OS — §11 Branding — assets, login/email/report/print branding  (20260502_0116)
--
-- Tables (5) — DKNF via dos.ui_brand_asset_kind_t / dos.ui_print_engine_t.
-- 3NF: login/email/report branding tables hold UUID FK to brand_assets, not
-- redundant url/asset_path columns.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_brand_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  asset_kind    dos.ui_brand_asset_kind_t NOT NULL,
  variant       VARCHAR(40) NOT NULL DEFAULT 'default',
  url           TEXT NOT NULL,
  mime_type     VARCHAR(150),
  width_px      INTEGER,
  height_px     INTEGER,
  size_bytes    BIGINT,
  checksum      VARCHAR(128),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    VARCHAR(64),
  updated_by    VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_brand_assets_uk
    UNIQUE (tenant_id, asset_kind, variant),
  CONSTRAINT ui_brand_assets_size_chk
    CHECK (size_bytes IS NULL OR size_bytes >= 0),
  CONSTRAINT ui_brand_assets_dim_chk
    CHECK (
      (width_px IS NULL OR width_px > 0) AND
      (height_px IS NULL OR height_px > 0)
    )
);

CREATE INDEX IF NOT EXISTS ix_ui_brand_assets_tenant
  ON dos.ui_brand_assets (tenant_id);

CREATE TABLE IF NOT EXISTS dos.ui_login_branding (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  hero_asset_id   UUID,
  logo_asset_id   UUID,
  welcome_text_key VARCHAR(150),
  support_link    TEXT,
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_login_branding_uk UNIQUE (tenant_id),
  CONSTRAINT ui_login_branding_hero_fk
    FOREIGN KEY (hero_asset_id) REFERENCES dos.ui_brand_assets(id) ON DELETE SET NULL,
  CONSTRAINT ui_login_branding_logo_fk
    FOREIGN KEY (logo_asset_id) REFERENCES dos.ui_brand_assets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dos.ui_email_branding (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  header_html   TEXT,
  footer_html   TEXT,
  accent_color  VARCHAR(20),
  logo_asset_id UUID,
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_email_branding_uk UNIQUE (tenant_id),
  CONSTRAINT ui_email_branding_logo_fk
    FOREIGN KEY (logo_asset_id) REFERENCES dos.ui_brand_assets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dos.ui_report_branding (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  cover_template_html TEXT,
  watermark_text      VARCHAR(150),
  watermark_asset_id  UUID,
  legal_footer        TEXT,
  config              JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_report_branding_uk UNIQUE (tenant_id),
  CONSTRAINT ui_report_branding_watermark_fk
    FOREIGN KEY (watermark_asset_id) REFERENCES dos.ui_brand_assets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dos.ui_print_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  template_key      VARCHAR(150) NOT NULL,
  engine            dos.ui_print_engine_t NOT NULL DEFAULT 'html',
  template_body     TEXT NOT NULL,
  default_locale    VARCHAR(20) NOT NULL DEFAULT 'en',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        VARCHAR(64),
  updated_by        VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_print_templates_uk
    UNIQUE (tenant_id, template_key, default_locale)
);

CREATE INDEX IF NOT EXISTS ix_ui_print_templates_tenant
  ON dos.ui_print_templates (tenant_id);

COMMIT;

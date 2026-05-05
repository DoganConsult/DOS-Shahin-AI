-- =============================================================================
-- Migration: 20260505_2000_tenant_configuration_defaults
-- Purpose:   Populate empty tenant configuration tables with enterprise-grade
--            defaults for the dogan tenant (and any other tenants with missing config).
--
-- Issue:     Several tenant configuration tables are empty (tenant_brand_tokens,
--            tenant_locales, ui_tenant_branding), leaving tenants without
--            explicit configuration even though they use platform defaults.
--
-- Fix:       Populate these tables with explicit defaults for all tenants to ensure
--            enterprise-grade configuration completeness.
--
-- Idempotent: YES — ON CONFLICT DO NOTHING for all inserts.
-- =============================================================================

BEGIN;

-- ─── 1. Populate tenant_locales with default en/ar locales ───────────────
INSERT INTO dos.tenant_locales (tenant_id, locale_code, is_default)
SELECT t.tenant_id, 'en', true
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_locales tl
  WHERE tl.tenant_id = t.tenant_id AND tl.locale_code = 'en'
)
ON CONFLICT (tenant_id, locale_code) DO NOTHING;

INSERT INTO dos.tenant_locales (tenant_id, locale_code, is_default)
SELECT t.tenant_id, 'ar', false
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_locales tl
  WHERE tl.tenant_id = t.tenant_id AND tl.locale_code = 'ar'
)
ON CONFLICT (tenant_id, locale_code) DO NOTHING;

-- ─── 2. Populate tenant_brand_tokens with platform default tokens ─────────
-- Using IBM Carbon Design System default color tokens
INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-interactive-01', '#0f62fe'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-interactive-01'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-interactive-02', '#6f6f6f'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-interactive-02'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-interactive-03', '#393939'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-interactive-03'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-ui-01', '#161616'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-ui-01'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-ui-02', '#525252'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-ui-02'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-ui-03', '#8d8d8d'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-ui-03'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-ui-04', '#f4f4f4'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-ui-04'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-ui-05', '#ffffff'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-ui-05'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-text-01', '#161616'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-text-01'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-text-02', '#525252'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-text-02'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-text-03', '#6f6f6f'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-text-03'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-text-04', '#a8a8a8'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-text-04'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-text-05', '#c6c6c6'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-text-05'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-link-01', '#0f62fe'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-link-01'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-link-02', '#6f6f6f'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-link-02'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-inverse-01', '#ffffff'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-inverse-01'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

INSERT INTO dos.tenant_brand_tokens (tenant_id, token_key, token_value)
SELECT t.tenant_id, '--cds-inverse-02', '#393939'
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_brand_tokens tbt
  WHERE tbt.tenant_id = t.tenant_id AND tbt.token_key = '--cds-inverse-02'
)
ON CONFLICT (tenant_id, token_key) DO NOTHING;

-- ─── 3. Populate ui_tenant_branding with default branding ───────────────────
INSERT INTO dos.ui_tenant_branding (tenant_id, brand_name, is_active)
SELECT t.tenant_id, t.tenant_id, true
FROM dos.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_tenant_branding utb
  WHERE utb.tenant_id = t.tenant_id AND utb.is_active = true
)
ON CONFLICT (tenant_id) DO UPDATE SET
  is_active = true,
  updated_at = now();

-- Self-assertion: ensure all tenants have locale and branding configured
DO $$
DECLARE
  missing_locales INTEGER;
  missing_branding INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_locales
  FROM dos.tenants t
  WHERE NOT EXISTS (
    SELECT 1 FROM dos.tenant_locales tl
    WHERE tl.tenant_id = t.tenant_id AND tl.locale_code = 'en'
  );
  IF missing_locales <> 0 THEN
    RAISE EXCEPTION 'tenant_configuration_defaults left % tenants without en locale', missing_locales;
  END IF;

  SELECT COUNT(*) INTO missing_branding
  FROM dos.tenants t
  WHERE NOT EXISTS (
    SELECT 1 FROM dos.ui_tenant_branding utb
    WHERE utb.tenant_id = t.tenant_id AND utb.is_active = true
  );
  IF missing_branding <> 0 THEN
    RAISE EXCEPTION 'tenant_configuration_defaults left % tenants without branding', missing_branding;
  END IF;
END $$;

COMMIT;

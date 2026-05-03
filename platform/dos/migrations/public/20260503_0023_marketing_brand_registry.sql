-- Phase M0 — Brand DNA + Marketing-OS foundation.
-- Owner: ui-os-service.
--
-- Adds two registry tables under the dos.* schema:
--   ① dos.marketing_brand_tokens   — per-brand semantic-token overrides
--      (mirrors brand-overlays.css; lets platform admins edit brand colour
--      semantics without a redeploy).
--   ② dos.marketing_brand_assets   — per-brand asset rows (eagle, wordmark,
--      lockup, favicon, og-image, hero-bg) consumed by
--      <dos-brand-eagle> + BrandResolverService.
--
-- Seeds the two M0 brand codes (shahin-ai, dogan-ai-os) with eagle-mark
-- placeholder SVGs, en/ar alt text, and required favicon + og-image rows.
-- The eagle SVG bodies are intentionally minimal placeholders — final art
-- is uploaded by the brand admin via the Config Center UI in Phase M0-T4.
--
-- Forward-only and idempotent:
--   ① CREATE TABLE IF NOT EXISTS for both registry tables.
--   ② INSERT … ON CONFLICT DO NOTHING for token + asset seed rows.
--
-- Carbon-only contract preserved:
--   These tables hold BRAND artefacts, not Carbon component rows. The
--   trg_carbon_only_runtime trigger only governs
--   dos.dynamic_ui_component_registry — brand assets are out of its scope
--   by design. Brand assets are referenced by <dos-brand-eagle>, which
--   is a DOS UI-system primitive (not a Carbon component).

BEGIN;

-- =====================================================================
-- 1. dos.marketing_brand_tokens — semantic-token override rows.
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.marketing_brand_tokens (
  brand_code   TEXT NOT NULL,
  token_key    TEXT NOT NULL,
  token_value  TEXT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   TEXT,
  CONSTRAINT marketing_brand_tokens_pk PRIMARY KEY (brand_code, token_key),
  CONSTRAINT marketing_brand_tokens_brand_chk
    CHECK (brand_code IN ('shahin-ai','dogan-ai-os')),
  CONSTRAINT marketing_brand_tokens_key_chk
    CHECK (token_key LIKE '--dos-%')
);

COMMENT ON TABLE dos.marketing_brand_tokens IS
  'M0 brand DNA — semantic-token overlays per brand. Mirrors brand-overlays.css.';

-- =====================================================================
-- 2. dos.marketing_brand_assets — per-brand asset rows.
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.marketing_brand_assets (
  id            BIGSERIAL PRIMARY KEY,
  brand_code    TEXT NOT NULL,
  asset_kind    TEXT NOT NULL,
  theme         TEXT NOT NULL DEFAULT 'light',
  locale        TEXT,            -- NULL = applies to all locales
  direction     TEXT,            -- NULL = applies to LTR + RTL
  source_kind   TEXT NOT NULL,   -- 'svg' | 'url'
  svg           TEXT,            -- populated when source_kind='svg'
  url           TEXT,            -- populated when source_kind='url'
  mime          TEXT,            -- populated when source_kind='url'
  width         INTEGER NOT NULL,
  height        INTEGER NOT NULL,
  alt_en        TEXT NOT NULL,
  alt_ar        TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_brand_assets_brand_chk
    CHECK (brand_code IN ('shahin-ai','dogan-ai-os')),
  CONSTRAINT marketing_brand_assets_kind_chk
    CHECK (asset_kind IN
      ('logo-eagle','logo-wordmark','logo-lockup','favicon','og-image','hero-bg')),
  CONSTRAINT marketing_brand_assets_theme_chk
    CHECK (theme IN ('light','dark','mono-light','mono-dark')),
  CONSTRAINT marketing_brand_assets_locale_chk
    CHECK (locale IS NULL OR locale IN ('en','ar')),
  CONSTRAINT marketing_brand_assets_dir_chk
    CHECK (direction IS NULL OR direction IN ('ltr','rtl')),
  CONSTRAINT marketing_brand_assets_source_chk
    CHECK (source_kind IN ('svg','url')),
  CONSTRAINT marketing_brand_assets_payload_chk
    CHECK (
      (source_kind = 'svg' AND svg IS NOT NULL)
   OR (source_kind = 'url' AND url IS NOT NULL AND mime IS NOT NULL)
    ),
  CONSTRAINT marketing_brand_assets_dims_chk
    CHECK (width > 0 AND height > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_brand_assets_match_uq
  ON dos.marketing_brand_assets
  (brand_code, asset_kind, theme,
   COALESCE(locale, ''), COALESCE(direction, ''))
  WHERE active = TRUE;

COMMENT ON TABLE dos.marketing_brand_assets IS
  'M0 brand DNA — per-brand asset rows resolved by BrandResolverService.';

-- =====================================================================
-- 3. Seed — Shahin-AI semantic tokens + assets.
-- =====================================================================
INSERT INTO dos.marketing_brand_tokens (brand_code, token_key, token_value) VALUES
  ('shahin-ai', '--dos-color-brand-primary',        '#0f1f3d'),
  ('shahin-ai', '--dos-color-brand-primary-strong', '#08152a'),
  ('shahin-ai', '--dos-color-brand-primary-soft',   '#1d3666'),
  ('shahin-ai', '--dos-color-brand-accent',         '#c9a14a'),
  ('shahin-ai', '--dos-color-brand-accent-strong',  '#a37e2c'),
  ('shahin-ai', '--dos-color-brand-accent-soft',    '#e6cd8c'),
  ('shahin-ai', '--dos-color-brand-on-primary',     '#ffffff'),
  ('shahin-ai', '--dos-color-brand-on-accent',      '#1a1a1a')
ON CONFLICT (brand_code, token_key) DO NOTHING;

INSERT INTO dos.marketing_brand_tokens (brand_code, token_key, token_value) VALUES
  ('dogan-ai-os', '--dos-color-brand-primary',        '#1a1f2c'),
  ('dogan-ai-os', '--dos-color-brand-primary-strong', '#0c111c'),
  ('dogan-ai-os', '--dos-color-brand-primary-soft',   '#2a3147'),
  ('dogan-ai-os', '--dos-color-brand-accent',         '#d98e2b'),
  ('dogan-ai-os', '--dos-color-brand-accent-strong',  '#b46f1c'),
  ('dogan-ai-os', '--dos-color-brand-accent-soft',    '#f0b87a'),
  ('dogan-ai-os', '--dos-color-brand-on-primary',     '#ffffff'),
  ('dogan-ai-os', '--dos-color-brand-on-accent',      '#1a1a1a')
ON CONFLICT (brand_code, token_key) DO NOTHING;

-- =====================================================================
-- 4. Seed — Shahin-AI brand assets (eagle + favicon + og-image).
--    Eagle bodies are minimal placeholders; final art uploaded via
--    the Config Center brand admin page in M0-T4.
-- =====================================================================
INSERT INTO dos.marketing_brand_assets
  (brand_code, asset_kind, theme, locale, direction, source_kind,
   svg, url, mime, width, height, alt_en, alt_ar, version)
VALUES
  -- Shahin eagle (light) — navy + gold pictogram placeholder.
  ('shahin-ai', 'logo-eagle', 'light', NULL, NULL, 'svg',
   '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">'
   '<path fill="#0f1f3d" d="M32 4 L60 30 L48 30 L48 56 L36 56 L36 38 L28 38 L28 56 L16 56 L16 30 L4 30 Z"/>'
   '<path fill="#c9a14a" d="M32 14 L52 30 L44 30 L44 32 L20 32 L20 30 L12 30 Z"/>'
   '</svg>',
   NULL, NULL, 64, 64,
   'Shahin AI eagle logo', 'شعار شاهين AI', 1),
  -- Shahin eagle (dark) — inverted contrast.
  ('shahin-ai', 'logo-eagle', 'dark', NULL, NULL, 'svg',
   '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">'
   '<path fill="#ffffff" d="M32 4 L60 30 L48 30 L48 56 L36 56 L36 38 L28 38 L28 56 L16 56 L16 30 L4 30 Z"/>'
   '<path fill="#c9a14a" d="M32 14 L52 30 L44 30 L44 32 L20 32 L20 30 L12 30 Z"/>'
   '</svg>',
   NULL, NULL, 64, 64,
   'Shahin AI eagle logo', 'شعار شاهين AI', 1),
  -- Shahin favicon.
  ('shahin-ai', 'favicon', 'light', NULL, NULL, 'svg',
   '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true">'
   '<rect width="32" height="32" fill="#0f1f3d"/>'
   '<path fill="#c9a14a" d="M16 6 L26 18 L20 18 L20 26 L12 26 L12 18 L6 18 Z"/>'
   '</svg>',
   NULL, NULL, 32, 32,
   'Shahin AI', 'شاهين AI', 1),
  -- Shahin OG image (placeholder URL — uploaded in M0-T4).
  ('shahin-ai', 'og-image', 'light', NULL, NULL, 'url',
   NULL, '/assets/brand/shahin-ai/og-image-1200x630.png', 'image/png',
   1200, 630,
   'Shahin AI — Agentic GRC platform',
   'شاهين AI — منصة الحوكمة والمخاطر والامتثال الوكيلية', 1)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 5. Seed — Dogan-AI-OS brand assets (eagle + favicon + og-image).
-- =====================================================================
INSERT INTO dos.marketing_brand_assets
  (brand_code, asset_kind, theme, locale, direction, source_kind,
   svg, url, mime, width, height, alt_en, alt_ar, version)
VALUES
  ('dogan-ai-os', 'logo-eagle', 'light', NULL, NULL, 'svg',
   '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">'
   '<path fill="#1a1f2c" d="M32 4 L60 30 L48 30 L48 56 L36 56 L36 38 L28 38 L28 56 L16 56 L16 30 L4 30 Z"/>'
   '<path fill="#d98e2b" d="M32 14 L52 30 L44 30 L44 32 L20 32 L20 30 L12 30 Z"/>'
   '</svg>',
   NULL, NULL, 64, 64,
   'Dogan AI-OS eagle logo', 'شعار دوجان AI-OS', 1),
  ('dogan-ai-os', 'logo-eagle', 'dark', NULL, NULL, 'svg',
   '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">'
   '<path fill="#ffffff" d="M32 4 L60 30 L48 30 L48 56 L36 56 L36 38 L28 38 L28 56 L16 56 L16 30 L4 30 Z"/>'
   '<path fill="#d98e2b" d="M32 14 L52 30 L44 30 L44 32 L20 32 L20 30 L12 30 Z"/>'
   '</svg>',
   NULL, NULL, 64, 64,
   'Dogan AI-OS eagle logo', 'شعار دوجان AI-OS', 1),
  ('dogan-ai-os', 'favicon', 'light', NULL, NULL, 'svg',
   '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true">'
   '<rect width="32" height="32" fill="#1a1f2c"/>'
   '<path fill="#d98e2b" d="M16 6 L26 18 L20 18 L20 26 L12 26 L12 18 L6 18 Z"/>'
   '</svg>',
   NULL, NULL, 32, 32,
   'Dogan AI-OS', 'دوجان AI-OS', 1),
  ('dogan-ai-os', 'og-image', 'light', NULL, NULL, 'url',
   NULL, '/assets/brand/dogan-ai-os/og-image-1200x630.png', 'image/png',
   1200, 630,
   'Dogan AI-OS — Operating system for agentic enterprises',
   'دوجان AI-OS — نظام التشغيل للمؤسسات الوكيلية', 1)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 6. Sanity guard — every brand has its required asset trio.
-- =====================================================================
DO $$
DECLARE
  required_kinds TEXT[] := ARRAY['logo-eagle','favicon','og-image'];
  brand TEXT;
  kind TEXT;
  cnt INTEGER;
BEGIN
  FOREACH brand IN ARRAY ARRAY['shahin-ai','dogan-ai-os'] LOOP
    FOREACH kind IN ARRAY required_kinds LOOP
      SELECT count(*) INTO cnt
      FROM dos.marketing_brand_assets
      WHERE brand_code = brand AND asset_kind = kind AND active = TRUE;
      IF cnt = 0 THEN
        RAISE EXCEPTION '[brand-registry] brand "%" missing required asset "%"', brand, kind;
      END IF;
    END LOOP;
  END LOOP;
END $$;

COMMIT;

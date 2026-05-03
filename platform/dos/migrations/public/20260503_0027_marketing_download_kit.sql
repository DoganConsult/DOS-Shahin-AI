-- 20260503_0027_marketing_download_kit.sql
-- Owner: ui-os-service.
--
-- Phase M1.5 — Download-Kit system for the public marketing landing.
--
-- Adds:
--   ① 3 component_keys in dos.dynamic_ui_component_registry:
--        marketing.download-kit-card    → carbon_key='tiles'
--        marketing.gated-download-modal → carbon_key='modal'
--        marketing.download-success     → carbon_key='notification'
--      (each vendor='ibm-carbon', approval_status='approved' — Carbon-only
--      contract preserved; trg_carbon_only_runtime untouched).
--   ② dos.marketing_assets — registry of downloadable PDFs (asset_key,
--      brand_code, locale, title, description, asset_type, file_url,
--      thumbnail_url, is_gated, version, approval_status, published_at).
--   ③ dos.marketing_download_events — append-only event sink for the
--      three CTA events (opened/submitted/completed). Lives in dos schema
--      because it is platform-level, NOT tenant-bound.
--   ④ Seeds three first kits (en + ar):
--        shahin-executive-overview  (gated)
--        grc-readiness-checklist    (open)
--        security-trust-pack        (gated)
--
-- Forward-only and idempotent.

BEGIN;

-- =====================================================================
-- 1. Component-registry rows (Carbon-backed).
-- =====================================================================
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('marketing.download-kit-card',    'ibm-carbon', 'tiles',        'approved'),
  ('marketing.gated-download-modal', 'ibm-carbon', 'modal',        'approved'),
  ('marketing.download-success',     'ibm-carbon', 'notification', 'approved')
ON CONFLICT (component_key) DO NOTHING;

-- =====================================================================
-- 2. dos.marketing_assets — downloadable file registry.
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.marketing_assets (
  asset_key        TEXT NOT NULL,
  brand_code       TEXT NOT NULL,
  locale           TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  asset_type       TEXT NOT NULL,        -- pdf | xlsx | pptx | zip
  file_url         TEXT NOT NULL,
  thumbnail_url    TEXT,
  is_gated         BOOLEAN NOT NULL DEFAULT FALSE,
  version          INT NOT NULL DEFAULT 1,
  approval_status  TEXT NOT NULL DEFAULT 'approved',
  published_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_assets_pk PRIMARY KEY (asset_key, brand_code, locale),
  CONSTRAINT marketing_assets_brand_chk
    CHECK (brand_code IN ('shahin-ai','dogan-ai-os')),
  CONSTRAINT marketing_assets_locale_chk
    CHECK (locale IN ('en','ar')),
  CONSTRAINT marketing_assets_type_chk
    CHECK (asset_type IN ('pdf','xlsx','pptx','zip')),
  CONSTRAINT marketing_assets_approval_chk
    CHECK (approval_status IN ('draft','approved','retired'))
);

COMMENT ON TABLE dos.marketing_assets IS
  'M1.5 — registry of downloadable marketing kits. Public read.';

-- =====================================================================
-- 3. dos.marketing_download_events — CTA event sink.
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.marketing_download_events (
  id            BIGSERIAL PRIMARY KEY,
  event_key     TEXT NOT NULL,           -- opened | submitted | completed
  asset_key     TEXT NOT NULL,
  brand_code    TEXT NOT NULL,
  locale        TEXT NOT NULL,
  email         TEXT,
  company       TEXT,
  job_title     TEXT,
  country       TEXT,
  interest_area TEXT,
  user_agent    TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_download_events_event_chk
    CHECK (event_key IN ('marketing.download.opened',
                         'marketing.download.submitted',
                         'marketing.download.completed'))
);
CREATE INDEX IF NOT EXISTS marketing_download_events_asset_idx
  ON dos.marketing_download_events (asset_key, occurred_at DESC);

COMMENT ON TABLE dos.marketing_download_events IS
  'M1.5 — append-only event sink for download CTA telemetry.';

-- =====================================================================
-- 4. Seed first 3 kits × 2 locales = 6 rows.
-- =====================================================================
INSERT INTO dos.marketing_assets
  (asset_key, brand_code, locale, title, description, asset_type,
   file_url, thumbnail_url, is_gated, version, approval_status)
VALUES
  -- Executive Overview (gated)
  ('shahin-executive-overview','shahin-ai','en',
    'Shahin-AI Executive Overview',
    'A concise pack for executives evaluating AI-native GRC.',
    'pdf', '/assets/marketing/shahin-ai/shahin-executive-overview-en.pdf', NULL,
    TRUE, 1, 'approved'),
  ('shahin-executive-overview','shahin-ai','ar',
    'نظرة تنفيذية على شاهين',
    'حزمة موجزة للمسؤولين التنفيذيين الذين يقيّمون منصة الحوكمة المدفوعة بالذكاء الاصطناعي.',
    'pdf', '/assets/marketing/shahin-ai/shahin-executive-overview-ar.pdf', NULL,
    TRUE, 1, 'approved'),
  -- GRC Readiness Checklist (open)
  ('grc-readiness-checklist','shahin-ai','en',
    'GRC Readiness Checklist',
    'A practical checklist to assess your GRC programme readiness.',
    'pdf', '/assets/marketing/shahin-ai/grc-readiness-checklist-en.pdf', NULL,
    FALSE, 1, 'approved'),
  ('grc-readiness-checklist','shahin-ai','ar',
    'قائمة جاهزية الحوكمة والمخاطر والامتثال',
    'قائمة عملية لتقييم جاهزية برنامج الحوكمة لديك.',
    'pdf', '/assets/marketing/shahin-ai/grc-readiness-checklist-ar.pdf', NULL,
    FALSE, 1, 'approved'),
  -- Security & Trust Pack (gated)
  ('security-trust-pack','shahin-ai','en',
    'Security & Trust Pack',
    'Architecture, data residency, controls, and audit posture.',
    'pdf', '/assets/marketing/shahin-ai/security-trust-pack-en.pdf', NULL,
    TRUE, 1, 'approved'),
  ('security-trust-pack','shahin-ai','ar',
    'حزمة الأمن والثقة',
    'الهندسة المعمارية وموقع البيانات والضوابط ووضع التدقيق.',
    'pdf', '/assets/marketing/shahin-ai/security-trust-pack-ar.pdf', NULL,
    TRUE, 1, 'approved')
ON CONFLICT (asset_key, brand_code, locale) DO NOTHING;

-- =====================================================================
-- 5. Sanity guard.
-- =====================================================================
DO $$
DECLARE
  expected TEXT[] := ARRAY[
    'marketing.download-kit-card',
    'marketing.gated-download-modal',
    'marketing.download-success'
  ];
  cnt INT;
BEGIN
  SELECT count(*) INTO cnt
    FROM dos.dynamic_ui_component_registry
   WHERE component_key = ANY(expected)
     AND vendor = 'ibm-carbon' AND approval_status = 'approved';
  IF cnt < array_length(expected,1) THEN
    RAISE EXCEPTION '[m1.5] download-kit registry rows missing: have %, want %',
      cnt, array_length(expected,1);
  END IF;

  SELECT count(*) INTO cnt FROM dos.marketing_assets WHERE active = TRUE;
  IF cnt < 6 THEN
    RAISE EXCEPTION '[m1.5] expected >=6 marketing_assets rows (3 kits × en+ar), have %', cnt;
  END IF;
END $$;

COMMIT;

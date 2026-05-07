-- 20260512_0900_foundation_route_i18n_columns_backfill.sql
--
-- Foundation Shell + Route Contract Recovery — Phase 7 (i18n / RTL contract)
--
-- Goal: Make the locale-aware UI-OS resolver return Arabic copy for the
-- canonical Foundation routes by populating the typed *_en / *_ar
-- columns on dos.ui_route_template_binding. Without these columns the
-- resolver pickStr() helper has nothing to flip on `locale=ar`, and the
-- browser receives English even when the user is in Arabic mode — a
-- Phase 7 acceptance violation.
--
-- This migration is forward-only and idempotent. It does NOT delete any
-- existing data, does NOT add fallback constants in code, and does NOT
-- introduce tables. Every value seeded here lives in the DB so the
-- frontend never invents Arabic copy.
--
-- Steps:
--   1. Backfill subtitle_en / eyebrow_en from props->>'subtitle' /
--      props->>'eyebrow' for any foundation route where the typed
--      columns are blank but the props JSON already carries the value.
--   2. Seed Arabic translations (title_ar, subtitle_ar, eyebrow_ar)
--      for the 4 user-mandated deep-check routes:
--         /foundation/overview
--         /foundation/access-review
--         /foundation/delegations
--         /foundation/users
--      Only fills empties (NULL / '') — never overwrites existing
--      Arabic copy.
--   3. Re-asserts version bump so consumers invalidate caches.

BEGIN;

-- ── 1. Backfill EN typed columns from props ───────────────────────────
UPDATE dos.ui_route_template_binding
   SET subtitle_en = COALESCE(NULLIF(subtitle_en, ''), props->>'subtitle'),
       eyebrow_en  = COALESCE(NULLIF(eyebrow_en, ''),  props->>'eyebrow'),
       title_en    = COALESCE(NULLIF(title_en, ''),    props->>'title')
 WHERE route LIKE '/foundation/%'
   AND (
        (subtitle_en IS NULL OR subtitle_en = '') AND props->>'subtitle' IS NOT NULL
     OR (eyebrow_en  IS NULL OR eyebrow_en  = '') AND props->>'eyebrow'  IS NOT NULL
     OR (title_en    IS NULL OR title_en    = '') AND props->>'title'    IS NOT NULL
   );

-- ── 2. Seed Arabic translations for the deep-check routes ────────────
-- /foundation/overview
UPDATE dos.ui_route_template_binding
   SET subtitle_ar = COALESCE(NULLIF(subtitle_ar, ''),
         'هيكل المؤسسة وحوكمة الوصول والوضع التشغيلي.'),
       eyebrow_ar  = COALESCE(NULLIF(eyebrow_ar, ''),  'المؤسسة'),
       title_ar    = COALESCE(NULLIF(title_ar, ''),    'نظرة عامة على المؤسسة'),
       version     = GREATEST(version, 0) + 1
 WHERE route = '/foundation/overview';

-- /foundation/access-review
UPDATE dos.ui_route_template_binding
   SET subtitle_ar = COALESCE(NULLIF(subtitle_ar, ''),
         'تقدم حملات مراجعة الوصول الدورية والتصديقات.'),
       eyebrow_ar  = COALESCE(NULLIF(eyebrow_ar, ''),  'المؤسسة'),
       title_ar    = COALESCE(NULLIF(title_ar, ''),    'مراجعة الصلاحيات'),
       version     = GREATEST(version, 0) + 1
 WHERE route = '/foundation/access-review';

-- /foundation/delegations
UPDATE dos.ui_route_template_binding
   SET subtitle_ar = COALESCE(NULLIF(subtitle_ar, ''),
         'قواعد التفويض النشطة وتواريخ انتهائها.'),
       eyebrow_ar  = COALESCE(NULLIF(eyebrow_ar, ''),  'المؤسسة'),
       title_ar    = COALESCE(NULLIF(title_ar, ''),    'التفويضات'),
       version     = GREATEST(version, 0) + 1
 WHERE route = '/foundation/delegations';

-- /foundation/users
UPDATE dos.ui_route_template_binding
   SET subtitle_ar = COALESCE(NULLIF(subtitle_ar, ''),
         'دليل المستخدمين النشطين وملكية الحسابات.'),
       eyebrow_ar  = COALESCE(NULLIF(eyebrow_ar, ''),  'المؤسسة'),
       title_ar    = COALESCE(NULLIF(title_ar, ''),    'المستخدمون'),
       version     = GREATEST(version, 0) + 1
 WHERE route = '/foundation/users';

-- ── 3. Validation assertion (fails the migration on missing rows) ────
DO $$
DECLARE
  missing_count INT;
BEGIN
  SELECT COUNT(*) INTO missing_count
    FROM (VALUES
      ('/foundation/overview'),
      ('/foundation/access-review'),
      ('/foundation/delegations'),
      ('/foundation/users')
    ) AS r(route)
   WHERE NOT EXISTS (
     SELECT 1 FROM dos.ui_route_template_binding b
      WHERE b.route = r.route
        AND COALESCE(b.subtitle_ar, '') <> ''
        AND COALESCE(b.title_ar,    '') <> ''
        AND COALESCE(b.eyebrow_ar,  '') <> ''
   );
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'foundation route i18n backfill: % deep-check routes missing Arabic copy', missing_count;
  END IF;
END $$;

COMMIT;

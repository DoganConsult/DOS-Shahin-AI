-- =====================================================================
-- 0120 DOWN — drop masthead columns from dos.ui_route_template_binding.
-- =====================================================================
BEGIN;

ALTER TABLE dos.ui_route_template_binding
  DROP COLUMN IF EXISTS title_en,
  DROP COLUMN IF EXISTS title_ar,
  DROP COLUMN IF EXISTS subtitle_en,
  DROP COLUMN IF EXISTS subtitle_ar,
  DROP COLUMN IF EXISTS eyebrow_en,
  DROP COLUMN IF EXISTS eyebrow_ar,
  DROP COLUMN IF EXISTS ai_headline_en,
  DROP COLUMN IF EXISTS ai_headline_ar,
  DROP COLUMN IF EXISTS status_tags,
  DROP COLUMN IF EXISTS primary_action;

COMMIT;

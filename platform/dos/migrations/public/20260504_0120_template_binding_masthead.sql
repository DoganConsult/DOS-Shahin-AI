-- =====================================================================
-- 0120 — Template-binding masthead columns
--
-- Phase F-F7-2 — adds bilingual masthead source-of-truth columns to
-- `dos.ui_route_template_binding` so the resolver can synthesise a
-- populated header for every template-driven route. The
-- DynamicTemplatePageComponent host (patched in the same wave) reads
-- the resolver-derived `props.masthead` object and pushes its scalar
-- fields onto the template @Input setters (title, subtitle, eyebrow,
-- aiHeadline, statusTags, primaryAction).
--
-- Effect (idempotent, forward-only):
--   * Add 9 nullable columns (title_en, title_ar, subtitle_en,
--     subtitle_ar, eyebrow_en, eyebrow_ar, ai_headline_en,
--     ai_headline_ar) + 2 jsonb columns (status_tags, primary_action).
--   * Bump `version` and re-run `trg_bump_ui_route_template_version`
--     trigger when a row is updated downstream.
--
-- No row is migrated here; bilingual content lands in 0130.
-- =====================================================================
BEGIN;

ALTER TABLE dos.ui_route_template_binding
  ADD COLUMN IF NOT EXISTS title_en        text,
  ADD COLUMN IF NOT EXISTS title_ar        text,
  ADD COLUMN IF NOT EXISTS subtitle_en     text,
  ADD COLUMN IF NOT EXISTS subtitle_ar     text,
  ADD COLUMN IF NOT EXISTS eyebrow_en      text,
  ADD COLUMN IF NOT EXISTS eyebrow_ar      text,
  ADD COLUMN IF NOT EXISTS ai_headline_en  text,
  ADD COLUMN IF NOT EXISTS ai_headline_ar  text,
  ADD COLUMN IF NOT EXISTS status_tags     jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS primary_action  jsonb;

COMMENT ON COLUMN dos.ui_route_template_binding.title_en       IS 'Masthead H1 (en) — projected to props.masthead.title';
COMMENT ON COLUMN dos.ui_route_template_binding.title_ar       IS 'Masthead H1 (ar) — projected to props.masthead.title';
COMMENT ON COLUMN dos.ui_route_template_binding.subtitle_en    IS 'Masthead subtitle (en)';
COMMENT ON COLUMN dos.ui_route_template_binding.subtitle_ar    IS 'Masthead subtitle (ar)';
COMMENT ON COLUMN dos.ui_route_template_binding.eyebrow_en     IS 'Masthead breadcrumb eyebrow (en)';
COMMENT ON COLUMN dos.ui_route_template_binding.eyebrow_ar     IS 'Masthead breadcrumb eyebrow (ar)';
COMMENT ON COLUMN dos.ui_route_template_binding.ai_headline_en IS 'Inline cds-ai-label headline (en)';
COMMENT ON COLUMN dos.ui_route_template_binding.ai_headline_ar IS 'Inline cds-ai-label headline (ar)';
COMMENT ON COLUMN dos.ui_route_template_binding.status_tags    IS 'Array of {label,severity} surfacing as cds-tag chips.';
COMMENT ON COLUMN dos.ui_route_template_binding.primary_action IS '{label, route, permission?} object surfacing as cdsButton.';

COMMIT;

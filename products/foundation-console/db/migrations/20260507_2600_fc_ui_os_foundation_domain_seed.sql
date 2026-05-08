-- F10 — Foundation Console domain page surfaces seed for path '/'.
-- Idempotent. Safe re-run.
-- Doctrine:
--   - DB stays snake_case. Resolver normalizes to camelCase before emit.
--   - Every seeded component_key MUST be in F10 FC_APPROVED_COMPONENT_KEYS.
--   - Replaces the F9 placeholder welcome surface with real Foundation domain surfaces.
--   - tenant_id '*' is the public/default tenant scope.

BEGIN;

-- Drop the F9 placeholder welcome surface; F10 publishes real domain surfaces in its place.
DELETE FROM fc_ui_os.page_surfaces
 WHERE tenant_id = '*'
   AND product_code = 'foundation-console'
   AND page_id = 'fc.page.home'
   AND surface_id = 'fc.page.home.surface.welcome';

-- Refresh page metadata for /
INSERT INTO fc_ui_os.pages
  (id, tenant_id, product_code, path, title_i18n_key, title_fallback, perms_required, enabled, version)
VALUES
  ('fc.page.home', '*', 'foundation-console', '/',
   'fc.page.home.title', 'Foundation Console', '{}'::text[], true, 2)
ON CONFLICT (tenant_id, product_code, id) DO UPDATE
  SET path           = EXCLUDED.path,
      title_i18n_key = EXCLUDED.title_i18n_key,
      title_fallback = EXCLUDED.title_fallback,
      perms_required = EXCLUDED.perms_required,
      enabled        = EXCLUDED.enabled,
      version        = EXCLUDED.version,
      updated_at     = now();

-- Real Foundation domain surfaces for path '/'.
-- All component_key values are within F10 FC_APPROVED_COMPONENT_KEYS.
INSERT INTO fc_ui_os.page_surfaces
  (tenant_id, product_code, page_id, surface_id, slot_key, position, enabled, version,
   component_key, component_type, renderer_key, carbon_key, perms_required, props)
VALUES
  ('*', 'foundation-console', 'fc.page.home',
   'fc.page.home.surface.heading', 'page.main', 0, true, 1,
   'foundation.section.heading', 'visual', 'fc.renderer.sectionHeading', NULL, '{}'::text[],
   '{"title":"Foundation Console","subtitle":"Operational overview","level":1}'::jsonb),

  ('*', 'foundation-console', 'fc.page.home',
   'fc.page.home.surface.dashboard', 'page.main', 10, true, 1,
   'foundation.dashboard.summary', 'visual', 'fc.renderer.dashboardSummary', NULL, '{}'::text[],
   '{"title":"Summary","metrics":[]}'::jsonb),

  ('*', 'foundation-console', 'fc.page.home',
   'fc.page.home.surface.recentHeading', 'page.main', 20, true, 1,
   'foundation.section.heading', 'visual', 'fc.renderer.sectionHeading', NULL, '{}'::text[],
   '{"title":"Recent activity","level":2}'::jsonb),

  ('*', 'foundation-console', 'fc.page.home',
   'fc.page.home.surface.recentList', 'page.main', 30, true, 1,
   'foundation.list.simple', 'visual', 'fc.renderer.listSimple', NULL, '{}'::text[],
   '{"items":[],"emptyMessage":"No recent activity yet."}'::jsonb)
ON CONFLICT (tenant_id, product_code, page_id, surface_id) DO UPDATE
  SET slot_key       = EXCLUDED.slot_key,
      position       = EXCLUDED.position,
      enabled        = EXCLUDED.enabled,
      version        = EXCLUDED.version,
      component_key  = EXCLUDED.component_key,
      component_type = EXCLUDED.component_type,
      renderer_key   = EXCLUDED.renderer_key,
      carbon_key     = EXCLUDED.carbon_key,
      perms_required = EXCLUDED.perms_required,
      props          = EXCLUDED.props,
      updated_at     = now();

-- ── Validation ───────────────────────────────────────────────────────
DO $$
DECLARE
  surfaces_count int;
  unapproved_count int;
BEGIN
  SELECT count(*) INTO surfaces_count
    FROM fc_ui_os.page_surfaces
   WHERE tenant_id='*' AND product_code='foundation-console' AND page_id='fc.page.home' AND enabled=true;
  IF surfaces_count < 4 THEN
    RAISE EXCEPTION 'F10 seed: page_surfaces<4 (got %)', surfaces_count;
  END IF;

  SELECT count(*) INTO unapproved_count
    FROM fc_ui_os.page_surfaces
   WHERE tenant_id='*' AND product_code='foundation-console' AND page_id='fc.page.home' AND enabled=true
     AND component_key NOT IN (
       'workspace.shell','workspace.header','workspace.sidebar','workspace.content',
       'workspace.navGroup','workspace.navItem','workspace.surface','workspace.emptyState',
       'workspace.diagnostic','workspace.loading','workspace.error',
       'foundation.section.heading','foundation.tile.metric','foundation.list.simple','foundation.dashboard.summary'
     );
  IF unapproved_count > 0 THEN
    RAISE EXCEPTION 'F10 seed: % unapproved component_key rows present', unapproved_count;
  END IF;
END
$$;

COMMIT;

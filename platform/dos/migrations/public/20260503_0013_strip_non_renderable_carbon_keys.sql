-- =====================================================================
-- 0013 — Strip non-renderable Carbon catalog rows from the runtime registry.
--
-- Background: closure-migration-0010 backfilled one
-- dos.dynamic_ui_component_registry row per Angular-usable
-- dos.ui_carbon_components row. That bucket included Sass/asset/theme/
-- utility packages (carbon.icons.angular, carbon.pictograms, asset.*,
-- theme.*, common, i18n, utils, forms, layout, experimental, placeholder)
-- that have NO renderable <cds-*> Angular element. Keeping them in the
-- runtime registry forces a CarbonCatalogPlaceholderRenderer fallback,
-- which violates the platform rule
--   "every carbon_key must resolve to a real renderer; no silent fallback".
--
-- Fix: delete only those non-renderable registry rows. The catalog
-- (dos.ui_carbon_components) is left untouched — these rows still exist
-- as catalog references, they simply stop being routable runtime
-- components.
--
-- No deletes happen for:
--   * any registry row used by dos.dynamic_ui_routes
--   * any reusable platform-owned `module.*` row from migration 0012
--   * any vendor/approval row managed elsewhere
-- =====================================================================
BEGIN;

-- Defensive: never delete a row referenced by a route.
DELETE FROM dos.dynamic_ui_component_registry r
 WHERE r.carbon_key IN (
   -- Sass / utility / asset / theme packages — no Carbon Angular element.
   'asset.charts','asset.colors','asset.elements','asset.feature-flags',
   'asset.grid','asset.icon-helpers','asset.icons','asset.layout',
   'asset.motion','asset.styles','asset.themes','asset.type','asset.utils-position',
   'theme','theme.g10','theme.g100','theme.g90','theme.white',
   'carbon.icons.angular','carbon.pictograms',
   'common','experimental','forms','i18n','layout','placeholder','utils'
 )
   AND NOT EXISTS (
     SELECT 1 FROM dos.dynamic_ui_routes rt
      WHERE rt.component_key = r.component_key
   )
   AND r.component_key NOT LIKE 'module.%';

COMMIT;

-- =====================================================================
-- Validation (read-only). After apply, expect:
--   * 0 registry rows whose carbon_key is in the strip-list above and
--     whose component_key is unreferenced.
--   * dos.ui_carbon_components row count UNCHANGED (catalog is intact).
-- =====================================================================

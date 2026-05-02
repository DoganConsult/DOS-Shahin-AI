-- =====================================================================
-- 0154 — Catalog the remaining IBM Carbon token + utility packages.
--
-- These are framework-agnostic IBM Carbon packages (sass tokens, helpers,
-- meta-bundles, positioning utils, feature-flag system) that are part of
-- the Carbon Design System ecosystem and are now installed in
-- products/shahin-ai/app, but were never catalogued in
-- dos.ui_carbon_components.
--
-- 12 new asset-package rows added (raw IBM Carbon, no wrappers):
--
--   Tokens (8 — already installed, just catalogued):
--     1.  @carbon/colors        — color tokens
--     2.  @carbon/grid          — 12/16-column grid
--     3.  @carbon/layout        — spacing/breakpoint tokens
--     4.  @carbon/motion        — easing/duration tokens
--     5.  @carbon/styles        — sass entry point
--     6.  @carbon/themes        — light/dark/g10/g90/g100 themes
--     7.  @carbon/type          — IBM Plex type scale
--     8.  @carbon/icons         — raw SVG sources (companion to @carbon/icons-angular)
--
--   Utilities/helpers (4 — newly installed via 0154):
--     9.  @carbon/feature-flags — per-feature opt-in flag system
--     10. @carbon/icon-helpers  — icon prop/attr helpers
--     11. @carbon/elements      — meta-bundle of all token packages
--     12. @carbon/utils-position — popover/tooltip positioning math
--
-- All rows: vendor='ibm-carbon', integration_mode='asset-package',
-- runtime_status='active', angular_native=TRUE (consumable from Angular
-- via sass/ts imports), wrapper_required=FALSE (no UI surface to wrap),
-- dynamic_ui_allowed=FALSE (not Dynamic-UI renderable — they back
-- design tokens / utilities consumed by other catalog rows).
-- =====================================================================
BEGIN;

INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, vendor, notes)
VALUES
  ('asset.colors',         '@carbon/colors',         '11.51.0', '@carbon/colors',         'utility', FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'Carbon color tokens (sass + JS). Backs every theme/token surface; no per-color rows.'),
  ('asset.grid',           '@carbon/grid',           '11.54.0', '@carbon/grid',           'layout',  FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'Carbon 12/16-column grid (sass). Consumed via [class*=cds--col].'),
  ('asset.layout',         '@carbon/layout',         '11.52.0', '@carbon/layout',         'layout',  FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'Spacing + breakpoint tokens (sass + JS).'),
  ('asset.motion',         '@carbon/motion',         '11.45.0', '@carbon/motion',         'utility', FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'Easing/duration motion tokens.'),
  ('asset.styles',         '@carbon/styles',         '1.105.0', '@carbon/styles',         'utility', FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'Top-level sass entry point shipping all Carbon component styles.'),
  ('asset.themes',         '@carbon/themes',         '11.72.0', '@carbon/themes',         'utility', FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'Light/dark/g10/g90/g100 theme tokens.'),
  ('asset.type',           '@carbon/type',           '11.58.0', '@carbon/type',           'utility', FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'IBM Plex type scale tokens (sass + JS).'),
  ('asset.icons',          '@carbon/icons',          '11.79.0', '@carbon/icons',          'utility', FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'Raw SVG icon sources. Companion to @carbon/icons-angular; consume via DosCarbonIconComponent allowlist.'),
  ('asset.feature-flags',  '@carbon/feature-flags',  '1.3.0',   '@carbon/feature-flags',  'utility', FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'Per-feature opt-in flag system (sass + JS). Used to enable canary Carbon component variants.'),
  ('asset.icon-helpers',   '@carbon/icon-helpers',   '10.75.0', '@carbon/icon-helpers',   'utility', FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'Icon prop/attribute helpers shared by every Carbon icon binding.'),
  ('asset.elements',       '@carbon/elements',       '11.88.0', '@carbon/elements',       'utility', FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'Meta-bundle of @carbon/colors+grid+layout+motion+themes+type+icons.'),
  ('asset.utils-position', '@carbon/utils-position', '1.3.0',   '@carbon/utils-position', 'utility', FALSE, TRUE, 'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon', 'Floating-element positioning math used by popover/tooltip/menu.')
ON CONFLICT (carbon_key) DO UPDATE
   SET package_name          = EXCLUDED.package_name,
       package_version       = EXCLUDED.package_version,
       source_component_name = EXCLUDED.source_component_name,
       category              = EXCLUDED.category,
       integration_mode      = EXCLUDED.integration_mode,
       runtime_status        = EXCLUDED.runtime_status,
       angular_native        = EXCLUDED.angular_native,
       wrapper_required      = EXCLUDED.wrapper_required,
       stability             = EXCLUDED.stability,
       dynamic_ui_allowed    = EXCLUDED.dynamic_ui_allowed,
       vendor                = EXCLUDED.vendor,
       notes                 = EXCLUDED.notes,
       is_active             = TRUE;

-- Post-flight: catalog now spans 20 IBM Carbon packages.
DO $$
DECLARE
  n_total       INTEGER;
  n_pkgs        INTEGER;
  n_non_ibm     INTEGER;
BEGIN
  SELECT COUNT(*)               INTO n_total FROM dos.ui_carbon_components;
  SELECT COUNT(DISTINCT package_name) INTO n_pkgs  FROM dos.ui_carbon_components;
  SELECT COUNT(*)               INTO n_non_ibm FROM dos.ui_carbon_components WHERE vendor <> 'ibm-carbon';

  IF n_total < 230 THEN RAISE EXCEPTION '0154: total catalog rows below 230 (got %)', n_total; END IF;
  IF n_pkgs  < 20  THEN RAISE EXCEPTION '0154: distinct packages below 20 (got %)', n_pkgs; END IF;
  IF n_non_ibm <> 0 THEN RAISE EXCEPTION '0154: non-IBM rows present (got %)', n_non_ibm; END IF;

  RAISE NOTICE 'CATALOG EXPANDED: total=% distinct_packages=% non_ibm=%', n_total, n_pkgs, n_non_ibm;
END $$;

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0154_carbon_token_utility_packages.sql', 'inline-0154', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations
    WHERE filename = '20260502_0154_carbon_token_utility_packages.sql'
 );

COMMIT;

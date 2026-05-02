-- 0153 — Add @carbon/themes (4 named theme variants).
--
-- Source: carbondesignsystem.com/guidelines/themes — Carbon ships exactly
-- four canonical color themes. Per rule #8, asset packages are catalogued
-- at package level, but themes are nameable + enumerable (unlike 2,392
-- icons), so each named theme gets its own row for runtime selection.
--
-- All four are 'asset-package' / 'utility' / 'active' — they ship as CSS
-- token bundles consumed via @carbon/styles + DosCarbonThemeProvider.
-- =====================================================================
BEGIN;

INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, notes)
VALUES
  ('theme.white', '@carbon/themes', '11.72.0', 'WhiteTheme',
     'utility', FALSE, TRUE,
     'asset-package', 'active', TRUE, FALSE,
     'stable', TRUE,
     'Light theme — white background. Activate via documentElement.dataset.carbonTheme="white" or @include theme($white) in SCSS.'),
  ('theme.g10', '@carbon/themes', '11.72.0', 'G10Theme',
     'utility', FALSE, TRUE,
     'asset-package', 'active', TRUE, FALSE,
     'stable', TRUE,
     'Light theme — gray-10 background. Activate via documentElement.dataset.carbonTheme="g10" or @include theme($g10).'),
  ('theme.g90', '@carbon/themes', '11.72.0', 'G90Theme',
     'utility', FALSE, TRUE,
     'asset-package', 'active', TRUE, FALSE,
     'stable', TRUE,
     'Dark theme — gray-90 background. Activate via documentElement.dataset.carbonTheme="g90" or @include theme($g90).'),
  ('theme.g100', '@carbon/themes', '11.72.0', 'G100Theme',
     'utility', FALSE, TRUE,
     'asset-package', 'active', TRUE, FALSE,
     'stable', TRUE,
     'Dark theme — black background. Activate via documentElement.dataset.carbonTheme="g100" or @include theme($g100).')
ON CONFLICT (carbon_key) DO UPDATE
  SET package_name        = EXCLUDED.package_name,
      package_version     = EXCLUDED.package_version,
      source_component_name = EXCLUDED.source_component_name,
      category            = EXCLUDED.category,
      integration_mode    = EXCLUDED.integration_mode,
      runtime_status      = EXCLUDED.runtime_status,
      angular_native      = EXCLUDED.angular_native,
      wrapper_required    = EXCLUDED.wrapper_required,
      stability           = EXCLUDED.stability,
      dynamic_ui_allowed  = EXCLUDED.dynamic_ui_allowed,
      notes               = EXCLUDED.notes,
      is_active           = TRUE;

DO $$
DECLARE n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM dos.ui_carbon_components WHERE package_name='@carbon/themes';
  IF n < 4 THEN
    RAISE EXCEPTION '0153: themes catalog drift — got %, want >= 4 (named themes: white/g10/g90/g100)', n;
  END IF;
  -- Optional pre-existing asset.themes package-meta row may coexist
  -- with the 4 named theme variants; both rows are valid.
  RAISE NOTICE 'OK — @carbon/themes total = % (>=4 canonical named themes)', n;
END $$;

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0153_carbon_themes_catalog.sql', 'inline-0153', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations WHERE filename = '20260502_0153_carbon_themes_catalog.sql'
 );

COMMIT;

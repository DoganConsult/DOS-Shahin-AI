-- =====================================================================
-- 0156 — Align @carbon/ibm-products-web-components catalog to the
-- actually-installed package (v0.38.0) and surface the remaining shipped
-- components.
--
-- Audit findings vs node_modules/@carbon/ibm-products-web-components/es/components/:
--   Installed: about-modal, action-set, big-number, checklist, coachmark,
--              full-page-error, guide-banner, interstitial-screen,
--              notification-panel (SINGULAR), options-tile, page-header,
--              side-panel, tearsheet, tearsheet-preview, truncated-text,
--              user-avatar
--
--   Catalogued via 0150: condition-builder (NOT shipped), decorator
--              (NOT shipped), notifications-panel (PLURAL — wrong element
--              name), side-panel, tearsheet, user-avatar.
--
-- Actions:
--   1. Realign 'notifications-panel' source_component_name (plural) →
--      'cds-notification-panel' (singular, real element name shipped).
--   2. Flip 'condition-builder' + 'decorator' runtime_status →
--      'missing-upstream-angular-binding' (priority wrappers per spec but
--      not yet shipped by IBM in this WC package).
--   3. Add 12 catalog rows for the remaining installed components so the
--      catalog matches the installed package surface 1:1.
--
-- All remain wrapper-required / dynamic_ui_allowed=FALSE until Angular
-- custom-element wrappers exist.
-- =====================================================================
BEGIN;

-- 1. Fix the plural→singular mismatch for the shipped notification panel.
UPDATE dos.ui_carbon_components
   SET source_component_name = 'cds-notification-panel',
       notes = COALESCE(notes,'') || ' (realigned 0156: source_component_name → cds-notification-panel singular per installed v0.38.0)'
 WHERE carbon_key = 'product-wc.notifications-panel';

-- 2. Mark not-yet-shipped priority wrappers as missing-upstream binding.
UPDATE dos.ui_carbon_components
   SET runtime_status = 'missing-upstream-angular-binding',
       notes = COALESCE(notes,'') || ' (0156: not shipped by @carbon/ibm-products-web-components@0.38.0; awaiting upstream binding)'
 WHERE carbon_key IN ('product-wc.condition-builder','product-wc.decorator');

-- 3. Add the 12 remaining shipped IBM Products WC components.
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, vendor, notes)
VALUES
  ('product-wc.about-modal',         '@carbon/ibm-products-web-components', '0.38.0', 'cds-about-modal',         'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: about modal. Angular wrapper pending.'),
  ('product-wc.action-set',          '@carbon/ibm-products-web-components', '0.38.0', 'cds-action-set',          'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: button action set used in modals/tearsheets.'),
  ('product-wc.big-number',          '@carbon/ibm-products-web-components', '0.38.0', 'cds-big-number',          'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: KPI big-number tile.'),
  ('product-wc.checklist',           '@carbon/ibm-products-web-components', '0.38.0', 'cds-checklist',           'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: onboarding/progress checklist.'),
  ('product-wc.coachmark',           '@carbon/ibm-products-web-components', '0.38.0', 'cds-coachmark',           'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: in-product coachmark guide.'),
  ('product-wc.full-page-error',     '@carbon/ibm-products-web-components', '0.38.0', 'cds-full-page-error',     'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: full-page error layout (403/404/other).'),
  ('product-wc.guide-banner',        '@carbon/ibm-products-web-components', '0.38.0', 'cds-guide-banner',        'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: announcement/guide banner.'),
  ('product-wc.interstitial-screen', '@carbon/ibm-products-web-components', '0.38.0', 'cds-interstitial-screen', 'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: interstitial onboarding screen.'),
  ('product-wc.options-tile',        '@carbon/ibm-products-web-components', '0.38.0', 'cds-options-tile',        'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: settings options tile.'),
  ('product-wc.page-header',         '@carbon/ibm-products-web-components', '0.38.0', 'cds-page-header',         'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: full page-header pattern (distinct from cds-page-header in @carbon/web-components).'),
  ('product-wc.tearsheet-preview',   '@carbon/ibm-products-web-components', '0.38.0', 'cds-tearsheet-preview',   'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: tearsheet preview surface.'),
  ('product-wc.truncated-text',      '@carbon/ibm-products-web-components', '0.38.0', 'cds-truncated-text',      'primitive', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'ibm-carbon', 'IBM Products WC: line-clamp truncated-text utility.')
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

-- 4. Post-flight invariants.
DO $$
DECLARE
  n_total       INTEGER;
  n_pkgs        INTEGER;
  n_non_ibm     INTEGER;
  n_pwc         INTEGER;
  n_pwc_priority INTEGER;
  n_pwc_missing INTEGER;
BEGIN
  SELECT COUNT(*)               INTO n_total       FROM dos.ui_carbon_components;
  SELECT COUNT(DISTINCT package_name) INTO n_pkgs  FROM dos.ui_carbon_components;
  SELECT COUNT(*)               INTO n_non_ibm     FROM dos.ui_carbon_components WHERE vendor <> 'ibm-carbon';
  SELECT COUNT(*)               INTO n_pwc         FROM dos.ui_carbon_components WHERE package_name = '@carbon/ibm-products-web-components';
  SELECT COUNT(*) INTO n_pwc_priority FROM dos.ui_carbon_components
   WHERE carbon_key = ANY(ARRAY['product-wc.side-panel','product-wc.tearsheet','product-wc.decorator',
                                'product-wc.condition-builder','product-wc.notifications-panel','product-wc.user-avatar']);
  SELECT COUNT(*) INTO n_pwc_missing  FROM dos.ui_carbon_components
   WHERE package_name = '@carbon/ibm-products-web-components'
     AND runtime_status = 'missing-upstream-angular-binding';

  IF n_pwc          <> 18 THEN RAISE EXCEPTION '0156: ibm-products-web-components rows want 18 (got %)', n_pwc; END IF;
  IF n_pwc_priority <> 6  THEN RAISE EXCEPTION '0156: priority 6 rows missing (got %)', n_pwc_priority; END IF;
  IF n_pwc_missing  <> 2  THEN RAISE EXCEPTION '0156: not-yet-shipped count drift (got %, want 2)', n_pwc_missing; END IF;
  IF n_non_ibm      <> 0  THEN RAISE EXCEPTION '0156: non-IBM rows present (%)', n_non_ibm; END IF;

  RAISE NOTICE 'IBM PRODUCTS WC ALIGNED: total=% pkgs=% pwc=% priority6=% not_shipped=%',
    n_total, n_pkgs, n_pwc, n_pwc_priority, n_pwc_missing;
END $$;

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0156_ibm_products_wc_align_installed.sql', 'inline-0156', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations
    WHERE filename = '20260502_0156_ibm_products_wc_align_installed.sql'
 );

COMMIT;

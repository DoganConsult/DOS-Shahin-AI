-- 0149 — IBM Carbon Ecosystem catalog expansion: Work-Order 1
-- IBM Products — Page & Modal Patterns (50 rows; WO1 enumerated 50 items
-- under "(48 items)" heading: 5 page chrome + 11 empty/error + 13 modals +
-- 5 edit + 5 cards + 2 people + 4 saving + 5 decorator).
--
-- Source package: @carbon/ibm-products@2.89.0 (React-only for most rows;
-- WC bridge via @carbon/ibm-products-web-components where available).
--
-- Per execution order:
--   - vendor = 'ibm-carbon'
--   - integration_mode in ('react-only-reference','web-component-wrapper',
--     'native-angular','asset-package','angular-chart','deprecated-alias','unavailable')
--   - runtime_status in ('active','wrapper-required','catalog-only',
--     'blocked-react-only','deprecated','experimental',
--     'missing-upstream-angular-binding')
--
-- 6NF: extends dos.ui_carbon_components with scalar classification columns;
-- no array columns introduced.
-- =====================================================================
BEGIN;

-- 1. Extend the canonical Carbon catalog with classification columns.
ALTER TABLE dos.ui_carbon_components
  ADD COLUMN IF NOT EXISTS source_component_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS integration_mode      VARCHAR(40)  NOT NULL DEFAULT 'native-angular'
    CHECK (integration_mode IN ('native-angular','angular-chart','web-component-wrapper',
                                'asset-package','react-only-reference','deprecated-alias','unavailable')),
  ADD COLUMN IF NOT EXISTS runtime_status        VARCHAR(40)  NOT NULL DEFAULT 'active'
    CHECK (runtime_status IN ('active','wrapper-required','catalog-only','blocked-react-only',
                              'deprecated','experimental','missing-upstream-angular-binding')),
  ADD COLUMN IF NOT EXISTS angular_native        BOOLEAN      NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS wrapper_required      BOOLEAN      NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS stability             VARCHAR(20)  NOT NULL DEFAULT 'stable'
    CHECK (stability IN ('stable','canary','experimental','deprecated','beta')),
  ADD COLUMN IF NOT EXISTS dynamic_ui_allowed    BOOLEAN      NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notes                 TEXT;

-- 1a. Lock Phase 0 baseline: native Angular Carbon rows keep correct flags.
UPDATE dos.ui_carbon_components
   SET integration_mode = 'native-angular',
       runtime_status   = 'active',
       angular_native   = TRUE,
       wrapper_required = TRUE,
       stability        = CASE WHEN is_experimental THEN 'experimental' ELSE 'stable' END,
       dynamic_ui_allowed = TRUE
 WHERE package_name = 'carbon-components-angular';

-- 1b. Drop the old single-version PK constraint nature (we now hold multi-package rows).
--     carbon_key is unique only within (package_name, carbon_key); but the
--     existing PK is on carbon_key alone. To allow IBM Products rows that
--     can collide on simple names, namespace IBM Products keys with 'product.' prefix.
--     No PK change required for this work-order.

-- 2. Seed Work-Order 1 — 48 IBM Products Page & Modal Pattern rows.
--    Convention: carbon_key = 'product.<PascalName>' to namespace away from
--    the 58 native-Angular rows.

INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, category, is_experimental, is_active,
   source_component_name, integration_mode, runtime_status, angular_native,
   wrapper_required, stability, dynamic_ui_allowed, notes)
VALUES
  -- Page chrome (5)
  ('product.PageHeader',           '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'PageHeader',           'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: page chrome — React-only; WC bridge candidate.'),
  ('product.Tearsheet',            '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'Tearsheet',            'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: page chrome — React-only; WC bridge candidate.'),
  ('product.TearsheetNarrow',      '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'TearsheetNarrow',      'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: page chrome — React-only; WC bridge candidate.'),
  ('product.SidePanel',            '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'SidePanel',            'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: page chrome — React-only; WC bridge candidate.'),
  ('product.InterstitialScreen',   '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'InterstitialScreen',   'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: page chrome — React-only.'),

  -- Empty / error states (11)
  ('product.EmptyState',                 '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'EmptyState',                 'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: empty/error.'),
  ('product.ErrorEmptyState',            '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'ErrorEmptyState',            'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: empty/error.'),
  ('product.NoDataEmptyState',           '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'NoDataEmptyState',           'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: empty/error.'),
  ('product.NoTagsEmptyState',           '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'NoTagsEmptyState',           'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: empty/error.'),
  ('product.NotFoundEmptyState',         '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'NotFoundEmptyState',         'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: empty/error.'),
  ('product.NotificationsEmptyState',    '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'NotificationsEmptyState',    'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: empty/error.'),
  ('product.UnauthorizedEmptyState',     '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'UnauthorizedEmptyState',     'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: empty/error.'),
  ('product.FullPageError',              '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'FullPageError',              'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: empty/error.'),
  ('product.HTTPError403',               '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'HTTPError403',               'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: empty/error.'),
  ('product.HTTPError404',               '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'HTTPError404',               'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: empty/error.'),
  ('product.HTTPErrorOther',             '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'HTTPErrorOther',             'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: empty/error.'),

  -- Modals + create flows (12)
  ('product.AboutModal',                 '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'AboutModal',                 'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.APIKeyModal',                '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'APIKeyModal',                'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.CreateModal',                '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'CreateModal',                'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.CreateFullPage',             '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'CreateFullPage',             'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.CreateFullPageStep',         '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'CreateFullPageStep',         'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.CreateSidePanel',            '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'CreateSidePanel',            'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.CreateTearsheet',            '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'CreateTearsheet',            'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.CreateTearsheetNarrow',      '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'CreateTearsheetNarrow',      'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.CreateTearsheetStep',        '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'CreateTearsheetStep',        'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.CreateTearsheetDivider',     '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'CreateTearsheetDivider',     'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.ExportModal',                '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'ExportModal',                'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.ImportModal',                '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'ImportModal',                'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),
  ('product.RemoveModal',                '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'RemoveModal',                'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: modal/create.'),

  -- Edit flows (5)
  ('product.EditFullPage',               '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'EditFullPage',               'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: edit flow.'),
  ('product.EditSidePanel',              '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'EditSidePanel',              'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: edit flow.'),
  ('product.EditTearsheet',              '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'EditTearsheet',              'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: edit flow.'),
  ('product.EditTearsheetNarrow',        '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'EditTearsheetNarrow',        'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: edit flow.'),
  ('product.EditUpdateCards',            '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'EditUpdateCards',            'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: edit flow.'),

  -- Cards (5)
  ('product.ExpressiveCard',             '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'ExpressiveCard',             'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: card.'),
  ('product.ProductiveCard',             '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'ProductiveCard',             'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: card.'),
  ('product.GetStartedCard',             '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'GetStartedCard',             'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: card.'),
  ('product.OptionsTile',                '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'OptionsTile',                'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: card.'),
  ('product.Card',                       '@carbon/ibm-products','2.89.0','component',TRUE, TRUE,'Card',                       'react-only-reference','blocked-react-only',FALSE,TRUE,'canary',FALSE,'WO1: card (canary).'),

  -- People (2)
  ('product.UserAvatar',                 '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'UserAvatar',                 'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: people.'),
  ('product.UserProfileImage',           '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'UserProfileImage',           'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: people.'),

  -- Saving / status (4)
  ('product.Saving',                     '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'Saving',                     'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: saving/status.'),
  ('product.StatusIcon',                 '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'StatusIcon',                 'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: saving/status.'),
  ('product.StatusIndicator',            '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'StatusIndicator',            'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: saving/status.'),
  ('product.EditInPlace',                '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'EditInPlace',                'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: saving/status.'),

  -- Decorator family (5)
  ('product.Decorator',                  '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'Decorator',                  'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: decorator family.'),
  ('product.DecoratorBase',              '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'DecoratorBase',              'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: decorator family.'),
  ('product.DecoratorDualButton',        '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'DecoratorDualButton',        'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: decorator family.'),
  ('product.DecoratorLink',              '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'DecoratorLink',              'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: decorator family.'),
  ('product.DecoratorSingleButton',      '@carbon/ibm-products','2.89.0','component',FALSE,TRUE,'DecoratorSingleButton',      'react-only-reference','blocked-react-only',FALSE,TRUE,'stable',FALSE,'WO1: decorator family.')
ON CONFLICT (carbon_key) DO UPDATE
   SET package_name          = EXCLUDED.package_name,
       package_version       = EXCLUDED.package_version,
       category              = EXCLUDED.category,
       is_experimental       = EXCLUDED.is_experimental,
       is_active             = TRUE,
       source_component_name = EXCLUDED.source_component_name,
       integration_mode      = EXCLUDED.integration_mode,
       runtime_status        = EXCLUDED.runtime_status,
       angular_native        = EXCLUDED.angular_native,
       wrapper_required      = EXCLUDED.wrapper_required,
       stability             = EXCLUDED.stability,
       dynamic_ui_allowed    = EXCLUDED.dynamic_ui_allowed,
       notes                 = EXCLUDED.notes;

-- 3. Index for fast filtering by integration_mode / runtime_status / package.
CREATE INDEX IF NOT EXISTS ix_ui_carbon_components_integration ON dos.ui_carbon_components(integration_mode);
CREATE INDEX IF NOT EXISTS ix_ui_carbon_components_runtime     ON dos.ui_carbon_components(runtime_status);
CREATE INDEX IF NOT EXISTS ix_ui_carbon_components_package     ON dos.ui_carbon_components(package_name);

-- 4. Post-flight assertions for Work-Order 1.
DO $$
DECLARE n INTEGER; n_blocked INTEGER;
BEGIN
  SELECT COUNT(*) INTO n
    FROM dos.ui_carbon_components
   WHERE package_name = '@carbon/ibm-products' AND carbon_key LIKE 'product.%';
  IF n <> 50 THEN
    RAISE EXCEPTION 'WO1: IBM Products Page & Modal Pattern rows count mismatch (got %, want 50)', n;
  END IF;

  SELECT COUNT(*) INTO n_blocked
    FROM dos.ui_carbon_components
   WHERE package_name = '@carbon/ibm-products'
     AND runtime_status = 'blocked-react-only';
  IF n_blocked <> 50 THEN
    RAISE EXCEPTION 'WO1: all 50 IBM Products rows must be blocked-react-only (got %)', n_blocked;
  END IF;
END $$;

COMMIT;

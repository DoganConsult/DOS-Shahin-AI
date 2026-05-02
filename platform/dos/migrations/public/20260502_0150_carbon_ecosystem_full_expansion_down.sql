-- 0150 DOWN — IBM Carbon Ecosystem Catalog Expansion (Phases 1-5)
-- Removes the rows seeded by 0150 and restores the prior category CHECK.
-- Does NOT touch the 58 carbon-components-angular baseline or the 50
-- @carbon/ibm-products rows from 0149.
-- =====================================================================
BEGIN;

DELETE FROM dos.ui_carbon_components
 WHERE package_name IN (
        '@carbon/charts-angular',
        '@carbon/icons-angular',
        '@carbon/pictograms',
        '@carbon/web-components',
        '@carbon/ibm-products-web-components',
        'carbon-ai-chat'
       )
    OR carbon_key IN ('product.Datagrid','product.DataSpreadsheet','product.ConditionBuilder',
                      'product.FilterPanel','product.FilterSummary','product.TagSet','product.TagOverflow',
                      'product.DescriptionList','product.DelimitedList','product.TruncatedList','product.TruncatedText',
                      'product.Cascade','product.Checklist','product.AddSelect','product.MultiAddSelect','product.SingleAddSelect',
                      'product.ActionBar','product.ActionSet','product.ButtonMenu','product.ButtonSetWithOverflow',
                      'product.ComboButton','product.BreadcrumbWithOverflow','product.BigNumber',
                      'product.Coachmark','product.CoachmarkBeacon','product.CoachmarkButton','product.CoachmarkFixed',
                      'product.CoachmarkOverlayElement','product.CoachmarkOverlayElements','product.CoachmarkStack',
                      'product.NotificationsPanel',
                      'product.Nav','product.SimpleHeader','product.ScrollGradient','product.NonLinearReading','product.Carousel',
                      'product.DragAndDrop','product.StringFormatter','product.CreateInfluencer',
                      'product.WebTerminal','product.Guidebanner','product.InlineTip','product.TooltipTrigger','product.SearchBar',
                      'product.FeatureFlags','product.Provider');

-- Restore the prior category CHECK (pre-chart, pre-ai).
ALTER TABLE dos.ui_carbon_components
  DROP CONSTRAINT IF EXISTS ui_carbon_components_category_check;
ALTER TABLE dos.ui_carbon_components
  ADD CONSTRAINT ui_carbon_components_category_check
  CHECK (category IN ('component','primitive','layout','utility','experimental','shell'));

-- Remove the inline 0150 schema_migrations row (leave 0148/0149 backfill in place).
DELETE FROM dos.schema_migrations
 WHERE filename = '20260502_0150_carbon_ecosystem_full_expansion.sql';

COMMIT;

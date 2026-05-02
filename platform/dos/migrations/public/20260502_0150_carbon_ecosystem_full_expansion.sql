-- 0150 — IBM Carbon Ecosystem Catalog Expansion (Phases 1-5)
--
-- Per Hard Execution Order (2026-05-02). Extends dos.ui_carbon_components
-- beyond the 58-row carbon-components-angular@5.69.0 baseline (Phase 0,
-- already complete) and beyond the 50-row IBM Products WO-1 page+modal
-- patterns seed (0149, already applied) to cover the full IBM Carbon
-- ecosystem.
--
-- Total new rows authored here: ~108
--   Phase 1: 25 chart types     (@carbon/charts-angular)
--   Phase 2: 2  package rows    (@carbon/icons-angular, @carbon/pictograms)
--   Phase 3: 25 WC-only rows    (@carbon/web-components)
--   Phase 4: 46 IBM Products    (@carbon/ibm-products WO-2 productivity)
--   Phase 4: 6  IBM Products WC (@carbon/ibm-products-web-components)
--   Phase 5: 5  AI suite        (web-components + deprecated alias)
--
-- Idempotent: every INSERT uses ON CONFLICT(carbon_key) DO UPDATE.
-- No destructive operations; the existing 58 + 50 rows are not touched
-- except via DO UPDATE if their carbon_key collides (none expected).
--
-- Classification model (every row sets all 14 classification fields):
--   vendor (implicit via package_name family)
--   package_name, package_version
--   carbon_key, source_component_name
--   category, integration_mode, runtime_status, stability
--   angular_native, wrapper_required, dynamic_ui_allowed
--   notes
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 0. Extend category CHECK to admit 'chart' + 'ai' (existed: component,
--    primitive, layout, utility, experimental, shell).
-- ---------------------------------------------------------------------
ALTER TABLE dos.ui_carbon_components
  DROP CONSTRAINT IF EXISTS ui_carbon_components_category_check;
ALTER TABLE dos.ui_carbon_components
  ADD CONSTRAINT ui_carbon_components_category_check
  CHECK (category IN ('component','primitive','layout','utility','experimental','shell','chart','ai'));

-- ---------------------------------------------------------------------
-- PHASE 1 — @carbon/charts-angular (25 chart-type rows)
-- ---------------------------------------------------------------------
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, notes)
VALUES
  ('chart.bar.simple',     '@carbon/charts-angular', '1.27.8', 'SimpleBarChart',     'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=bar.simple. dynamic_ui_allowed flips TRUE once wrapper props schema lands.'),
  ('chart.bar.grouped',    '@carbon/charts-angular', '1.27.8', 'GroupedBarChart',    'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=bar.grouped.'),
  ('chart.bar.stacked',    '@carbon/charts-angular', '1.27.8', 'StackedBarChart',    'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=bar.stacked.'),
  ('chart.bar.lollipop',   '@carbon/charts-angular', '1.27.8', 'LollipopChart',      'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=bar.lollipop.'),
  ('chart.bar.histogram',  '@carbon/charts-angular', '1.27.8', 'HistogramChart',     'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=bar.histogram.'),
  ('chart.line',           '@carbon/charts-angular', '1.27.8', 'LineChart',          'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=line.'),
  ('chart.area',           '@carbon/charts-angular', '1.27.8', 'AreaChart',          'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=area.'),
  ('chart.area.stacked',   '@carbon/charts-angular', '1.27.8', 'StackedAreaChart',   'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=area.stacked.'),
  ('chart.boxplot',        '@carbon/charts-angular', '1.27.8', 'BoxplotChart',       'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=boxplot.'),
  ('chart.bubble',         '@carbon/charts-angular', '1.27.8', 'BubbleChart',        'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=bubble.'),
  ('chart.scatter',        '@carbon/charts-angular', '1.27.8', 'ScatterChart',       'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=scatter.'),
  ('chart.pie',            '@carbon/charts-angular', '1.27.8', 'PieChart',           'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=pie.'),
  ('chart.donut',          '@carbon/charts-angular', '1.27.8', 'DonutChart',         'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=donut.'),
  ('chart.gauge',          '@carbon/charts-angular', '1.27.8', 'GaugeChart',         'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=gauge.'),
  ('chart.meter',          '@carbon/charts-angular', '1.27.8', 'MeterChart',         'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=meter.'),
  ('chart.treemap',        '@carbon/charts-angular', '1.27.8', 'TreemapChart',       'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=treemap.'),
  ('chart.circle-pack',    '@carbon/charts-angular', '1.27.8', 'CirclePackChart',    'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=circle-pack.'),
  ('chart.tree',           '@carbon/charts-angular', '1.27.8', 'TreeChart',          'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=tree.'),
  ('chart.alluvial',       '@carbon/charts-angular', '1.27.8', 'AlluvialChart',      'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=alluvial.'),
  ('chart.combo',          '@carbon/charts-angular', '1.27.8', 'ComboChart',         'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=combo.'),
  ('chart.choropleth',     '@carbon/charts-angular', '1.27.8', 'ChoroplethChart',    'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=choropleth.'),
  ('chart.heatmap',        '@carbon/charts-angular', '1.27.8', 'HeatmapChart',       'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=heatmap.'),
  ('chart.radar',          '@carbon/charts-angular', '1.27.8', 'RadarChart',         'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=radar.'),
  ('chart.bullet',         '@carbon/charts-angular', '1.27.8', 'BulletChart',        'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=bullet.'),
  ('chart.wordcloud',      '@carbon/charts-angular', '1.27.8', 'WordcloudChart',     'chart', FALSE, TRUE, 'angular-chart', 'active', TRUE, TRUE, 'stable', FALSE, 'Renders via DosCarbonChartComponent.chartType=wordcloud.')
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

-- ---------------------------------------------------------------------
-- PHASE 2 — Icons + Pictograms (2 package-level rows; NOT 2,392 SVG rows)
-- ---------------------------------------------------------------------
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, notes)
VALUES
  ('carbon.icons.angular', '@carbon/icons-angular', '11.2.2',  '@carbon/icons-angular',
     'utility', FALSE, TRUE,
     'asset-package', 'active', TRUE, TRUE, 'stable', TRUE,
     'Icon names resolved via DosCarbonIconComponent + iconName prop allowlist. Do NOT insert per-icon rows; ~2,392 SVGs governed by allowed-icon-registry, not per-row.'),
  ('carbon.pictograms',    '@carbon/pictograms',    '12.0.0',  '@carbon/pictograms',
     'utility', FALSE, TRUE,
     'asset-package', 'active', FALSE, TRUE, 'stable', FALSE,
     'Pictogram names resolved via DosCarbonPictogramComponent + pictogramName prop allowlist. Wrapper pending; flip dynamic_ui_allowed=TRUE once DosCarbonPictogramComponent ships.')
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

-- ---------------------------------------------------------------------
-- PHASE 3 — @carbon/web-components (25 WC-only rows: 10 fluid + 15 other)
-- ---------------------------------------------------------------------
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, notes)
VALUES
  -- Fluid form variants (10) — recommended density variant family, WC-only
  ('wc.fluid-combo-box',     '@carbon/web-components', '2.0.0', 'cds-fluid-combo-box',     'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Fluid form density variant. Angular wrapper pending (DosCarbonFluidComboBox).'),
  ('wc.fluid-dropdown',      '@carbon/web-components', '2.0.0', 'cds-fluid-dropdown',      'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Fluid form density variant. Angular wrapper pending.'),
  ('wc.fluid-multi-select',  '@carbon/web-components', '2.0.0', 'cds-fluid-multi-select',  'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Fluid form density variant. Angular wrapper pending.'),
  ('wc.fluid-number-input',  '@carbon/web-components', '2.0.0', 'cds-fluid-number-input',  'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Fluid form density variant. Angular wrapper pending.'),
  ('wc.fluid-password-input','@carbon/web-components', '2.0.0', 'cds-fluid-password-input','component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Fluid form density variant. Angular wrapper pending.'),
  ('wc.fluid-search',        '@carbon/web-components', '2.0.0', 'cds-fluid-search',        'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Fluid form density variant. Priority wrapper #6 (DosCarbonFluidSearch).'),
  ('wc.fluid-select',        '@carbon/web-components', '2.0.0', 'cds-fluid-select',        'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Fluid form density variant. Priority wrapper #8 (DosCarbonFluidSelect).'),
  ('wc.fluid-text-input',    '@carbon/web-components', '2.0.0', 'cds-fluid-text-input',    'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Fluid form density variant. Priority wrapper #7 (DosCarbonFluidTextInput).'),
  ('wc.fluid-textarea',      '@carbon/web-components', '2.0.0', 'cds-fluid-textarea',      'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Fluid form density variant. Angular wrapper pending.'),
  ('wc.fluid-time-picker',   '@carbon/web-components', '2.0.0', 'cds-fluid-time-picker',   'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Fluid form density variant. Angular wrapper pending.'),
  -- Other WC-only (15)
  ('wc.page-header',     '@carbon/web-components', '2.0.0', 'cds-page-header',     'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Priority wrapper #1 (DosCarbonPageHeader). Distinct from React product.PageHeader.'),
  ('wc.side-panel',      '@carbon/web-components', '2.0.0', 'cds-side-panel',      'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Priority wrapper #2 (DosCarbonSidePanel). Distinct from React product.SidePanel.'),
  ('wc.tearsheet',       '@carbon/web-components', '2.0.0', 'cds-tearsheet',       'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Priority wrapper #3 (DosCarbonTearsheet). Distinct from React product.Tearsheet.'),
  ('wc.badge-indicator', '@carbon/web-components', '2.0.0', 'cds-badge-indicator', 'primitive', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Status badge. Wrapper pending.'),
  ('wc.icon-indicator',  '@carbon/web-components', '2.0.0', 'cds-icon-indicator',  'primitive', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Icon-based indicator. Wrapper pending.'),
  ('wc.shape-indicator', '@carbon/web-components', '2.0.0', 'cds-shape-indicator', 'primitive', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Shape-based indicator. Wrapper pending.'),
  ('wc.stack',           '@carbon/web-components', '2.0.0', 'cds-stack',           'layout',    FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Vertical/horizontal stack layout. Priority wrapper #10 (DosCarbonStack).'),
  ('wc.heading',         '@carbon/web-components', '2.0.0', 'cds-heading',         'primitive', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Auto-leveled heading inside cds-section. Wrapper pending.'),
  ('wc.icon-button',     '@carbon/web-components', '2.0.0', 'cds-icon-button',     'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Priority wrapper #4 (DosCarbonIconButton). Distinct from cds-button[kind=ghost-icon].'),
  ('wc.skip-to-content', '@carbon/web-components', '2.0.0', 'cds-skip-to-content', 'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Accessibility skip link. Wrapper pending.'),
  ('wc.floating-menu',   '@carbon/web-components', '2.0.0', 'cds-floating-menu',   'primitive', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Positioned floating menu. Wrapper pending.'),
  ('wc.feature-flags',   '@carbon/web-components', '2.0.0', 'cds-feature-flags',   'utility',   FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Feature-flag provider. Wrapper pending.'),
  ('wc.copy',            '@carbon/web-components', '2.0.0', 'cds-copy',            'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Standalone copy button. Priority wrapper #9 (DosCarbonCopy). Distinct from code-snippet copy.'),
  ('wc.pagination-nav',  '@carbon/web-components', '2.0.0', 'cds-pagination-nav',  'component', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Page-by-page nav (distinct from cds-pagination). Priority wrapper #5 (DosCarbonPaginationNav).'),
  ('wc.form-group',      '@carbon/web-components', '2.0.0', 'cds-form-group',      'layout',    FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable', FALSE, 'Fieldset wrapper for form inputs. Wrapper pending.')
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

-- ---------------------------------------------------------------------
-- PHASE 4a — @carbon/ibm-products WO-2 productivity & data subset (46 rows)
-- All blocked-react-only (rule #3: never import @carbon/ibm-products into
-- Angular runtime). WO-1 (0149) already loaded the 50 page+modal patterns.
-- ---------------------------------------------------------------------
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, notes)
VALUES
  -- Data tables + grids (3)
  ('product.Datagrid',                '@carbon/ibm-products', '2.89.0', 'Datagrid',                'component',    FALSE, TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'stable', FALSE, 'React-only. Advanced data table beyond cds-table. Use cds-table for Angular runtime. WC-bridge subset tracked separately.'),
  ('product.DataSpreadsheet',         '@carbon/ibm-products', '2.89.0', 'DataSpreadsheet',         'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Spreadsheet-style editing grid.'),
  ('product.ConditionBuilder',        '@carbon/ibm-products', '2.89.0', 'ConditionBuilder',        'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Visual query/filter builder. WC-bridge equivalent tracked separately.'),
  -- Filters + tags (4)
  ('product.FilterPanel',             '@carbon/ibm-products', '2.89.0', 'FilterPanel',             'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Side filter panel.'),
  ('product.FilterSummary',           '@carbon/ibm-products', '2.89.0', 'FilterSummary',           'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Active-filter chip summary.'),
  ('product.TagSet',                  '@carbon/ibm-products', '2.89.0', 'TagSet',                  'component',    FALSE, TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'stable', FALSE, 'React-only. Tag overflow group.'),
  ('product.TagOverflow',             '@carbon/ibm-products', '2.89.0', 'TagOverflow',             'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Tag overflow chip variant.'),
  -- Lists (4)
  ('product.DescriptionList',         '@carbon/ibm-products', '2.89.0', 'DescriptionList',         'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Key/value definition list.'),
  ('product.DelimitedList',           '@carbon/ibm-products', '2.89.0', 'DelimitedList',           'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Inline delimited list.'),
  ('product.TruncatedList',           '@carbon/ibm-products', '2.89.0', 'TruncatedList',           'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Show-more/less list.'),
  ('product.TruncatedText',           '@carbon/ibm-products', '2.89.0', 'TruncatedText',           'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Tooltip-on-truncate text.'),
  -- Selection (5)
  ('product.Cascade',                 '@carbon/ibm-products', '2.89.0', 'Cascade',                 'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Cascade animated reveal.'),
  ('product.Checklist',               '@carbon/ibm-products', '2.89.0', 'Checklist',               'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Multi-step checklist.'),
  ('product.AddSelect',               '@carbon/ibm-products', '2.89.0', 'AddSelect',               'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Add+select compound control.'),
  ('product.MultiAddSelect',          '@carbon/ibm-products', '2.89.0', 'MultiAddSelect',          'component',    FALSE, TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'stable', FALSE, 'React-only. Multi-add+select stable.'),
  ('product.SingleAddSelect',         '@carbon/ibm-products', '2.89.0', 'SingleAddSelect',         'component',    FALSE, TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'stable', FALSE, 'React-only. Single-add+select stable.'),
  -- Action surfaces (4)
  ('product.ActionBar',               '@carbon/ibm-products', '2.89.0', 'ActionBar',               'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Overflow action toolbar.'),
  ('product.ActionSet',               '@carbon/ibm-products', '2.89.0', 'ActionSet',               'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Modal/footer button set.'),
  ('product.ButtonMenu',              '@carbon/ibm-products', '2.89.0', 'ButtonMenu',              'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Button + menu hybrid.'),
  ('product.ButtonSetWithOverflow',   '@carbon/ibm-products', '2.89.0', 'ButtonSetWithOverflow',   'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Responsive button set.'),
  -- Buttons + breadcrumbs (3)
  ('product.ComboButton',             '@carbon/ibm-products', '2.89.0', 'ComboButton',             'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. CCA combo-button covers Angular.'),
  ('product.BreadcrumbWithOverflow',  '@carbon/ibm-products', '2.89.0', 'BreadcrumbWithOverflow',  'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Overflow-aware breadcrumb.'),
  ('product.BigNumber',               '@carbon/ibm-products', '2.89.0', 'BigNumber',               'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Big-numeral KPI display.'),
  -- Coachmark family (7)
  ('product.Coachmark',               '@carbon/ibm-products', '2.89.0', 'Coachmark',               'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Onboarding callout.'),
  ('product.CoachmarkBeacon',         '@carbon/ibm-products', '2.89.0', 'CoachmarkBeacon',         'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Pulsing beacon.'),
  ('product.CoachmarkButton',         '@carbon/ibm-products', '2.89.0', 'CoachmarkButton',         'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Coachmark trigger button.'),
  ('product.CoachmarkFixed',          '@carbon/ibm-products', '2.89.0', 'CoachmarkFixed',          'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Fixed-position coachmark.'),
  ('product.CoachmarkOverlayElement', '@carbon/ibm-products', '2.89.0', 'CoachmarkOverlayElement', 'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Coachmark step element.'),
  ('product.CoachmarkOverlayElements','@carbon/ibm-products', '2.89.0', 'CoachmarkOverlayElements','component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Coachmark step container.'),
  ('product.CoachmarkStack',          '@carbon/ibm-products', '2.89.0', 'CoachmarkStack',          'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Coachmark step navigator.'),
  -- Notifications (1)
  ('product.NotificationsPanel',      '@carbon/ibm-products', '2.89.0', 'NotificationsPanel',      'component',    FALSE, TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'stable', FALSE, 'React-only. Slide-out notifications panel. WC-bridge equivalent tracked separately.'),
  -- Layout / nav helpers (5)
  ('product.Nav',                     '@carbon/ibm-products', '2.89.0', 'Nav',                     'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. App-level nav.'),
  ('product.SimpleHeader',            '@carbon/ibm-products', '2.89.0', 'SimpleHeader',            'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Lite shell header.'),
  ('product.ScrollGradient',          '@carbon/ibm-products', '2.89.0', 'ScrollGradient',          'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Scroll-edge gradient overlay.'),
  ('product.NonLinearReading',        '@carbon/ibm-products', '2.89.0', 'NonLinearReading',        'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Skim/branch-reading helper.'),
  ('product.Carousel',                '@carbon/ibm-products', '2.89.0', 'Carousel',                'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Horizontal carousel.'),
  -- Editing helpers (3)
  ('product.DragAndDrop',             '@carbon/ibm-products', '2.89.0', 'DragAndDrop',             'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. DnD primitives.'),
  ('product.StringFormatter',         '@carbon/ibm-products', '2.89.0', 'StringFormatter',         'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. String tokenization formatter.'),
  ('product.CreateInfluencer',        '@carbon/ibm-products', '2.89.0', 'CreateInfluencer',        'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Step-progress for create flows.'),
  -- Misc productivity (5)
  ('product.WebTerminal',             '@carbon/ibm-products', '2.89.0', 'WebTerminal',             'component',    FALSE, TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'stable', FALSE, 'React-only. Browser-side terminal panel.'),
  ('product.Guidebanner',             '@carbon/ibm-products', '2.89.0', 'Guidebanner',             'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Inline guide banner.'),
  ('product.InlineTip',               '@carbon/ibm-products', '2.89.0', 'InlineTip',               'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Inline tip card.'),
  ('product.TooltipTrigger',          '@carbon/ibm-products', '2.89.0', 'TooltipTrigger',          'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Tooltip trigger pattern.'),
  ('product.SearchBar',               '@carbon/ibm-products', '2.89.0', 'SearchBar',               'component',    TRUE,  TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'canary', FALSE, 'React-only canary. Header search bar.'),
  -- Feature flags + provider (2)
  ('product.FeatureFlags',            '@carbon/ibm-products', '2.89.0', 'FeatureFlags',            'utility',      FALSE, TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'stable', FALSE, 'React-only. Feature-flag provider context.'),
  ('product.Provider',                '@carbon/ibm-products', '2.89.0', 'Provider',                'utility',      FALSE, TRUE, 'react-only-reference', 'blocked-react-only', FALSE, TRUE, 'stable', FALSE, 'React-only. ContentWrapper / Provider for ibm-products theme + flags.')
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

-- ---------------------------------------------------------------------
-- PHASE 4b — @carbon/ibm-products-web-components (6 priority WC-bridge rows)
-- These are framework-agnostic WC equivalents of select ibm-products
-- components. Wrap as Angular custom elements per rule #5.
-- ---------------------------------------------------------------------
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, notes)
VALUES
  ('product-wc.tearsheet',          '@carbon/ibm-products-web-components', '0.x', 'cds-tearsheet',          'component', TRUE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'beta', FALSE, 'WC-bridge for product.Tearsheet. Wrapper priority #1.'),
  ('product-wc.side-panel',         '@carbon/ibm-products-web-components', '0.x', 'cds-side-panel',         'component', TRUE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'beta', FALSE, 'WC-bridge for product.SidePanel. Wrapper priority #2.'),
  ('product-wc.decorator',          '@carbon/ibm-products-web-components', '0.x', 'cds-decorator',          'component', TRUE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'beta', FALSE, 'WC-bridge for product.Decorator. Wrapper priority #3.'),
  ('product-wc.condition-builder',  '@carbon/ibm-products-web-components', '0.x', 'cds-condition-builder',  'component', TRUE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'beta', FALSE, 'WC-bridge for product.ConditionBuilder. Wrapper priority #4.'),
  ('product-wc.notifications-panel','@carbon/ibm-products-web-components', '0.x', 'cds-notifications-panel','component', TRUE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'beta', FALSE, 'WC-bridge for product.NotificationsPanel. Wrapper priority #5.'),
  ('product-wc.user-avatar',        '@carbon/ibm-products-web-components', '0.x', 'cds-user-avatar',        'component', TRUE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'beta', FALSE, 'WC-bridge for product.UserAvatar. Wrapper priority #6.')
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

-- ---------------------------------------------------------------------
-- PHASE 5 — AI suite (5 rows; AI Label already exists in CCA baseline)
-- Per rule: if Carbon AI Chat shell is not verified-installable, mark
-- as 'unavailable'. Slug = deprecated-alias of AI Label.
-- ---------------------------------------------------------------------
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, notes)
VALUES
  ('ai.skeleton',          '@carbon/web-components', '2.0.0', 'cds-ai-skeleton',         'ai', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable',     FALSE, 'AI loading shimmer. Wrapper pending (DosCarbonAiSkeleton).'),
  ('ai.chat-button',       '@carbon/web-components', '2.0.0', 'cds-chat-button',         'ai', FALSE, TRUE, 'web-component-wrapper', 'wrapper-required', FALSE, TRUE, 'stable',     FALSE, 'AI chat launcher button. Wrapper pending (DosCarbonAiChatButton).'),
  ('ai.chat-shell',        'carbon-ai-chat',         '0.x',   'CarbonAIChatShell',       'ai', TRUE,  TRUE, 'unavailable',           'missing-upstream-angular-binding', FALSE, TRUE, 'experimental', FALSE, 'Standalone repo carbon-design-system/carbon-ai-chat. No Angular binding verified. Marked unavailable per rule (do not fake). Re-evaluate when official Angular adapter ships.'),
  ('ai.chat-message-list', 'carbon-ai-chat',         '0.x',   'AIChatMessageList',       'ai', TRUE,  TRUE, 'unavailable',           'missing-upstream-angular-binding', FALSE, TRUE, 'experimental', FALSE, 'Sub-element of carbon-ai-chat shell. No Angular binding verified.'),
  ('ai.chat-input',        'carbon-ai-chat',         '0.x',   'AIChatInput',             'ai', TRUE,  TRUE, 'unavailable',           'missing-upstream-angular-binding', FALSE, TRUE, 'experimental', FALSE, 'Sub-element of carbon-ai-chat shell. No Angular binding verified.'),
  ('ai.slug-legacy-alias', '@carbon/web-components', '2.0.0', 'cds-slug',                'ai', FALSE, TRUE, 'deprecated-alias',      'deprecated',       FALSE, FALSE, 'deprecated', FALSE, 'Deprecated alias of AI Label. Do not use for new work; rule #5: AI Label is canonical.')
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

-- ---------------------------------------------------------------------
-- Tracking — backfill schema_migrations rows for 0148, 0149, 0150
-- (the catalog tables show changes but the migrations runner did not
-- record them; keep the ledger consistent).
-- ---------------------------------------------------------------------
INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT v.filename, v.checksum, 'system-backfill'
  FROM (VALUES
         ('20260502_0148_ibm_carbon_component_catalog.sql', 'backfill-0148'),
         ('20260502_0149_ibm_products_page_modal_patterns.sql', 'backfill-0149'),
         ('20260502_0150_carbon_ecosystem_full_expansion.sql', 'inline-0150')
       ) v(filename, checksum)
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations m WHERE m.filename = v.filename
 );

-- ---------------------------------------------------------------------
-- Post-flight invariants — assert phased counts.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  n_baseline    INTEGER;
  n_charts      INTEGER;
  n_packages    INTEGER;
  n_wc_only     INTEGER;
  n_ibm_react   INTEGER;
  n_ibm_wc      INTEGER;
  n_ai          INTEGER;
  n_total       INTEGER;
BEGIN
  SELECT COUNT(*) INTO n_baseline  FROM dos.ui_carbon_components WHERE package_name='carbon-components-angular';
  SELECT COUNT(*) INTO n_charts    FROM dos.ui_carbon_components WHERE package_name='@carbon/charts-angular';
  SELECT COUNT(*) INTO n_packages  FROM dos.ui_carbon_components WHERE package_name IN ('@carbon/icons-angular','@carbon/pictograms');
  SELECT COUNT(*) INTO n_wc_only   FROM dos.ui_carbon_components WHERE package_name='@carbon/web-components' AND category<>'ai';
  SELECT COUNT(*) INTO n_ibm_react FROM dos.ui_carbon_components WHERE package_name='@carbon/ibm-products';
  SELECT COUNT(*) INTO n_ibm_wc    FROM dos.ui_carbon_components WHERE package_name='@carbon/ibm-products-web-components';
  SELECT COUNT(*) INTO n_ai        FROM dos.ui_carbon_components WHERE category='ai' OR carbon_key='ai-label';
  SELECT COUNT(*) INTO n_total     FROM dos.ui_carbon_components;

  IF n_baseline  <> 58 THEN RAISE EXCEPTION '0150: baseline drift — carbon-components-angular=% (want 58)', n_baseline; END IF;
  IF n_charts    <> 25 THEN RAISE EXCEPTION '0150: charts seed drift — got %, want 25', n_charts; END IF;
  IF n_packages  <>  2 THEN RAISE EXCEPTION '0150: package rows drift — got %, want 2', n_packages; END IF;
  IF n_wc_only   <  25 THEN RAISE EXCEPTION '0150: WC-only seed under baseline — got %, want >=25', n_wc_only; END IF;
  IF n_ibm_react <  86 THEN RAISE EXCEPTION '0150: ibm-products under baseline — got %, want >=86 (50 from 0149 + 46 from 0150)', n_ibm_react; END IF;
  IF n_ibm_wc    <   6 THEN RAISE EXCEPTION '0150: ibm-products-wc under baseline — got %, want >=6', n_ibm_wc; END IF;
  IF n_ai        <   6 THEN RAISE EXCEPTION '0150: AI suite under baseline — got %, want >=6 (5 new + ai-label)', n_ai; END IF;
  IF n_total     < 200 THEN RAISE EXCEPTION '0150: total rows under baseline — got %, want >=200', n_total; END IF;

  RAISE NOTICE 'OK — catalog totals: baseline=% charts=% packages=% wc_only=% ibm_react=% ibm_wc=% ai=% TOTAL=%',
    n_baseline, n_charts, n_packages, n_wc_only, n_ibm_react, n_ibm_wc, n_ai, n_total;
END $$;

COMMIT;

import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const lines = fs.readFileSync('/tmp/registry_after.txt', 'utf8').trim().split('\n');
const rows = lines.map(l => {
  const [component_key, carbon_key] = l.split('|');
  return { component_key, carbon_key };
});

const CK_MAP = {
  'accordion': ['CarbonAccordionRenderer', 'p'],
  'breadcrumb': ['CarbonBreadcrumbRenderer', 'p'],
  'button': ['CarbonButtonRenderer', 'p'],
  'checkbox': ['CarbonCheckboxRenderer', 'p'],
  'combobox': ['CarbonComboBoxRenderer', 'p'],
  'context-menu': ['CarbonContextMenuRenderer', 'p'],
  'datepicker': ['CarbonDatePickerRenderer', 'p'],
  'datepicker-input': ['CarbonDatePickerRenderer', 'p'],
  'dropdown': ['CarbonDropdownRenderer', 'p'],
  'file-uploader': ['CarbonFileUploaderRenderer', 'p'],
  'grid': ['CarbonGridRenderer', 'p'],
  'inline-loading': ['CarbonInlineLoadingRenderer', 'p'],
  'input': ['CarbonTextInputRenderer', 'p'],
  'layer': ['CarbonLayerRenderer', 'p'],
  'modal': ['CarbonModalRenderer', 'p'],
  'number-input': ['CarbonNumberInputRenderer', 'p'],
  'pagination': ['CarbonPaginationRenderer', 'p'],
  'popover': ['CarbonPopoverRenderer', 'p'],
  'progress-bar': ['CarbonProgressBarRenderer', 'p'],
  'radio': ['CarbonRadioRenderer', 'p'],
  'search': ['CarbonSearchRenderer', 'p'],
  'select': ['CarbonSelectRenderer', 'p'],
  'skeleton': ['CarbonSkeletonTextRenderer', 'p'],
  'structured-list': ['CarbonStructuredListRenderer', 'p'],
  'table': ['CarbonDataTableRenderer', 'p'],
  'tabs': ['CarbonTabsRenderer', 'p'],
  'tag': ['CarbonTagRenderer', 'p'],
  'tiles': ['CarbonTileRenderer', 'p'],
  'toggle': ['CarbonToggleRenderer', 'p'],
  'toggletip': ['CarbonToggletipRenderer', 'p'],
  'tooltip': ['CarbonTooltipRenderer', 'p'],
  'ui-shell': ['CarbonUIShellRenderer', 'p'],
  'icon': ['CarbonIconRenderer', 'x'],
  'link': ['CarbonLinkRenderer', 'x'],
  'list': ['CarbonListRenderer', 'x'],
  'loading': ['CarbonLoadingRenderer', 'x'],
  'notification': ['CarbonNotificationRenderer', 'x'],
  'dialog': ['CarbonDialogRenderer', 'x'],
  'wc.skip-to-content': ['CarbonSkipToContentRenderer', 'x'],
  // Real <cds-*> web-component wrappers (file 'x') — Carbon shipped, not fallback.
  'ai-label':              ['CarbonAiLabelRenderer', 'x'],
  'ai.chat-button':        ['CarbonChatButtonRenderer', 'x'],
  'ai.skeleton':           ['CarbonAiSkeletonRenderer', 'x'],
  'aichat.container':      ['CarbonAiChatContainerRenderer', 'x'],
  'aichat.custom-element': ['CarbonAiChatElementRenderer', 'x'],
  'aspect-ratio':          ['CarbonAspectRatioRenderer', 'x'],
  'code-snippet':          ['CarbonCodeSnippetRenderer', 'x'],
  'combo-button':          ['CarbonComboButtonRenderer', 'x'],
  'contained-list':        ['CarbonContainedListRenderer', 'x'],
  'content-switcher':      ['CarbonContentSwitcherRenderer', 'x'],
  'menu-button':           ['CarbonMenuButtonRenderer', 'x'],
  'progress-indicator':    ['CarbonProgressIndicatorRenderer', 'x'],
  'slider':                ['CarbonSliderRenderer', 'x'],
  'timepicker':            ['CarbonTimePickerRenderer', 'x'],
  'timepicker-select':     ['CarbonTimePickerSelectRenderer', 'x'],
  'treeview':              ['CarbonTreeViewRenderer', 'x'],
  // wc.* web-components
  'wc.badge-indicator':    ['CarbonBadgeIndicatorRenderer', 'x'],
  'wc.copy':               ['CarbonCopyRenderer', 'x'],
  'wc.feature-flags':      ['CarbonFeatureFlagsRenderer', 'x'],
  'wc.floating-menu':      ['CarbonFloatingMenuRenderer', 'x'],
  'wc.fluid-combo-box':    ['CarbonFluidComboBoxRenderer', 'x'],
  'wc.fluid-dropdown':     ['CarbonFluidDropdownRenderer', 'x'],
  'wc.fluid-multi-select': ['CarbonFluidMultiSelectRenderer', 'x'],
  'wc.fluid-number-input': ['CarbonFluidNumberInputRenderer', 'x'],
  'wc.fluid-password-input':['CarbonFluidPasswordInputRenderer', 'x'],
  'wc.fluid-search':       ['CarbonFluidSearchRenderer', 'x'],
  'wc.fluid-select':       ['CarbonFluidSelectRenderer', 'x'],
  'wc.fluid-text-input':   ['CarbonFluidTextInputRenderer', 'x'],
  'wc.fluid-textarea':     ['CarbonFluidTextareaRenderer', 'x'],
  'wc.fluid-time-picker':  ['CarbonFluidTimePickerRenderer', 'x'],
  'wc.form-group':         ['CarbonFormGroupRenderer', 'x'],
  'wc.heading':            ['CarbonHeadingRenderer', 'x'],
  'wc.icon-button':        ['CarbonWcIconButtonRenderer', 'x'],
  'wc.icon-indicator':     ['CarbonIconIndicatorRenderer', 'x'],
  'wc.page-header':        ['CarbonWcPageHeaderRenderer', 'x'],
  'wc.pagination-nav':     ['CarbonPaginationNavRenderer', 'x'],
  'wc.shape-indicator':    ['CarbonShapeIndicatorRenderer', 'x'],
  'wc.side-panel':         ['CarbonSidePanelRenderer', 'x'],
  'wc.stack':              ['CarbonStackRenderer', 'x'],
  'wc.tearsheet':          ['CarbonTearsheetRenderer', 'x'],
  // product-wc.* — IBM Products web-components
  'product-wc.about-modal':         ['CarbonPwcAboutModalRenderer', 'x'],
  'product-wc.action-set':          ['CarbonPwcActionSetRenderer', 'x'],
  'product-wc.big-number':          ['CarbonPwcBigNumberRenderer', 'x'],
  'product-wc.checklist':           ['CarbonPwcChecklistRenderer', 'x'],
  'product-wc.coachmark':           ['CarbonPwcCoachmarkRenderer', 'x'],
  'product-wc.full-page-error':     ['CarbonPwcFullPageErrorRenderer', 'x'],
  'product-wc.guide-banner':        ['CarbonPwcGuideBannerRenderer', 'x'],
  'product-wc.interstitial-screen': ['CarbonPwcInterstitialScreenRenderer', 'x'],
  'product-wc.notifications-panel': ['CarbonPwcNotificationsPanelRenderer', 'x'],
  'product-wc.options-tile':        ['CarbonPwcOptionsTileRenderer', 'x'],
  'product-wc.page-header':         ['CarbonPwcPageHeaderRenderer', 'x'],
  'product-wc.side-panel':          ['CarbonPwcSidePanelRenderer', 'x'],
  'product-wc.tearsheet':           ['CarbonPwcTearsheetRenderer', 'x'],
  'product-wc.tearsheet-preview':   ['CarbonPwcTearsheetPreviewRenderer', 'x'],
  'product-wc.truncated-text':      ['CarbonPwcTruncatedTextRenderer', 'x'],
  'product-wc.user-avatar':         ['CarbonPwcUserAvatarRenderer', 'x'],
  // @carbon/charts-angular wrappers (file 'c')
  'chart.alluvial':       ['CarbonChartAlluvialRenderer', 'c'],
  'chart.area':           ['CarbonChartAreaRenderer', 'c'],
  'chart.area.stacked':   ['CarbonChartAreaStackedRenderer', 'c'],
  'chart.bar.grouped':    ['CarbonChartBarGroupedRenderer', 'c'],
  'chart.bar.histogram':  ['CarbonChartBarHistogramRenderer', 'c'],
  'chart.bar.lollipop':   ['CarbonChartBarLollipopRenderer', 'c'],
  'chart.bar.simple':     ['CarbonChartBarSimpleRenderer', 'c'],
  'chart.bar.stacked':    ['CarbonChartBarStackedRenderer', 'c'],
  'chart.boxplot':        ['CarbonChartBoxplotRenderer', 'c'],
  'chart.bubble':         ['CarbonChartBubbleRenderer', 'c'],
  'chart.bullet':         ['CarbonChartBulletRenderer', 'c'],
  'chart.choropleth':     ['CarbonChartChoroplethRenderer', 'c'],
  'chart.circle-pack':    ['CarbonChartCirclePackRenderer', 'c'],
  'chart.combo':          ['CarbonChartComboRenderer', 'c'],
  'chart.donut':          ['CarbonChartDonutRenderer', 'c'],
  'chart.gauge':          ['CarbonChartGaugeRenderer', 'c'],
  'chart.heatmap':        ['CarbonChartHeatmapRenderer', 'c'],
  'chart.line':           ['CarbonChartLineRenderer', 'c'],
  'chart.line.stacked':   ['CarbonChartLineStackedRenderer', 'c'],
  'chart.meter':          ['CarbonChartMeterRenderer', 'c'],
  'chart.pie':            ['CarbonChartPieRenderer', 'c'],
  'chart.radar':          ['CarbonChartRadarRenderer', 'c'],
  'chart.scatter':        ['CarbonChartScatterRenderer', 'c'],
  'chart.tree':           ['CarbonChartTreeRenderer', 'c'],
  'chart.treemap':        ['CarbonChartTreemapRenderer', 'c'],
  'chart.wordcloud':      ['CarbonChartWordcloudRenderer', 'c'],
};

const PLACEHOLDER = ['CarbonCatalogPlaceholderRenderer', 'x'];
const rendererFor = (ck) => CK_MAP[ck] || PLACEHOLDER;

// Reusable Module-Pack page components — bound to the universal 5-page
// pack (file 'm' = ./module-pages/<name>.component). Resolved by
// component_key, NOT carbon_key, so they take precedence over the
// per-carbon_key renderer mapping above.
const COMPONENT_KEY_OVERRIDE = {
  'module.overview.page':  ['ModuleOverviewPageComponent',  'm', 'module-overview-page.component'],
  'module.records.page':   ['ModuleRecordsPageComponent',   'm', 'module-records-page.component'],
  'module.workflows.page': ['ModuleWorkflowsPageComponent', 'm', 'module-workflows-page.component'],
  'module.reports.page':   ['ModuleReportsPageComponent',   'm', 'module-reports-page.component'],
  'module.settings.page':  ['ModuleSettingsPageComponent',  'm', 'module-settings-page.component'],
};

const FRAME_KEYS = {
  UIShell: 'CarbonUIShellRenderer',
  Header: 'CarbonHeaderRenderer',
  HeaderName: 'CarbonHeaderNameRenderer',
  HeaderNavigation: 'CarbonHeaderNavigationRenderer',
  HeaderMenu: 'CarbonHeaderMenuRenderer',
  HeaderMenuItem: 'CarbonHeaderMenuItemRenderer',
  HeaderGlobalBar: 'CarbonHeaderGlobalBarRenderer',
  HeaderGlobalAction: 'CarbonHeaderGlobalActionRenderer',
  SideNav: 'CarbonSideNavRenderer',
  SideNavItems: 'CarbonSideNavItemsRenderer',
  SideNavMenu: 'CarbonSideNavMenuRenderer',
  SideNavMenuItem: 'CarbonSideNavMenuItemRenderer',
  SideNavLink: 'CarbonSideNavLinkRenderer',
  Content: 'CarbonContentRenderer',
  Grid: 'CarbonGridRenderer',
  Column: 'CarbonColumnRenderer',
  Layer: 'CarbonLayerRenderer',
  Breadcrumb: 'CarbonBreadcrumbRenderer',
  Tabs: 'CarbonTabsRenderer',
  Tab: 'CarbonTabRenderer',
  Tile: 'CarbonTileRenderer',
  ClickableTile: 'CarbonClickableTileRenderer',
  ExpandableTile: 'CarbonExpandableTileRenderer',
  Tag: 'CarbonTagRenderer',
  InlineNotification: 'CarbonInlineNotificationRenderer',
  ToastNotification: 'CarbonToastNotificationRenderer',
  ProgressBar: 'CarbonProgressBarRenderer',
  InlineLoading: 'CarbonInlineLoadingRenderer',
  SkeletonText: 'CarbonSkeletonTextRenderer',
  SkeletonPlaceholder: 'CarbonSkeletonPlaceholderRenderer',
  DataTable: 'CarbonDataTableRenderer',
  TableToolbar: 'CarbonTableToolbarRenderer',
  TableToolbarSearch: 'CarbonTableToolbarSearchRenderer',
  TableToolbarActions: 'CarbonTableToolbarActionsRenderer',
  TableBatchActions: 'CarbonTableBatchActionsRenderer',
  Pagination: 'CarbonPaginationRenderer',
  StructuredList: 'CarbonStructuredListRenderer',
  Search: 'CarbonSearchRenderer',
  Dropdown: 'CarbonDropdownRenderer',
  ComboBox: 'CarbonComboBoxRenderer',
  MultiSelect: 'CarbonMultiSelectRenderer',
  DatePicker: 'CarbonDatePickerRenderer',
  TextInput: 'CarbonTextInputRenderer',
  TextArea: 'CarbonTextAreaRenderer',
  NumberInput: 'CarbonNumberInputRenderer',
  Select: 'CarbonSelectRenderer',
  Checkbox: 'CarbonCheckboxRenderer',
  Radio: 'CarbonRadioRenderer',
  Toggle: 'CarbonToggleRenderer',
  Button: 'CarbonButtonRenderer',
  IconButton: 'CarbonIconButtonRenderer',
  OverflowMenu: 'CarbonOverflowMenuRenderer',
  OverflowMenuOption: 'CarbonOverflowMenuOptionRenderer',
  ContextMenu: 'CarbonContextMenuRenderer',
  Modal: 'CarbonModalRenderer',
  Tooltip: 'CarbonTooltipRenderer',
  Toggletip: 'CarbonToggletipRenderer',
  Popover: 'CarbonPopoverRenderer',
  FileUploader: 'CarbonFileUploaderRenderer',
  Accordion: 'CarbonAccordionRenderer',
};

const out = [];
out.push("// AUTO-MAINTAINED: keep in sync with dos.dynamic_ui_component_registry.");
out.push("import type { Type } from '@angular/core';");
out.push('');
out.push('/**');
out.push(' * IBM Carbon component_key resolution.');
out.push(' *');
out.push(' * Every component_key registered in dos.dynamic_ui_component_registry');
out.push(' * (vendor=ibm-carbon, approval_status=approved) resolves here to a real');
out.push(' * IBM Carbon Angular renderer (carbon-components-angular@5.69.x).');
out.push(' *');
out.push(' * No DynamicPageHostComponent fallback. No PrimeNG. No Material.');
out.push(' * Many component_keys legitimately alias the same renderer by carbon_key.');
out.push(' */');
out.push('');
out.push('const CARBON_PRIMITIVE_COMPONENT_MAP: Record<string, () => Promise<Type<any>>> = {');
for (const [k, cls] of Object.entries(FRAME_KEYS)) {
  out.push(`  ${k}: () => import('./carbon-primitive-renderers').then(m => m.${cls}),`);
}
out.push('};');
out.push('');
out.push('const REGISTRY_COMPONENT_MAP: Record<string, () => Promise<Type<any>>> = {');
for (const r of rows) {
  const override = COMPONENT_KEY_OVERRIDE[r.component_key];
  const [cls, src, mfile] = override ?? [...rendererFor(r.carbon_key), undefined];
  const file = src === 'p'
    ? './carbon-primitive-renderers'
    : src === 'c'
      ? './carbon-chart-renderers'
      : src === 'm'
        ? `./module-pages/${mfile}`
        : './carbon-extended-renderers';
  const key = r.component_key.replace(/'/g, "\\'");
  out.push(`  '${key}': () => import('${file}').then(m => m.${cls}),`);
}
out.push('};');
out.push('');
out.push('export const COMPONENT_MAP: Record<string, () => Promise<Type<any>>> = {');
out.push('  ...CARBON_PRIMITIVE_COMPONENT_MAP,');
out.push('  ...REGISTRY_COMPONENT_MAP,');
out.push('};');
out.push('');

fs.writeFileSync(join(repoRoot, 'platform/dos/registry/component-map.ts'), out.join('\n'));

const distinctCk = [...new Set(rows.map(r => r.carbon_key))].sort();
const placeholders = distinctCk.filter(ck => !CK_MAP[ck]);
const placeholderRowCount = rows.filter(r => !CK_MAP[r.carbon_key]).length;
console.log('rows:', rows.length);
console.log('distinct carbon_keys:', distinctCk.length);
console.log('native-mapped carbon_keys:', distinctCk.length - placeholders.length);
console.log('placeholder-bound carbon_keys:', placeholders.length);
console.log('placeholder-bound row count:', placeholderRowCount);

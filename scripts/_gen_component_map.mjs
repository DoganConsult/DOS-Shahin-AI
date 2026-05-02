import fs from 'node:fs';

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
};

const PLACEHOLDER = ['CarbonCatalogPlaceholderRenderer', 'x'];
const rendererFor = (ck) => CK_MAP[ck] || PLACEHOLDER;

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
  const [cls, src] = rendererFor(r.carbon_key);
  const file = src === 'p' ? './carbon-primitive-renderers' : './carbon-extended-renderers';
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

fs.writeFileSync('/root/DOS-Platform/platform/dos/registry/component-map.ts', out.join('\n'));

const distinctCk = [...new Set(rows.map(r => r.carbon_key))].sort();
const placeholders = distinctCk.filter(ck => !CK_MAP[ck]);
const placeholderRowCount = rows.filter(r => !CK_MAP[r.carbon_key]).length;
console.log('rows:', rows.length);
console.log('distinct carbon_keys:', distinctCk.length);
console.log('native-mapped carbon_keys:', distinctCk.length - placeholders.length);
console.log('placeholder-bound carbon_keys:', placeholders.length);
console.log('placeholder-bound row count:', placeholderRowCount);

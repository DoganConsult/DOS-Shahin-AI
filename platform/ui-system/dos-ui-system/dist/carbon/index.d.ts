/**
 * @dos/ui-system — Carbon adapter barrel.
 *
 * One-source rule: products/modules/services MUST import Carbon-backed
 * primitives from `@dos/ui-system` (this barrel is re-exported from the
 * package root). Direct imports of `carbon-components-angular` or
 * `@carbon/*-angular` outside this folder fail `ui-os-carbon-boundary-guard`.
 */
export * from './dos-carbon-button.component';
export * from './dos-carbon-text-input.component';
export * from './dos-carbon-select.component';
export * from './dos-carbon-modal.component';
export * from './dos-carbon-tabs.component';
export * from './dos-carbon-data-table.component';
export * from './dos-carbon-header-shell.component';
export * from './dos-carbon-tile.component';
export * from './dos-carbon-notification.component';
export * from './dos-carbon-tag.component';
export * from './dos-carbon-structured-list.component';
export * from './dos-carbon-side-nav.component';
export * from './dos-carbon-icon.component';
export * from './dos-carbon-grid.component';
export * from './dos-carbon-header-action.component';
export * from './dos-carbon-checkbox.component';
export * from './dos-carbon-radio.component';
export * from './dos-carbon-toggle.component';
export * from './dos-carbon-slider.component';
export * from './dos-carbon-number-input.component';
export * from './dos-carbon-text-area.component';
export * from './dos-carbon-password-input.component';
export * from './dos-carbon-search.component';
export * from './dos-carbon-dropdown.component';
export * from './dos-carbon-combo-box.component';
export * from './dos-carbon-multi-select.component';
export * from './dos-carbon-date-picker.component';
export * from './dos-carbon-time-picker.component';
export * from './dos-carbon-file-uploader.component';
export * from './dos-carbon-tooltip.component';
export * from './dos-carbon-popover.component';
export * from './dos-carbon-toggle-tip.component';
export * from './dos-carbon-inline-loading.component';
export * from './dos-carbon-loading.component';
export * from './dos-carbon-skeleton.component';
export * from './dos-carbon-progress-bar.component';
export * from './dos-carbon-progress-indicator.component';
export * from './dos-carbon-accordion.component';
export * from './dos-carbon-breadcrumb.component';
export * from './dos-carbon-pagination.component';
export * from './dos-carbon-overflow-menu.component';
export * from './dos-carbon-link.component';
export * from './dos-carbon-code-snippet.component';
export * from './dos-carbon-contained-list.component';
export * from './dos-carbon-treeview.component';
export * from './dos-carbon-content-switcher.component';
export * from './dos-carbon-layer.component';
export * from './dos-carbon-chart.component';
export { armCarbonOnlyCustomElementRegistry, isCarbonOnlyArmed, type CarbonOnlyArmOptions, } from './wc-registry-allowlist';

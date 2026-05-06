# Workspace Contract Audit Report

Generated: 2026-05-06T11:21:42.720Z
Runtime Available: No

## Summary

- Seed keys: 60
- Registry keys: 67
- Tenant bindings: 60
- Runtime emitted: 0
- DOM rendered: 0
- Visible: 0
- Catalog-only: 32
- Structural: 14
- Visual: 7
- Action: 7
- Data-binding: 7
- Missing binding: 7
- Missing rendererKey: 46
- Missing COMPONENT_MAP: 0
- Permission blocked: 0
- Entitlement blocked: 0
- Hidden/zero-size DOM: 0
- Undefined aria/action: 0

## Live Comparisons

- Seed → Registry missing: -7
- Registry → Binding missing: 7
- Binding → Runtime missing: 60
- Runtime → DOM missing: 0

## Failure Rules

❌ 2 failures:

- `shell-host-branching`: shell.isTrailingHeaderSurface
- `workspace-home-template-binding`: /workspace-home

## Audit Table

| componentKey | componentType | rendererKey | carbonKey | zone | category | source | registryApproved | hasBinding | componentMapHit | emitted | reason |
|-------------|---------------|-------------|-----------|------|----------|--------|-----------------|------------|----------------|---------|--------|
| workspace.frame.ui-shell | shell-frame | shell.frame | ui-shell | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.header | shell-frame | shell.frame | header | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.header-name | shell-frame | shell.frame | header-name | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.header-navigation | shell-frame | shell.frame | header-navigation | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.header-menu | shell-frame | shell.frame | header-menu | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.header-menu-item | shell-frame | shell.frame | header-menu-item | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.header-global-bar | shell-frame | shell.frame | header-global-bar | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.header-global-action | shell-frame | shell.frame | header-global-action | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.side-nav | shell-frame | shell.frame | side-nav | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.side-nav-items | shell-frame | shell.frame | side-nav-items | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.side-nav-menu | shell-frame | shell.frame | side-nav-menu | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.side-nav-menu-item | shell-frame | shell.frame | side-nav-menu-item | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.side-nav-link | shell-frame | shell.frame | side-nav-link | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.frame.content | shell-frame | shell.frame | content | - | structural | seed | ✓ | ✓ | ✓ | ✗ | N/A |
| workspace.nav.grid | nav | - | grid | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.nav.column | nav | - | column | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.nav.layer | nav | - | layer | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.nav.breadcrumb | nav | - | breadcrumb | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.nav.tabs | nav | - | tabs | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.nav.tab | nav | - | tab | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.nav.tile | nav | - | tile | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.nav.clickable-tile | nav | - | clickable-tile | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.nav.expandable-tile | nav | - | expandable-tile | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.nav.tag | nav | - | tag | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.data.data-table | data | - | data_table | - | data-binding | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.data.table-toolbar | data | - | table_toolbar | - | data-binding | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.data.table-toolbar-search | data | - | table_toolbar_search | - | data-binding | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.data.table-toolbar-actions | data | - | table_toolbar_actions | - | data-binding | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.data.table-batch-actions | data | - | table_batch_actions | - | data-binding | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.data.pagination | data | - | pagination | - | data-binding | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.data.structured-list | data | - | structured-list | - | data-binding | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.search | input | - | search | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.dropdown | input | - | dropdown | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.combo-box | input | - | combo_box | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.multi-select | input | - | multi_select | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.date-picker | input | - | date_picker | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.text-input | input | - | text_input | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.text-area | input | - | text_area | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.number-input | input | - | number-input | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.select | input | - | select | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.checkbox | input | - | checkbox | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.radio | input | - | radio | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.input.toggle | input | - | toggle | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.action.button | action | - | button | - | action | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.action.icon-button | action | - | icon_button | - | action | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.action.overflow-menu | action | - | overflow-menu | - | action | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.action.overflow-menu-option | action | - | overflow-menu-option | - | action | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.action.modal | action | - | modal | - | action | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.action.inline-notification | action | - | inline-notification | - | action | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.action.toast-notification | action | - | toast-notification | - | action | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.polish.tooltip | polish | - | tooltip | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.polish.toggletip | polish | - | toggletip | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.polish.popover | polish | - | popover | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.polish.progress-bar | polish | - | progress-bar | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.polish.inline-loading | polish | - | inline-loading | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.polish.skeleton-text | polish | - | skeleton-text | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.polish.skeleton-placeholder | polish | - | skeleton-placeholder | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.polish.context-menu | polish | - | context-menu | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.polish.file-uploader | polish | - | file-uploader | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.polish.accordion | polish | - | accordion | - | catalog-only | seed | ✓ | ✓ | ✗ | ✗ | no-rendererKey; |
| workspace.shell.brand | shell.brand | shell.brand | header-name | header | visual-shell | registry | ✓ | ✗ | ✓ | ✗ | no-binding; |
| workspace.shell.empty-state | shell.empty-state | shell.empty-state | tile | main | visual-main | registry | ✓ | ✗ | ✓ | ✗ | no-binding; |
| workspace.shell.module-cards | shell.module-cards | shell.module-cards | tile | main | visual-main | registry | ✓ | ✗ | ✓ | ✗ | no-binding; |
| workspace.shell.settings-action | shell.settings-action | shell.settings-action | header-global-action | header | visual-shell | registry | ✓ | ✗ | ✓ | ✗ | no-binding; |
| workspace.shell.sidebar-nav | shell.sidebar-nav | shell.sidebar-nav | side-nav-items | sidebar | visual-nav | registry | ✓ | ✗ | ✓ | ✗ | no-binding; |
| workspace.shell.user-menu | shell.user-menu | shell.user-menu | header-global-action | header | visual-shell | registry | ✓ | ✗ | ✓ | ✗ | no-binding; |
| workspace.shell.workspace-title | shell.workspace-title | shell.workspace-title | header-name | header | visual-shell | registry | ✓ | ✗ | ✓ | ✗ | no-binding; |

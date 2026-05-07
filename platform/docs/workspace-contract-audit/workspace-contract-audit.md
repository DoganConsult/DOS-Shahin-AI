# Workspace Contract Audit Report (v2)

Generated: 2026-05-07T05:44:54.323Z

## Resolved Inputs

- Tenant: `14f273cf260a4736` (status=active, source=auto-first-active)
- Caller user: `70dd0034-bb20-4f9b-a9df-a308cd902efa` (member=true, source=auto-first-member)
- Product: `foundation` (active=true, source=auto-first-active)

## Runtime Probe

- URL: `http://localhost:4015/api/ui-os/workspace-runtime?tenant_id=14f273cf260a4736&user_id=70dd0034-bb20-4f9b-a9df-a308cd902efa&product_code=foundation`
- HTTP status: 200
- ok: true
- surfaces emitted: 21

## DOM Probe

- mode: disabled
- reason: option-B: DOM/visible columns removed pending Playwright probe for /workspace-home

## Summary

- seedKeyCount: 67
- registryKeyCount: 68
- tenantBindingCount: 68
- runtimeEmittedCount: 21
- catalogOnly: 0
- structural: 14
- visual: 28
- action: 7
- dataBinding: 19
- missingBinding: 0
- missingRendererKeyForRenderable: 0
- visualMappedCount: 54
- structuralNullCount: 14
- unmappedCount: 0

## Set Comparisons

- onlyInSeed (0)
- onlyInRegistry (1): `workspace.shell.global-quick-actions`
- seedAndRegistry (67): `workspace.action.button`, `workspace.action.icon-button`, `workspace.action.inline-notification`, `workspace.action.modal`, `workspace.action.overflow-menu`, `workspace.action.overflow-menu-option`, `workspace.action.toast-notification`, `workspace.data.data-table`, `workspace.data.pagination`, `workspace.data.structured-list`, `workspace.data.table-batch-actions`, `workspace.data.table-toolbar`, `workspace.data.table-toolbar-actions`, `workspace.data.table-toolbar-search`, `workspace.frame.content`, `workspace.frame.header`, `workspace.frame.header-global-action`, `workspace.frame.header-global-bar`, `workspace.frame.header-menu`, `workspace.frame.header-menu-item`, `workspace.frame.header-name`, `workspace.frame.header-navigation`, `workspace.frame.side-nav`, `workspace.frame.side-nav-items`, `workspace.frame.side-nav-link`, `workspace.frame.side-nav-menu`, `workspace.frame.side-nav-menu-item`, `workspace.frame.ui-shell`, `workspace.input.checkbox`, `workspace.input.combo-box`, `workspace.input.date-picker`, `workspace.input.dropdown`, `workspace.input.multi-select`, `workspace.input.number-input`, `workspace.input.radio`, `workspace.input.search`, `workspace.input.select`, `workspace.input.text-area`, `workspace.input.text-input`, `workspace.input.toggle`, `workspace.nav.breadcrumb`, `workspace.nav.clickable-tile`, `workspace.nav.column`, `workspace.nav.expandable-tile`, `workspace.nav.grid`, `workspace.nav.layer`, `workspace.nav.tab`, `workspace.nav.tabs`, `workspace.nav.tag`, `workspace.nav.tile`, `workspace.polish.accordion`, `workspace.polish.context-menu`, `workspace.polish.file-uploader`, `workspace.polish.inline-loading`, `workspace.polish.popover`, `workspace.polish.progress-bar`, `workspace.polish.skeleton-placeholder`, `workspace.polish.skeleton-text`, `workspace.polish.toggletip`, `workspace.polish.tooltip`, `workspace.shell.brand`, `workspace.shell.empty-state`, `workspace.shell.module-cards`, `workspace.shell.settings-action`, `workspace.shell.sidebar-nav`, `workspace.shell.user-menu`, `workspace.shell.workspace-title`
- onlyInBinding (0)
- registryNotBound (0)
- onlyInRuntime (0)
- bindingNotEmittedByRuntime (47): `workspace.action.button`, `workspace.action.icon-button`, `workspace.action.inline-notification`, `workspace.action.modal`, `workspace.action.overflow-menu`, `workspace.action.overflow-menu-option`, `workspace.action.toast-notification`, `workspace.data.data-table`, `workspace.data.pagination`, `workspace.data.structured-list`, `workspace.data.table-batch-actions`, `workspace.data.table-toolbar`, `workspace.data.table-toolbar-actions`, `workspace.data.table-toolbar-search`, `workspace.input.checkbox`, `workspace.input.combo-box`, `workspace.input.date-picker`, `workspace.input.dropdown`, `workspace.input.multi-select`, `workspace.input.number-input`, `workspace.input.radio`, `workspace.input.search`, `workspace.input.select`, `workspace.input.text-area`, `workspace.input.text-input`, `workspace.input.toggle`, `workspace.nav.breadcrumb`, `workspace.nav.clickable-tile`, `workspace.nav.column`, `workspace.nav.expandable-tile`, `workspace.nav.grid`, `workspace.nav.layer`, `workspace.nav.tab`, `workspace.nav.tabs`, `workspace.nav.tag`, `workspace.nav.tile`, `workspace.polish.accordion`, `workspace.polish.context-menu`, `workspace.polish.file-uploader`, `workspace.polish.inline-loading`, `workspace.polish.popover`, `workspace.polish.progress-bar`, `workspace.polish.skeleton-placeholder`, `workspace.polish.skeleton-text`, `workspace.polish.toggletip`, `workspace.polish.tooltip`, `workspace.shell.empty-state`

## Failures (0)

OK — no evidence-backed failures.

## Verdict: WORKSPACE_CONTRACT_AUDIT_GATE_PASS

## Audit Table

| componentKey | componentType | rendererKey | carbonKey | zone | category | source | approved | bound | enabled | mapStatus | emitted | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| workspace.action.button | action | shell.catalog-action | button | main | action | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.action.icon-button | action | shell.catalog-action | icon_button | main | action | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.action.inline-notification | action | shell.catalog-action | inline-notification | main | action | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.action.modal | action | shell.catalog-action | modal | main | action | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.action.overflow-menu | action | shell.catalog-action | overflow-menu | main | action | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.action.overflow-menu-option | action | shell.catalog-action | overflow-menu-option | main | action | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.action.toast-notification | action | shell.catalog-action | toast-notification | main | action | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.data.data-table | data | shell.catalog-data | data_table | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.data.pagination | data | shell.catalog-data | pagination | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.data.structured-list | data | shell.catalog-data | structured-list | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.data.table-batch-actions | data | shell.catalog-data | table_batch_actions | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.data.table-toolbar | data | shell.catalog-data | table_toolbar | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.data.table-toolbar-actions | data | shell.catalog-data | table_toolbar_actions | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.data.table-toolbar-search | data | shell.catalog-data | table_toolbar_search | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.frame.content | shell-frame | shell.frame | content | main | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.header | shell-frame | shell.frame | header | header | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.header-global-action | shell-frame | shell.frame | header-global-action | header | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.header-global-bar | shell-frame | shell.frame | header-global-bar | header | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.header-menu | shell-frame | shell.frame | header-menu | header | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.header-menu-item | shell-frame | shell.frame | header-menu-item | header | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.header-name | shell-frame | shell.frame | header-name | header | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.header-navigation | shell-frame | shell.frame | header-navigation | header | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.side-nav | shell-frame | shell.frame | side-nav | sidebar | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.side-nav-items | shell-frame | shell.frame | side-nav-items | sidebar | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.side-nav-link | shell-frame | shell.frame | side-nav-link | sidebar | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.side-nav-menu | shell-frame | shell.frame | side-nav-menu | sidebar | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.side-nav-menu-item | shell-frame | shell.frame | side-nav-menu-item | sidebar | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.frame.ui-shell | shell-frame | shell.frame | ui-shell | main | structural | seed | Y | Y | Y | structural-null | Y | OK |
| workspace.input.checkbox | input | shell.catalog-input | checkbox | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.input.combo-box | input | shell.catalog-input | combo_box | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.input.date-picker | input | shell.catalog-input | date_picker | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.input.dropdown | input | shell.catalog-input | dropdown | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.input.multi-select | input | shell.catalog-input | multi_select | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.input.number-input | input | shell.catalog-input | number-input | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.input.radio | input | shell.catalog-input | radio | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.input.search | input | shell.catalog-input | search | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.input.select | input | shell.catalog-input | select | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.input.text-area | input | shell.catalog-input | text_area | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.input.text-input | input | shell.catalog-input | text_input | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.input.toggle | input | shell.catalog-input | toggle | main | data-binding | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.nav.breadcrumb | nav | shell.catalog-nav | breadcrumb | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.nav.clickable-tile | nav | shell.catalog-nav | clickable-tile | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.nav.column | nav | shell.catalog-nav | column | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.nav.expandable-tile | nav | shell.catalog-nav | expandable-tile | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.nav.grid | nav | shell.catalog-nav | grid | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.nav.layer | nav | shell.catalog-nav | layer | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.nav.tab | nav | shell.catalog-nav | tab | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.nav.tabs | nav | shell.catalog-nav | tabs | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.nav.tag | nav | shell.catalog-nav | tag | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.nav.tile | nav | shell.catalog-nav | tile | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.polish.accordion | polish | shell.catalog-polish | accordion | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.polish.context-menu | polish | shell.catalog-polish | context-menu | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.polish.file-uploader | polish | shell.catalog-polish | file-uploader | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.polish.inline-loading | polish | shell.catalog-polish | inline-loading | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.polish.popover | polish | shell.catalog-polish | popover | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.polish.progress-bar | polish | shell.catalog-polish | progress-bar | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.polish.skeleton-placeholder | polish | shell.catalog-polish | skeleton-placeholder | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.polish.skeleton-text | polish | shell.catalog-polish | skeleton-text | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.polish.toggletip | polish | shell.catalog-polish | toggletip | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.polish.tooltip | polish | shell.catalog-polish | tooltip | main | visual-main | seed | Y | Y | Y | visual-mapped | N | OK |
| workspace.shell.brand | shell.brand | shell.brand | header-name | header | visual-shell | seed | Y | Y | Y | visual-mapped | Y | OK |
| workspace.shell.empty-state | shell.empty-state | shell.empty-state | tile | main | visual-main | seed | Y | Y | N | visual-mapped | N | OK |
| workspace.shell.global-quick-actions | shell.global-quick-actions | shell.global-quick-actions | header-global-action | header | visual-shell | registry | Y | Y | Y | visual-mapped | Y | OK |
| workspace.shell.module-cards | shell.module-cards | shell.module-cards | tile | main | visual-main | seed | Y | Y | Y | visual-mapped | Y | OK |
| workspace.shell.settings-action | shell.settings-action | shell.settings-action | header-global-action | header | visual-shell | seed | Y | Y | Y | visual-mapped | Y | OK |
| workspace.shell.sidebar-nav | shell.sidebar-nav | shell.sidebar-nav | side-nav-items | sidebar | visual-nav | seed | Y | Y | Y | visual-mapped | Y | OK |
| workspace.shell.user-menu | shell.user-menu | shell.user-menu | header-global-action | header | visual-shell | seed | Y | Y | Y | visual-mapped | Y | OK |
| workspace.shell.workspace-title | shell.workspace-title | shell.workspace-title | header-name | header | visual-shell | seed | Y | Y | Y | visual-mapped | Y | OK |

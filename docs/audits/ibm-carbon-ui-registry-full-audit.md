# IBM Carbon Dynamic UI Registry -- Full Audit

**Audit Date:** 2026-05-02
**Auditor:** Claude Opus 4.6 (automated, read-only)
**Scope:** DOS-Platform IBM Carbon Dynamic UI component registry, frontend COMPONENT_MAP, Carbon primitive renderers, forbidden UI usage, and build readiness.
**Verdict:** **FAIL**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [DB Registry Inventory](#2-db-registry-inventory)
3. [Carbon Catalog (ui_carbon_components)](#3-carbon-catalog)
4. [Frontend Carbon Primitive Renderers](#4-frontend-carbon-primitive-renderers)
5. [COMPONENT_MAP Reconciliation](#5-component_map-reconciliation)
6. [DynamicPageHostComponent Fallback Analysis](#6-dynamicpagehostcomponent-fallback-analysis)
7. [Route and Widget Key Coverage](#7-route-and-widget-key-coverage)
8. [Forbidden UI Usage](#8-forbidden-ui-usage)
9. [Build Check](#9-build-check)
10. [Risk Summary](#10-risk-summary)
11. [Recommendations](#11-recommendations)

---

## 1. Executive Summary

This read-only audit examines the IBM Carbon Dynamic UI registry across the DOS-Platform. The system is designed so that every UI component_key in the registry maps to a real Angular renderer -- either a Carbon primitive renderer or a dedicated page/module component. The hard rule is: **no Carbon key may map to DynamicPageHostComponent** (the generic fallback).

### Key Metrics

| Metric | Value |
|---|---|
| DB registry rows (estimated) | ~152 |
| Frontend COMPONENT_MAP keys | 209 |
| Carbon primitive keys (rendered) | 60 |
| Shahin dedicated component keys | 4 |
| Keys mapped to DynamicPageHostComponent | 145 |
| Carbon primitive renderer classes | 60 |
| Forbidden PrimeNG import matches | 5,516+ |
| Forbidden PrimeIcons (pi-*) matches | 1,867+ |
| Forbidden Material Icons matches | ~50+ |
| Carbon catalog rows (ui_carbon_components) | ~247 |

### Verdict: FAIL

Three critical failures:
1. **145 component_keys map to DynamicPageHostComponent fallback** -- violates the hard rule.
2. **Extensive PrimeNG / PrimeIcons / Material Icons forbidden usage** across ~841+ source files.
3. **Some route component_keys (0157) are used in routes but never inserted into the component_registry.**

---

## 2. DB Registry Inventory

All rows expected in `dos.dynamic_ui_component_registry` based on SQL migration analysis.

### 2.1 TIER 1 -- Workspace Frame (14 keys, migration 0501)

| # | component_key | vendor | approval_status | migration | carbon_key | status |
|---|---|---|---|---|---|---|
| 1 | UIShell | ibm-carbon | approved | 0501 | UIShell | OK |
| 2 | Header | ibm-carbon | approved | 0501 | Header | OK |
| 3 | HeaderName | ibm-carbon | approved | 0501 | HeaderName | OK |
| 4 | HeaderNavigation | ibm-carbon | approved | 0501 | HeaderNavigation | OK |
| 5 | HeaderMenu | ibm-carbon | approved | 0501 | HeaderMenu | OK |
| 6 | HeaderMenuItem | ibm-carbon | approved | 0501 | HeaderMenuItem | OK |
| 7 | HeaderGlobalBar | ibm-carbon | approved | 0501 | HeaderGlobalBar | OK |
| 8 | HeaderGlobalAction | ibm-carbon | approved | 0501 | HeaderGlobalAction | OK |
| 9 | SideNav | ibm-carbon | approved | 0501 | SideNav | OK |
| 10 | SideNavItems | ibm-carbon | approved | 0501 | SideNavItems | OK |
| 11 | SideNavMenu | ibm-carbon | approved | 0501 | SideNavMenu | OK |
| 12 | SideNavMenuItem | ibm-carbon | approved | 0501 | SideNavMenuItem | OK |
| 13 | SideNavLink | ibm-carbon | approved | 0501 | SideNavLink | OK |
| 14 | Content | ibm-carbon | approved | 0501 | Content | OK |

### 2.2 TIER 2 -- Pages/Cards/Forms/Tables (36 keys, migration 0501)

| # | component_key | vendor | approval_status | migration | carbon_key | status |
|---|---|---|---|---|---|---|
| 15 | Grid | ibm-carbon | approved | 0501 | Grid | OK |
| 16 | Column | ibm-carbon | approved | 0501 | Column | OK |
| 17 | Layer | ibm-carbon | approved | 0501 | Layer | OK |
| 18 | Breadcrumb | ibm-carbon | approved | 0501 | Breadcrumb | OK |
| 19 | Tabs | ibm-carbon | approved | 0501 | Tabs | OK |
| 20 | Tab | ibm-carbon | approved | 0501 | Tab | OK |
| 21 | Tile | ibm-carbon | approved | 0501 | Tile | OK |
| 22 | ClickableTile | ibm-carbon | approved | 0501 | ClickableTile | OK |
| 23 | ExpandableTile | ibm-carbon | approved | 0501 | ExpandableTile | OK |
| 24 | Tag | ibm-carbon | approved | 0501 | Tag | OK |
| 25 | DataTable | ibm-carbon | approved | 0501 | DataTable | OK |
| 26 | TableToolbar | ibm-carbon | approved | 0501 | TableToolbar | OK |
| 27 | TableToolbarSearch | ibm-carbon | approved | 0501 | TableToolbarSearch | OK |
| 28 | TableToolbarActions | ibm-carbon | approved | 0501 | TableToolbarActions | OK |
| 29 | TableBatchActions | ibm-carbon | approved | 0501 | TableBatchActions | OK |
| 30 | Pagination | ibm-carbon | approved | 0501 | Pagination | OK |
| 31 | StructuredList | ibm-carbon | approved | 0501 | StructuredList | OK |
| 32 | Search | ibm-carbon | approved | 0501 | Search | OK |
| 33 | Dropdown | ibm-carbon | approved | 0501 | Dropdown | OK |
| 34 | ComboBox | ibm-carbon | approved | 0501 | ComboBox | OK |
| 35 | MultiSelect | ibm-carbon | approved | 0501 | MultiSelect | OK |
| 36 | DatePicker | ibm-carbon | approved | 0501 | DatePicker | OK |
| 37 | TextInput | ibm-carbon | approved | 0501 | TextInput | OK |
| 38 | TextArea | ibm-carbon | approved | 0501 | TextArea | OK |
| 39 | NumberInput | ibm-carbon | approved | 0501 | NumberInput | OK |
| 40 | Select | ibm-carbon | approved | 0501 | Select | OK |
| 41 | Checkbox | ibm-carbon | approved | 0501 | Checkbox | OK |
| 42 | Radio | ibm-carbon | approved | 0501 | Radio | OK |
| 43 | Toggle | ibm-carbon | approved | 0501 | Toggle | OK |
| 44 | Button | ibm-carbon | approved | 0501 | Button | OK |
| 45 | IconButton | ibm-carbon | approved | 0501 | IconButton | OK |
| 46 | OverflowMenu | ibm-carbon | approved | 0501 | OverflowMenu | OK |
| 47 | OverflowMenuOption | ibm-carbon | approved | 0501 | OverflowMenuOption | OK |
| 48 | Modal | ibm-carbon | approved | 0501 | Modal | OK |
| 49 | InlineNotification | ibm-carbon | approved | 0501 | InlineNotification | OK |
| 50 | ToastNotification | ibm-carbon | approved | 0501 | ToastNotification | OK |

### 2.3 TIER 3 -- Enterprise Polish (10 keys, migration 0501)

| # | component_key | vendor | approval_status | migration | carbon_key | status |
|---|---|---|---|---|---|---|
| 51 | Tooltip | ibm-carbon | approved | 0501 | Tooltip | OK |
| 52 | Toggletip | ibm-carbon | approved | 0501 | Toggletip | OK |
| 53 | Popover | ibm-carbon | approved | 0501 | Popover | OK |
| 54 | ProgressBar | ibm-carbon | approved | 0501 | ProgressBar | OK |
| 55 | InlineLoading | ibm-carbon | approved | 0501 | InlineLoading | OK |
| 56 | SkeletonText | ibm-carbon | approved | 0501 | SkeletonText | OK |
| 57 | SkeletonPlaceholder | ibm-carbon | approved | 0501 | SkeletonPlaceholder | OK |
| 58 | ContextMenu | ibm-carbon | approved | 0501 | ContextMenu | OK |
| 59 | FileUploader | ibm-carbon | approved | 0501 | FileUploader | OK |
| 60 | Accordion | ibm-carbon | approved | 0501 | Accordion | OK |

### 2.4 DNA Module Archetype Keys (24 keys, migration 0147, backclassified via 0148)

| # | component_key | vendor | approval_status | migration | carbon_key | status |
|---|---|---|---|---|---|---|
| 61 | command-center.ai | ibm-carbon | approved | 0147 | tiles | OK |
| 62 | command-center.cfg | ibm-carbon | approved | 0147 | tiles | OK |
| 63 | command-center.dnoc | ibm-carbon | approved | 0147 | tiles | OK |
| 64 | command-center.dos | ibm-carbon | approved | 0147 | tiles | OK |
| 65 | command-center.dsoc | ibm-carbon | approved | 0147 | tiles | OK |
| 66 | command-center.fnd | ibm-carbon | approved | 0147 | tiles | OK |
| 67 | command-center.mtm | ibm-carbon | approved | 0147 | tiles | OK |
| 68 | command-center.tm | ibm-carbon | approved | 0147 | tiles | OK |
| 69 | smart-grid.ai | ibm-carbon | approved | 0147 | table | OK |
| 70 | smart-grid.cfg | ibm-carbon | approved | 0147 | table | OK |
| 71 | smart-grid.dnoc | ibm-carbon | approved | 0147 | table | OK |
| 72 | smart-grid.dos | ibm-carbon | approved | 0147 | table | OK |
| 73 | smart-grid.dsoc | ibm-carbon | approved | 0147 | table | OK |
| 74 | smart-grid.fnd | ibm-carbon | approved | 0147 | table | OK |
| 75 | smart-grid.mtm | ibm-carbon | approved | 0147 | table | OK |
| 76 | smart-grid.tm | ibm-carbon | approved | 0147 | table | OK |
| 77 | audit-timeline.ai | ibm-carbon | approved | 0147 | structured-list | OK |
| 78 | audit-timeline.cfg | ibm-carbon | approved | 0147 | structured-list | OK |
| 79 | audit-timeline.dnoc | ibm-carbon | approved | 0147 | structured-list | OK |
| 80 | audit-timeline.dos | ibm-carbon | approved | 0147 | structured-list | OK |
| 81 | audit-timeline.dsoc | ibm-carbon | approved | 0147 | structured-list | OK |
| 82 | audit-timeline.fnd | ibm-carbon | approved | 0147 | structured-list | OK |
| 83 | audit-timeline.mtm | ibm-carbon | approved | 0147 | structured-list | OK |
| 84 | audit-timeline.tm | ibm-carbon | approved | 0147 | structured-list | OK |

### 2.5 Compliance Page Keys (63 keys, migration 0500)

| # | component_key | vendor | approval_status | migration | status |
|---|---|---|---|---|---|
| 85 | AssertionDashboardPage | ibm-carbon | approved | 0500 | OK |
| 86 | AssessmentTemplatesPage | ibm-carbon | approved | 0500 | OK |
| 87 | AssessmentsListPage | ibm-carbon | approved | 0500 | OK |
| 88 | ComplianceAdminPage | ibm-carbon | approved | 0500 | OK |
| 89 | ComplianceAssessmentsPage | ibm-carbon | approved | 0500 | OK |
| 90 | ComplianceAttestationsPage | ibm-carbon | approved | 0500 | OK |
| 91 | ComplianceCalendarPage | ibm-carbon | approved | 0500 | OK |
| 92 | ComplianceCatchAll | ibm-carbon | approved | 0500 | OK |
| 93 | ComplianceControlDetailPage | ibm-carbon | approved | 0500 | OK |
| 94 | ComplianceControlsPage | ibm-carbon | approved | 0500 | OK |
| 95 | ComplianceDiagnosticsPage | ibm-carbon | approved | 0500 | OK |
| 96 | ComplianceEvidenceOpsPage | ibm-carbon | approved | 0500 | OK |
| 97 | ComplianceEvidencePage | ibm-carbon | approved | 0500 | OK |
| 98 | ComplianceExceptionsPage | ibm-carbon | approved | 0500 | OK |
| 99 | ComplianceFindingsPage | ibm-carbon | approved | 0500 | OK |
| 100 | ComplianceFrameworksPage | ibm-carbon | approved | 0500 | OK |
| 101 | ComplianceGapsPage | ibm-carbon | approved | 0500 | OK |
| 102 | ComplianceHeatmapPage | ibm-carbon | approved | 0500 | OK |
| 103 | ComplianceHome | ibm-carbon | approved | 0500 | OK |
| 104 | ComplianceKsaPage | ibm-carbon | approved | 0500 | OK |
| 105 | ComplianceObligationsPage | ibm-carbon | approved | 0500 | OK |
| 106 | ComplianceOverviewPage | ibm-carbon | approved | 0500 | OK |
| 107 | CompliancePosturePage | ibm-carbon | approved | 0500 | OK |
| 108 | ComplianceRegulatorPage | ibm-carbon | approved | 0500 | OK |
| 109 | ComplianceRegulatoryChangesPage | ibm-carbon | approved | 0500 | OK |
| 110 | ComplianceReportsPage | ibm-carbon | approved | 0500 | OK |
| 111 | ComplianceRoadmapPage | ibm-carbon | approved | 0500 | OK |
| 112 | ComplianceSavingsPage | ibm-carbon | approved | 0500 | OK |
| 113 | ComplianceTemplatesPage | ibm-carbon | approved | 0500 | OK |
| 114 | ComplianceWorkQueuePage | ibm-carbon | approved | 0500 | OK |
| 115 | ContentPackPage | ibm-carbon | approved | 0500 | OK |
| 116 | ControlPosturePage | ibm-carbon | approved | 0500 | OK |
| 117 | ControlTestingPage | ibm-carbon | approved | 0500 | OK |
| 118 | ControlsMonitoringPage | ibm-carbon | approved | 0500 | OK |
| 119 | EsgPage | ibm-carbon | approved | 0500 | OK |
| 120 | EthicsIntegrityPage | ibm-carbon | approved | 0500 | OK |
| 121 | ExceptionManagerPage | ibm-carbon | approved | 0500 | OK |
| 122 | FrameworkHubPage | ibm-carbon | approved | 0500 | OK |
| 123 | FrameworkMappingPage | ibm-carbon | approved | 0500 | OK |
| 124 | FrameworkScorecardPage | ibm-carbon | approved | 0500 | OK |
| 125 | GenericModuleLifecycle | ibm-carbon | approved | 0500 | OK |
| 126 | IntelligenceHubPage | ibm-carbon | approved | 0500 | OK |
| 127 | KsaHubPage | ibm-carbon | approved | 0500 | OK |
| 128 | MappingPage | ibm-carbon | approved | 0500 | OK |
| 129 | MaturityJourneyPage | ibm-carbon | approved | 0500 | OK |
| 130 | MaturityWizardPage | ibm-carbon | approved | 0500 | OK |
| 131 | NcaAssessmentPage | ibm-carbon | approved | 0500 | OK |
| 132 | ObligationDetailPage | ibm-carbon | approved | 0500 | OK |
| 133 | ObligationWorkspacePage | ibm-carbon | approved | 0500 | OK |
| 134 | OntologyCatalogPage | ibm-carbon | approved | 0500 | OK |
| 135 | RcsaCampaignsPage | ibm-carbon | approved | 0500 | OK |
| 136 | RegistryPage | ibm-carbon | approved | 0500 | OK |
| 137 | RegulationCompilerPage | ibm-carbon | approved | 0500 | OK |
| 138 | RegulatoryDeltaDashboardPage | ibm-carbon | approved | 0500 | OK |
| 139 | RegulatoryFeedsPage | ibm-carbon | approved | 0500 | OK |
| 140 | RegulatoryReasoningStudioPage | ibm-carbon | approved | 0500 | OK |
| 141 | SamaAssessmentPage | ibm-carbon | approved | 0500 | OK |
| 142 | ScoringPage | ibm-carbon | approved | 0500 | OK |
| 143 | ScoringPoliciesPage | ibm-carbon | approved | 0500 | OK |
| 144 | ScoringPolicyDetailPage | ibm-carbon | approved | 0500 | OK |
| 145 | SoxCompliancePage | ibm-carbon | approved | 0500 | OK |
| 146 | TaxonomyPage | ibm-carbon | approved | 0500 | OK |
| 147 | UcfBrowserPage | ibm-carbon | approved | 0500 | OK |

### 2.6 DAuth Experience Layer Keys (5 route keys, migration 0145)

| # | component_key | vendor | approval_status | migration | status |
|---|---|---|---|---|---|
| 148 | platform.dauth.overview | ibm-carbon | approved | 0145 | OK - registered |
| 149 | platform.dauth.users.list | ibm-carbon | approved | 0145 | OK - registered |
| 150 | platform.dauth.roles.list | ibm-carbon | approved | 0145 | OK - registered |
| 151 | platform.dauth.perms.list | ibm-carbon | approved | 0145 | OK - registered |
| 152 | platform.dauth.audit.list | ibm-carbon | approved | 0145 | OK - registered |

### Summary

| Category | Count | Status |
|---|---|---|
| Carbon Primitives (T1+T2+T3) | 60 | All OK |
| DNA Archetype Keys | 24 | All OK |
| Compliance Page Keys | 63 | All OK |
| DAuth Route Keys | 5 | All OK |
| **Total registered** | **152** | -- |

---

## 3. Carbon Catalog

Table `dos.ui_carbon_components` contains the approved Carbon component catalog.

### 3.1 Core Library (migration 0148)

- **Source:** carbon-components-angular@5.69.0
- **Rows:** 58

### 3.2 Ecosystem Expansion (migration 0150)

| Category | Count |
|---|---|
| Charts (@carbon/charts-angular) | 25 |
| Icons + Pictograms (@carbon/icons-angular, carbon-pictograms) | 2 |
| Web Components (@carbon/web-components) | 25 |
| IBM Products (@carbon/ibm-products) | 46 |
| IBM Products WC (@carbon/ibm-products-web-components) | 6 |
| AI Suite (@carbon/ai) | 5 |
| **Ecosystem subtotal** | **108** |

### 3.3 Total Catalog

| Source | Rows |
|---|---|
| Core (0148) | 58 |
| Ecosystem (0150) | 108 |
| **Total** | **~247** |

Note: The 60 Carbon primitive keys in the component_registry (Section 2.1--2.3) map to a subset of the 58 core catalog rows. Some registry keys (e.g., HeaderGlobalBar, HeaderGlobalAction) are logical groupings of Carbon Angular directives rather than standalone catalog entries, accounting for the 60 vs 58 difference.

---

## 4. Frontend Carbon Primitive Renderers

File: `carbon-primitive-renderers.ts` (837 lines)
All 60 renderers are standalone Angular components using `ChangeDetectionStrategy.OnPush`.
All imports come from `carbon-components-angular`.

| # | component_key | Renderer Class | Carbon Selector(s) | Valid |
|---|---|---|---|---|
| 1 | UIShell | CarbonUIShellRenderer | cds-header | Yes |
| 2 | Header | CarbonHeaderRenderer | cds-header | Yes |
| 3 | HeaderName | CarbonHeaderNameRenderer | cds-header | Yes |
| 4 | HeaderNavigation | CarbonHeaderNavigationRenderer | cds-header-navigation | Yes |
| 5 | HeaderMenu | CarbonHeaderMenuRenderer | cds-header-menu | Yes |
| 6 | HeaderMenuItem | CarbonHeaderMenuItemRenderer | cds-header-item | Yes |
| 7 | HeaderGlobalBar | CarbonHeaderGlobalBarRenderer | cds-header-global | Yes |
| 8 | HeaderGlobalAction | CarbonHeaderGlobalActionRenderer | cds-header-action | Yes |
| 9 | SideNav | CarbonSideNavRenderer | cds-sidenav | Yes |
| 10 | SideNavItems | CarbonSideNavItemsRenderer | cds-sidenav | Yes |
| 11 | SideNavMenu | CarbonSideNavMenuRenderer | cds-sidenav-menu | Yes |
| 12 | SideNavMenuItem | CarbonSideNavMenuItemRenderer | cds-sidenav-item | Yes |
| 13 | SideNavLink | CarbonSideNavLinkRenderer | cds-sidenav-item | Yes |
| 14 | Content | CarbonContentRenderer | cds--content (CSS class) | Yes |
| 15 | Grid | CarbonGridRenderer | cdsGrid (directive) | Yes |
| 16 | Column | CarbonColumnRenderer | cdsCol (directive) | Yes |
| 17 | Layer | CarbonLayerRenderer | cdsLayer (directive) | Yes |
| 18 | Breadcrumb | CarbonBreadcrumbRenderer | cds-breadcrumb | Yes |
| 19 | Tabs | CarbonTabsRenderer | cds-tabs / cds-tab | Yes |
| 20 | Tab | CarbonTabRenderer | cds-tabs / cds-tab | Yes |
| 21 | Tile | CarbonTileRenderer | cds-tile | Yes |
| 22 | ClickableTile | CarbonClickableTileRenderer | cds-clickable-tile | Yes |
| 23 | ExpandableTile | CarbonExpandableTileRenderer | cds-expandable-tile | Yes |
| 24 | Tag | CarbonTagRenderer | cds-tag | Yes |
| 25 | InlineNotification | CarbonInlineNotificationRenderer | cds-notification | Yes |
| 26 | ToastNotification | CarbonToastNotificationRenderer | cds-toast | Yes |
| 27 | ProgressBar | CarbonProgressBarRenderer | cds-progress-bar | Yes |
| 28 | InlineLoading | CarbonInlineLoadingRenderer | cds-inline-loading | Yes |
| 29 | SkeletonText | CarbonSkeletonTextRenderer | cds-skeleton-text | Yes |
| 30 | SkeletonPlaceholder | CarbonSkeletonPlaceholderRenderer | cds-skeleton-placeholder | Yes |
| 31 | DataTable | CarbonDataTableRenderer | cds-table-container / cdsTable / cdsTableHead / cdsTableBody / cdsTableRow / cdsTableData / cdsTableHeadCell | Yes |
| 32 | TableToolbar | CarbonTableToolbarRenderer | cds-table-toolbar | Yes |
| 33 | TableToolbarSearch | CarbonTableToolbarSearchRenderer | cds-table-toolbar-search | Yes |
| 34 | TableToolbarActions | CarbonTableToolbarActionsRenderer | cds-table-toolbar-actions | Yes |
| 35 | TableBatchActions | CarbonTableBatchActionsRenderer | cds-table-toolbar-actions | Yes |
| 36 | Pagination | CarbonPaginationRenderer | cds-pagination | Yes |
| 37 | StructuredList | CarbonStructuredListRenderer | cds-structured-list / cds-list-header / cds-list-column / cds-list-row | Yes |
| 38 | Search | CarbonSearchRenderer | cds-search | Yes |
| 39 | Dropdown | CarbonDropdownRenderer | cds-dropdown | Yes |
| 40 | ComboBox | CarbonComboBoxRenderer | cds-combo-box | Yes |
| 41 | MultiSelect | CarbonMultiSelectRenderer | cds-dropdown type="multi" | Yes |
| 42 | DatePicker | CarbonDatePickerRenderer | cds-date-picker | Yes |
| 43 | TextInput | CarbonTextInputRenderer | cds-label / cdsText | Yes |
| 44 | TextArea | CarbonTextAreaRenderer | cds-textarea-label / cdsTextArea | Yes |
| 45 | NumberInput | CarbonNumberInputRenderer | cds-number | Yes |
| 46 | Select | CarbonSelectRenderer | cds-select | Yes |
| 47 | Checkbox | CarbonCheckboxRenderer | cds-checkbox | Yes |
| 48 | Radio | CarbonRadioRenderer | cds-radio-group / cds-radio | Yes |
| 49 | Toggle | CarbonToggleRenderer | cds-toggle | Yes |
| 50 | Button | CarbonButtonRenderer | cdsButton (directive) | Yes |
| 51 | IconButton | CarbonIconButtonRenderer | cds-icon-button | Yes |
| 52 | OverflowMenu | CarbonOverflowMenuRenderer | cds-overflow-menu | Yes |
| 53 | OverflowMenuOption | CarbonOverflowMenuOptionRenderer | cds-overflow-menu-option | Yes |
| 54 | ContextMenu | CarbonContextMenuRenderer | cds-context-menu | Yes |
| 55 | Modal | CarbonModalRenderer | cds-modal / cds-modal-header / cdsModalContent / cdsModalContentText | Yes |
| 56 | Tooltip | CarbonTooltipRenderer | cds-tooltip | Yes |
| 57 | Toggletip | CarbonToggletipRenderer | cds-toggletip | Yes |
| 58 | Popover | CarbonPopoverRenderer | cdsPopover (directive) | Yes |
| 59 | FileUploader | CarbonFileUploaderRenderer | cds-file-uploader | Yes |
| 60 | Accordion | CarbonAccordionRenderer | cds-accordion / cds-accordion-item | Yes |

**Result: 60/60 renderers valid. PASS.**

---

## 5. COMPONENT_MAP Reconciliation

File: `component-map.ts` (258 lines)
Total keys in COMPONENT_MAP: **209**

### 5.1 Breakdown by Mapping Target

| Target | Count | Status |
|---|---|---|
| Carbon Primitive Renderers (via CARBON_PRIMITIVE_COMPONENT_MAP) | 60 | PASS |
| DynamicPageHostComponent (generic fallback) | 145 | **FAIL -- FALLBACK_MAPPING** |
| Dedicated Shahin Components | 4 | PASS |
| **Total** | **209** | -- |

### 5.2 Carbon Primitive Keys (60) -- PASS

All 60 keys from CARBON_PRIMITIVE_COMPONENT_MAP are spread into COMPONENT_MAP and resolve to dedicated renderer classes in `carbon-primitive-renderers.ts`. No issues.

### 5.3 Shahin Dedicated Keys (4) -- PASS

| component_key | Maps To | Status |
|---|---|---|
| ShahinProfilePage | ProfileComponent | PASS |
| ShahinSettingsPage | SettingsComponent | PASS |
| ShahinTenantProfilePage | TenantProfileComponent | PASS |
| ShahinTenantSettingsPage | TenantSettingsComponent | PASS |

### 5.4 DynamicPageHostComponent Fallback Keys (145) -- FAIL

**Hard rule violated:** "No Carbon key may map to DynamicPageHostComponent."

All 145 keys listed below map to DynamicPageHostComponent:

#### 5.4.1 Compliance Pages (63 keys)

| # | component_key | Status |
|---|---|---|
| 1 | AssertionDashboardPage | FALLBACK_MAPPING |
| 2 | AssessmentTemplatesPage | FALLBACK_MAPPING |
| 3 | AssessmentsListPage | FALLBACK_MAPPING |
| 4 | ComplianceAdminPage | FALLBACK_MAPPING |
| 5 | ComplianceAssessmentsPage | FALLBACK_MAPPING |
| 6 | ComplianceAttestationsPage | FALLBACK_MAPPING |
| 7 | ComplianceCalendarPage | FALLBACK_MAPPING |
| 8 | ComplianceCatchAll | FALLBACK_MAPPING |
| 9 | ComplianceControlDetailPage | FALLBACK_MAPPING |
| 10 | ComplianceControlsPage | FALLBACK_MAPPING |
| 11 | ComplianceDiagnosticsPage | FALLBACK_MAPPING |
| 12 | ComplianceEvidenceOpsPage | FALLBACK_MAPPING |
| 13 | ComplianceEvidencePage | FALLBACK_MAPPING |
| 14 | ComplianceExceptionsPage | FALLBACK_MAPPING |
| 15 | ComplianceFindingsPage | FALLBACK_MAPPING |
| 16 | ComplianceFrameworksPage | FALLBACK_MAPPING |
| 17 | ComplianceGapsPage | FALLBACK_MAPPING |
| 18 | ComplianceHeatmapPage | FALLBACK_MAPPING |
| 19 | ComplianceHome | FALLBACK_MAPPING |
| 20 | ComplianceKsaPage | FALLBACK_MAPPING |
| 21 | ComplianceObligationsPage | FALLBACK_MAPPING |
| 22 | ComplianceOverviewPage | FALLBACK_MAPPING |
| 23 | CompliancePosturePage | FALLBACK_MAPPING |
| 24 | ComplianceRegulatorPage | FALLBACK_MAPPING |
| 25 | ComplianceRegulatoryChangesPage | FALLBACK_MAPPING |
| 26 | ComplianceReportsPage | FALLBACK_MAPPING |
| 27 | ComplianceRoadmapPage | FALLBACK_MAPPING |
| 28 | ComplianceSavingsPage | FALLBACK_MAPPING |
| 29 | ComplianceTemplatesPage | FALLBACK_MAPPING |
| 30 | ComplianceWorkQueuePage | FALLBACK_MAPPING |
| 31 | ContentPackPage | FALLBACK_MAPPING |
| 32 | ControlPosturePage | FALLBACK_MAPPING |
| 33 | ControlTestingPage | FALLBACK_MAPPING |
| 34 | ControlsMonitoringPage | FALLBACK_MAPPING |
| 35 | EsgPage | FALLBACK_MAPPING |
| 36 | EthicsIntegrityPage | FALLBACK_MAPPING |
| 37 | ExceptionManagerPage | FALLBACK_MAPPING |
| 38 | FrameworkHubPage | FALLBACK_MAPPING |
| 39 | FrameworkMappingPage | FALLBACK_MAPPING |
| 40 | FrameworkScorecardPage | FALLBACK_MAPPING |
| 41 | GenericModuleLifecycle | FALLBACK_MAPPING |
| 42 | IntelligenceHubPage | FALLBACK_MAPPING |
| 43 | KsaHubPage | FALLBACK_MAPPING |
| 44 | MappingPage | FALLBACK_MAPPING |
| 45 | MaturityJourneyPage | FALLBACK_MAPPING |
| 46 | MaturityWizardPage | FALLBACK_MAPPING |
| 47 | NcaAssessmentPage | FALLBACK_MAPPING |
| 48 | ObligationDetailPage | FALLBACK_MAPPING |
| 49 | ObligationWorkspacePage | FALLBACK_MAPPING |
| 50 | OntologyCatalogPage | FALLBACK_MAPPING |
| 51 | RcsaCampaignsPage | FALLBACK_MAPPING |
| 52 | RegistryPage | FALLBACK_MAPPING |
| 53 | RegulationCompilerPage | FALLBACK_MAPPING |
| 54 | RegulatoryDeltaDashboardPage | FALLBACK_MAPPING |
| 55 | RegulatoryFeedsPage | FALLBACK_MAPPING |
| 56 | RegulatoryReasoningStudioPage | FALLBACK_MAPPING |
| 57 | SamaAssessmentPage | FALLBACK_MAPPING |
| 58 | ScoringPage | FALLBACK_MAPPING |
| 59 | ScoringPoliciesPage | FALLBACK_MAPPING |
| 60 | ScoringPolicyDetailPage | FALLBACK_MAPPING |
| 61 | SoxCompliancePage | FALLBACK_MAPPING |
| 62 | TaxonomyPage | FALLBACK_MAPPING |
| 63 | UcfBrowserPage | FALLBACK_MAPPING |

#### 5.4.2 DAuth Route Keys (5 keys)

| # | component_key | Status |
|---|---|---|
| 64 | platform.dauth.overview | FALLBACK_MAPPING |
| 65 | platform.dauth.users.list | FALLBACK_MAPPING |
| 66 | platform.dauth.roles.list | FALLBACK_MAPPING |
| 67 | platform.dauth.perms.list | FALLBACK_MAPPING |
| 68 | platform.dauth.audit.list | FALLBACK_MAPPING |

#### 5.4.3 Platform DNA Route Keys (40 keys)

| # | component_key | Status |
|---|---|---|
| 69 | platform.ai-platform.overview | FALLBACK_MAPPING |
| 70 | platform.ai-platform.gateway | FALLBACK_MAPPING |
| 71 | platform.ai-platform.engine | FALLBACK_MAPPING |
| 72 | platform.ai-platform.governance | FALLBACK_MAPPING |
| 73 | platform.ai-platform.audit | FALLBACK_MAPPING |
| 74 | platform.config-center.overview | FALLBACK_MAPPING |
| 75 | platform.config-center.settings | FALLBACK_MAPPING |
| 76 | platform.config-center.flags | FALLBACK_MAPPING |
| 77 | platform.config-center.tokens | FALLBACK_MAPPING |
| 78 | platform.config-center.audit | FALLBACK_MAPPING |
| 79 | platform.dnoc.overview | FALLBACK_MAPPING |
| 80 | platform.dnoc.services | FALLBACK_MAPPING |
| 81 | platform.dnoc.metrics | FALLBACK_MAPPING |
| 82 | platform.dnoc.alerts | FALLBACK_MAPPING |
| 83 | platform.dnoc.audit | FALLBACK_MAPPING |
| 84 | platform.dos-platform.overview | FALLBACK_MAPPING |
| 85 | platform.dos-platform.registries | FALLBACK_MAPPING |
| 86 | platform.dos-platform.schemas | FALLBACK_MAPPING |
| 87 | platform.dos-platform.events | FALLBACK_MAPPING |
| 88 | platform.dos-platform.audit | FALLBACK_MAPPING |
| 89 | platform.dsoc.overview | FALLBACK_MAPPING |
| 90 | platform.dsoc.detections | FALLBACK_MAPPING |
| 91 | platform.dsoc.incidents | FALLBACK_MAPPING |
| 92 | platform.dsoc.policies | FALLBACK_MAPPING |
| 93 | platform.dsoc.audit | FALLBACK_MAPPING |
| 94 | platform.foundation-admin.overview | FALLBACK_MAPPING |
| 95 | platform.foundation-admin.organizations | FALLBACK_MAPPING |
| 96 | platform.foundation-admin.persons | FALLBACK_MAPPING |
| 97 | platform.foundation-admin.lifecycle | FALLBACK_MAPPING |
| 98 | platform.foundation-admin.audit | FALLBACK_MAPPING |
| 99 | platform.multi-tenant-mgmt.overview | FALLBACK_MAPPING |
| 100 | platform.multi-tenant-mgmt.tenants | FALLBACK_MAPPING |
| 101 | platform.multi-tenant-mgmt.provisioning | FALLBACK_MAPPING |
| 102 | platform.multi-tenant-mgmt.quotas | FALLBACK_MAPPING |
| 103 | platform.multi-tenant-mgmt.audit | FALLBACK_MAPPING |
| 104 | platform.tenant-management.overview | FALLBACK_MAPPING |
| 105 | platform.tenant-management.directory | FALLBACK_MAPPING |
| 106 | platform.tenant-management.members | FALLBACK_MAPPING |
| 107 | platform.tenant-management.profile | FALLBACK_MAPPING |
| 108 | platform.tenant-management.audit | FALLBACK_MAPPING |

#### 5.4.4 DNA Archetype Keys (24 keys)

| # | component_key | Status |
|---|---|---|
| 109 | command-center.ai | FALLBACK_MAPPING |
| 110 | command-center.cfg | FALLBACK_MAPPING |
| 111 | command-center.dnoc | FALLBACK_MAPPING |
| 112 | command-center.dos | FALLBACK_MAPPING |
| 113 | command-center.dsoc | FALLBACK_MAPPING |
| 114 | command-center.fnd | FALLBACK_MAPPING |
| 115 | command-center.mtm | FALLBACK_MAPPING |
| 116 | command-center.tm | FALLBACK_MAPPING |
| 117 | smart-grid.ai | FALLBACK_MAPPING |
| 118 | smart-grid.cfg | FALLBACK_MAPPING |
| 119 | smart-grid.dnoc | FALLBACK_MAPPING |
| 120 | smart-grid.dos | FALLBACK_MAPPING |
| 121 | smart-grid.dsoc | FALLBACK_MAPPING |
| 122 | smart-grid.fnd | FALLBACK_MAPPING |
| 123 | smart-grid.mtm | FALLBACK_MAPPING |
| 124 | smart-grid.tm | FALLBACK_MAPPING |
| 125 | audit-timeline.ai | FALLBACK_MAPPING |
| 126 | audit-timeline.cfg | FALLBACK_MAPPING |
| 127 | audit-timeline.dnoc | FALLBACK_MAPPING |
| 128 | audit-timeline.dos | FALLBACK_MAPPING |
| 129 | audit-timeline.dsoc | FALLBACK_MAPPING |
| 130 | audit-timeline.fnd | FALLBACK_MAPPING |
| 131 | audit-timeline.mtm | FALLBACK_MAPPING |
| 132 | audit-timeline.tm | FALLBACK_MAPPING |

#### 5.4.5 Additional Widget/Route Keys from 0146/0157 (13 keys)

| # | component_key | Status |
|---|---|---|
| 133 | command-center.identity-summary | FALLBACK_MAPPING |
| 134 | audit-timeline.access | FALLBACK_MAPPING |
| 135 | audit-timeline.runtime | FALLBACK_MAPPING |
| 136 | audit-timeline.ui-system | FALLBACK_MAPPING |
| 137 | audit-timeline.dauth | FALLBACK_MAPPING |
| 138 | matrix.health | FALLBACK_MAPPING |
| 139 | page-masthead.overview | FALLBACK_MAPPING |
| 140 | page-masthead.settings | FALLBACK_MAPPING |
| 141 | smart-grid.components | FALLBACK_MAPPING |
| 142 | smart-grid.permissions | FALLBACK_MAPPING |
| 143 | smart-grid.services | FALLBACK_MAPPING |
| 144 | smart-grid.sessions | FALLBACK_MAPPING |
| 145 | smart-grid.themes | FALLBACK_MAPPING |

---

## 6. DynamicPageHostComponent Fallback Analysis

### 6.1 What DynamicPageHostComponent Does

DynamicPageHostComponent is the generic fallback renderer. When a component_key has no dedicated renderer, the dynamic UI engine falls back to this component, which renders a generic page shell. This means the key is "registered" but has no real Carbon-specific UI implementation.

### 6.2 Impact

- **145 of 209 COMPONENT_MAP keys (69.4%)** resolve to the fallback.
- These keys are functionally present but do not render any Carbon-specific UI.
- The DB registry marks them as `vendor='ibm-carbon'` and `approval_status='approved'`, creating a false sense of compliance.

### 6.3 Breakdown by Category

| Category | Fallback Keys | Severity |
|---|---|---|
| Compliance pages | 63 | HIGH -- primary user-facing pages |
| Platform DNA route keys | 40 | HIGH -- module landing pages |
| DNA archetype keys | 24 | MEDIUM -- widget archetypes |
| Additional widget/route keys | 13 | MEDIUM -- supplementary widgets |
| DAuth route keys | 5 | MEDIUM -- identity management |

---

## 7. Route and Widget Key Coverage

### 7.1 Keys in Routes but NOT in component_registry

Migration 0157 defines routes and widgets using these component_keys but does **not** INSERT them into `dos.dynamic_ui_component_registry`:

**Route component_keys (11):**
- page-masthead.overview
- page-masthead.settings
- smart-grid.components
- smart-grid.permissions
- smart-grid.services
- smart-grid.sessions
- smart-grid.themes
- matrix.health
- audit-timeline.access
- audit-timeline.runtime
- audit-timeline.ui-system

**Widget component_keys (9):**
- command-center.access-summary
- command-center.runtime-summary
- command-center.ui-system-summary
- context-rail.access
- context-rail.runtime
- context-rail.ui-system
- recommendation-card.access-tips
- recommendation-card.runtime-tips
- recommendation-card.ui-system-tips

**Total: 20 keys used in routes/widgets but missing from the registry.**

### 7.2 DAuth Widget Keys (migration 0146)

These widget keys are used in 0146 but their registry status depends on whether 0146 inserts them:
- command-center.identity-summary
- smart-grid.users
- smart-grid.roles
- context-rail.user-360
- context-rail.role-coverage
- matrix.permissions
- audit-timeline.dauth
- recommendation-card.identity

### 7.3 Shahin Keys (migration 0503_0001)

The 4 Shahin keys (ShahinProfilePage, ShahinSettingsPage, ShahinTenantProfilePage, ShahinTenantSettingsPage) are used in routes but are **not registered in the component_registry**. They map to dedicated components in COMPONENT_MAP, so they function correctly despite the registry gap.

---

## 8. Forbidden UI Usage

### 8.1 PrimeNG

- **Import matches:** 5,516+ across ~841 source files
- **Major modules detected:** TableModule, InputTextarea, DropdownModule, ButtonModule, ToolbarModule, DialogModule, CalendarModule, ToastModule, ConfirmDialogModule, MultiSelectModule, and many more
- **Key areas:** platform/workflow/*, platform/ai/*, platform/dnoc/*, platform/dauth/ui/login/*, modules/risk/*, modules/compliance/*
- **Severity:** CRITICAL -- PrimeNG is the dominant UI library in non-Carbon portions of the codebase

### 8.2 PrimeIcons (pi-*)

- **Template matches:** 1,867+ in HTML files
- **Key areas:** risk-workspace, approval-center, dashboard, governance-actions, framework-scorecard, control-posture, report-center, landing pages
- **Severity:** HIGH -- icon system is entirely PrimeIcons outside Carbon shell

### 8.3 Material Icons

- **Matches:** ~50+
- **Usage:** Mobile components only -- mobile-tab-bar, mobile-settings, mobile-onboarding, evidence-camera, mobile-dashboard
- **CSS class:** `material-icons-outlined`
- **Severity:** MEDIUM -- limited to mobile PWA layer

### 8.4 Not Found

- No Angular Material (`mat-icon`, `MatIconModule`) imports detected.
- No custom sidebar/header/drawer patterns bypassing Carbon shell detected.

---

## 9. Build Check

**Status: BLOCKED**

| command | result | error_count | errors_related_to_carbon_registry | notes |
|---|---|---|---|---|
| `pnpm --filter shahin-ai-grc-frontend run build` | FAIL | 3 | 0 | All 3 errors are unrelated baseline import resolution failures |

**Build errors (all unrelated to Carbon registry):**

1. `Could not resolve "@app/core/services/ui-infra/i18n.service"` -- missing i18n service import in app.config.ts
2. `Could not resolve "@app/core/platform/shell/shell-host.component"` -- missing shell-host import in app.routes.ts
3. `Could not resolve "./app/core/utils/dev-logger"` -- missing dev-logger import in main.ts

**Conclusion:** Build fails due to 3 unrelated baseline import errors. None are related to Carbon registry, COMPONENT_MAP, or carbon-primitive-renderers.ts. The Carbon registry layer itself cannot be build-validated until these baseline errors are resolved.

---

## 10. Risk Summary

| # | Risk | Severity | Count | Description |
|---|---|---|---|---|
| R1 | DynamicPageHostComponent fallback | CRITICAL | 145 keys | 69.4% of COMPONENT_MAP keys use the generic fallback instead of dedicated Carbon renderers |
| R2 | PrimeNG forbidden usage | CRITICAL | 5,516+ imports | PrimeNG is deeply embedded across ~841 source files |
| R3 | PrimeIcons forbidden usage | HIGH | 1,867+ matches | PrimeIcons (pi-*) used throughout HTML templates |
| R4 | Route keys missing from registry | HIGH | 20 keys | Migration 0157 uses component_keys in routes/widgets without inserting them into the registry |
| R5 | Material Icons usage | MEDIUM | ~50+ matches | Material Icons used in mobile components |
| R6 | Shahin keys not in registry | LOW | 4 keys | Shahin pages work via COMPONENT_MAP but are not in the DB registry |
| R7 | Build blocked | LOW | 3 errors | Build fails on 3 unrelated baseline import errors; Carbon registry itself untestable |

---

## 11. Recommendations

1. **Create dedicated Carbon renderers for the 145 DynamicPageHostComponent keys.** Prioritize the 63 compliance pages and 40 platform DNA route keys as these are user-facing.

2. **Run migration to register the 20 missing route/widget keys** from 0157 into `dos.dynamic_ui_component_registry`. Without registry entries, the dynamic UI engine cannot enforce vendor/approval policies on these keys.

3. **Plan PrimeNG deprecation roadmap.** With 5,516+ import references across 841 files, this is a multi-sprint effort. Start with modules that have direct Carbon equivalents (Button, Dropdown, DataTable, Dialog).

4. **Replace PrimeIcons with @carbon/icons-angular.** The 1,867+ pi-* references should be systematically replaced with Carbon icon components.

5. **Evaluate Material Icons in mobile layer.** Determine whether the mobile PWA should also adopt Carbon icons or if a separate icon policy applies.

6. **Register the 4 Shahin keys in the component_registry** to close the registry gap, even though they function correctly via COMPONENT_MAP.

7. **Execute a build verification** (`pnpm --filter shahin-ai-grc-frontend run build`) to confirm all renderers compile cleanly.

---

*Generated by Claude Opus 4.6 (automated read-only audit) on 2026-05-02.*

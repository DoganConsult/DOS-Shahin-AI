# Frontend Component Deprecation Map

**Version:** 1.0.0  
**Effective Date:** 2026-03-20  
**Status:** ACTIVE — Migration Guide

---

## Overview

This document provides a complete deprecation map for all deprecated frontend components, their migration paths, removal blockers, and timelines. This map is maintained as part of the UI Foundation Unification effort.

**Key Principle:** Deprecated components are kept temporarily for backward compatibility during migration. All new code must use canonical components.

---

## Deprecation Status Legend

- **🟢 SOFT-DEPRECATED** — Marked deprecated, consumers migrated, safe to remove in next major version
- **🟡 RETAINED** — Deprecated but retained for utility functions or specific use cases
- **🔴 BLOCKED** — Deprecated but cannot be removed due to active dependencies or blockers
- **⚪ REMOVED** — Component has been deleted

---

## Deprecated Components

### 1. Widget Shell (Deprecated Implementations)

#### 1.1 Feature Dashboard Widget Shell
**File:** `frontend/src/app/features/dashboard/widgets/widget-shell.component.ts`  
**Selector:** `app-widget-shell-deprecated`  
**Status:** 🟢 SOFT-DEPRECATED

**Deprecation Date:** 2026-03-20  
**Reason:** Duplicate implementation resolved during Phase A conflict resolution

**Canonical Replacement:**
- `@app/dashboard/shared/widget-shell/widget-shell.component.ts` (selector: `app-widget-shell`)

**Migration Path:**
```typescript
// OLD (deprecated)
import { WidgetShellComponent } from '@app/features/dashboard/widgets/widget-shell.component';

<app-widget-shell-deprecated [title]="'Widget Title'" [fetchedAt]="timestamp">
  <!-- content -->
</app-widget-shell-deprecated>

// NEW (canonical)
import { WidgetShellComponent } from '@app/dashboard/shared/widget-shell/widget-shell.component';

<app-widget-shell
  [title]="'Widget Title'"
  [subtitle]="'Optional subtitle'"
  [state]="'ready'"
  [canRefresh]="true"
  [lastUpdatedUtc]="timestamp"
  (refresh)="onRefresh()">
  <!-- content -->
</app-widget-shell>
```

**Feature Differences:**
- Canonical version supports: `subtitle`, `state` (ready/loading/empty/error), `canRefresh`, `canExport`, `canPin`, `lastUpdatedUtc`, i18n support
- Deprecated version: minimal implementation with only `title` and `fetchedAt`

**Migration Status:**
- ✅ All consumers migrated (16 files updated in Phase A)
- ✅ No active usages found

**Removal Blocker:** None  
**Removal Target:** Next major version (v2.0.0)

---

#### 1.2 Shared Widgets Widget Shell
**File:** `frontend/src/app/shared/widgets/widget-shell/widget-shell.component.ts`  
**Selector:** `app-widget-shell-deprecated`  
**Status:** 🟢 SOFT-DEPRECATED

**Deprecation Date:** 2026-03-20  
**Reason:** Duplicate implementation resolved during Phase A conflict resolution

**Canonical Replacement:**
- `@app/dashboard/shared/widget-shell/widget-shell.component.ts` (selector: `app-widget-shell`)

**Migration Path:**
```typescript
// OLD (deprecated)
import { WidgetShellComponent } from '@app/shared/widgets/widget-shell/widget-shell.component';

<app-widget-shell-deprecated
  [title]="'Widget Title'"
  [subtitle]="'Subtitle'"
  [state]="'ready'"
  [canRefresh]="true"
  (refresh)="onRefresh()">
  <!-- content -->
</app-widget-shell-deprecated>

// NEW (canonical)
import { WidgetShellComponent } from '@app/dashboard/shared/widget-shell/widget-shell.component';

<app-widget-shell
  [title]="'Widget Title'"
  [subtitle]="'Subtitle'"
  [state]="'ready'"
  [canRefresh]="true"
  [canExport]="true"
  [lastUpdatedUtc]="lastUpdated()"
  (refresh)="onRefresh()"
  (export)="onExport($event)">
  <!-- content -->
</app-widget-shell>
```

**Feature Differences:**
- Canonical version adds: `canExport`, `canPin`, `lastUpdatedUtc`, `AppDatePipe` integration, enhanced i18n
- Deprecated version: basic state management without export/pin actions

**Migration Status:**
- ✅ All report pages migrated to canonical version
- ✅ No active usages found

**Removal Blocker:** None  
**Removal Target:** Next major version (v2.0.0)

---

### 2. Global Search (Deprecated)

**File:** `frontend/src/app/shared/components/global-search.component.ts`  
**Selector:** `app-global-search-deprecated`  
**Status:** 🟢 SOFT-DEPRECATED

**Deprecation Date:** 2026-03-20  
**Reason:** Duplicate implementation resolved during Phase A conflict resolution

**Canonical Replacement:**
- `@app/shared/global-search/global-search.component.ts` (selector: `app-global-search`)

**Migration Path:**
```typescript
// OLD (deprecated)
import { GlobalSearchComponent } from '@app/shared/components/global-search.component';

<app-global-search-deprecated />

// NEW (canonical)
import { GlobalSearchComponent } from '@app/shared/global-search/global-search.component';

<app-global-search />
```

**Feature Differences:**
- Both implementations are feature-equivalent
- Canonical version is the maintained version
- Deprecated version kept for backward compatibility during migration

**Migration Status:**
- ✅ All consumers migrated (top-bar.component.ts updated in Phase A)
- ✅ No active usages found

**Removal Blocker:** None  
**Removal Target:** Next major version (v2.0.0)

---

**Note:** The full-page global search (`@app/pages/global-search/global-search.component.ts`, selector: `app-global-search-page`) is **NOT deprecated**. It serves a different use case (full-page search experience) and is distinct from the dropdown search component.

---

### 3. Sidebar (Deprecated)

**File:** `frontend/src/app/shared/layout/sidebar.component.ts`  
**Selector:** `app-sidebar-deprecated`  
**Status:** 🟡 RETAINED

**Deprecation Date:** 2026-03-20  
**Reason:** Legacy sidebar replaced by canonical `AppSidebarComponent` for `app-shell` layout

**Canonical Replacement:**
- `@app/layout/app-sidebar.component.ts` (selector: `app-layout-sidebar`)

**Migration Path:**
```typescript
// OLD (deprecated - component usage)
import { SidebarComponent } from '@app/shared/layout/sidebar.component';

<app-sidebar-deprecated />

// NEW (canonical - used automatically by app-shell)
// No direct usage needed - app-shell.component.ts uses AppSidebarComponent automatically
```

**Feature Differences:**
- Canonical version: Modern sidebar with `NavigationStore`, `ProductsModulesConfigService`, module switching
- Deprecated version: Legacy sidebar implementation

**Migration Status:**
- ✅ Component selector (`app-sidebar`) not used in current app shell
- ✅ App shell uses canonical `AppSidebarComponent` (selector: `app-layout-sidebar`)
- 🟡 **Retained for utility functions:** `hasPermission`, `getVisibleNavItems`, `ROLE_PERMISSIONS`, `NavItem` interface

**Active Dependencies:**
- `@app/core/guards/role.guard.ts` — imports `hasPermission` function
- Other components may import utility functions

**Removal Blocker:** Utility functions (`hasPermission`, `getVisibleNavItems`) are used by guards and other components  
**Removal Target:** Future version (after utility functions extracted to separate module)  
**Future Plan:** Extract utility functions to `@app/shared/utils/rbac.utils.ts` or similar, then remove component

---

### 4. Dynamic Dashboard Host (Widgets Core)

**File:** `frontend/src/app/widgets/core/hosts/dynamic-dashboard-host.component.ts`  
**Selector:** `app-widget-layout-host` (renamed from `app-dynamic-dashboard-host`)  
**Status:** 🟡 DEPRECATED

**Deprecation Date:** 2026-03-20  
**Reason:** Selector conflict resolved — canonical component uses `app-dynamic-dashboard-host`

**Canonical Replacement:** `app-dynamic-dashboard-host` from `frontend/src/app/features/dashboard/shared/dynamic-dashboard-host.component.ts` (API-driven dashboard host)

**Migration:**
- If using `DashboardLayout` + `WidgetRenderContext` inputs → Consider migrating to API-driven approach
- If keeping layout-based approach → Update selector to `app-widget-layout-host`

**Removal Blocker:** None (no usages found)

---

### 5. Workspace Scope Filter

**File:** `frontend/src/app/shared/layout/workspace-scope-filter.component.ts`  
**Selector:** `app-workspace-scope-filter`  
**Status:** 🟡 RETAINED (Different Use Case)

**Deprecation Date:** 2026-03-20  
**Reason:** Clarified as distinct use case from canonical scope-filter-bar (not a duplicate)

**Canonical Alternative (Different Use Case):**
- `@app/shared/scope-filter-bar/scope-filter-bar.component.ts` (selector: `app-scope-filter-bar`)
  - **Purpose:** Entity, framework, and time-period filtering
  - **Use Case:** Compliance, risk, evidence pages

**Current Component Purpose:**
- Multi-dimensional workspace scope filtering
- Workspace-level dashboards
- Different API: `/workspaces/{workspaceId}/scopes`

**Migration Path:**
```typescript
// Current (retained - different use case)
import { WorkspaceScopeFilterComponent } from '@app/shared/layout/workspace-scope-filter.component';

<app-workspace-scope-filter
  [workspaceId]="workspaceId()"
  (scopeChange)="onScopeChange($event)" />

// Alternative (if consolidating scope filtering in future)
// Use canonical scope-filter-bar if it can be extended to support workspace scopes
```

**Active Dependencies:**
- `@app/pages/approval-center/approval-center.component.ts`
- `@app/pages/ccm-dashboard/ccm-dashboard.component.ts`

**Removal Blocker:** Serves different use case (workspace-level filtering vs entity/framework filtering)  
**Removal Target:** Not planned — consider consolidation in future refactor if patterns can be unified  
**Future Plan:** Evaluate if scope filtering patterns can be unified into a single component with different modes

---

### 5. Chart.js Adapter

**File:** `frontend/src/app/widgets/adapters/chartjs/chartjs-widget.adapter.ts`  
**Status:** 🟢 SOFT-DEPRECATED

**Deprecation Date:** 2026-03-20  
**Reason:** Chart.js marked as legacy per chart policy (Phase B)

**Canonical Replacement:**
- `@app/shared/charts/echart.component.ts` (selector: `app-echart`) — Primary chart engine
- `@app/shared/charts/plotly-chart.component.ts` (selector: `app-plotly-chart`) — 3D visualizations

**Migration Path:**
```typescript
// OLD (deprecated - Chart.js)
import { ChartjsAdapterConfig } from '@app/widgets/adapters/chartjs/chartjs-widget.adapter';

// Chart.js widget configuration
const chartjsConfig: ChartjsAdapterConfig = {
  widgetId: 'widget-1',
  chartType: 'bar'
};

// NEW (canonical - ECharts)
import { EChartComponent } from '@app/shared/charts/echart.component';

const echartsOptions = {
  xAxis: { type: 'category', data: ['A', 'B', 'C'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [10, 20, 30] }]
};

<app-echart [options]="echartsOptions" [height]="'360px'" />
```

**Chart Policy:**
- ✅ **ECharts** — Primary chart engine (use for all standard charts)
- ✅ **D3.js** — Custom SVG, motion-rich, bespoke visuals
- ✅ **Plotly** — 3D/WebGL visualizations only
- ❌ **Chart.js** — Legacy, do not use for new charts

**Migration Status:**
- 🟡 Existing Chart.js widgets remain functional
- 🟡 No forced migration required (backward compatibility maintained)
- ✅ New charts must use ECharts

**Removal Blocker:** Existing Chart.js widgets may still be in use  
**Removal Target:** Gradual migration, no hard deadline  
**Future Plan:** Migrate Chart.js widgets to ECharts when widgets are updated or refactored

**See:** `CHART_POLICY.md` for detailed chart usage policy

---

## Migration Priority Matrix

| Component | Priority | Effort | Impact | Status |
|-----------|----------|--------|--------|--------|
| Widget Shell (Feature) | ✅ Complete | Low | High | 🟢 Migrated |
| Widget Shell (Shared) | ✅ Complete | Low | High | 🟢 Migrated |
| Global Search | ✅ Complete | Low | Medium | 🟢 Migrated |
| Sidebar | 🟡 Deferred | Medium | Low | 🟡 Retained (utilities) |
| Workspace Scope Filter | 🟡 N/A | N/A | N/A | 🟡 Different use case |
| Chart.js Adapter | 🟡 Gradual | High | Medium | 🟡 Legacy support |

**Priority Levels:**
- ✅ **Complete** — Migration finished, safe to remove
- 🟡 **Deferred** — Blocked or different use case
- 🔴 **High** — Needs immediate attention (none currently)

---

## Removal Schedule

### Phase 1: Immediate (Next Major Version - v2.0.0)

**Components to Remove:**
1. `@app/features/dashboard/widgets/widget-shell.component.ts` (selector: `app-widget-shell-deprecated`)
2. `@app/shared/widgets/widget-shell/widget-shell.component.ts` (selector: `app-widget-shell-deprecated`)
3. `@app/shared/components/global-search.component.ts` (selector: `app-global-search-deprecated`)

**Prerequisites:**
- ✅ All consumers migrated (verified in Phase A)
- ✅ No active usages found
- ✅ Tests updated

**Action:** Delete files in v2.0.0 release

---

### Phase 2: Future (After Utility Extraction)

**Components to Refactor:**
1. `@app/shared/layout/sidebar.component.ts` (selector: `app-sidebar-deprecated`)

**Prerequisites:**
- Extract utility functions to separate module:
  - `hasPermission()` → `@app/shared/utils/rbac.utils.ts`
  - `getVisibleNavItems()` → `@app/shared/utils/navigation.utils.ts`
  - `ROLE_PERMISSIONS` → `@app/shared/constants/rbac.constants.ts`
  - `NavItem` interface → `@app/shared/types/navigation.types.ts`
- Update all imports in:
  - `@app/core/guards/role.guard.ts`
  - Any other components using these utilities
- Verify no component selector usage remains

**Action:** Extract utilities, then remove component file

---

### Phase 3: Gradual (No Hard Deadline)

**Components to Migrate:**
1. Chart.js widgets → ECharts

**Strategy:**
- Migrate when widgets are updated or refactored
- No forced migration required
- New charts must use ECharts (enforced by policy)

**Action:** Gradual migration as widgets are updated

---

## Migration Checklist Template

When migrating from a deprecated component:

- [ ] **Identify all usages**
  - Search for component selector in templates
  - Search for component import in TypeScript files
  - Check test files

- [ ] **Update imports**
  - Change import path to canonical component
  - Update component class name if different

- [ ] **Update template selectors**
  - Replace deprecated selector with canonical selector
  - Update any input/output bindings if API changed

- [ ] **Verify feature parity**
  - Compare deprecated vs canonical features
  - Ensure all required features are available
  - Test component behavior

- [ ] **Update styling (if needed)**
  - Check if custom styles need adjustment
  - Verify design token usage

- [ ] **Update tests**
  - Update component references in test files
  - Verify tests pass with canonical component

- [ ] **Remove deprecated import**
  - Remove unused import statements
  - Clean up any deprecated component references

- [ ] **Document migration**
  - Note migration in PR description
  - Update this deprecation map if status changes

---

## Blockers and Dependencies

### Sidebar Component Blockers

**Blocker:** Utility functions exported from deprecated component

**Dependencies:**
- `@app/core/guards/role.guard.ts` — uses `hasPermission()`
- Potential other components using `getVisibleNavItems()`, `ROLE_PERMISSIONS`, `NavItem`

**Resolution Plan:**
1. Create `@app/shared/utils/rbac.utils.ts` with `hasPermission()` function
2. Create `@app/shared/utils/navigation.utils.ts` with `getVisibleNavItems()` function
3. Create `@app/shared/constants/rbac.constants.ts` with `ROLE_PERMISSIONS`
4. Create `@app/shared/types/navigation.types.ts` with `NavItem` interface
5. Update all imports to new locations
6. Remove deprecated component file

**Estimated Effort:** 2-4 hours

---

### Chart.js Migration Blockers

**Blocker:** Existing Chart.js widgets may be in active use

**Resolution Plan:**
- No forced migration required
- Migrate widgets to ECharts when they are updated or refactored
- Enforce ECharts for all new charts (policy + lint rules)

**Estimated Effort:** Per-widget basis (varies)

---

## Testing Requirements

Before removing a deprecated component:

1. **Verify no active usages:**
   ```bash
   grep -r "app-widget-shell-deprecated" frontend/src
   grep -r "app-global-search-deprecated" frontend/src
   grep -r "app-sidebar-deprecated" frontend/src
   ```

2. **Run full test suite:**
   ```bash
   npm test
   ```

3. **Manual testing:**
   - Test all pages that previously used deprecated component
   - Verify canonical component works correctly
   - Check for any visual regressions

4. **Integration testing:**
   - Test component interactions
   - Verify state management
   - Check i18n support

---

## Related Documents

- `CANONICAL_COMPONENT_MAP.md` — Canonical component ownership
- `CHART_POLICY.md` — Chart library usage policy
- `STATE_PATTERNS.md` — State pattern usage policy
- `DESIGN_TOKEN_MIGRATION.md` — Design token migration log
- `AI_OS_INTEGRATION_PATTERNS.md` — AI OS integration patterns

---

## Policy Maintenance

This deprecation map is **active** and should be updated when:
1. New components are deprecated
2. Migration status changes
3. Blockers are resolved
4. Components are removed

**Last Updated:** 2026-03-20  
**Policy Owner:** Frontend Architecture Team

---

## Summary

### Deprecated Components Status

| Component | Status | Migration | Removal Target |
|-----------|--------|-----------|----------------|
| Widget Shell (Feature) | 🟢 Soft-deprecated | ✅ Complete | v2.0.0 |
| Widget Shell (Shared) | 🟢 Soft-deprecated | ✅ Complete | v2.0.0 |
| Global Search | 🟢 Soft-deprecated | ✅ Complete | v2.0.0 |
| Sidebar | 🟡 Retained | 🟡 Deferred | After utility extraction |
| Workspace Scope Filter | 🟡 Different use case | N/A | Not planned |
| Chart.js Adapter | 🟢 Soft-deprecated | 🟡 Gradual | No deadline |

### Next Actions

1. **Immediate:** Prepare for v2.0.0 removal of 3 soft-deprecated components
2. **Short-term:** Extract sidebar utility functions to separate modules
3. **Long-term:** Gradual Chart.js → ECharts migration as widgets are updated

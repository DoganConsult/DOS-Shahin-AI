# Canonical Component Map

**Version:** 1.0.0  
**Effective Date:** 2026-03-20  
**Status:** FROZEN — Canonical Truth

---

## Overview

This document defines the **single source of truth** for all canonical shared UI components in the Shahin-AI GRC Platform frontend. This map is **non-negotiable** and must be followed for all new implementations.

---

## Component Categories

### A. Page Structure Components

#### 1. Page Shell
**Canonical Component:**
- `@app/shared/components/page-shell.component.ts` (selector: `app-page-shell`)

**Purpose:**
- Main page wrapper with breadcrumbs, loading skeleton, and content area
- Handles sidebar collapse state
- Provides consistent page layout structure

**Usage:**
```typescript
import { PageShellComponent } from '@app/shared/components/page-shell.component';

<app-page-shell
  [icon]="'chart-bar'"
  [title]="'Dashboard'"
  [subtitle]="'Overview'"
  [breadcrumbs]="['Dashboard']"
  [loading]="loading()">
  <!-- Page content -->
</app-page-shell>
```

**Deprecated Alternatives:**
- None (this is the only page shell)

---

#### 2. Page Header
**Canonical Component:**
- `@app/shared/components/page-header.component.ts` (selector: `app-page-header`)

**Purpose:**
- Page title, subtitle, icon, breadcrumbs, and action buttons
- Bilingual support (EN/AR)
- Action buttons with primary/secondary styling

**Usage:**
```typescript
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/page-header.component';

const actions: PageHeaderAction[] = [
  { id: 'create', labelEn: 'Create', labelAr: 'إنشاء', icon: 'plus', primary: true }
];

<app-page-header
  [titleEn]="'Policies'"
  [titleAr]="'السياسات'"
  [subtitleEn]="'Manage policies'"
  [subtitleAr]="'إدارة السياسات'"
  [icon]="'file'"
  [breadcrumbs]="['Governance', 'Policies']"
  [actions]="actions"
  (actionClick)="onAction($event)" />
```

**Deprecated Alternatives:**
- None (this is the only page header)

---

#### 3. Section Header
**Canonical Component:**
- `@app/shared/widgets/section-header/section-header.component.ts` (selector: `app-section-header`)

**Purpose:**
- Section titles with badge, subtitle, and optional icon
- Used primarily in landing pages and marketing sections
- Bilingual support (EN/AR)

**Usage:**
```typescript
import { SectionHeaderComponent } from '@app/shared/widgets/section-header/section-header.component';

<app-section-header
  [badge]="'Features'"
  [badgeAr]="'المميزات'"
  [badgeIcon]="'star'"
  [title]="'Platform Capabilities'"
  [titleAr]="'قدرات المنصة'"
  [subtitle]="'Comprehensive GRC management'"
  [subtitleAr]="'إدارة شاملة للحوكمة والمخاطر والامتثال'" />
```

**Deprecated Alternatives:**
- None (this is the only section header)

---

### B. Widget Components

#### 4. Widget Shell
**Canonical Component:**
- `@app/dashboard/shared/widget-shell/widget-shell.component.ts` (selector: `app-widget-shell`)

**Purpose:**
- Widget container with title, subtitle, actions (refresh/export/pin), and state management
- Built-in loading/error/empty states
- i18n support
- Last updated timestamp

**Usage:**
```typescript
import { WidgetShellComponent } from '@app/dashboard/shared/widget-shell/widget-shell.component';

<app-widget-shell
  [title]="'Compliance Score'"
  [subtitle]="'Overall compliance posture'"
  [state]="widgetState()"
  [canRefresh]="true"
  [canExport]="true"
  [canPin]="true"
  [lastUpdatedUtc]="lastUpdated()"
  (refresh)="onRefresh()"
  (export)="onExport($event)"
  (pin)="onPin()">
  <!-- Widget content (only shown when state === 'ready') -->
  <app-echart [options]="chartOptions()" />
</app-widget-shell>
```

**Deprecated Alternatives:**
- `@app/features/dashboard/widgets/widget-shell.component.ts` (selector: `app-widget-shell-deprecated`)
- `@app/shared/widgets/widget-shell/widget-shell.component.ts` (selector: `app-widget-shell-deprecated`)

**Migration:**
- All consumers have been migrated to the canonical component
- Deprecated components will be removed in the next major version

---

#### 5. Widget Container
**Canonical Component:**
- `@app/shared/widgets/widget-container.component.ts` (selector: `app-widget-container`)

**Purpose:**
- Dynamic widget loading and rendering
- Widget grid layout support
- Display modes (compact/expanded)
- Drill-through support
- Built-in loading/error states

**Usage:**
```typescript
import { WidgetContainerComponent } from '@app/shared/widgets/widget-container.component';

<app-widget-container
  [widgetComponent]="widgetComponent"
  [icon]="'chart-bar'"
  [nameEn]="'Compliance Score'"
  [nameAr]="'نقاط الامتثال'"
  [width]="2"
  [height]="2"
  [displayMode]="'expanded'"
  [widgetId]="'compliance-score'"
  (onDrillDown)="openDrillDown($event)" />
```

**Deprecated Alternatives:**
- None (this is the only widget container)

---

### C. Data Display Components

#### 6. Stat Card / KPI Card
**Canonical Component:**
- `@app/shared/components/stat-card.component.ts` (selector: `app-stat-card`)

**Purpose:**
- KPI/metric display with icon, value, label, optional trend
- Accent color support
- Used in dashboards and report pages

**Usage:**
```typescript
import { StatCardComponent } from '@app/shared/components/stat-card.component';

<app-stat-card
  [icon]="'shield'"
  [value]="'85%'"
  [label]="'Compliance Score'"
  [accentColor]="'#0f62fe'"
  [trend]="5.2" />
```

**Deprecated Alternatives:**
- None (this is the only stat card)

---

### D. State Components

#### 7. Skeleton Loader
**Canonical Component:**
- `@app/shared/components/skeleton-loader.component.ts` (selector: `app-skeleton-loader`)

**Purpose:**
- Loading state placeholder with shimmer animation
- Variants: card, list, detail

**Usage:**
```typescript
import { SkeletonLoaderComponent } from '@app/shared/components/skeleton-loader.component';

<app-skeleton-loader [variant]="'card'" />
<app-skeleton-loader [variant]="'list'" [rows]="5" />
<app-skeleton-loader [variant]="'detail'" />
```

**Alternative:**
- PrimeNG `SkeletonModule` (`p-skeleton`) is acceptable for PrimeNG table/list contexts

**See:** `STATE_PATTERNS.md` for detailed usage policy

---

#### 8. Empty State
**Canonical Component:**
- `@app/shared/components/empty-state.component.ts` (selector: `app-empty-state`)

**Purpose:**
- Empty state display with icon, title, description, optional action button
- Variants: default, error, search, success, locked
- Bilingual support (EN/AR)

**Usage:**
```typescript
import { EmptyStateComponent } from '@app/shared/components/empty-state.component';

<app-empty-state
  [variant]="'default'"
  [title]="'No items yet'"
  [description]="'Get started by creating your first item'"
  [actionLabel]="'Create Item'"
  (action)="onCreate()" />
```

**See:** `STATE_PATTERNS.md` for detailed usage policy

---

### E. Navigation & Layout Components

#### 9. Sidebar (App Layout)
**Canonical Component:**
- `@app/layout/app-sidebar.component.ts` (selector: `app-layout-sidebar`)

**Purpose:**
- Main application sidebar for `app-shell`
- Navigation menu with module switching
- Mobile-responsive collapse
- Uses `NavigationStore` and `ProductsModulesConfigService`

**Usage:**
- Used automatically by `app-shell.component.ts`
- Do not use directly in page templates

**Deprecated Alternatives:**
- `@app/shared/layout/sidebar.component.ts` (selector: `app-sidebar-deprecated`)
  - **Reason for retention:** Exports utility functions (`hasPermission`, `getVisibleNavItems`) used by guards and other components
  - **Migration:** Utility functions will be extracted to a separate module in a future version

---

#### 10. Global Search (Dropdown)
**Canonical Component:**
- `@app/shared/global-search/global-search.component.ts` (selector: `app-global-search`)

**Purpose:**
- Dropdown search component for top bar
- Real-time search with results dropdown
- Keyboard navigation support

**Usage:**
- Used automatically by `top-bar.component.ts`
- Do not use directly in page templates

**Deprecated Alternatives:**
- `@app/shared/components/global-search.component.ts` (selector: `app-global-search-deprecated`)
  - **Status:** All consumers migrated to canonical version

**Related:**
- `@app/pages/global-search/global-search.component.ts` (selector: `app-global-search-page`)
  - **Purpose:** Full-page search experience (distinct use case, not deprecated)

---

#### 11. Scope Filter Bar
**Canonical Component:**
- `@app/shared/scope-filter-bar/scope-filter-bar.component.ts` (selector: `app-scope-filter-bar`)

**Purpose:**
- Entity, framework, and time-period filtering
- Used in compliance, risk, and evidence pages

**Usage:**
```typescript
import { ScopeFilterBarComponent } from '@app/shared/scope-filter-bar/scope-filter-bar.component';

<app-scope-filter-bar
  [entities]="entities()"
  [frameworks]="frameworks()"
  [selectedEntity]="selectedEntity()"
  [selectedFramework]="selectedFramework()"
  (entityChange)="onEntityChange($event)"
  (frameworkChange)="onFrameworkChange($event)" />
```

**Related (Different Use Case):**
- `@app/shared/layout/workspace-scope-filter.component.ts` (selector: `app-workspace-scope-filter`)
  - **Purpose:** Multi-dimensional workspace scope filtering (workspace-level dashboards)
  - **Status:** Not deprecated, serves different use case

---

### F. Chart Components

#### 12. ECharts Wrapper
**Canonical Component:**
- `@app/shared/charts/echart.component.ts` (selector: `app-echart`)

**Purpose:**
- Primary chart wrapper for ECharts visualizations
- Standard charts: bar, line, pie, donut, radar, gauge, heatmap, scatter, treemap

**Usage:**
```typescript
import { EChartComponent } from '@app/shared/charts/echart.component';

<app-echart [options]="chartOptions" [height]="'360px'" [theme]="'light'" />
```

**See:** `CHART_POLICY.md` for detailed usage policy

---

#### 13. Plotly Chart (3D)
**Canonical Component:**
- `@app/shared/charts/plotly-chart.component.ts` (selector: `app-plotly-chart`)

**Purpose:**
- 3D visualizations (surface plots, 3D scatter, 3D mesh)
- WebGL-accelerated 3D rendering

**Usage:**
```typescript
import { PlotlyChartComponent } from '@app/shared/charts/plotly-chart.component';

<app-plotly-chart
  [data]="plotlyData"
  [layout]="plotlyLayout"
  [height]="'500px'" />
```

**See:** `CHART_POLICY.md` for detailed usage policy

---

### G. Interactive Components

#### 14. Drill-Through Panel
**Canonical Component:**
- `@app/shared/widgets/drill-through/drill-through-panel.component.ts` (selector: `app-drill-through-panel`)

**Purpose:**
- Multi-level drill-through navigation
- Breadcrumb navigation
- Payload-driven content rendering

**Usage:**
```typescript
import { DrillThroughPanelComponent } from '@app/shared/widgets/drill-through/drill-through-panel.component';

<app-drill-through-panel />
```

**Note:** Panel is managed by `WidgetContextService` and opens automatically on drill-down events

---

## Component Ownership Summary

| Component | Canonical Location | Selector | Status |
|-----------|-------------------|----------|--------|
| Page Shell | `@app/shared/components/page-shell.component.ts` | `app-page-shell` | ✅ Canonical |
| Page Header | `@app/shared/components/page-header.component.ts` | `app-page-header` | ✅ Canonical |
| Section Header | `@app/shared/widgets/section-header/section-header.component.ts` | `app-section-header` | ✅ Canonical |
| Widget Shell | `@app/dashboard/shared/widget-shell/widget-shell.component.ts` | `app-widget-shell` | ✅ Canonical |
| Widget Container | `@app/shared/widgets/widget-container.component.ts` | `app-widget-container` | ✅ Canonical |
| Stat Card | `@app/shared/components/stat-card.component.ts` | `app-stat-card` | ✅ Canonical |
| Skeleton Loader | `@app/shared/components/skeleton-loader.component.ts` | `app-skeleton-loader` | ✅ Canonical |
| Empty State | `@app/shared/components/empty-state.component.ts` | `app-empty-state` | ✅ Canonical |
| Sidebar | `@app/layout/app-sidebar.component.ts` | `app-layout-sidebar` | ✅ Canonical |
| Global Search | `@app/shared/global-search/global-search.component.ts` | `app-global-search` | ✅ Canonical |
| Scope Filter Bar | `@app/shared/scope-filter-bar/scope-filter-bar.component.ts` | `app-scope-filter-bar` | ✅ Canonical |
| ECharts | `@app/shared/charts/echart.component.ts` | `app-echart` | ✅ Canonical |
| Plotly | `@app/shared/charts/plotly-chart.component.ts` | `app-plotly-chart` | ✅ Canonical |
| Drill-Through Panel | `@app/shared/widgets/drill-through/drill-through-panel.component.ts` | `app-drill-through-panel` | ✅ Canonical |

---

## Deprecated Components

### Widget Shell (Deprecated)
- `@app/features/dashboard/widgets/widget-shell.component.ts` (selector: `app-widget-shell-deprecated`)
- `@app/shared/widgets/widget-shell/widget-shell.component.ts` (selector: `app-widget-shell-deprecated`)
- **Migration:** Use `@app/dashboard/shared/widget-shell/widget-shell.component.ts`
- **Status:** All consumers migrated, will be removed in next major version

### Global Search (Deprecated)
- `@app/shared/components/global-search.component.ts` (selector: `app-global-search-deprecated`)
- **Migration:** Use `@app/shared/global-search/global-search.component.ts`
- **Status:** All consumers migrated, will be removed in next major version

### Sidebar (Deprecated)
- `@app/shared/layout/sidebar.component.ts` (selector: `app-sidebar-deprecated`)
- **Migration:** Use `@app/layout/app-sidebar.component.ts` for sidebar UI
- **Status:** Retained temporarily for exported utility functions (`hasPermission`, `getVisibleNavItems`)
- **Future:** Utility functions will be extracted to a separate module

---

## Component Selection Rules

### Rule 1: Always Use Canonical Components
- ✅ Use components from this map for all new implementations
- ❌ Do not create duplicate components with the same selector
- ❌ Do not use deprecated components for new code

### Rule 2: Widget State Management
- ✅ Use `app-widget-shell` with `state` input for all widgets
- ❌ Do not create custom loading/error/empty UI inside widget content

### Rule 3: Page Structure
- ✅ Use `app-page-shell` for page wrapper
- ✅ Use `app-page-header` for page headers with actions
- ✅ Use `app-section-header` for section titles (landing pages)

### Rule 4: State Patterns
- ✅ Use `app-skeleton-loader` for loading states
- ✅ Use `app-empty-state` for empty/error states
- ✅ Use widget shell's built-in states for widgets

**See:** `STATE_PATTERNS.md` for detailed state pattern policy

### Rule 5: Chart Selection
- ✅ Use `app-echart` for standard charts
- ✅ Use `app-plotly-chart` for 3D visualizations only
- ❌ Do not use Chart.js for new charts

**See:** `CHART_POLICY.md` for detailed chart usage policy

---

## Migration Checklist

When migrating from deprecated components:

- [ ] Identify all usages of deprecated component
- [ ] Update imports to canonical component
- [ ] Update selector in templates
- [ ] Verify feature parity (all features preserved)
- [ ] Test component behavior
- [ ] Update any custom styling if needed
- [ ] Remove deprecated component import

---

## Policy Maintenance

This map is **frozen** and should not be changed without:
1. Architecture review
2. Team consensus
3. Update to this document
4. Migration plan for any breaking changes

**Last Updated:** 2026-03-20  
**Policy Owner:** Frontend Architecture Team

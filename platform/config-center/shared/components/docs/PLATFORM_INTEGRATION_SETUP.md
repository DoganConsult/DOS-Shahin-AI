# Platform Integration Setup — Canonical Components

**Version:** 1.0.0  
**Effective Date:** 2026-03-20  
**Status:** ACTIVE — Integration Guide

---

## Overview

This document provides complete setup instructions for integrating canonical UI components across the entire platform. It ensures all developers know how to properly import, use, and configure canonical components.

**Key Principle:** All new implementations must use canonical components. Deprecated components are only for backward compatibility during migration.

---

## Quick Start

### 1. Import Canonical Components

All canonical components are **standalone** and can be imported directly:

```typescript
// ✅ CORRECT — Direct import of canonical component
import { WidgetShellComponent } from '@app/dashboard/shared/widget-shell/widget-shell.component';
import { ScopeFilterBarComponent } from '@app/shared/scope-filter-bar/scope-filter-bar.component';
import { GlobalSearchComponent } from '@app/shared/global-search/global-search.component';
import { PageShellComponent } from '@app/shared/components/page-shell.component';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';
import { StatCardComponent } from '@app/shared/components/stat-card.component';
import { SkeletonLoaderComponent } from '@app/shared/components/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/empty-state.component';
import { EChartComponent } from '@app/shared/charts/echart.component';
import { PlotlyChartComponent } from '@app/shared/charts/plotly-chart.component';
```

### 2. Add to Component Imports

Since components are standalone, add them to your component's `imports` array:

```typescript
@Component({
  selector: 'app-my-page',
  standalone: true,
  imports: [
    CommonModule,
    WidgetShellComponent,      // ✅ Canonical widget shell
    ScopeFilterBarComponent,    // ✅ Canonical scope filter
    EChartComponent,            // ✅ Canonical ECharts wrapper
    PageShellComponent,         // ✅ Canonical page shell
    PageHeaderComponent,        // ✅ Canonical page header
    StatCardComponent,           // ✅ Canonical stat card
    SkeletonLoaderComponent,    // ✅ Canonical skeleton loader
    EmptyStateComponent,        // ✅ Canonical empty state
  ],
  templateUrl: './my-page.component.html',
})
export class MyPageComponent {
  // Component logic
}
```

### 3. Use in Templates

```html
<!-- ✅ CORRECT — Use canonical selectors -->
<app-page-shell [title]="'My Page'" [loading]="loading()">
  <app-page-header
    [titleEn]="'My Page'"
    [titleAr]="'صفحتي'"
    [icon]="'chart-bar'"
    [actions]="pageActions" />

  <app-scope-filter-bar
    [entities]="entities()"
    [frameworks]="frameworks()"
    (entityChange)="onEntityChange($event)"
    (frameworkChange)="onFrameworkChange($event)" />

  <app-widget-shell
    [title]="'Compliance Score'"
    [subtitle]="'Overall compliance posture'"
    [state]="widgetState()"
    [canRefresh]="true"
    [canExport]="true"
    [lastUpdatedUtc]="lastUpdated()"
    (refresh)="onRefresh()"
    (export)="onExport($event)">
    <app-echart [options]="chartOptions()" [height]="'360px'" />
  </app-widget-shell>
</app-page-shell>
```

---

## Component Integration Patterns

### Pattern 1: Page with Widget Shell

**Use Case:** Dashboard page with multiple widgets

```typescript
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageShellComponent } from '@app/shared/components/page-shell.component';
import { WidgetShellComponent, WidgetState } from '@app/dashboard/shared/widget-shell/widget-shell.component';
import { EChartComponent } from '@app/shared/charts/echart.component';
import { StatCardComponent } from '@app/shared/components/stat-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    PageShellComponent,
    WidgetShellComponent,
    EChartComponent,
    StatCardComponent,
  ],
  template: `
    <app-page-shell [title]="'Dashboard'" [loading]="loading()">
      <!-- Stat Cards -->
      <div class="stat-grid">
        <app-stat-card
          [icon]="'shield'"
          [value]="complianceScore()"
          [label]="'Compliance Score'"
          [accentColor]="'#0f62fe'" />
      </div>

      <!-- Widgets -->
      <app-widget-shell
        [title]="'Compliance Trend'"
        [state]="trendWidgetState()"
        [canRefresh]="true"
        (refresh)="refreshTrend()">
        <app-echart [options]="trendChartOptions()" />
      </app-widget-shell>
    </app-page-shell>
  `,
})
export class DashboardComponent {
  loading = signal(false);
  complianceScore = signal('85%');
  trendWidgetState = signal<WidgetState>('ready');

  trendChartOptions = computed(() => ({
    xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: [80, 82, 85] }],
  }));

  refreshTrend() {
    this.trendWidgetState.set('loading');
    // ... fetch data
    this.trendWidgetState.set('ready');
  }
}
```

### Pattern 2: Page with Scope Filter

**Use Case:** Compliance, risk, or evidence page with filtering

```typescript
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageShellComponent } from '@app/shared/components/page-shell.component';
import { PageHeaderComponent } from '@app/shared/components/page-header.component';
import { ScopeFilterBarComponent, ScopeFilter } from '@app/shared/scope-filter-bar/scope-filter-bar.component';
import { SkeletonLoaderComponent } from '@app/shared/components/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/empty-state.component';

@Component({
  selector: 'app-compliance',
  standalone: true,
  imports: [
    CommonModule,
    PageShellComponent,
    PageHeaderComponent,
    ScopeFilterBarComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-shell [title]="'Compliance'" [loading]="loading()">
      <app-page-header
        [titleEn]="'Compliance'"
        [titleAr]="'الامتثال'"
        [icon]="'shield-check'"
        [actions]="headerActions" />

      <app-scope-filter-bar
        [entities]="entities()"
        [frameworks]="frameworks()"
        [selectedEntity]="selectedEntity()"
        [selectedFramework]="selectedFramework()"
        (entityChange)="onEntityChange($event)"
        (frameworkChange)="onFrameworkChange($event)" />

      @if (loading()) {
        <app-skeleton-loader [variant]="'list'" [rows]="5" />
      } @else if (items().length === 0) {
        <app-empty-state
          [variant]="'default'"
          [title]="'No compliance items'"
          [description]="'Get started by creating your first compliance item'"
          [actionLabel]="'Create Item'"
          (action)="onCreate()" />
      } @else {
        <!-- Content -->
      }
    </app-page-shell>
  `,
})
export class ComplianceComponent {
  loading = signal(false);
  entities = signal([]);
  frameworks = signal([]);
  selectedEntity = signal<string | null>(null);
  selectedFramework = signal<string | null>(null);
  items = signal([]);

  headerActions = [
    { id: 'create', labelEn: 'Create', labelAr: 'إنشاء', icon: 'plus', primary: true },
  ];

  onEntityChange(entityId: string | null) {
    this.selectedEntity.set(entityId);
    this.loadData();
  }

  onFrameworkChange(framework: string | null) {
    this.selectedFramework.set(framework);
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    // ... fetch data based on filters
    this.loading.set(false);
  }

  onCreate() {
    // ... create new item
  }
}
```

### Pattern 3: Widget with State Management

**Use Case:** Widget that handles loading, error, and empty states

```typescript
import { Component, signal, computed, effect } from '@angular/core';
import { WidgetShellComponent, WidgetState } from '@app/dashboard/shared/widget-shell/widget-shell.component';
import { EChartComponent } from '@app/shared/charts/echart.component';
import { DataService } from '@app/core/services/data.service';

@Component({
  selector: 'app-compliance-widget',
  standalone: true,
  imports: [WidgetShellComponent, EChartComponent],
  template: `
    <app-widget-shell
      [title]="'Compliance Score'"
      [subtitle]="'Overall compliance posture'"
      [state]="widgetState()"
      [canRefresh]="true"
      [canExport]="true"
      [lastUpdatedUtc]="lastUpdated()"
      (refresh)="refresh()"
      (export)="export($event)">
      <app-echart [options]="chartOptions()" [height]="'360px'" />
    </app-widget-shell>
  `,
})
export class ComplianceWidgetComponent {
  private dataService = inject(DataService);

  widgetState = signal<WidgetState>('loading');
  data = signal<any>(null);
  lastUpdated = signal<string | undefined>(undefined);

  chartOptions = computed(() => {
    const d = this.data();
    if (!d) return null;
    return {
      xAxis: { type: 'category', data: d.categories },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: d.values }],
    };
  });

  constructor() {
    this.loadData();
  }

  loadData() {
    this.widgetState.set('loading');
    this.dataService.getComplianceData().subscribe({
      next: (data) => {
        this.data.set(data);
        this.lastUpdated.set(new Date().toISOString());
        this.widgetState.set(data.length === 0 ? 'empty' : 'ready');
      },
      error: () => {
        this.widgetState.set('error');
      },
    });
  }

  refresh() {
    this.loadData();
  }

  export(format: 'png' | 'csv' | 'pdf') {
    // ... export logic
  }
}
```

---

## Global Search Integration

**Note:** Global search is automatically integrated via `top-bar.component.ts`. You typically don't need to import it directly.

If you need to use it programmatically:

```typescript
import { GlobalSearchComponent } from '@app/shared/global-search/global-search.component';

// In template (if needed):
<app-global-search />
```

---

## Sidebar Integration

**Note:** Sidebar is automatically integrated via `app-shell.component.ts`. You should **not** import it directly in page components.

The canonical sidebar (`app-layout-sidebar`) is used automatically by the app shell layout.

---

## Chart Integration

### ECharts (Primary)

```typescript
import { EChartComponent } from '@app/shared/charts/echart.component';
// or
import { AppEchartComponent } from '@app/shared/widgets/echart-wrapper/app-echart.component';

@Component({
  imports: [EChartComponent],
  template: `
    <app-echart
      [options]="chartOptions()"
      [height]="'360px'"
      [theme]="'light'"
      (chartReady)="onChartReady($event)"
      (chartError)="onChartError($event)" />
  `,
})
export class MyChartComponent {
  chartOptions = signal({
    xAxis: { type: 'category', data: ['A', 'B', 'C'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [10, 20, 30] }],
  });

  onChartReady(instance: any) {
    // Chart instance ready
  }

  onChartError(error: any) {
    // Handle error
  }
}
```

### Plotly (3D Only)

```typescript
import { PlotlyChartComponent } from '@app/shared/charts/plotly-chart.component';

@Component({
  imports: [PlotlyChartComponent],
  template: `
    <app-plotly-chart
      [data]="plotlyData()"
      [layout]="plotlyLayout()"
      [height]="'500px'" />
  `,
})
export class My3DChartComponent {
  plotlyData = signal([{
    type: 'scatter3d',
    mode: 'markers',
    x: [1, 2, 3],
    y: [4, 5, 6],
    z: [7, 8, 9],
  }]);

  plotlyLayout = signal({
    title: '3D Scatter Plot',
    scene: { xaxis: {}, yaxis: {}, zaxis: {} },
  });
}
```

---

## State Pattern Integration

### Loading State

```typescript
import { SkeletonLoaderComponent } from '@app/shared/components/skeleton-loader.component';

// In template:
@if (loading()) {
  <app-skeleton-loader [variant]="'card'" />
} @else {
  <!-- Content -->
}
```

### Empty State

```typescript
import { EmptyStateComponent } from '@app/shared/components/empty-state.component';

// In template:
@if (items().length === 0) {
  <app-empty-state
    [variant]="'default'"
    [title]="'No items yet'"
    [description]="'Get started by creating your first item'"
    [actionLabel]="'Create Item'"
    (action)="onCreate()" />
}
```

### Error State

```typescript
// In template:
@if (error()) {
  <app-empty-state
    [variant]="'error'"
    [title]="'Error loading data'"
    [description]="error()"
    [actionLabel]="'Retry'"
    (action)="retry()" />
}
```

### Widget State (Built-in)

```typescript
import { WidgetShellComponent, WidgetState } from '@app/dashboard/shared/widget-shell/widget-shell.component';

// Widget shell handles loading/error/empty states automatically:
<app-widget-shell
  [state]="widgetState()"  // 'ready' | 'loading' | 'empty' | 'error'
  [title]="'My Widget'">
  <!-- Content only shown when state === 'ready' -->
</app-widget-shell>
```

---

## Module Integration (Legacy)

If you're using Angular modules (not standalone components), you can still import canonical components:

```typescript
import { NgModule } from '@angular/core';
import { WidgetShellComponent } from '@app/dashboard/shared/widget-shell/widget-shell.component';
import { ScopeFilterBarComponent } from '@app/shared/scope-filter-bar/scope-filter-bar.component';

@NgModule({
  imports: [
    WidgetShellComponent,    // ✅ Standalone components can be imported
    ScopeFilterBarComponent, // ✅ Standalone components can be imported
  ],
  // ...
})
export class MyModule {}
```

---

## Barrel Exports (Optional)

For convenience, you can create barrel exports. However, **direct imports are preferred** for better tree-shaking.

### Example: `shared/components/index.ts`

```typescript
// Optional barrel export (not required, but convenient)
export { PageShellComponent } from './page-shell.component';
export { PageHeaderComponent } from './page-header.component';
export { StatCardComponent } from './stat-card.component';
export { SkeletonLoaderComponent } from './skeleton-loader.component';
export { EmptyStateComponent } from './empty-state.component';
```

### Usage with Barrel Export

```typescript
// ✅ Works, but direct import is preferred
import {
  PageShellComponent,
  PageHeaderComponent,
  StatCardComponent,
} from '@app/shared/components';
```

---

## Common Integration Mistakes

### ❌ DON'T: Use Deprecated Components

```typescript
// ❌ WRONG — Using deprecated component
import { WidgetShellComponent } from '@app/features/dashboard/widgets/widget-shell.component';
import { GlobalSearchComponent } from '@app/shared/components/global-search.component';

// ✅ CORRECT — Use canonical components
import { WidgetShellComponent } from '@app/dashboard/shared/widget-shell/widget-shell.component';
import { GlobalSearchComponent } from '@app/shared/global-search/global-search.component';
```

### ❌ DON'T: Use Wrong Selectors

```html
<!-- ❌ WRONG — Deprecated selector -->
<app-widget-shell-deprecated [title]="'Widget'" />

<!-- ✅ CORRECT — Canonical selector -->
<app-widget-shell [title]="'Widget'" [state]="'ready'" />
```

### ❌ DON'T: Create Duplicate Components

```typescript
// ❌ WRONG — Creating new widget-shell implementation
@Component({
  selector: 'app-widget-shell', // ❌ Conflict!
  // ...
})

// ✅ CORRECT — Use canonical component
import { WidgetShellComponent } from '@app/dashboard/shared/widget-shell/widget-shell.component';
```

### ❌ DON'T: Use Chart.js for New Charts

```typescript
// ❌ WRONG — Using Chart.js for new chart
import { Chart } from 'chart.js';

// ✅ CORRECT — Use ECharts
import { EChartComponent } from '@app/shared/charts/echart.component';
```

---

## Integration Checklist

When integrating canonical components into a new page or feature:

- [ ] **Import canonical components** (not deprecated ones)
- [ ] **Add to component imports array** (standalone components)
- [ ] **Use canonical selectors** in templates
- [ ] **Follow state patterns** (loading/error/empty)
- [ ] **Use design tokens** (no hardcoded values)
- [ ] **Follow chart policy** (ECharts primary, Plotly 3D only)
- [ ] **Test component behavior** (state transitions, i18n, RTL)
- [ ] **Verify no deprecated components** are used
- [ ] **Run guardrail tests** to verify compliance

---

## Testing Integration

### Unit Test Example

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WidgetShellComponent } from '@app/dashboard/shared/widget-shell/widget-shell.component';
import { EChartComponent } from '@app/shared/charts/echart.component';

describe('MyWidgetComponent', () => {
  let component: MyWidgetComponent;
  let fixture: ComponentFixture<MyWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MyWidgetComponent,
        WidgetShellComponent,  // ✅ Import canonical component
        EChartComponent,       // ✅ Import canonical chart
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyWidgetComponent);
    component = fixture.componentInstance;
  });

  it('should render widget shell', () => {
    const widgetShell = fixture.nativeElement.querySelector('app-widget-shell');
    expect(widgetShell).toBeTruthy();
  });
});
```

---

## Related Documentation

- `CANONICAL_COMPONENT_MAP.md` — Complete list of canonical components
- `DEPRECATION_MAP.md` — Migration guide for deprecated components
- `CHART_POLICY.md` — Chart library usage policy
- `STATE_PATTERNS.md` — State pattern policies
- `GUARDRAILS_README.md` — Guardrail tests

---

## Support

If you encounter integration issues:

1. **Check canonical component map** — Verify you're using the correct component
2. **Check deprecation map** — Ensure you're not using deprecated components
3. **Run guardrail tests** — Verify your integration follows policies
4. **Review examples** — See integration patterns above

---

## Policy Maintenance

This integration guide should be updated when:

- New canonical components are added
- Integration patterns change
- New best practices are established
- Deprecated components are removed

**Last Updated:** 2026-03-20  
**Policy Owner:** Frontend Architecture Team

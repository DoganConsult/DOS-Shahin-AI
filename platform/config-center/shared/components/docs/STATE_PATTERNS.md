# State Patterns Policy

**Version:** 1.0.0  
**Effective Date:** 2026-03-20  
**Status:** FROZEN — Canonical Policy

---

## Overview

This document defines the canonical state patterns (loading, error, empty) for the Shahin-AI GRC Platform frontend. These patterns ensure consistent UX across all pages, widgets, and components.

---

## Canonical State Components

### 1. Loading State: Skeleton Loader

**Canonical Component:**
- `@app/shared/components/skeleton-loader.component.ts` (selector: `app-skeleton-loader`)

**Variants:**
- `card` — Card-style skeleton (default)
- `list` — List item skeleton
- `detail` — Detail page skeleton

**Usage:**
```typescript
import { SkeletonLoaderComponent } from '@app/shared/components/skeleton-loader.component';

// In template:
<app-skeleton-loader [variant]="'card'" />
<app-skeleton-loader [variant]="'list'" [rows]="5" />
<app-skeleton-loader [variant]="'detail'" />
```

**Alternative (PrimeNG Skeleton):**
- PrimeNG's `SkeletonModule` (`p-skeleton`) is acceptable for PrimeNG table/list contexts
- Prefer `app-skeleton-loader` for custom layouts

---

### 2. Empty State

**Canonical Component:**
- `@app/shared/components/empty-state.component.ts` (selector: `app-empty-state`)

**Variants:**
- `default` — Standard empty state
- `error` — Error-style empty state
- `search` — Search/no results empty state
- `success` — Success/complete empty state
- `locked` — Locked/restricted empty state

**Usage:**
```typescript
import { EmptyStateComponent } from '@app/shared/components/empty-state.component';

// In template:
<app-empty-state
  [variant]="'default'"
  [title]="'No items yet'"
  [description]="'Get started by creating your first item'"
  [actionLabel]="'Create Item'"
  (action)="onCreate()" />
```

**When to Use:**
- ✅ Empty lists/tables
- ✅ Empty search results
- ✅ Empty filtered views
- ✅ No data available states
- ✅ Initial state before first action

**When NOT to Use:**
- ❌ Error states (use error variant or dedicated error component)
- ❌ Loading states (use skeleton loader)

---

### 3. Error State

**Canonical Pattern:**
- **Option A:** Use `app-empty-state` with `variant="error"`
- **Option B:** Use widget shell's built-in error state (for widgets)
- **Option C:** Inline error state for page-level errors

**Widget Shell Error State:**
The canonical widget shell (`app-widget-shell`) handles error states internally:

```typescript
<app-widget-shell [state]="'error'" [title]="'Widget Title'">
  <!-- Error state is handled by widget shell -->
</app-widget-shell>
```

**Page-Level Error State:**
For page-level errors, use `app-empty-state` with error variant:

```typescript
<app-empty-state
  variant="error"
  title="Failed to load data"
  description="An error occurred while loading. Please try again."
  [actionLabel]="'Retry'"
  (action)="onRetry()" />
```

**Inline Error State (Legacy Pattern):**
Some pages use inline `.error-state` CSS classes. This is acceptable for legacy code but new code should prefer `app-empty-state` with `variant="error"`.

---

## Widget Shell State Management

**Canonical Widget Shell:**
- `@app/dashboard/shared/widget-shell/widget-shell.component.ts` (selector: `app-widget-shell`)

**State Input:**
```typescript
@Input() state: 'loading' | 'error' | 'empty' | 'ready' = 'ready';
```

**Built-in States:**
- `loading` — Shows skeleton animation
- `error` — Shows error message with i18n support
- `empty` — Shows "No data available" message with i18n support
- `ready` — Shows widget content (`<ng-content>`)

**Usage:**
```typescript
<app-widget-shell
  [title]="'Compliance Score'"
  [state]="widgetState()"
  [canRefresh]="true"
  (refresh)="onRefresh()">
  <!-- Widget content only shown when state === 'ready' -->
  <app-echart [options]="chartOptions" />
</app-widget-shell>
```

**State Logic:**
```typescript
// In component:
widgetState = computed(() => {
  if (loading()) return 'loading';
  if (error()) return 'error';
  if (!data() || data().length === 0) return 'empty';
  return 'ready';
});
```

---

## State Pattern Decision Tree

```
Need to show state?
│
├─ Widget context?
│  └─ YES → Use app-widget-shell with state input
│     ├─ loading → state="loading"
│     ├─ error → state="error"
│     ├─ empty → state="empty"
│     └─ ready → state="ready" + content
│
├─ Page/List context?
│  └─ YES → Use dedicated state components
│     ├─ Loading → app-skeleton-loader
│     ├─ Empty → app-empty-state (variant="default"|"search")
│     └─ Error → app-empty-state (variant="error")
│
└─ PrimeNG Table context?
   └─ YES → Use PrimeNG SkeletonModule (p-skeleton) for loading
      └─ Use app-empty-state for empty table
```

---

## State Pattern Rules

### Rule 1: Widget Shell States (Preferred for Widgets)

**Always use widget shell's built-in states for widgets:**
- ✅ Widget loading → `state="loading"`
- ✅ Widget error → `state="error"`
- ✅ Widget empty → `state="empty"`
- ✅ Widget ready → `state="ready"` + content

**Do NOT:**
- ❌ Create custom loading/error/empty UI inside widget content
- ❌ Use separate skeleton/empty components inside widget shell

### Rule 2: Page-Level States

**For page-level states, use dedicated components:**
- ✅ Page loading → `app-skeleton-loader` (appropriate variant)
- ✅ Page empty → `app-empty-state` (with action if applicable)
- ✅ Page error → `app-empty-state` (variant="error" with retry action)

### Rule 3: List/Table States

**For lists and tables:**
- ✅ Loading → `app-skeleton-loader` (variant="list") or PrimeNG `p-skeleton`
- ✅ Empty → `app-empty-state` (variant="default" or "search")
- ✅ Error → `app-empty-state` (variant="error")

### Rule 4: Inline States (Legacy)

**Legacy inline states (`.error-state`, `.empty-state` CSS classes) are acceptable for existing code but:**
- ⚠️ New code should use canonical components
- ⚠️ Legacy patterns should be migrated when refactoring

---

## Internationalization (i18n)

**All state components support i18n:**

**Widget Shell:**
- Uses `I18nService` for error/empty messages
- Keys: `common.failedToLoad`, `common.noDataAvailable`, `common.lastUpdated`

**Empty State:**
- Title and description should be i18n-translated strings
- Action labels should be i18n-translated

**Skeleton Loader:**
- No text content (visual only)

---

## Examples

### ✅ Correct: Widget with State Management

```typescript
@Component({ /* ... */ })
export class ComplianceWidgetComponent {
  data = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  widgetState = computed(() => {
    if (this.loading()) return 'loading';
    if (this.error()) return 'error';
    if (!this.data() || this.data().length === 0) return 'empty';
    return 'ready';
  });
}
```

```html
<app-widget-shell
  [title]="'Compliance Score'"
  [state]="widgetState()"
  [canRefresh]="true"
  (refresh)="loadData()">
  <app-echart [options]="chartOptions()" />
</app-widget-shell>
```

### ✅ Correct: Page with Empty State

```typescript
@Component({ /* ... */ })
export class PoliciesPageComponent {
  policies = signal<Policy[]>([]);
  loading = signal(false);
  
  i18n = inject(I18nService);
}
```

```html
@if (loading()) {
  <app-skeleton-loader [variant]="'list'" [rows]="5" />
} @else if (policies().length === 0) {
  <app-empty-state
    [title]="i18n.translate('policies.noPolicies')"
    [description]="i18n.translate('policies.createFirstPolicy')"
    [actionLabel]="i18n.translate('common.create')"
    (action)="onCreatePolicy()" />
} @else {
  <!-- Policies list -->
}
```

### ✅ Correct: Page with Error State

```typescript
@Component({ /* ... */ })
export class ReportsPageComponent {
  error = signal<string | null>(null);
  i18n = inject(I18nService);
}
```

```html
@if (error()) {
  <app-empty-state
    variant="error"
    [title]="i18n.translate('common.error')"
    [description]="error()"
    [actionLabel]="i18n.translate('common.retry')"
    (action)="onRetry()" />
}
```

### ❌ Incorrect: Custom Loading State in Widget

```html
<!-- DO NOT create custom loading inside widget shell -->
<app-widget-shell [state]="'ready'">
  @if (loading) {
    <div class="custom-loading">Loading...</div> <!-- WRONG -->
  }
</app-widget-shell>
```

**Correct:**
```html
<app-widget-shell [state]="loading ? 'loading' : 'ready'">
  <!-- Widget content -->
</app-widget-shell>
```

---

## Migration Notes

### Legacy Inline States → Canonical Components

**Before (Legacy):**
```html
<div *ngIf="loading" class="loading-state">Loading...</div>
<div *ngIf="!loading && items.length === 0" class="empty-state">No items</div>
<div *ngIf="error" class="error-state">{{ error }}</div>
```

**After (Canonical):**
```html
@if (loading()) {
  <app-skeleton-loader [variant]="'list'" />
} @else if (error()) {
  <app-empty-state variant="error" [title]="error()" [actionLabel]="'Retry'" (action)="onRetry()" />
} @else if (items().length === 0) {
  <app-empty-state [title]="'No items'" />
} @else {
  <!-- Content -->
}
```

---

## Component Reference

### SkeletonLoaderComponent

**Location:** `@app/shared/components/skeleton-loader.component.ts`  
**Selector:** `app-skeleton-loader`  
**Inputs:**
- `variant: 'card' | 'list' | 'detail' = 'card'`
- `rows: number` (for list variant)

### EmptyStateComponent

**Location:** `@app/shared/components/empty-state.component.ts`  
**Selector:** `app-empty-state`  
**Inputs:**
- `variant: 'default' | 'error' | 'search' | 'success' | 'locked' = 'default'`
- `icon: string` (optional, overrides variant icon)
- `title: string = 'No items yet'`
- `description: string = ''`
- `actionLabel: string = ''`
- `dir: 'ltr' | 'rtl' = 'ltr'`
**Outputs:**
- `action: EventEmitter<void>` (emitted when action button clicked)

### WidgetShellComponent (State Management)

**Location:** `@app/dashboard/shared/widget-shell/widget-shell.component.ts`  
**Selector:** `app-widget-shell`  
**State Input:**
- `state: 'loading' | 'error' | 'empty' | 'ready' = 'ready'`

---

## Policy Maintenance

This policy is **frozen** and should not be changed without:
1. Architecture review
2. Team consensus
3. Update to this document
4. Migration plan for any breaking changes

**Last Updated:** 2026-03-20  
**Policy Owner:** Frontend Architecture Team

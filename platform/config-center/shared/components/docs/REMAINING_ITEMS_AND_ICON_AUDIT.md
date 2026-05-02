# Remaining Items & Icon System Audit

**Date:** 2026-03-20  
**Status:** Audit Report

---

## Overview

This document lists all remaining items that need unification and audits the icon system and dynamic DB-driven UI components for unification opportunities.

**Last Updated:** 2026-03-20  
**Status:** Audit Complete — Ready for Implementation

---

## Executive Summary

### Critical Issues (Must Fix Immediately)
1. **🔴 Dynamic Dashboard Host Selector Conflict** — Two components share `app-dynamic-dashboard-host` selector
   - **Canonical:** `shared/dashboard/dynamic-dashboard-host.component.ts` (in use, API-driven)
   - **Deprecated:** `widgets/core/hosts/dynamic-dashboard-host.component.ts` (not in use, layout-focused)
   - **Action:** Rename deprecated selector to `app-widget-layout-host`
   - **Effort:** 30 minutes

### Important Issues (Should Fix Soon)
2. **🟡 Sidebar Utility Functions** — Utilities trapped in deprecated component
   - **Blocking:** Full sidebar deprecation removal
   - **Action:** Extract `hasPermission()`, `getVisibleNavItems()`, `ROLE_PERMISSIONS`, `NavItem` to dedicated files
   - **Effort:** 2-4 hours

3. **🟡 Icon System Unification** — Inconsistent icon usage across platform
   - **Issue:** Hardcoded `pi-*` classes in canonical components, local mappings, no unified component
   - **Action:** Create canonical `<app-icon>` component and icon constants
   - **Effort:** 4-6 hours

### Optional Improvements (Can Defer)
4. **🟢 Workflow Builder Migration** — Custom page shell instead of canonical
5. **🟢 Table/Form/Dialog Pattern Audit** — Check for duplicate patterns

### Dynamic Components Audit Results ✅
- **`app-dynamic-widget-host`** — ✅ No conflicts, different use case
- **`app-executive-dynamic-page`** — ✅ No conflicts, uses canonical component
- **`app-dynamic-dashboard-page`** — ✅ No conflicts, different use case
- **`app-form-builder`** — ✅ No conflicts, uses canonical components
- **`app-workflow-builder`** — ✅ No conflicts, minor improvement opportunity

---

## 1. Remaining Items from UI Foundation Unification

### 1.1 Deprecated Component Cleanup

**Status:** 🟡 PARTIALLY COMPLETE

**Remaining Work:**

#### A. Sidebar Utility Functions Migration
**Blocker:** Utility functions exported from deprecated sidebar component

**Files to Migrate:**
- `frontend/src/app/shared/layout/sidebar.component.ts` (deprecated)

**Functions to Extract:**
- `hasPermission()` → Move to `@app/shared/utils/rbac.utils.ts`
- `getVisibleNavItems()` → Move to `@app/shared/utils/navigation.utils.ts`
- `ROLE_PERMISSIONS` constant → Move to `@app/shared/constants/rbac.constants.ts`
- `NavItem` interface → Move to `@app/shared/types/navigation.types.ts`

**Dependencies:**
- `@app/core/guards/role.guard.ts` imports `hasPermission` from deprecated sidebar
- Other components may use navigation utilities (need to verify)

**Current Usage Found:**
- `frontend/src/app/core/guards/role.guard.ts` — imports `hasPermission` function
- Need to search for other usages of `getVisibleNavItems`, `ROLE_PERMISSIONS`, `NavItem`

**Estimated Effort:** 2-4 hours

**Priority:** MEDIUM (blocking full sidebar deprecation removal)

---

#### B. Chart.js Legacy Widgets
**Status:** 🟢 SOFT-DEPRECATED (no forced migration)

**Policy:** Migrate to ECharts when widgets are updated/refactored

**Action Required:** None (policy-driven, not code-driven)

---

### 1.2 Icon System Unification

**Status:** 🟡 NEEDS UNIFICATION

**Current State:**

#### A. Icon Mapping System
**File:** `frontend/src/app/shared/utils/nav-icons.ts`

**What Exists:**
- `NAV_ICON_MAP` — 154 icon mappings (route → PrimeIcon class)
- `getNavIcon(route)` — Resolver function with fallback

**Issues Found:**
1. **Inconsistent Usage:**
   - Some components use `getNavIcon()` from nav-icons.ts
   - Many components hardcode `pi-*` classes directly
   - Some components define local icon mappings (e.g., `PHASE_ICONS`, `STATUS_ICONS`)

2. **No Canonical Icon Component:**
   - No unified `<app-icon>` component
   - Icons are rendered as `<i class="pi pi-*">` throughout codebase
   - No centralized icon styling/theming

3. **Icon Naming Inconsistencies:**
   - Some use route keys (e.g., `'dashboard'`)
   - Some use icon names directly (e.g., `'pi-chart-bar'`)
   - Some use shorthand (e.g., `'chart-bar'` expecting `pi-` prefix)

**Examples of Inconsistent Usage:**

```typescript
// ✅ GOOD — Uses NAV_ICON_MAP
import { getNavIcon } from '@app/shared/utils/nav-icons';
const icon = getNavIcon('dashboard'); // Returns 'pi-chart-bar'

// ❌ INCONSISTENT — Hardcoded (found in canonical components!)
// Found in: page-shell.component.ts, page-header.component.ts, empty-state.component.ts, global-search.component.ts
<i class="pi pi-chart-bar"></i>
<i class="pi pi-chevron-right"></i>
<i class="pi pi-plus"></i>
<i class="pi pi-search"></i>
<i class="pi pi-times"></i>
<i class="pi pi-spin pi-spinner"></i>
<i class="pi pi-inbox"></i>
<i class="pi pi-history"></i>

// ❌ INCONSISTENT — Local mapping (found in roadmap-view.component.ts, dashboard.component.ts, workspace-home.component.ts)
const PHASE_ICONS: Record<string, string> = {
  foundation: 'pi-building',
  assessment: 'pi-search',
  // ...
};
const STATUS_ICONS: Record<TaskStatus, string> = {
  pending: 'pi-circle',
  in_progress: 'pi-spin pi-spinner',
  completed: 'pi-check-circle',
  // ...
};
actionIcon(type: string): string {
  const icons: Record<string, string> = {
    overdue_task: 'pi pi-clock',
    pending_approval: 'pi pi-check-circle',
    // ...
  };
  return icons[type] || 'pi pi-circle';
}

// ❌ INCONSISTENT — Direct string (found in form-builder.component.ts, page-shell inputs)
icon="pencil" // Expects pi-pencil
icon="chart-bar" // Expects pi-chart-bar
```

**Hardcoded Icons Found in Canonical Components:**
- `page-shell.component.ts`: `pi-chevron-right` (breadcrumb separator)
- `page-header.component.ts`: `pi-chevron-right` (breadcrumb separator)
- `empty-state.component.ts`: `pi-plus` (action icon)
- `global-search.component.ts`: `pi-search`, `pi-times`, `pi-spin pi-spinner`, `pi-inbox`, `pi-history`
- `ai-entity-context-panel.component.ts`: `pi-sparkles`, `pi-lightbulb`, `pi-exclamation-triangle`
- `entity-preview.component.ts`: `pi-user`, `pi-clock`, `pi-eye`, `pi-pencil`
- `list-pagination-bar.component.ts`: `pi-chevron-left`, `pi-chevron-right`

**Recommendation:**
1. Create canonical `<app-icon>` component
2. Standardize on `getNavIcon()` for all route-based icons
3. Create icon constants file for non-route icons (status, phase, etc.)
4. Add lint rule to prevent hardcoded `pi-*` classes

**Estimated Effort:** 4-6 hours

**Priority:** MEDIUM (improves consistency, not blocking)

---

### 1.3 Dynamic DB-Driven UI Components

**Status:** 🟡 NEEDS AUDIT & POTENTIAL UNIFICATION

**Components Found:**

#### A. Dynamic Dashboard Host (2 implementations) ⚠️ **CRITICAL CONFLICT**
1. **`frontend/src/app/shared/dashboard/dynamic-dashboard-host.component.ts`** ✅ **CANONICAL**
   - Selector: `app-dynamic-dashboard-host`
   - Purpose: Renders widgets from API-driven dashboard configuration
   - Features:
     - API integration (`DashboardApiService`)
     - Loading/error states
     - Widget loading via `WidgetLoaderService`
     - Uses `WidgetHostDirective` for dynamic rendering
     - Supports `dashboardCode` and `tenantId` inputs
   - Status: ✅ Standalone, production-ready, **IN USE**
   - **Usage:** `executive-dynamic-page.component.ts` imports and uses this version

2. **`frontend/src/app/widgets/core/hosts/dynamic-dashboard-host.component.ts`** ⚠️ **DEPRECATED**
   - Selector: `app-dynamic-dashboard-host` ⚠️ **DUPLICATE SELECTOR**
   - Purpose: Renders widgets from `DashboardLayout` configuration object
   - Features:
     - Takes `DashboardLayout` and `WidgetRenderContext` as required inputs
     - Uses `WidgetRegistryService` and `WidgetVisibilityService`
     - Uses `WidgetOutletComponent` for rendering
     - More focused on layout/visibility filtering
   - Status: ⚠️ **CONFLICT** — Same selector as #1, **NOT IN USE**
   - **Usage:** No usages found in codebase

**Decision:**
- **Canonical:** `shared/dashboard/dynamic-dashboard-host.component.ts` (more feature-complete, API-driven, in use)
- **Deprecated:** `widgets/core/hosts/dynamic-dashboard-host.component.ts` (rename selector to `app-widget-layout-host` or remove)

**Action Required:**
1. Rename deprecated version selector to `app-widget-layout-host` (or remove if unused)
2. Add `@deprecated` JSDoc tag to deprecated version
3. Update any potential usages (none found currently)
4. Document in `DEPRECATION_MAP.md`

---

#### B. Form Builder
**File:** `frontend/src/app/pages/form-builder/form-builder.component.ts`

**Status:** ✅ Standalone, no conflicts

**Purpose:**
- Create/manage form templates
- Render forms from database schemas
- Workflow template management

**Integration:**
- Uses canonical `PageShellComponent`
- Uses canonical `StatusBadgeComponent`
- Uses canonical `EmptyStateComponent` (via template)

**Notes:**
- Not a shared component (page-level)
- No unification needed (single implementation)

---

#### C. Workflow Builder
**File:** `frontend/src/app/pages/workflow-builder/workflow-builder.component.ts`

**Status:** ✅ Standalone, no conflicts

**Purpose:**
- Visual workflow canvas builder
- Drag-and-drop workflow nodes
- Workflow simulation

**Integration:**
- Uses custom page shell (not canonical `PageShellComponent`)
- Could benefit from canonical page shell migration

**Notes:**
- Not a shared component (page-level)
- Consider migrating to canonical `PageShellComponent`

---

#### D. Dynamic Widget Host
**File:** `frontend/src/app/features/dashboard/dynamic-widget-host.component.ts`

**Status:** ✅ NO CONFLICTS

**Purpose:**
- Renders a single widget component by `componentKey`
- Uses local widget registry (`DASHBOARD_WIDGET_COMPONENTS`)
- Simple, focused component for single widget rendering

**Selector:** `app-dynamic-widget-host` (unique, no conflicts)

**Usage:**
- Used by `dynamic-dashboard-page.component.ts` to render individual widgets

**Integration:**
- No conflicts with other components
- Different purpose than `app-dynamic-dashboard-host` (single widget vs. full dashboard)

**Action Required:** None (no conflicts, different use case)

---

#### E. Executive Dynamic Page
**File:** `frontend/src/app/features/executive/executive-dynamic-page.component.ts`

**Status:** ✅ NO CONFLICTS

**Purpose:**
- Page-level component for executive dashboard
- Wraps `app-dynamic-dashboard-host` with `dashboardCode="agrc-executive"`

**Selector:** `app-executive-dynamic-page` (unique, no conflicts)

**Integration:**
- Uses canonical `shared/dashboard/dynamic-dashboard-host.component.ts`
- Properly imports and uses the canonical version

**Action Required:** None (no conflicts, uses canonical component)

---

#### F. Dynamic Dashboard Page
**File:** `frontend/src/app/features/dashboard/pages/dynamic-dashboard-page.component.ts`

**Status:** ✅ NO CONFLICTS

**Purpose:**
- Page-level component for dynamic dashboards loaded from route params
- Uses `DashboardStore` for state management
- Renders widgets using `app-dynamic-widget-host` (not the conflicting component)

**Selector:** `app-dynamic-dashboard-page` (unique, no conflicts)

**Integration:**
- Uses `app-dynamic-widget-host` (different from conflicting `app-dynamic-dashboard-host`)
- Uses `DashboardStore` for data management
- No conflicts with other components

**Action Required:** None (no conflicts, different use case)

---

### 1.4 Other Potential Unification Items

#### A. Table/Data Display Patterns
**Status:** 🟡 NEEDS AUDIT

**Questions:**
- Are there duplicate table components?
- Is there a canonical data table pattern?
- Are PrimeNG TableModule usages consistent?

**Action Required:** Audit table usage patterns

---

#### B. Dialog/Modal Patterns
**Status:** 🟡 NEEDS AUDIT

**Questions:**
- Are dialog patterns consistent?
- Is there a canonical dialog wrapper?
- Are PrimeNG DialogModule usages consistent?

**Action Required:** Audit dialog/modal usage patterns

---

#### C. Form Input Patterns
**Status:** 🟡 NEEDS AUDIT

**Questions:**
- Are form input patterns consistent?
- Is there a canonical form field component?
- Are validation patterns unified?

**Action Required:** Audit form input patterns

---

## 2. Icon System Unification Plan

### 2.1 Current Icon Usage Analysis

**Icon Sources:**
1. **PrimeIcons** (primary) — `pi-*` classes
2. **Material Icons** (secondary) — via `@fontsource/material-icons-outlined`
3. **Custom icons** — SVG or image assets

**Icon Usage Patterns:**
- Route-based icons → `getNavIcon(route)` from `nav-icons.ts`
- Status icons → Hardcoded `pi-*` classes
- Phase icons → Local mappings in components
- Action icons → Hardcoded `pi-*` classes
- Widget icons → Mixed (some from manifest, some hardcoded)

---

### 2.2 Recommended Icon Unification

#### Step 1: Create Canonical Icon Component
**File:** `frontend/src/app/shared/components/icon.component.ts`

**Purpose:**
- Unified icon rendering
- Consistent styling
- Icon size/color theming
- Fallback handling

**Proposed API:**
```typescript
<app-icon 
  [name]="'dashboard'" 
  [size]="'md'"
  [color]="'primary'"
  [type]="'route'" />
```

---

#### Step 2: Create Icon Constants
**File:** `frontend/src/app/shared/constants/icons.constants.ts`

**Purpose:**
- Centralize all icon mappings
- Status icons
- Phase icons
- Action icons
- Widget icons

**Structure:**
```typescript
export const STATUS_ICONS = {
  pending: 'pi-circle',
  in_progress: 'pi-spin pi-spinner',
  completed: 'pi-check-circle',
  // ...
};

export const PHASE_ICONS = {
  foundation: 'pi-building',
  assessment: 'pi-search',
  // ...
};
```

---

#### Step 3: Migrate Components
**Priority Order:**
1. High-impact shared components (page-shell, page-header, etc.)
2. Dashboard components
3. Page components
4. Widget components

---

#### Step 4: Add Lint Rules
**Rule:** Prevent hardcoded `pi-*` classes

**Exception:** Allow in icon component itself

---

## 3. Dynamic DB-Driven UI Components Audit

### 3.1 Components Requiring Immediate Attention

#### A. Dynamic Dashboard Host Conflict ⚠️ CRITICAL
**Issue:** Two components with same selector `app-dynamic-dashboard-host`

**Files:**
1. `frontend/src/app/shared/dashboard/dynamic-dashboard-host.component.ts`
2. `frontend/src/app/widgets/core/hosts/dynamic-dashboard-host.component.ts`

**Action Required:**
1. Determine which is canonical (likely `shared/dashboard` version)
2. Rename deprecated version selector
3. Migrate usages
4. Remove deprecated version

**Estimated Effort:** 2-3 hours

**Priority:** HIGH (selector conflict)

---

### 3.2 Components Requiring Audit

#### A. Dynamic Widget Host
**File:** `frontend/src/app/features/dashboard/dynamic-widget-host.component.ts`

**Action:** Read file, check for conflicts, determine canonical status

---

#### B. Executive Dynamic Page
**File:** `frontend/src/app/features/executive/executive-dynamic-page.component.ts`

**Action:** Read file, check for conflicts, determine canonical status

---

#### C. Dynamic Dashboard Page
**File:** `frontend/src/app/features/dashboard/pages/dynamic-dashboard-page.component.ts`

**Action:** Read file, check for conflicts, determine canonical status

---

### 3.3 Form Builder Status

**Status:** ✅ NO ACTION NEEDED

**Reason:**
- Single implementation
- No conflicts
- Uses canonical components
- Page-level component (not shared)

---

### 3.4 Workflow Builder Status

**Status:** 🟡 MINOR IMPROVEMENT OPPORTUNITY

**Recommendation:**
- Migrate to canonical `PageShellComponent` instead of custom page shell
- Standardize icon usage
- Use canonical empty state component

**Priority:** LOW (not blocking)

---

## 4. Summary of Remaining Items

### Critical (Must Fix)
1. **Dynamic Dashboard Host Selector Conflict** — Two components with same selector
   - Priority: HIGH
   - Effort: 2-3 hours
   - Blocker: Yes

---

### Important (Should Fix)
2. **Sidebar Utility Functions Migration** — Extract utilities from deprecated component
   - Priority: MEDIUM
   - Effort: 2-4 hours
   - Blocker: Yes (for sidebar deprecation removal)

3. **Icon System Unification** — Create canonical icon component and constants
   - Priority: MEDIUM
   - Effort: 4-6 hours
   - Blocker: No (improves consistency)

---

### Nice to Have (Can Defer)
4. **Workflow Builder Migration** — Migrate to canonical page shell
   - Priority: LOW
   - Effort: 1-2 hours
   - Blocker: No

5. **Dynamic Components Audit** — Audit remaining dynamic components
   - Priority: LOW
   - Effort: 2-3 hours
   - Blocker: No

6. **Table/Form/Dialog Pattern Audit** — Check for duplicate patterns
   - Priority: LOW
   - Effort: 4-6 hours
   - Blocker: No

---

## 5. Recommended Next Steps

### Immediate (This Sprint)
1. ✅ Resolve dynamic dashboard host selector conflict
2. ✅ Extract sidebar utility functions

### Short Term (Next Sprint)
3. ✅ Create canonical icon component
4. ✅ Create icon constants file
5. ✅ Migrate high-impact components to icon component

### Medium Term (Future)
6. Audit remaining dynamic components
7. Audit table/form/dialog patterns
8. Migrate workflow builder to canonical page shell

---

## 6. Icon System Unification — Detailed Plan

### Phase 1: Create Icon Infrastructure

**Files to Create:**
1. `frontend/src/app/shared/components/icon.component.ts`
2. `frontend/src/app/shared/constants/icons.constants.ts`
3. `frontend/src/app/shared/components/icon.component.scss`

**Icon Component API:**
```typescript
@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <i [ngClass]="iconClass()" [class]="sizeClass()" [style.color]="color()"></i>
  `,
})
export class IconComponent {
  @Input() name!: string;
  @Input() type: 'route' | 'status' | 'phase' | 'action' | 'direct' = 'route';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() color?: string;
  
  iconClass = computed(() => {
    if (this.type === 'direct') return `pi-${this.name}`;
    // Resolve from constants
  });
}
```

---

### Phase 2: Create Icon Constants

**File:** `frontend/src/app/shared/constants/icons.constants.ts`

```typescript
import { NAV_ICON_MAP } from '../utils/nav-icons';

export const STATUS_ICONS: Record<string, string> = {
  pending: 'pi-circle',
  in_progress: 'pi-spin pi-spinner',
  completed: 'pi-check-circle',
  skipped: 'pi-minus-circle',
  failed: 'pi-times-circle',
  // ...
};

export const PHASE_ICONS: Record<string, string> = {
  foundation: 'pi-building',
  assessment: 'pi-search',
  implementation: 'pi-wrench',
  operations: 'pi-sync',
  continuous_improvement: 'pi-chart-line',
};

export const ACTION_ICONS: Record<string, string> = {
  create: 'pi-plus',
  edit: 'pi-pencil',
  delete: 'pi-trash',
  save: 'pi-save',
  cancel: 'pi-times',
  // ...
};

export function getIcon(name: string, type: 'route' | 'status' | 'phase' | 'action' | 'direct' = 'route'): string {
  switch (type) {
    case 'route': return NAV_ICON_MAP[name] || `pi-${name}`;
    case 'status': return STATUS_ICONS[name] || `pi-${name}`;
    case 'phase': return PHASE_ICONS[name] || `pi-${name}`;
    case 'action': return ACTION_ICONS[name] || `pi-${name}`;
    case 'direct': return `pi-${name}`;
    default: return `pi-${name}`;
  }
}
```

---

### Phase 3: Migrate Components

**Migration Order:**
1. Shared components (page-shell, page-header, etc.)
2. Dashboard components
3. High-traffic pages
4. Remaining pages
5. Widgets

**Migration Pattern:**
```typescript
// OLD
<i class="pi pi-chart-bar"></i>

// NEW
<app-icon name="chart-bar" type="route" size="md" />
```

---

### Phase 4: Add Lint Rules

**Rule:** Prevent hardcoded `pi-*` classes

**File:** `.eslintrc.json` or lint config

**Pattern:**
```json
{
  "rules": {
    "no-hardcoded-primeicons": "error"
  }
}
```

**Exception:** Allow in `icon.component.ts` and `icons.constants.ts`

---

## 7. Dynamic DB-Driven UI — Detailed Audit Plan

### Step 1: Resolve Selector Conflict ✅ **READY TO FIX**

**Findings:**
1. ✅ Both files read and compared
2. ✅ Features compared:
   - `shared/dashboard` version: API-driven, loading/error states, more feature-complete, **IN USE**
   - `widgets/core/hosts` version: Layout-focused, takes config objects, **NOT IN USE**
3. ✅ Canonical determined: `shared/dashboard/dynamic-dashboard-host.component.ts`
4. ⏳ **Action Required:** Rename deprecated version selector to `app-widget-layout-host`
5. ⏳ **Action Required:** Add `@deprecated` JSDoc tag
6. ⏳ **Action Required:** Update `DEPRECATION_MAP.md`

**Implementation Steps:**
1. Rename selector in `widgets/core/hosts/dynamic-dashboard-host.component.ts`:
   ```typescript
   selector: 'app-widget-layout-host', // Changed from app-dynamic-dashboard-host
   ```
2. Add deprecation notice:
   ```typescript
   /**
    * @deprecated Use app-dynamic-dashboard-host from @app/shared/dashboard instead.
    * This component is kept for backward compatibility with DashboardLayout-based rendering.
    * Will be removed in a future version.
    */
   ```
3. Update `DEPRECATION_MAP.md` with migration path

---

### Step 2: Audit Remaining Dynamic Components

**Components to Audit:**
1. `dynamic-widget-host.component.ts`
2. `executive-dynamic-page.component.ts`
3. `dynamic-dashboard-page.component.ts`

**Audit Checklist:**
- [ ] Check for selector conflicts
- [ ] Check for duplicate functionality
- [ ] Verify canonical component usage
- [ ] Check integration with canonical components
- [ ] Document findings

---

### Step 3: Create Dynamic UI Component Policy

**Policy Document:** `DYNAMIC_UI_POLICY.md`

**Contents:**
- When to use dynamic components
- Canonical dynamic component patterns
- DB-driven UI best practices
- Form builder usage guidelines
- Workflow builder usage guidelines

---

## 8. Integration Checklist

### Icon System
- [ ] Create `icon.component.ts`
- [ ] Create `icons.constants.ts`
- [ ] Migrate `page-shell.component.ts` to use icon component
- [ ] Migrate `page-header.component.ts` to use icon component
- [ ] Migrate dashboard components
- [ ] Add lint rule for hardcoded icons
- [ ] Update documentation

### Dynamic Components
- [ ] Resolve dynamic dashboard host conflict
- [ ] Audit remaining dynamic components
- [ ] Create dynamic UI policy document
- [ ] Migrate workflow builder to canonical page shell (optional)

### Sidebar Utilities
- [ ] Extract `hasPermission()` to `rbac.utils.ts`
- [ ] Extract `getVisibleNavItems()` to `navigation.utils.ts`
- [ ] Extract `ROLE_PERMISSIONS` to `rbac.constants.ts`
- [ ] Extract `NavItem` to `navigation.types.ts`
- [ ] Update all imports
- [ ] Remove deprecated sidebar component

---

## 9. Estimated Total Effort

| Item | Effort | Priority |
|------|--------|----------|
| Dynamic Dashboard Host Conflict | 2-3 hours | HIGH |
| Sidebar Utility Migration | 2-4 hours | MEDIUM |
| Icon System Unification | 4-6 hours | MEDIUM |
| Dynamic Components Audit | 2-3 hours | LOW |
| Workflow Builder Migration | 1-2 hours | LOW |
| **Total** | **11-18 hours** | |

---

## 10. Priority Ranking

1. **🔴 CRITICAL:** Dynamic dashboard host selector conflict
2. **🟡 IMPORTANT:** Sidebar utility migration
3. **🟡 IMPORTANT:** Icon system unification
4. **🟢 OPTIONAL:** Dynamic components audit
5. **🟢 OPTIONAL:** Workflow builder migration

---

**Next Action:** Resolve dynamic dashboard host selector conflict first (highest priority, blocking issue).

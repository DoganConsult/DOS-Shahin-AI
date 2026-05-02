# Action Plan — Remaining UI Foundation Unification Items

**Date:** 2026-03-20  
**Status:** Ready for Implementation

---

## Quick Reference

| Priority | Item | Effort | Blocker |
|---------|------|--------|---------|
| 🔴 CRITICAL | Dynamic Dashboard Host Selector Conflict | 30 min | Yes |
| 🟡 IMPORTANT | Sidebar Utility Functions Migration | 2-4 hrs | Yes (sidebar removal) |
| 🟡 IMPORTANT | Icon System Unification | 4-6 hrs | No |
| 🟢 OPTIONAL | Workflow Builder Migration | 1-2 hrs | No |
| 🟢 OPTIONAL | Dynamic Components Audit | Complete ✅ | No |

---

## 1. 🔴 CRITICAL: Resolve Dynamic Dashboard Host Selector Conflict

### Problem
Two components share the same selector `app-dynamic-dashboard-host`:
- `frontend/src/app/shared/dashboard/dynamic-dashboard-host.component.ts` (✅ canonical, in use)
- `frontend/src/app/widgets/core/hosts/dynamic-dashboard-host.component.ts` (⚠️ deprecated, not in use)

### Solution
Rename the deprecated version's selector.

### Implementation Steps

#### Step 1: Rename Selector
**File:** `frontend/src/app/widgets/core/hosts/dynamic-dashboard-host.component.ts`

```typescript
@Component({
  selector: 'app-widget-layout-host', // Changed from app-dynamic-dashboard-host
  standalone: true,
  // ...
})
/**
 * @deprecated Use app-dynamic-dashboard-host from @app/shared/dashboard instead.
 * This component is kept for backward compatibility with DashboardLayout-based rendering.
 * Will be removed in a future version.
 */
export class DynamicDashboardHostComponent {
  // ...
}
```

#### Step 2: Update Deprecation Map
**File:** `frontend/src/app/shared/components/DEPRECATION_MAP.md`

Add entry:
```markdown
### Dynamic Dashboard Host (Widgets Core)

**File:** `frontend/src/app/widgets/core/hosts/dynamic-dashboard-host.component.ts`

**Selector:** `app-widget-layout-host` (renamed from `app-dynamic-dashboard-host`)

**Status:** 🟡 DEPRECATED

**Canonical Replacement:** `app-dynamic-dashboard-host` from `@app/shared/dashboard/dynamic-dashboard-host.component.ts`

**Migration:**
- If using `DashboardLayout` + `WidgetRenderContext` inputs → Consider migrating to API-driven approach
- If keeping layout-based approach → Update selector to `app-widget-layout-host`

**Removal Blocker:** None (no usages found)
```

#### Step 3: Verify No Usages
Run:
```bash
grep -r "app-dynamic-dashboard-host" frontend/src --exclude-dir=node_modules
```

Expected: Only `shared/dashboard` version and documentation should reference it.

### Verification
- [ ] Selector renamed in deprecated component
- [ ] `@deprecated` JSDoc tag added
- [ ] `DEPRECATION_MAP.md` updated
- [ ] No usages of old selector found
- [ ] Selector conflict test passes

**Estimated Time:** 30 minutes

---

## 2. 🟡 IMPORTANT: Sidebar Utility Functions Migration

### Problem
Deprecated sidebar component exports utility functions used by guards and other components:
- `hasPermission()` — Used by `role.guard.ts`
- `getVisibleNavItems()` — Navigation filtering
- `ROLE_PERMISSIONS` — Permission constants
- `NavItem` — Navigation item interface

### Solution
Extract utilities to dedicated files.

### Implementation Steps

#### Step 1: Create Utility Files

**File:** `frontend/src/app/shared/utils/rbac.utils.ts`
```typescript
import { ROLE_PERMISSIONS } from '../constants/rbac.constants';
import { SessionService } from '@app/core/dauth/session/session.service';

export function hasPermission(requiredPermission: string, authService: SessionService): boolean {
  // Implementation from sidebar.component.ts
}
```

**File:** `frontend/src/app/shared/constants/rbac.constants.ts`
```typescript
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Copy from sidebar.component.ts
};
```

**File:** `frontend/src/app/shared/utils/navigation.utils.ts`
```typescript
import { NavItem } from '../types/navigation.types';
import { hasPermission } from './rbac.utils';

export function getVisibleNavItems(
  items: NavItem[],
  authService: SessionService
): NavItem[] {
  // Implementation from sidebar.component.ts
}
```

**File:** `frontend/src/app/shared/types/navigation.types.ts`
```typescript
export interface NavItem {
  // Copy from sidebar.component.ts
}
```

#### Step 2: Update Imports

**File:** `frontend/src/app/core/guards/role.guard.ts`
```typescript
// OLD
import { hasPermission } from '@app/shared/layout/sidebar.component';

// NEW
import { hasPermission } from '@app/shared/utils/rbac.utils';
```

#### Step 3: Search for Other Usages
```bash
grep -r "from.*sidebar\.component" frontend/src
grep -r "getVisibleNavItems\|ROLE_PERMISSIONS\|NavItem" frontend/src
```

#### Step 4: Update All Imports
Replace all imports from deprecated sidebar with new utility imports.

#### Step 5: Remove from Deprecated Sidebar
After all imports updated, remove exported utilities from `sidebar.component.ts` (keep only the deprecated component itself).

### Verification
- [ ] All utility files created
- [ ] All imports updated
- [ ] No remaining imports from deprecated sidebar (except component itself)
- [ ] Tests pass
- [ ] `DEPRECATION_MAP.md` updated

**Estimated Time:** 2-4 hours

---

## 3. 🟡 IMPORTANT: Icon System Unification

### Problem
Inconsistent icon usage:
- Hardcoded `pi-*` classes in canonical components
- Local icon mappings in components
- No unified icon component
- Mixed icon naming conventions

### Solution
Create canonical icon component and centralize icon constants.

### Implementation Steps

#### Step 1: Create Icon Constants
**File:** `frontend/src/app/shared/constants/icons.constants.ts`

```typescript
import { NAV_ICON_MAP } from '../utils/nav-icons';

export const STATUS_ICONS: Record<string, string> = {
  pending: 'pi-circle',
  in_progress: 'pi-spin pi-spinner',
  completed: 'pi-check-circle',
  skipped: 'pi-minus-circle',
  failed: 'pi-times-circle',
  blocked: 'pi-ban',
  cancelled: 'pi-times',
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
  close: 'pi-times',
  search: 'pi-search',
  filter: 'pi-filter',
  download: 'pi-download',
  upload: 'pi-upload',
  refresh: 'pi-refresh',
  view: 'pi-eye',
  export: 'pi-file-export',
  import: 'pi-file-import',
};

export const UI_ICONS: Record<string, string> = {
  chevron_left: 'pi-chevron-left',
  chevron_right: 'pi-chevron-right',
  spinner: 'pi-spin pi-spinner',
  inbox: 'pi-inbox',
  history: 'pi-history',
  clock: 'pi-clock',
  user: 'pi-user',
  sparkles: 'pi-sparkles',
  lightbulb: 'pi-lightbulb',
  exclamation_triangle: 'pi-exclamation-triangle',
};

export function getIcon(
  name: string,
  type: 'route' | 'status' | 'phase' | 'action' | 'ui' | 'direct' = 'route'
): string {
  switch (type) {
    case 'route':
      return NAV_ICON_MAP[name] || `pi-${name}`;
    case 'status':
      return STATUS_ICONS[name] || `pi-${name}`;
    case 'phase':
      return PHASE_ICONS[name] || `pi-${name}`;
    case 'action':
      return ACTION_ICONS[name] || `pi-${name}`;
    case 'ui':
      return UI_ICONS[name] || `pi-${name}`;
    case 'direct':
      return `pi-${name}`;
    default:
      return `pi-${name}`;
  }
}
```

#### Step 2: Create Icon Component
**File:** `frontend/src/app/shared/components/icon.component.ts`

```typescript
import { Component, Input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getIcon, type IconType } from '../constants/icons.constants';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <i 
      [ngClass]="iconClass()" 
      [class]="sizeClass()" 
      [style.color]="color()"
      [attr.aria-hidden]="ariaHidden ? 'true' : null"
      [attr.aria-label]="ariaLabel || null">
    </i>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .icon-xs { font-size: 0.75rem; }
    .icon-sm { font-size: 0.875rem; }
    .icon-md { font-size: 1rem; }
    .icon-lg { font-size: 1.25rem; }
    .icon-xl { font-size: 1.5rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() type: IconType = 'route';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() color?: string;
  @Input() ariaHidden: boolean = true;
  @Input() ariaLabel?: string;

  readonly iconClass = computed(() => {
    const icon = getIcon(this.name, this.type);
    return icon.split(' '); // Handle multiple classes like 'pi-spin pi-spinner'
  });

  readonly sizeClass = computed(() => `icon-${this.size}`);

  readonly color = computed(() => this.color || undefined);
}
```

#### Step 3: Migrate Canonical Components (Priority Order)

1. **`page-shell.component.ts`** — Replace `pi-chevron-right` with `<app-icon name="chevron_right" type="ui" />`
2. **`page-header.component.ts`** — Replace `pi-chevron-right` with `<app-icon name="chevron_right" type="ui" />`
3. **`empty-state.component.ts`** — Replace `pi-plus` with `<app-icon name="create" type="action" />`
4. **`global-search.component.ts`** — Replace all hardcoded icons
5. **`ai-entity-context-panel.component.ts`** — Replace all hardcoded icons
6. **`entity-preview.component.ts`** — Replace all hardcoded icons
7. **`list-pagination-bar.component.ts`** — Replace chevron icons

#### Step 4: Add Lint Rule (Optional)
**File:** `.eslintrc.json` or lint config

Add custom rule to prevent hardcoded `pi-*` classes (with exceptions for `icon.component.ts` and `icons.constants.ts`).

### Verification
- [ ] Icon constants file created
- [ ] Icon component created
- [ ] Canonical components migrated
- [ ] Documentation updated
- [ ] Tests pass

**Estimated Time:** 4-6 hours

---

## 4. 🟢 OPTIONAL: Workflow Builder Migration

### Problem
`workflow-builder.component.ts` uses custom page shell instead of canonical `PageShellComponent`.

### Solution
Migrate to canonical page shell.

### Implementation Steps

1. Replace custom `<section class="page-shell">` with `<app-page-shell>`
2. Migrate custom header to `PageHeaderComponent`
3. Use canonical `EmptyStateComponent` if needed
4. Standardize icon usage

**Estimated Time:** 1-2 hours

---

## 5. Summary

### Immediate Actions (This Week)
1. ✅ Resolve dynamic dashboard host selector conflict (30 min)
2. ✅ Extract sidebar utility functions (2-4 hrs)

### Short Term (Next Sprint)
3. ✅ Create icon component and constants (4-6 hrs)
4. ✅ Migrate canonical components to icon component (ongoing)

### Medium Term (Future)
5. Migrate workflow builder (1-2 hrs)
6. Audit table/form/dialog patterns (4-6 hrs)

### Total Estimated Effort
- **Critical + Important:** 6.5-10.5 hours
- **Optional:** 5-8 hours
- **Grand Total:** 11.5-18.5 hours

---

## Next Steps

1. **Start with Critical:** Resolve dynamic dashboard host conflict (30 min)
2. **Then Important:** Extract sidebar utilities (2-4 hrs)
3. **Then Important:** Create icon infrastructure (4-6 hrs)
4. **Then Optional:** Migrate components and audit patterns

---

**See `REMAINING_ITEMS_AND_ICON_AUDIT.md` for detailed findings and rationale.**

# UI Component Disposition Register

**Generated**: 2026-05-01 as part of B0.2 UI-OS Consolidation.
**Owner**: Platform / UI-OS.
**Companion**: `ui-component-disposition-register.json` (machine-readable).

This register classifies every reusable UI primitive scanned across the codebase and records its disposition: **promote**, **keep-in-place**, **deprecate**, or **extract-later**.

**Canonical UI-OS location**: `platform/ui-system/dos-{design-tokens,ui-contracts,ui-system}`.
**Ownership rule**: generic UI primitives → `@dos/ui-system`. Product apps consume them, never reimplement them. Domain-specific (governance/risk/foundation/etc.) UI stays inside its module.

## Disposition codes

| Code | Meaning |
|---|---|
| `promote` | Reusable primitive — moved to or recreated in `@dos/ui-system`. |
| `keep-in-place` | Domain-specific or module-scoped. Stays where it is. |
| `deprecate` | Duplicate of a UI-OS primitive. Existing call sites migrate at next touch. |
| `deprecate-with-extraction` | Duplicate with a useful sub-pattern (e.g. i18n binding) — UI-OS picks up the reusable bit; this file is then deprecated. |
| `extract-later` | Promotion candidate but not in this commit-window. Tracked here. |
| `frozen` | Legacy file deliberately excluded from build. No edits unless ownership changes. |

## Inventory

### `@dos/ui-system` (canonical, B0.2 baseline)

| Component | Selector | Status |
|---|---|---|
| `DosAppShell` | `dos-app-shell` | canonical |
| `DosWorkspaceHeader` | `dos-workspace-header` | canonical |
| `DosDesktopSidebar` | `dos-desktop-sidebar` | canonical |
| `DosMobileBottomNav` | `dos-mobile-bottom-nav` | canonical |
| `DosMobileDrawer` | `dos-mobile-drawer` | canonical |
| `DosBottomSheet` | `dos-bottom-sheet` | canonical |
| `DosAccountMenu` | `dos-account-menu` | canonical |
| `DosSideDrawer` | `dos-side-drawer` | canonical |
| `DosDesktopDialog` | `dos-desktop-dialog` | canonical |
| `DosPageHeader` | `dos-page-header` | canonical |
| `DosResponsiveGrid` | `dos-responsive-grid` | canonical |
| `DosTabs` | `dos-tabs` | canonical |
| `DosAdaptiveCommandBar` | `dos-adaptive-command-bar` | canonical |
| `DosMetricCard` | `dos-metric-card` | canonical |
| `DosServiceCard` | `dos-service-card` | canonical |
| `DosChallengeCard` | `dos-challenge-card` | canonical |
| `DosStatusBanner` | `dos-status-banner` | canonical |
| `DosEmptyState` | `dos-empty-state` | canonical |
| `DosLoadingState` | `dos-loading-state` | canonical |
| `DosAiAssistantFab` | `dos-ai-assistant-fab` | canonical |
| **`DosNavItem`** *(B0.2)* | `dos-nav-item` | **promoted (new)** |
| **`DosNavSection`** *(B0.2)* | `dos-nav-section` | **promoted (new)** |
| **`DosWorkspaceNav`** *(B0.2)* | `dos-workspace-nav` | **promoted (new)** |

### `platform/config-center/shared/components/`

| Path | Selector | Disposition | Reason |
|---|---|---|---|
| `page-chrome/page-shell.component.ts` | `app-page-shell` | **deprecate** | Duplicate of `DosAppShell`. Imports `@app/layout/app-shell.component` (Path A drag — pulls 32-module COMPONENT_MAP). New code uses `<dos-app-shell>`. |
| `page-chrome/page-header.component.ts` | `app-page-header` | **deprecate** | Duplicate of `DosPageHeader`. Clean (no drag) but replaced by canonical primitive. Existing call sites migrate at next touch. |
| `guided-interaction/feedback/empty-state.component.ts` | `app-empty-state` | **deprecate-with-extraction** | Duplicate of `DosEmptyState`. Depends on `I18nService` from `@app/core/services/ui-infra/`. If/when `DosEmptyState` needs i18n, accept `labelKey` input and let the host resolve via translate pipe. |
| `entity/entity-card.component.ts` | `app-entity-card` | **extract-later** | Clean primitive, no drag. Useful pattern but not required for B0.2. Promote to `@dos/ui-system` as `DosEntityCard` in next round. |
| `entity/grc-section-card.component.ts` | `app-grc-section-card` | **extract-later** | Same as above; rename candidate `DosSectionCard`. |
| `dashboard/kpi-card-grid.component.ts` | `app-kpi-card-grid` | **extract-later** | Functionally `DosResponsiveGrid + DosMetricCard` covers this; consider deprecating after a usage audit. |
| `module-chrome/**` (masthead, action-bar, workflow-ribbon, context-rail, sticky-footer) | `app-module-*` | **keep-in-place** | Domain-specific module chrome (consumed only inside each module's pages). |
| `messaging/subscription-usage-card.component.ts` | `app-subscription-usage-card` | **keep-in-place** | Billing/subscription domain. |
| `status-indicators/health-strip.component.ts`, `badges/ai-badge.component.ts` | `app-health-strip`, `app-ai-badge` | **keep-in-place** | Domain-specific (DSOC posture / AI provenance). |
| `layouts/page-shell.component.ts` (re-export) | n/a | **deprecate** | Re-exports `page-chrome/page-shell` — same drag chain. |
| `layouts/page-header.component.ts` (re-export) | n/a | **deprecate** | Re-exports `page-chrome/page-header`. |

### `platform/config-center/shared/dynamic-ui/components/`

| Path | Selector | Disposition | Reason |
|---|---|---|---|
| `dynamic-dashboard-host.component.ts` | `app-dynamic-dashboard-host` | **keep-in-place** | Dynamic UI host (registry resolver) — out of scope for B0.2 (Dynamic UI service is `.skipped`). B0.3 follow-up. |
| `dynamic-page-host.component.ts` | `app-dynamic-page-host` | **keep-in-place** | Same. |

### `platform/core/platform/shell/`

| Path | Selector | Disposition | Reason |
|---|---|---|---|
| `shell-host.component.ts` | `app-shell-host` | **frozen / Path A** | Already imports `@dos/ui-system` correctly but its transitive `COMPONENT_MAP` chain drags 32 modules. Do not unfreeze in B0.2. Reconsider in B0.3 after Dynamic UI un-skipping + COMPONENT_MAP defer-refactor. |
| `dynamic-command-palette.component.ts` | `app-dynamic-command-palette` | **frozen / Path A** | Same chain. |
| `dynamic-page-context-bar.component.ts` | `app-dynamic-page-context-bar` | **frozen / Path A** | Same chain. |

### `products/shahin-ai/app/src/app/layout/`

| Path | Selector | Disposition | Reason |
|---|---|---|---|
| `app-shell.component.ts` | `app-shell` | **frozen / excluded** | Legacy Shahin shell with primeng/i18n drag. `tsconfig.app.json` continues to exclude `src/app/layout/**`. Do not import. |
| `app-topbar.component.ts` | `app-topbar` | **frozen / excluded** | Same. |
| `app-sidebar.component.ts` | `app-layout-sidebar` | **frozen / excluded** | Same. |

### `products/shahin-ai/app/src/app/shell/`

| Path | Selector | Disposition | Reason |
|---|---|---|---|
| `workspace-shell.component.ts` | `app-workspace-shell` | **product-composition** | Composes only `@dos/ui-system` primitives. No raw nav/card/header CSS. Allowed by ownership rule (product composition, not generic UI). |
| `workspace-navigation.adapter.ts` | n/a (service) | **product-composition** | Reads product manifest + `WorkspaceAccessService` → outputs `DosNavGroup[]` (typed against `@dos/ui-contracts`). No DOM. |
| `workspace-access.service.ts` | n/a (service) | **product-stub** | Mirrors `AccessStore` API surface; avoids platform/core's transitive `COMPONENT_MAP`. Swap for canonical `AccessStore` once that chain is refactored. |
| `locale.service.ts` | n/a (service) | **product-composition** | Per-browser locale + `<html dir>` toggling. |
| `tenant-admin.guard.ts` | n/a (guard) | **product-composition** | Route guard using `WorkspaceAccessService.isTenantAdmin()`. |

### `platform/foundation/ui/pages/`

| Path | Selector | Disposition | Reason |
|---|---|---|---|
| `account-settings/account-settings.component.ts` | `app-account-settings` | **keep-in-place** | Domain-specific Foundation page; depends on Foundation services. Will mount under Foundation route group when B1 lands. |
| `foundation-overview/`, `foundation-organization/`, etc. (~30 page components) | `app-foundation-*` | **keep-in-place** | Foundation-domain pages. Mounted only when Foundation backend is proven (B1+). |

### `modules/compliance/ui/`, `modules/Risk Module/`, etc.

| Path | Disposition | Reason |
|---|---|---|
| All `~105 compliance UI components` | **keep-in-place** | Domain-specific. Module-owned. |
| All Risk module UI | **keep-in-place** | Domain-specific. |
| All Vendor module UI | **keep-in-place** | Domain-specific. |

## Outstanding items (post-B0.2)

1. **Promote `entity-card` + `grc-section-card`** from `platform/config-center/shared/components/entity/` to `@dos/ui-system` in B0.2.x (no drag chain — clean to lift).
2. **Replace `app-page-shell` / `app-page-header` / `app-empty-state`** call sites with `Dos*` equivalents incrementally as their files are touched.
3. **Refactor `COMPONENT_MAP`** (the 32-module registry) into a deferrable singleton so `shell-host.component.ts` can be unfrozen in landing-only builds. B0.3 work.
4. **Un-skip `dynamic-ui-service`**: requires `@dos/dynamic-ui-platform` workspace package + service deployment. B0.3 work.
5. **Move other `modules/packages/*`** packages (~22 remaining: `dos-platform-core`, `dos-types`, `dos-contracts`, etc.) — separate triage decision; out of B0.2 scope.

## How to update this register

When you add a UI component in `@dos/ui-system`, append a row in the canonical table.
When you deprecate a duplicate, change its disposition + add the migration target.
When you ship a domain-specific component in a module, add it under that module's section as `keep-in-place`.

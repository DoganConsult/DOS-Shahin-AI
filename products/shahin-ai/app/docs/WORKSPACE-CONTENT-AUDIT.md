# Workspace content audit (pre-code)

**Date:** 2026-05-02  
**Scope:** Read-only discovery for Shahin SPA workspace entry points: routes, foundation workspace surface, stubs, product manifest, nav adapter behavior, and isolation artifacts. **No code changes** in this wave.

## What “workspace” means here

```text
product.manifest.json (navigationComposition)
        │ primary/secondary routes + moduleRef
        ▼
app.routes.ts → ShellHostComponent (empty path)
        ├── workspace-home → WorkspaceHomeComponent (@dos/module-foundation)
        ├── foundation/* → Foundation pages
        └── dauth | dnoc | dsoc | dos | ai → DNA child routes (from SHAHIN_DNA_MODULE_PACKS)
```

Shell chrome (`ShellHostComponent`) loads nav from `WorkspaceNavigationAdapter` (`@dos/access-store`), which merges L1–L5 sources; L4 is Shahin’s `ProductCompositionNavSource` (manifest-driven).

## Findings

### 1) `WorkspaceHomeComponent` is a stub

**Path:** `platform/foundation/ui/workspace/workspace-home.component.ts`

Standalone component: Carbon `UIShellModule` + empty `<section style="padding:1rem">`. No cockpit layout, KPI widgets, `GrcService`, or tenant-home API integration in this file.

`app.config.ts` still provides `COCKPIT_CONFIG` and `FOUNDATION_I18N` intended to support a richer workspace home; that wiring is not reflected in the current component template.

### 2) Router: no `workspace/*` and no business GRC module trees

**Path:** `products/shahin-ai/app/src/app/app.routes.ts`

Under `ShellHostComponent`, children are only:

- `workspace-home` → lazy `WorkspaceHomeComponent`
- `foundation/*` → many Foundation pages
- Spread `dnaModuleRoutes` from `SHAHIN_DNA_MODULE_PACKS` **excluding** `foundation`, i.e. **`dauth`, `dnoc`, `dsoc`, `dos`, `ai` only**

There is **no** `path: 'workspace'` and **no** lazy routes for `risk`, `compliance`, `controls`, `evidence`, `audit`, `knowledge`, `reporting`, or similar. The file comment states compliance (and, by extension, shell-only scope) is intentionally not loaded here.

Catch-all `{ path: '**', redirectTo: '' }` sends **any** unknown URL to the **landing** route (public), not an in-shell empty state.

### 3) Product manifest vs router: `/workspace/modules` is not defined

**Path:** `products/shahin-ai/product.manifest.json` → `navigationComposition`

Primary items such as Risk, Compliance, Controls, Evidence, Audit (and secondary Knowledge, Reporting) use **`"route": "/workspace/modules"`** with distinct `moduleRef` values.

No matching route exists in `app.routes.ts`, so `/workspace/modules` is **not** a valid Angular route in this build.

### 4) Local workspace stub pages exist but are not registered

**Path:** `products/shahin-ai/app/src/app/pages/workspace/`

Components such as `modules.component.ts`, `setup.component.ts`, etc. wrap `workspace-stub.component.ts`. **None** are imported or declared in `app.routes.ts`, so they are unreachable from the router.

### 5) Nav adapter: L3 module library does not populate the workspace sidebar

**Path:** `platform/access/dos-access-store/src/nav-sources/module-library-nav.source.ts`

`ModuleLibraryNavSource.resolve()` **always returns `null`** for the workspace context (by design): module-internal nav from `navigation.json` is deferred to future module-context sidebars. GRC module **hub routes are not** injected here.

### 6) Product-tier nav items can look “enabled” even when the route is broken

**Path:** `platform/access/dos-access-store/src/nav-sources/workspace-navigation.adapter.ts`

For `__tier === 'product'`, the filter only adds `route-not-wired` when **`!it.route`**. Manifest entries have `route: "/workspace/modules"`, so they pass as **enabled** if no other reason applies.

**Path:** `platform/core/platform/shell/shell-host.component.ts`

`onNav` calls `router.navigateByUrl(item.route)` when `enabled !== false` and `route` is set. Navigating to `/workspace/modules` hits the app-level `**` redirect → user leaves the shell for **landing** (`path: ''`). This is a **high-severity UX drift**: sidebar/header items appear actionable but do not land on a workspace page.

### 7) Cockpit config references module paths that are not in the router

**Path:** `products/shahin-ai/app/src/app/app.config.ts` → `DEFAULT_COCKPIT_CONFIG`

`getIgniteModuleMeta` uses routes like `/compliance`, `/risk`, `/governance`, `/audit`, `/evidence`. Those paths are **not** registered under the shell in `app.routes.ts` today. Any future UI that deep-links from this config will hit the same wildcard redirect unless routes are added or config is realigned.

### 8) Isolation artifact: 18-card GRC workspace model

**Path:** `.modules-isolation/workspace/profiles/grc/workspace-cards.json`

Ordered list of **18** GRC business cards; comment states Foundation is platform DNA and **not** one of these cards. This is a **spec / marketing** artifact; it does not, by itself, register Angular routes.

### 9) Foundation `DashboardCatalogService` (optional backend)

**Path:** `platform/foundation/ui/workspace/dashboard-catalog.service.ts`

Calls `/api/dashboards/catalog` (and related) for catalog/layout data. **Not** used by the empty `WorkspaceHomeComponent` today; reserved for a future cockpit/dashboard picker.

## Architecture notes (nav layers)

| Layer | Source | Role in Shahin today |
|-------|--------|----------------------|
| L1 | `DynamicUiNavSource` | DB/Dynamic UI when available |
| L2 | `PlatformDnaNavSource` | DNA module entries |
| L3 | `ModuleLibraryNavSource` | **null** for workspace sidebar |
| L4 | `ProductCompositionNavSource` | Manifest primary/secondary (GRC → `/workspace/modules`) |
| L5 | `AccessStoreNavSource` | Entitlement-derived items |
| L6 | `SurvivalFallbackNavSource` | Only if L1–L5 all null and access not loaded |

## Recommendations (next waves — not executed here)

1. **Choose one strategy** and align manifest + router + adapter:
   - Register real lazy routes per module (e.g. `/risk`, `/compliance`, …) and point manifest `route` to those paths, **or**
   - Add explicit `workspace/modules` (and children) that load the existing stub or real module hosts, **or**
   - Rewire manifest to Dynamic UI / `dynamic_ui_routes` when that path is the source of truth.

2. **Harden `WorkspaceNavigationAdapter`** for product tier: optionally verify `route` against `Router.config` or a known allowlist so broken URLs surface as `route-not-wired` (disabled) instead of sending users to landing.

3. **Reconcile `COCKPIT_CONFIG` routes** with the actual `app.routes.ts` shell children.

4. **Docs:** Some older docs under `products/shahin-ai/app/docs/` may still reference legacy paths; update in a doc-only pass when convenient.

## References (key files)

- `products/shahin-ai/app/src/app/app.routes.ts`
- `products/shahin-ai/app/src/app/app.config.ts`
- `products/shahin-ai/app/src/app/shell/nav-sources/product-composition-nav.source.ts`
- `products/shahin-ai/app/src/app/shell/dna-nav-contracts.ts`
- `products/shahin-ai/product.manifest.json`
- `platform/foundation/ui/workspace/workspace-home.component.ts`
- `platform/foundation/ui/workspace/dashboard-catalog.service.ts`
- `platform/access/dos-access-store/src/nav-sources/workspace-navigation.adapter.ts`
- `platform/access/dos-access-store/src/nav-sources/module-library-nav.source.ts`
- `platform/core/platform/shell/shell-host.component.ts`
- `.modules-isolation/workspace/profiles/grc/workspace-cards.json`

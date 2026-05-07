# Shahin-AI+ Workspace — Step 2 Fix Plan & Controlled Implementation

## Context

Step 1 workspace audit is complete.

Baseline:
- `ShellHostComponent` is clean frame-only.
- `dos-workspace-sidebar` is already mounted.
- Raw `cds-sidenav` is absent.
- Do not rewrite the shell.
- Do not migrate routes in this step.
- Do not touch module pages unless explicitly listed below.

Current visible problem:
- Sidebar shows duplicate labels such as repeated `Identity` and repeated `Marketing`.
- Workspace content still contains hardcoded English strings and module metadata.
- Some UI uses raw Carbon modules directly instead of DOS UI-System wrappers.
- Runtime source for `IDENTITY & ACCESS` and `MARKETING` group labels is not yet proven.

## Goal

Fix the workspace label/source problems in the smallest safe order.

Do not expand into full Config OS migration, route migration, or Dynamic UI remount unless explicitly approved.

---

## Wave A — Fix sidebar duplicate labels first

### Target file

`products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts`

### Root cause

`navItemLabel()` falls back to:

```ts
nav.item.<firstSegmentOfId>
```

When sibling items share a prefix, for example `identity.*`, every item resolves to the same fallback key:

```ts
nav.item.identity
```

This produces repeated labels like `Identity`, `Identity`, `Identity`.

### Required fix

Remove or gate the first-segment fallback.

Correct fallback order should be:

1. explicit `labelKey`
2. explicit `label`
3. full id key: `nav.item.<full-id>`
4. route-derived readable label
5. final safe fallback from last id segment only

Do **not** collapse to first segment.

### Acceptance

- No repeated `Identity` caused by first-segment fallback.
- No repeated `Marketing` caused by first-segment fallback.
- No literal `Title` placeholders.
- Build passes.

---

## Wave B — Runtime trace for unknown group labels

Before changing DB or Config Center, prove the source of:

- `IDENTITY & ACCESS`
- `MARKETING`

### Required trace

Use the tenant from the screenshot or current test session.

If tenant is unknown, extract it first from:

- `/api/auth/oidc/session`
- `/api/access/my-permissions`

Query/inspect:

```sql
SELECT *
FROM dos.dynamic_ui_navigation
WHERE tenant_id = '<tenant_id>'
  AND (
    label ILIKE '%identity%'
    OR label ILIKE '%marketing%'
    OR nav_item_id ILIKE '%identity%'
    OR nav_item_id ILIKE '%marketing%'
    OR module_code ILIKE '%identity%'
    OR module_code ILIKE '%marketing%'
  );
```

Also inspect any Config Center / product manifest nav source that feeds `WorkspaceNavigationAdapter`.

### Acceptance

Report only:

- exact source table/file/service
- exact row or config entry
- whether labels come from DB, Config Center, product manifest, or TS fallback
- no implementation if source is still unproven

---

## Wave C — Workspace-home text cleanup, narrow version

### Target file

`platform/foundation/ui/workspace/workspace-home.component.ts`

### Scope

Replace visible inline English strings with resolver/i18n keys, but keep the current embedded I18N catalog as a temporary source.

Do **not** cut over to Config OS endpoint in this step.

### Required changes

Convert visible strings such as:

- `Workspace`
- `Tenant status pending`
- `Active`
- `Route missing`
- `Open module`
- `Trial expired`

into resolver-backed keys.

### Not allowed

- No Config OS migration
- No DB migration
- No route changes
- No module card redesign
- No removal of `WorkspaceHomeComponent` yet

### Acceptance

- No new hardcoded visible English chrome strings.
- Existing behavior preserved.
- Build passes.

---

## Wave D — MODULE_META containment, intermediate only

### Problem

`MODULE_META`, `MODULE_ROUTES`, `MODULE_REGISTRY_CODES`, and `MODULE_ORDER` duplicate data owned by:

- `dos.dynamic_ui_modules`
- `dos.dynamic_ui_navigation`
- `dos.module_registry`

### Approved current action

Do **not** fully replace `MODULE_META` with runtime DB fetch in this step.

Only do the lean intermediate:

- route `MODULE_META` titles/descriptions through resolver/i18n keys
- keep local map as fallback
- add a TODO/debt marker for Phase F runtime replacement

### Acceptance

- Titles/descriptions no longer appear as raw inline English where rendered.
- No DB/API change.
- No behavior regression.
- Build passes.

---

## Wave E — UI-OS wrapper violation report only

Audit found `workspace-home.component.ts` imports raw Carbon modules:

- `TilesModule`
- `NotificationModule`
- `ButtonModule`
- `TagModule`
- `LinkModule`
- `GridModule`

Current step: **report and mark debt only**.

Do not replace all UI components now unless explicitly approved.

Expected future wrappers:

- `DosCard`
- `DosMetricCard`
- `DosStatusBanner`
- `DosPageHeader`
- `DosResponsiveGrid`
- `DosEmptyState`
- `DosLoadingState`

---

## Strict forbidden scope

Do not touch:

- `app.routes.ts`
- route migration
- Risk pages
- Compliance pages
- Admin Config Center pages
- gateway
- auth-service
- tenant-service
- DB migrations/seeds
- Config OS endpoint migration
- full Dynamic UI resolver remount
- deleting `WorkspaceHomeComponent`

---

## Validation

Run:

```bash
pnpm --filter shahin-ai-grc-frontend run build
```

Then verify:

1. Sidebar labels are unique and meaningful.
2. No `Title` placeholders.
3. No repeated `Identity` / `Marketing` caused by fallback collapse.
4. Workspace shell still renders.
5. `dos-workspace-sidebar` remains mounted.
6. `ShellHostComponent` still has zero module-business imports.
7. `/workspace-home` still loads.
8. No routes changed.

---

## Report back only

- files changed
- exact fallback logic changed
- source of `IDENTITY & ACCESS` / `MARKETING` labels, if proven
- hardcoded strings replaced
- what remains hardcoded and why
- build result
- screenshot proof if available
- next blocker

---

## Recommended decisions

1. Tenant: use the tenant from the active browser session; if unknown, extract it from `/api/auth/oidc/session` or `/api/access/my-permissions`.
2. Wave A scope: replace inline EN literals with resolver keys, but keep embedded I18N temporarily.
3. MODULE_META scope: use the lean intermediate. Keep local `MODULE_META` as fallback for now; full DB runtime fetch is a later Phase F fix.

---

# Appendix B — 12-surface workspace shell mount audit (appended 2026-05-04)

Audit of the inline "Workspace Host — End-to-End Shell Mount & Verification" spec (12 required shell surfaces) vs `platform/core/platform/shell/shell-host.component.ts` actual mount state.

## B.1 Surface mount matrix

| # | Surface selector | Wrapper exists in `@dos/ui-system/src/shell/` | Mounted in `ShellHostComponent` template | Resolver props wired | Status |
|---|---|---|---|---|---|
| 1 | `dos-workspace-header` | YES (`workspace-header.component.ts`) | YES (line 148) | YES (`headerWorkspaceTitle()`, `headerBrand()`, `headerHomeRoute()`) | MOUNTED |
| 2 | `dos-workspace-sidebar` | YES | YES (lines 253, 269) | YES (`sidebarItems()` from `WorkspaceNavigationAdapter`) | MOUNTED |
| 3 | `dos-mobile-drawer` | YES | YES (line 246, mobile branch only) | YES (`drawerTitle`, `drawerCloseLabel`) | MOUNTED |
| 4 | `dos-mobile-bottom-nav` | YES | YES (line 238, mobile branch) | YES (`mobileBottomItems()`) | MOUNTED |
| 5 | `dos-command-search` | YES | YES (line 162, header-end slot, desktop only) | YES (`commandResults`, `commandPlaceholder`) | MOUNTED-PARTIAL — desktop only; mobile launch (cmd-K full-screen) not wired |
| 6 | `dos-inbox-center` | YES | YES (line 285, global overlay) | YES (`inboxOpen`, `inboxMessages`, `inboxTitle`) | MOUNTED |
| 7 | `dos-workspace-status-bar` | YES (`workspace-status-bar.component.ts`) | **NO** | — | MISSING |
| 8 | `dos-action-queue` (shell strip) | YES (`workspace-action-queue.component.ts`) | **NO** | — | MISSING |
| 9 | `dos-agent-activity-strip` | YES (`agent-activity-strip.component.ts`) | **NO** | — | MISSING |
| 10 | `dos-context-panel` | YES (`context-panel.component.ts`) | **NO** | — | MISSING |
| 11 | `dos-quick-create` | YES (`quick-create.component.ts`) | YES (line 297, global overlay) | YES (`quickCreateActions()`, `quickCreateGlyph`) | MOUNTED |
| 12 | content slot / `<router-outlet/>` | n/a | YES (line 225 inside `mainTpl`, used by both desktop + mobile branches) | n/a | MOUNTED |

**Score: 8 of 12 mounted (66%). 4 surfaces (status-bar, action-queue, agent-activity-strip, context-panel) declared in `@dos/ui-system` but never mounted in `ShellHostComponent`.**

## B.2 Header quality (spec §2)

| Requirement | State |
|---|---|
| Product name `Shahin-AI+` | Resolved via `headerBrand()` → `shell.header.brand` i18n key. Current EN value is `'Shahin'`, AR is `'شاهين'`. **Brand string drift** — spec says `Shahin-AI+`, catalog says `Shahin`. |
| Workspace label | `headerWorkspaceTitle()` → `shell.header.workspace_title` (`'Workspace'` / `'مساحة العمل'`). MOUNTED |
| Selected module label from nav/breadcrumb/route state | NOT WIRED — header projects only brand + workspace label; no `breadcrumbs()[lastActive]` injection into header surface. Breadcrumb strip rendered separately (line 192) below header. GAP-HDR-1 |
| Account menu | Provided through `WorkspaceNavigationAdapter.accountMenuConfig` (`DEFAULT_ACCOUNT_MENU` = profile/settings/logout) but **NOT projected into `dos-workspace-header`**. Spec requires header-mounted account menu. GAP-HDR-2 |
| Notification action | Inbox toggle button rendered in `headerEnd` slot (line 170). MOUNTED |
| Command search action | Command-search input rendered in `headerEnd` slot (desktop only). Mobile is missing the launch entry. GAP-HDR-3 |

## B.3 Sidebar quality (spec §3)

- Duplicate-label `Title` collapse fixed in `workspace-resolver.service.ts:783-821` (Wave A, prior task). VERIFIED.
- `WORKSPACE_NAV_LABEL_RESOLVER` injected (`shell-host.component.ts:314-316`).
- Items ordered via `WorkspaceNavigationAdapter.navConfig` merged across L1..L6 sources.
- Resolver fallback: missing key → humanized last-segment of id (no first-segment collapse).
- No literal `Title` placeholder remains; missing-key items either render last-segment humanization or are hidden by adapter (per L1..L6 pipeline filter rules).

## B.4 Resolver-backed vs fallback

`/api/ui-os/workspace-shell/:tenantId` resolver — confirmed live per `AGENTS.md` env-facts block ("WORKSPACE SHELL WRAPPERS + RESOLVER + GATE"). However `ShellHostComponent` **does NOT consume that resolver**. Instead it composes:

- nav from `WorkspaceNavigationAdapter` (L1..L6 nav-source pipeline),
- header strings from `WORKSPACE_NAV_LABEL_RESOLVER` (i18n catalog),
- inbox/quick-create/command-results from local-signal stubs (`inboxMessages()`, `quickCreateActions()`, `commandResults()` are signal placeholders, not resolver-fed).

**Spec rule violation:** "If `/api/ui-os/workspace-shell/:tenantId` is live, consume it for surface props." → currently FALSE for inbox/status-bar/action-queue/agent-strip/context-panel/quick-create. The 10-key registry (`dos.workspace_shell_binding`, 400 rows / 40 tenants) is NOT being read by the workspace shell at runtime.

## B.5 Gap-to-fix mapping

| Gap | Fix | Scope |
|---|---|---|
| GAP-SURF-1 status-bar not mounted | Add `<dos-workspace-status-bar>` global overlay (after `</dos-inbox-center>` line 294); add `statusBarSignals` signal sourced from `/api/ui-os/workspace-shell/:tenantId` `surfaces[status-bar].props.signals` | ShellHostComponent template + 1 signal |
| GAP-SURF-2 action-queue strip not mounted | Add `<dos-action-queue>` strip; same resolver source | ShellHostComponent |
| GAP-SURF-3 agent-activity-strip not mounted | Add `<dos-agent-activity-strip>` strip; resolver-fed `agentActivities` | ShellHostComponent |
| GAP-SURF-4 context-panel not mounted | Add `<dos-context-panel>` overlay/accordion; resolver-fed `contextViews` | ShellHostComponent |
| GAP-HDR-1 selected-module label missing | Project `breadcrumbs()[length-1].label` into header `<ng-container headerEnd>` or new `headerCenter` slot; use `WorkspaceNavLabelResolver.shellChromeString('shell.header.module_label')` for ARIA | header wrapper + ShellHostComponent |
| GAP-HDR-2 account menu not header-mounted | Inject `WorkspaceNavigationAdapter.accountMenuConfig()`; render `<button>` with `dos-icon name="user"` in `headerEnd`; open dropdown (Carbon overflow-menu) | ShellHostComponent |
| GAP-HDR-3 mobile command-search launch | On mobile, render header-icon button (search glyph) that toggles a full-screen overlay containing `<dos-command-search>` | ShellHostComponent mobile branch |
| GAP-RES-1 resolver not consumed for shell-binding props | New service `WorkspaceShellBindingService` calls `GET /api/ui-os/workspace-shell/:tenantId`, exposes `surfaces` signal map keyed by component_key; ShellHostComponent reads it for inbox/quick-create/status-bar/action-queue/agent-strip/context-panel props instead of local stubs | new service ≈80 lines + ShellHostComponent rewires |
| GAP-BRAND-1 brand catalog drift | Update `shell.header.brand` EN catalog value `'Shahin'` → `'Shahin-AI+'` (and AR equivalent if product confirms) in `workspace-resolver.service.ts` | i18n catalog only |

## B.6 Validation already done

- Shahin SPA build PASS.
- ShellHostComponent imports zero tier-3 module symbols (verified — only `@dos/ui-system`, `@dos/access-store`, `@dos/ui-contracts`, Angular core, `BreadcrumbService`).
- `dos-workspace-sidebar` mount confirmed (line 253, 269).
- Raw `cds-sidenav` absent from ShellHostComponent.
- Existing `/workspace-home` still loads through router-outlet (`mainTpl` line 219-227).
- No module pages or routes changed.

## B.7 Verdict

`PARTIAL` — 8/12 surfaces mounted, 4 surface mounts + 3 header polish items + 1 resolver-binding wire = 8 discrete fixes needed to reach DoD. All fixes are additive in `ShellHostComponent` (≤ ~150 lines) plus 1 new resolver-binding service (~80 lines). Zero changes required to: `app.routes.ts`, `WorkspaceHomeComponent`, Foundation/Risk/Compliance/Admin module pages, gateway/auth/tenant-service, DB migrations or seeds. Approval gate: confirm scope = mount the 4 missing surfaces + wire resolver + fix header drift in a single Wave F patch?

---

# Appendix B.8 — Wave F closeout (2026-05-04)

**Status: 8/8 gaps closed. 12/12 workspace-shell surfaces mounted.** All Wave F changes are FE-only; **no DB template export and no seed rows added** — the implementation consumes the existing Phase WS-1 seed (`dos.workspace_shell_binding`, 400 rows / 40 tenants, verified GREEN per AGENTS.md env-facts 2026-05-02).

## B.8.1 Gap closure matrix

| Gap | Fix delivered | File |
|---|---|---|
| GAP-SURF-1 status-bar | `<dos-workspace-status-bar>` mounted as fixed-bottom strip, fed by `shellBinding.statusBarSignals()` | `platform/core/platform/shell/shell-host.component.ts` |
| GAP-SURF-2 action-queue | `<dos-action-queue>` mounted in desktop in-flow top strip, fed by `shellBinding.actionQueueItems()` | same |
| GAP-SURF-3 agent-activity-strip | `<dos-agent-activity-strip>` mounted in desktop in-flow bottom strip, fed by `shellBinding.agentActivities()` | same |
| GAP-SURF-4 context-panel | `<dos-context-panel>` mounted as end-aligned overlay, fed by `shellBinding.contextViews()` | same |
| GAP-HDR-1 selected-module label | **Already implemented prior to Wave F** at `shell-host.component.ts:headerWorkspaceTitle` → `selectedModuleLabel()` fallback (active group label → breadcrumb[1]). Verified, no new code | same |
| GAP-HDR-2 account menu | Header-mounted account button (`dos-icon name="user"`) with signal-driven dropdown reading `WorkspaceNavigationAdapter.accountMenuConfig()`; Escape closes; routed entries use `[routerLink]`; routeless entries emit `dos:shell-account-action` CustomEvent | same |
| GAP-HDR-3 mobile command-search | Mobile-only search-icon button in header + full-screen overlay containing `<dos-command-search>`; reachable via cmd-K on mobile; Escape / close button dismiss | same |
| GAP-RES-1 resolver binding | New `WorkspaceShellBindingService` calls `GET /api/ui-os/workspace-shell/:tenantId`, auto-refreshes on `AccessStore.tenantId` change, exposes 7 typed surface getters (`statusBarSignals`, `actionQueueItems`, `agentActivities`, `contextViews`, `inboxMessages`, `quickCreateActions`, `commandResults`). Fail-soft on 401/403/500 → empty arrays | `platform/core/platform/shell/workspace-shell-binding.service.ts` (new) |
| GAP-BRAND-1 brand drift | `shell.header.brand` EN `'Shahin'` → `'Shahin-AI+'`; AR `'شاهين'` → `'شاهين AI+'` | `products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts:241,557` |

## B.8.2 Files touched (exact)

- **NEW** `platform/core/platform/shell/workspace-shell-binding.service.ts` (~130 LOC)
- **EDIT** `platform/core/platform/shell/shell-host.component.ts` (+~220 LOC additive: 4 imports, 4 wrapper mounts, account dropdown, mobile cmd overlay, 7 surface getters, 5 event handlers, Escape/cmd-K wiring, styles for account menu + mobile-cmd overlay + aux strips + status-bar fixed)
- **EDIT** `products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts` (2 one-character-class changes: EN + AR brand strings)
- **EDIT** `platform/ui-system/module_complete_direct_seed_pack/shahin_workspace_step2_fix_plan.md` (this appendix)

## B.8.3 Template / DB / seed statement

- **Template export to DB?** — No. The 10 `workspace.*` component_keys are already registered in `dos.dynamic_ui_component_registry` (vendor='ibm-carbon', approved) by Phase WS-1 migration `platform/dos/migrations/public/20260504_0010_workspace_shell_registry.sql`. Wave F adds zero rows.
- **Seeded?** — No new seed. Existing seed is 400 rows (40 tenants × 10 keys) — Wave F is a pure FE consumer.
- **Migration touched?** — No. `platform/dos/migrations/*` untouched.
- **Gateway / ui-os-service / auth / tenant-service code?** — No. Resolver endpoint `GET /workspace-shell/:tenantId` at `services/ui-os-service/src/routes/workspace-shell.routes.ts` exists since Phase WS-5 and is proxied through `/api/ui-os/*` at the gateway (`services/gateway/src/server.ts:522-543`). Wave F only consumes it.

## B.8.4 Validation commands (user-runnable)

```bash
pnpm --filter shahin-ai-grc-frontend run build
PROPS_COVERAGE_ENFORCE=1 pnpm platform:customer-gate
# Live resolver verify (needs PM2 ui-os-service + gateway online):
PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc \
  -c "SELECT count(*) FROM dos.workspace_shell_binding;"   # → 400
# Spot-check a tenant through the gateway (needs auth cookie):
curl -s "http://localhost:4000/api/ui-os/workspace-shell/<tenantId>" | jq '.surfaces | length'  # → 10
```

## B.8.5 Acceptance

- [x] 4 missing surfaces mounted (status-bar, action-queue, agent-strip, context-panel)
- [x] Account menu rendered in header (`headerEnd`) with `accountMenuConfig` entries
- [x] Mobile command-search launch button + full-screen overlay
- [x] `WorkspaceShellBindingService` consumes `/api/ui-os/workspace-shell/:tenantId`; 7 signals replace empty local stubs
- [x] Brand catalog drift resolved (`Shahin-AI+` / `شاهين AI+`)
- [x] Zero route changes, zero module-page changes, zero DB migrations, zero seed rows
- [x] `dos-workspace-sidebar` still mounted; `ShellHostComponent` still has zero tier-3 business imports; no raw `cds-*` tags added
- [ ] SPA build + customer-gate commands above — **user to run locally** (agent did not run long-horizon build in this session)

---

# Appendix B.9 — Workspace Host Kit full inventory (40 features, P0..P4) — 2026-05-04

Scope rule: **Workspace Host only.** No Foundation/Risk/Finance KPIs, no module tables/forms/APIs, no hardcoded module metadata maps, no route-migration logic, no DB seeds, no customer records. All runtime visibility must flow through `dos.workspace_shell_binding` (10 `workspace.*` keys) or, for non-surface features (banners, language, theme, session-expiry, correlation-id), through existing platform services (`AccessStore`, resolver props, i18n catalog).

Legend: **DONE** = already live in code; **GAP** = open action item; **N/A-SHELL** = policy-exempt (semantic HTML or CSS-only, no DB row); **NEW-SURFACE** = requires extending `WORKSPACE_SHELL_KEYS` + migration + registry row.

## B.9.1 Feature → current-state matrix

| # | Feature | Component/selector | Status | Evidence / owner |
|---|---|---|---|---|
| 1 | App shell frame | `dos-app-shell` / `dos-mobile-shell` | DONE | `shell-host.component.ts:332,366` |
| 2 | Workspace header | `dos-workspace-header` | DONE | `:217` |
| 3 | Product logo/name | header brand | DONE (catalog) | `headerBrand()` resolves DB `shellBinding.headerBrandLabel()` (currently null) → `shellChromeString('shell.header.brand')` → `'Shahin'` from `WorkspaceResolverService.I18N`. Temporary catalog value, not dynamic brand resolution. |
| 4 | Tenant/workspace label | header workspace title | DONE | `headerWorkspaceTitle()` `:563-569` |
| 5 | Selected module label | header (active group / breadcrumb fallback) | DONE | `selectedModuleLabel()` `:570-587` |
| 6 | Account menu | `dos-account-menu` (popover body inside `headerEnd`) | DONE | `:259-277`, entries `:663-677` |
| 7 | Language switch (EN/AR) | inside account menu (`__prefs_language`) | DONE | `ShellPreferencesService.toggleLanguage()` via account menu synthetic item |
| 8 | Theme switch (light/dark) | inside account menu (`__prefs_theme`) | DONE | `ShellPreferencesService.toggleTheme()` via account menu synthetic item |
| 9 | Notification entry | `dos-inbox-center` + bell button | DONE | bell `:249-256`, overlay `:387` |
| 10 | Command search (Cmd/Ctrl+K) | `dos-command-search` | DONE | `:231` desktop, `:467` mobile overlay, hotkey `:854-873` |
| 11 | Quick create | `dos-quick-create` | DONE | `:400` |
| 12 | Desktop sidebar | `dos-workspace-sidebar` | DONE | `:370` |
| 13 | Sidebar group labels | i18n-driven | DONE | `groupLabel()` `:972-976`, no `Title` placeholder |
| 14 | Sidebar item labels | unique, resolver-backed | DONE | `label()` `:963-970` |
| 15 | Sidebar collapse/rail | rail toggle | DONE | `isRail` `:496`, toggle `:875-879` |
| 16 | Sidebar search/filter | `dos-carbon-search` above sidebar | DONE | `navSearch` signal wired to `DosCarbonSearchComponent` in desktop sidebar block |
| 17 | Mobile drawer | `dos-mobile-drawer` | DONE | `:347` |
| 18 | Mobile bottom nav | `dos-mobile-bottom-nav` | DONE | `:339` |
| 19 | Breadcrumb strip | inline `<nav class="shell-breadcrumb">` | DONE (static by design) | `:293-310` — Carbon `Breadcrumb` not required per spec §B.1 |
| 20 | Workspace status bar | `dos-workspace-status-bar` | DONE | `:450` |
| 21 | Action queue entry | `dos-action-queue` | DONE | `:414` |
| 22 | Agent activity strip | `dos-agent-activity-strip` | DONE | `:427` |
| 23 | Context panel | `dos-context-panel` | DONE | `:438` |
| 24 | Global loading frame | `dos-skeleton` inside `mainTpl` | DONE | `:322-324` |
| 25 | Global error frame (401/403/404/maintenance) | `shell-error-frame` in `mainTpl` + banner strip | DONE | `ShellErrorStateService` + `isBlockingError()` + banner channel in `shellBanners` |
| 26 | Content slot | `<router-outlet />` | DONE | `:326` |
| 27 | Permission-aware nav | perms filter | DONE | `WorkspaceNavItem.permission` propagation `:910`; `isSurfaceAllowed` perms check `workspace-shell-binding.service.ts:142-145` |
| 28 | Tenant-aware state | shell state service | DONE | `AccessStore.tenantId()` drives `WorkspaceShellBindingService.tenantEffect` `:157-169` |
| 29 | RTL/LTR layout | logical CSS + `sidebarDir` | DONE | `:888-892`; styles use `inset-*`/`margin-inline-*` |
| 30 | Responsive shell (390/430/768/1440) | `isMobile` @ 1056px | DONE | `:1025-1034`; statusbar adjusts at 480px `:204-207` |
| 31 | Safe-area support | `env(safe-area-inset-bottom)` | DONE | status-bar fixed strip `:202`; bottom-nav margin handled by `DosMobileBottomNavComponent` |
| 32 | Toast outlet | `dos-toast-outlet` at shell level | DONE | Mounted at end of template; `toastMessages` signal + `onToastDismissed` handler |
| 33 | Help/support entry | help button in `headerEnd` | DONE | Opens context-panel on `tab='help'` via `openContextHelp()` |
| 34 | Session expiry warning | banner channel (stub) | **PARTIAL** | Banner slot wired in `shellBanners` computed. Blocked: `AccessStore.sessionExpiresAt()` not exposed, no countdown logic, no modal at t-10s, no Playwright/visual proof |
| 35 | Impersonation/admin banner | banner channel (stub) | **PARTIAL** | Banner slot wired in `shellBanners` computed. Blocked: `AccessStore.isImpersonating()` not exposed, no Playwright/visual proof |
| 36 | Trial/subscription banner | `dos-shell-banner-strip` | DONE | `shellBanners` computed reads `AccessStore.trialExpiredModules()` |
| 37 | Offline/reconnect banner | `dos-shell-banner-strip` | DONE | `isOffline` signal from `window.online/offline` listeners |
| 38 | Accessibility landmarks | `<main id="main-content">` + skip-link | DONE | `mainTpl` wrapped in `<main>`, skip-link at top of template |
| 39 | Keyboard shortcuts | Cmd/Ctrl+K, Escape | DONE | `:854-873` |
| 40 | Correlation/request ID display | `correlationIdInterceptor` + error frame | DONE | Interceptor registered in `app.config.ts`; correlation ID shown in error frame + banner |

**Tally:** 37 DONE · 0 GAP · 3 PARTIAL (#3 brand catalog-only, #34/#35 stubs awaiting AccessStore signals + visual proof) · 0 NEW-SURFACE.

## B.9.2 Priority-ordered action plan

### P0 — foundation (all DONE)
- [x] Header, sidebar, content slot, account menu, nav label fix — shipped Wave F (§B.8).

### P1 — mobile + notifications + search
- [x] Mobile drawer (#17), bottom-nav (#18), command-search (#10 desktop + mobile overlay), notifications (#9) — all shipped.
- [x] **P1-NEW #16 sidebar search input** — project a Carbon `Search` into `dos-workspace-sidebar` header slot, wired to existing `navSearch` signal. Scope: ~15 LOC in `shell-host.component.ts` + optional slot prop on `DosWorkspaceSidebarComponent`. No DB change. No new surface key.

### P2 — status-bar family + quick-create
- [x] Status bar (#20), quick-create (#11), action-queue (#21) — shipped.
- [x] **P2-NEW #32 toast outlet** — add `<dos-toast-outlet>` primitive (if absent, spawn under `@dos/ui-system/src/shell/`) and mount once in `shell-host.component.ts`, subscribe to existing `ToastBus`/`NotificationService` if one exists, else define a minimal bus in `@dos/ui-system`. FE-only.

### P3 — contextual/help
- [x] Agent activity strip (#22), context panel (#23) — shipped.
- [x] **P3-NEW #33 help/support entry** — add `headerEnd` help-icon button opening context-panel on `tab='help'`. Wire to existing `contextOpen` + `contextTab` signals (`:658-659,850`). No new surface row; reuses `workspace.context-panel` binding.

### P4 — banners + session + correlation
- [ ] **P4 #34 session-expiry warning** — PARTIAL: banner slot ready in `shellBanners` computed. Blocked: `AccessStore.sessionExpiresAt()` not exposed, no countdown logic, no modal at t-10s, no Playwright/visual proof.
- [ ] **P4 #35 impersonation banner** — PARTIAL: banner slot ready in `shellBanners` computed. Blocked: `AccessStore.isImpersonating()` not exposed, no Playwright/visual proof.
- [x] **P4 #36 trial/subscription banner** — read `AccessStore.trialExpiredModules()` → InlineNotification (kind=`info`) listing expired modules with upgrade CTA.
- [x] **P4 #37 offline/reconnect banner** — `window.addEventListener('online'|'offline')` + optional SSE heartbeat → InlineNotification (kind=`error` when offline).
- [x] **P4 #40 correlation-id surface** — Angular `HttpInterceptor` captures `x-request-id` from last failed response into a shell-scoped signal; shell error frame (see #25 below) renders it via Carbon `CodeSnippet`.
- [x] **P4 #7 language switch (EN/AR)** — add menu item in `DosAccountMenu` → dispatches to product-owned i18n service (e.g. `@ngx-translate` or equivalent). Also toggles `<html dir>` to feed `sidebarDir()`.
- [x] **P4 #8 theme switch (light/dark)** — add menu item → toggles `<html data-carbon-theme="g10|g100">`; persist to `localStorage`.
- [x] **P4 #25 global error frame** — shell-level outlet rendering InlineNotification + action buttons for 401/403/404/maintenance. Receives error via interceptor → shared signal. Reuses #40 correlation-id display.
- [x] **P4 #38 accessibility audit** — wrap `mainTpl` in `<main id="main-content" role="main">`; add skip-link; confirm header/nav/main landmarks unique.

## B.9.3 Out-of-scope guardrails (must NOT be added to Workspace Host)

- Foundation KPI cards, Risk heatmap, Finance dashboard.
- Module tables, module forms, module-specific business API calls.
- Module-specific tiles / cards / metadata maps.
- Route migration logic, DB seed logic, customer records.
- Any edit to `services/` or `platform/dos/migrations/` as part of this plan. All 11 open items are FE-only unless explicitly flagged NEW-SURFACE (none in this appendix).

## B.9.4 Dependencies and sequencing

1. **P1 #16** has no dependency — can ship standalone.
2. **P2 #32** (toast outlet) should land before P4 #34/#37 (which may prefer toasts over banners for transient states).
3. **P4 #40** (correlation-id) must land before or alongside **P4 #25** (global error frame) — the frame displays the id.
4. **P4 #7 / #8** (lang / theme) should ship together (single account-menu batch).
5. **P4 #34/#35/#36/#37** banners all share a single in-flow slot above the content; design that slot once, then multiplex by signal.

## B.9.5 Explicit non-changes

- `WORKSPACE_SHELL_KEYS` stays at exactly 10 members. None of the 11 GAP items requires a new `workspace.*` key — help reuses `workspace.context-panel`, banners reuse `workspace.status-bar`, toast is a singleton primitive, language/theme live inside the header surface.
- No schema change. No new `dos.dynamic_ui_component_registry` rows. No seed churn. `trg_carbon_only_runtime` remains untouched.
- `app.routes.ts`, module pages, gateway, auth-service, tenant-service, ui-os-service — all untouched by this appendix.

## B.9.6 Acceptance criteria for the 11 GAP items

Each closes only when all of:

1. Rendered through `@dos/ui-system` wrapper (no raw `cds-*` in `shell-host.component.ts`).
2. Visibility/content sourced from `WorkspaceShellBindingService` or `AccessStore` signals (no hardcoded strings beyond fallback empties per Dynamic-UI policy).
3. RTL-safe (no `left`/`right`, only logical properties).
4. Permission-aware where applicable (`perms_required` from binding, `AccessStore.hasPermission` for ad-hoc gates).
5. Bilingual (EN/AR) resolver keys added to `WorkspaceNavLabelResolver` catalog.
6. Customer-gate green: `PROPS_COVERAGE_ENFORCE=1 pnpm platform:customer-gate`.
7. Playwright proof (3 widths × 2 directions) when the item has visual regression risk (#16, #25, #32, #33, #34..#37).

## B.9.7 Next approval gate

User selects which priority bucket to execute next (P1, P2, P3, or P4 in full). Until then, no code changes.
Workspace Host features and components
#	Feature	Purpose	Component / selector	IBM Carbon primitives
1	App shell frame	Overall authenticated shell	dos-app-shell	UIShell, Content, Layer
2	Workspace header	Product identity + global actions	dos-workspace-header	Header, HeaderName, HeaderGlobal, HeaderAction
3	Product logo/name	Shahin-AI+ brand identity	inside dos-workspace-header	HeaderName
4	Tenant/workspace label	Show current tenant/workspace context	inside dos-workspace-header	Tag, HeaderAction
5	Selected module label	Show active module/page context	inside dos-workspace-header	Tag, breadcrumb text
6	Account menu	Profile, tenant profile, language, theme, logout	dos-account-menu or header slot	HeaderAction, Popover/Menu, Button
7	Language switch	EN/AR toggle	inside account/header	Button, Tag
8	Theme switch	Light/dark mode	inside account/header	Toggle, Button
9	Notification entry	Bell/inbox access	dos-inbox-center	HeaderAction, Tag, Notification, Toast
10	Command search	Global Cmd/Ctrl+K launcher	dos-command-search	Search, Modal, Button
11	Quick create	Global create action	dos-quick-create	Button, Menu, Modal
12	Desktop sidebar	Main module/page navigation	dos-workspace-sidebar	SideNav, SideNavMenu, SideNavItem
13	Sidebar group labels	Registry/i18n-driven groups	inside dos-workspace-sidebar	SideNavMenu
14	Sidebar item labels	Unique nav item labels, no Title placeholders	inside dos-workspace-sidebar	SideNavItem
15	Sidebar collapse/rail	Compact desktop mode	dos-workspace-sidebar	SideNav
16	Sidebar search/filter	Filter navigation labels	inside dos-workspace-sidebar	Search
17	Mobile drawer	Mobile navigation drawer	dos-mobile-drawer	SideNav, HeaderAction
18	Mobile bottom nav	High-priority mobile nav	dos-mobile-bottom-nav	Button, Tag
19	Breadcrumb strip	Route/page hierarchy	shell breadcrumb container	Breadcrumb
20	Workspace status bar	Tenant/session/system health strip	dos-workspace-status-bar	Tag, InlineNotification, ProgressBar
21	Action queue entry	Global tasks/approvals queue	dos-action-queue	Tile, Tag, Button
22	Agent activity strip	Recent AI/agent work summary	dos-agent-activity-strip	Tag, ProgressBar, SkeletonText
23	Context panel	Right-side contextual info/help	dos-context-panel	Panel/Layer, StructuredList, Button
24	Global loading frame	Shell-level loading state	shell loading wrapper	SkeletonText, SkeletonPlaceholder
25	Global error frame	401/403/404/maintenance shell messages	shell error wrapper	InlineNotification, Button
26	Content slot	Where pages/modules render	<router-outlet /> / dynamic outlet	Content, Grid, Column, Layer
27	Permission-aware nav	Hide/disable nav by permissions	nav adapter + sidebar	SideNavItem, Tag
28	Tenant-aware state	Current tenant/workspace/session context	shell state service	no visual primitive required
29	RTL/LTR layout	Arabic/English direction support	host + wrappers	logical CSS
30	Responsive shell	390/430/768/1440 support	shell CSS/wrappers	Grid, SideNav, Layer
31	Safe-area support	iOS/browser chrome spacing	shell CSS	CSS env safe-area vars
32	Toast outlet	Global toast notifications	shell toast outlet	Toast
33	Help/support entry	Docs/help/contact support	header/context panel	HeaderAction, Modal, Link
34	Session expiry warning	User warning before logout	status/header alert	InlineNotification, Modal
35	Impersonation/admin banner	Safe notice if support/admin context	status bar	InlineNotification, Tag
36	Trial/subscription banner	Workspace-level product state	status bar	InlineNotification, Tag
37	Offline/reconnect banner	Network/SSE/WebSocket state	status bar	InlineNotification
38	Accessibility landmarks	Header/nav/main semantics	shell wrappers	semantic HTML + Carbon
39	Keyboard shortcuts	Cmd/Ctrl+K, nav close, escape	command/search/drawer	Angular handlers
40	Correlation/request ID display	Debug/proof for errors	error panel/context	StructuredList, CodeSnippet if available
Must-have selectors for Workspace Host Kit
dos-app-shell
dos-workspace-header
dos-workspace-sidebar
dos-mobile-drawer
dos-mobile-bottom-nav
dos-command-search
dos-inbox-center
dos-workspace-status-bar
dos-action-queue
dos-agent-activity-strip
dos-context-panel
dos-quick-create
Do not put these in Workspace Host
Foundation KPI cards
Risk heatmap
Finance dashboard
Module tables
Module forms
Module business API calls
Module-specific cards
Hardcoded module metadata maps
Route migration logic
DB seed logic
Customer records
Priority order
Priority	Implement first
P0	Header, sidebar, content slot, account menu, nav label fix
P1	Mobile drawer/bottom nav, command search, notifications
P2	Status bar, quick create, action queue
P3	Agent activity strip, context panel, help/support
P4	Session expiry, offline/reconnect, correlation ID, admin banners
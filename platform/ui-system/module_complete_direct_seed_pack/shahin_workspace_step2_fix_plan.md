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

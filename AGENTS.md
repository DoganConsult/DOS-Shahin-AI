ZERO STATIC / ZERO LEGACY / ZERO FALLBACK — MAINTENANCE MODE

Server is in maintenance mode until this is complete.

Treat this as a full cutover to Dynamic UI + UI-OS only.

No defer.
No compatibility layer.
No mirror implementation.
No fallback nav.
No fallback route.
No fallback label.
No fallback icon.
No fallback CSS value.
No browser-side legacy adapter.
No static safety net.
No fake green.
No “temporary” exception.

Core doctrine:
DB stores.
Dynamic UI declares.
UI-OS resolves and normalizes.
Frontend renders only normalized UI-OS runtime.
If UI-OS emits nothing, frontend shows nothing.
Frontend must never invent Home, Foundation, /workspace-home, routes, labels, icons, actions, or module trees.

Important DB note:
The current server DB is test DB, but still do controlled changes:
- create backup/snapshot before migration
- use idempotent migrations/seeds
- no destructive table drops unless explicitly required and proven test-only
- document every DB mutation
- after migration, prove runtime output from DB/UI-OS only

====================================================
GLOBAL HARD RULES
====================================================

Forbidden everywhere in live frontend shell/nav/runtime:
- static nav arrays as source of truth
- static Home injection
- static Foundation tree
- /workspace-home fallback
- buildPlatformNav
- buildFoundationGroup
- buildFoundationNavChildren
- shellActionFromLegacyRecord
- label_key in frontend
- label_fallback in frontend
- labelKey in frontend nav/shell contracts
- labelEn / labelAr in frontend runtime contracts
- component_key in frontend runtime contracts
- perms_required in frontend runtime contracts
- route as nav/action fallback
- detailRoute / detail_route
- evidenceUri / evidence_uri
- chromeStrings
- props['accountMenu']
- local banner/session policy in shell-host or binding
- hardcoded user-facing labels
- hardcoded product routes
- fallback icons
- fallback CSS values var(..., ...)
- hardcoded media query @media (max-width: 480px)
- document.querySelector shell coupling
- mirror shell implementation under modules/core

Allowed only inside UI-OS resolver/service boundary:
- DB snake_case
- component_key
- perms_required
- label_key
- label_fallback
- route from DB
- raw DB DTO shapes

Nothing raw leaves UI-OS.

====================================================
FINAL RUNTIME SOURCE
====================================================

Only source for workspace shell/navigation:

GET /api/ui-os/workspace-runtime

Required response shape only:

shell.surfaces[]
shell.zones
shell.nav.groups[]
shell.nav.items[]
shell.chrome
shell.shortcuts
shell.banners
shell.policies

All browser-facing fields must be camelCase and typed.

ShellAction allowed shapes only:

{ kind: 'navigate', path: string }
{ kind: 'open_external', url: string }
{ kind: 'toggle_language' }
{ kind: 'toggle_theme' }
{ kind: 'open_context_tab', tab: string }
{ kind: 'open_command' }
{ kind: 'close_overlay' }
{ kind: 'clear_error' }
{ kind: 'dispatch_event', eventName: string, payload?: Record<string, unknown> }

WorkspaceI18nLabel allowed shape only:

{ i18nKey?: string; fallback?: string; label?: string }

====================================================
EXECUTION ORDER
====================================================

PHASE 0 — Freeze and prove live paths

Before edits, print:
- canonical shell path
- SPA alias/import chain
- mirror shell path status
- contract source paths
- UI-OS resolver path
- bootstrap paths containing /workspace-home

Canonical decisions:
- platform/core/platform/shell is the only live shell source
- modules/core/platform/shell must be deleted or hard re-export only
- platform/ui-system/dos-ui-contracts/src/shell-action.contract.ts is the only ShellAction contract
- services/ui-os-service/src/routes/workspace-shell.routes.ts owns all DB-to-runtime normalization

PHASE 1 — UI-OS resolver normalization

File:
services/ui-os-service/src/routes/workspace-shell.routes.ts

Implement server-side normalization:

component_key  -> componentKey
perms_required -> permsRequired
label_key      -> label.i18nKey
label_fallback -> label.fallback
label_en/ar    -> label.label or label.fallback according to locale rule
route          -> action: { kind: 'navigate', path: route }

Emit only:
- shell.surfaces
- shell.zones
- shell.nav.groups
- shell.nav.items
- shell.chrome
- shell.shortcuts
- shell.banners
- shell.policies

Never emit:
- navigation.groups/items alias
- component_key
- perms_required
- label_key
- label_fallback
- labelKey
- labelEn
- labelAr
- route
- detailRoute
- detail_route
- evidenceUri
- evidence_uri

PHASE 2 — Shared contracts

Files:
platform/ui-system/dos-ui-contracts/src/shell-action.contract.ts
platform/ui-system/dos-ui-contracts/src/nav-contract.ts
platform/ui-system/dos-ui-system/src/shell/workspace-shell.contracts.ts

Delete:
- shellActionFromLegacyRecord
- legacy parse branches
- route from nav item contracts
- labelKey from nav/account contracts
- close_overlay.overlay
- dispatch_event.name
- dispatch_event.detail
- DB-shaped runtime fields

Contracts must expose only typed UI-OS runtime fields.

PHASE 3 — Binding service

File:
platform/core/platform/shell/workspace-shell-binding.service.ts

Delete:
- local label resolution
- chromeString compatibility
- resolveRuntimeLabel if it interprets legacy fields
- labelKey / label_key / label_fallback handling
- route / detailRoute / evidenceUri carry-through
- props['accountMenu']
- local banner construction
- local session-expiry policy
- dot-path chrome policy scanning
- raw props scanning for shell chrome

Keep only:
- typed runtime accessors
- zone grouping
- permission filtering
- typed ShellAction objects already emitted by UI-OS
- no legacy normalization

PHASE 4 — Shell host

File:
platform/core/platform/shell/shell-host.component.ts

Shell-host may only:
- render
- manage local open/closed UI state
- call zoneHas(...)
- execute typed ShellAction
- consume typed runtime shortcuts
- consume typed runtime banners/chrome/nav

Delete:
- hardcoded labels
- hardcoded routes
- hardcoded icons
- hardcoded CSS fallbacks
- hardcoded keyboard shortcuts
- local banner/session policy
- legacy action conversion
- document.querySelector
- labelFromKey
- /settings/subscription

PHASE 5 — Mirror shell collapse

Files:
modules/core/platform/shell/shell-host.component.ts
modules/core/platform/shell/index.ts

Either:
- delete if no imports depend on them
or
- replace with hard re-export to platform/core only

No second live implementation.
No lockstep mirror maintenance.

PHASE 6 — Navigation and bootstrap

Files:
platform/core/platform/navigation/navigation.config.ts
platform/core/services/platform/dynamic-ui-bootstrap.service.ts
platform/config-center/shared/dynamic-ui/services/dynamic-ui-bootstrap.service.ts
platform/core/services/platform/bootstrap.store.ts
platform/core/services/platform/app-bootstrap.service.ts
platform/core/services/platform/platform-bootstrap.service.ts
platform/core/services/platform/entitlements.service.ts

Delete:
- static Home
- static Foundation
- static platform nav arrays
- /workspace-home fallback defaults
- buildPlatformNav
- buildFoundationGroup
- buildFoundationNavChildren
- “compile-compat” nav residue
- static SPA fallback list

Result:
Empty UI-OS runtime nav = empty frontend nav.
`/workspace-home` appears only if UI-OS/Dynamic UI emits it.

PHASE 7 — UI-system shell components

Scope:
platform/ui-system/dos-ui-system/src/shell/**
platform/ui-system/dos-ui-system/src/components/nav-item.component.ts

Remove browser-side fallback copy and legacy label handling.

Allowed display resolution:
label.label -> label.fallback -> empty string

Do not use:
labelKey
label_key
label_en
label_ar
hardcoded empty-state copy
generated fallback text

PHASE 8 — CI hard gate

Create/strengthen:
scripts/ci-guards/lint-no-legacy-uios-shell.mjs

Wire into:
scripts/ci-guards/dos-master-gate.mjs

Guard must scan:
platform/core/platform/shell
platform/core/platform/navigation
platform/core/platform/dynamic-ui
platform/core/services/platform
platform/ui-system/dos-ui-contracts/src
platform/ui-system/dos-ui-system/src/shell
platform/ui-system/dos-ui-system/src/components/nav-item.component.ts

Guard must fail on:
shellActionFromLegacyRecord
label_key
label_fallback
labelKey
labelEn
labelAr
component_key
perms_required
detailRoute
detail_route
evidenceUri
evidence_uri
chromeStrings
props['accountMenu']
buildPlatformNav
buildFoundationGroup
buildFoundationNavChildren
/workspace-home in fallback/bootstrap/nav code
fallback to static
static SPA list
FALLBACK_GROUP_ICON
FALLBACK_ITEM_ICON
CARBON_BREAKPOINT_LARGE_PX
labelFromKey
/settings/subscription
document.querySelector
var(..., ...)
@media (max-width: 480px)

Do not skip comments for fallback/static/legacy language.
Stale comments are doctrine drift and must fail.

====================================================
VALIDATION COMMANDS
====================================================

Run all:

pnpm --filter @dos/ui-contracts build
pnpm --filter @dos/ui-system build
pnpm --filter @dos/platform-core build
pnpm --filter @dos/platform-app build

node scripts/ci-guards/lint-no-static-nav-fallback.mjs
node scripts/ci-guards/lint-no-legacy-uios-shell.mjs

Grep proof:

grep -RIn "shellActionFromLegacyRecord\|label_key\|label_fallback\|labelKey\|labelEn\|labelAr\|component_key\|perms_required\|detailRoute\|detail_route\|evidenceUri\|evidence_uri\|chromeStrings\|props\['accountMenu'\]\|buildPlatformNav\|buildFoundationGroup\|buildFoundationNavChildren\|/settings/subscription" \
  platform/core/platform/shell \
  platform/core/platform/navigation \
  platform/core/platform/dynamic-ui \
  platform/core/services/platform \
  platform/ui-system/dos-ui-contracts/src \
  platform/ui-system/dos-ui-system/src/shell \
  || true

Expected:
zero forbidden hits outside UI-OS resolver/service boundary.

Also grep /workspace-home:

grep -RIn "/workspace-home" \
  platform/core/platform/shell \
  platform/core/platform/navigation \
  platform/core/platform/dynamic-ui \
  platform/core/services/platform \
  platform/ui-system/dos-ui-contracts/src \
  platform/ui-system/dos-ui-system/src/shell \
  || true

Expected:
zero hardcoded fallback/default hits.
If /workspace-home exists, it must be only test fixture or runtime-emitted DB data, not source fallback.

====================================================
RUNTIME PROOF
====================================================

If services are running:

GET /api/ui-os/workspace-runtime

Prove:
- response has shell.nav only, not navigation alias
- shell.nav.items use action.kind/action.path, not route
- shell.surfaces use componentKey/permsRequired, not component_key/perms_required
- shell.zones.main exists only from DB/UI-OS data
- shell.zones.sidebar exists only from DB/UI-OS data
- /workspace-home appears only if emitted by UI-OS/Dynamic UI data
- page body/sidebar render only from shell.zones.main/sidebar

====================================================
CLOSE-OUT REPORT FORMAT
====================================================

Report only:

1. Files changed
2. Legacy patterns deleted
3. UI-OS resolver mappings added
4. Mirror shell status
5. Static nav/bootstrap fallback removals
6. Build results
7. Guard results
8. Grep proof
9. Runtime proof
10. Remaining blockers, if any

Do not report “PASS” unless all builds, guards, grep proof, and runtime proof pass.

Final acceptance:
ZERO STATIC.
ZERO LEGACY.
ZERO FALLBACK.
ZERO MIRROR.
ZERO BROWSER NORMALIZATION.
ZERO HARDCODED /workspace-home.
ONLY Dynamic UI + UI-OS runtime.

Short version for your agent’s mindset:

If the frontend has to guess, legacy is still alive.
If shell has to normalize DB fields, legacy is still alive.
If /workspace-home exists without UI-OS data, legacy is still alive.
If empty DB still creates nav, legacy is still alive.
Kill it at source: UI-OS resolves, frontend renders.
If any runtime value is missing from DB/Dynamic UI/UI-OS data, do not hardcode it in frontend, shell, service, resolver, bootstrap, or config.

Required behavior:
1. Identify the missing runtime value.
2. Classify it:
   - shell chrome data
   - navigation data
   - route/default entry data
   - label/i18n data
   - action data
   - banner/policy data
   - layout/token/config data
   - permission/entitlement data
   - component registry/binding data

3. Add the correct DB structure if missing:
   - create table only if no existing canonical table fits
   - otherwise extend the canonical table with a migration
   - never create duplicate shadow tables
   - never put product-specific fallback data in frontend code

4. Add an idempotent migration:
   - forward migration
   - safe re-run
   - tenant/product/module scoped where needed
   - rollback/down migration if your migration framework requires it
   - assertion at the end proving required rows/columns exist

5. Add seed data only through the canonical seed/migration pipeline:
   - Dynamic UI component registry
   - workspace shell binding
   - nav groups/items
   - route catalog
   - i18n/runtime labels
   - shell chrome config
   - shell policies
   - actions
   - permissions/entitlements

6. UI-OS resolver must read this DB data and emit normalized runtime DTOs.

7. Frontend must only consume UI-OS runtime.
   If DB data is missing, frontend shows empty/controlled missing-data state.
   It must not invent the missing value.

Forbidden:
- hardcoded /workspace-home fallback
- hardcoded Home nav
- hardcoded Foundation nav
- hardcoded labels
- hardcoded icons
- hardcoded route defaults
- hardcoded shell policy
- hardcoded banner copy
- hardcoded action objects
- hardcoded “safe fallback” arrays
- local JSON fallback in frontend
- temporary in-code seed objects
- fallback constants pretending to be runtime config

Missing data response:
If a needed row does not exist, create:
- migration
- seed
- validation query
- UI-OS resolver mapping
- CI guard / smoke proof

Do not patch around missing DB data in TypeScript.

Add this acceptance clause:

Acceptance:
- Every value rendered by workspace shell/nav comes from DB → UI-OS runtime.
- If a value was missing, the fix includes a DB migration/seed, not a frontend constant.
- No frontend file contains product/default data that should live in DB.
- /workspace-home exists only as Dynamic UI/UI-OS data.
- Empty DB rows produce empty UI, not hardcoded recovery.
- Migration proof shows required rows exist.
- Runtime proof shows UI-OS emits the rows.

And give the agent this final doctrine line:

If the data is required, store it.
If the schema is missing, migrate it.
If the runtime needs it, UI-OS resolves it.
If the frontend invents it, the patch fails.

This matches the expanded hard-kill plan: /workspace-home fallback exists outside shell files in bootstrap services, so the true fix is not another frontend fallback; the missing/default runtime data must be represented in DB/Dynamic UI/UI-OS instead  These are the **extra rules** to add so the agent cannot escape with “mostly dynamic” or hidden fallback.

## Zero Legacy / Zero Static Master Rules

```text id="extra-zero-rules"
1. ONE SOURCE RULE
Only GET /api/ui-os/workspace-runtime can drive workspace shell, sidebar, command nav, banners, shortcuts, shell chrome, and /workspace-home.

2. DB-FIRST RULE
If a required value is missing, create/extend DB table + migration + seed.
Do not hardcode it in TS/HTML/SCSS/config.

3. NO FRONTEND INVENTION RULE
Frontend must not invent:
- Home
- /workspace-home
- Foundation nav
- labels
- icons
- banners
- shortcuts
- actions
- routes
- empty-state text
- default module cards

4. UI-OS NORMALIZATION RULE
DB may use snake_case.
Only UI-OS resolver may read snake_case.
Browser-facing JSON must be camelCase only.

5. NO BROWSER ADAPTER RULE
WorkspaceShellBindingService must not normalize legacy DB DTOs.
It only consumes already-normalized UI-OS runtime.

6. NO COMPATIBILITY RULE
Delete compatibility aliases:
- route
- labelKey
- label_key
- label_fallback
- detailRoute
- evidenceUri
- chromeStrings
- props['accountMenu']
- shellActionFromLegacyRecord

7. NO STATIC NAV RULE
Empty DB/runtime nav means empty UI.
No fallback nav arrays.
No static Home.
No static Foundation.
No buildPlatformNav.
No buildFoundationGroup.
No buildFoundationNavChildren.

8. NO HARDCODED ROUTE RULE
/workspace-home must appear only from DB/Dynamic UI/UI-OS runtime.
No bootstrap fallback.
No entitlements fallback.
No shell fallback.

9. NO MIRROR RULE
One canonical shell tree only:
platform/core/platform/shell
modules/core/platform/shell must be deleted or hard re-export only.

10. NO LOCAL POLICY RULE
Shell-host and binding service must not own:
- session expiry thresholds
- banner rules
- trial expiry copy
- offline copy
- subscription route
- shortcut keys
- disabled tooltip text

11. NO CSS FALLBACK RULE
No var(..., fallback) inside shell-host.
No hardcoded Carbon fallback colors/sizes/spacings.
If token is missing, fix design tokens.

12. NO COMMENT DRIFT RULE
CI must fail stale comments like:
- fallback to static
- static SPA list
- temporary fallback
- legacy compatibility
Comments are doctrine too.

13. CONTRACT FIRST RULE
ShellAction shape must be one union only:
- navigate/path
- open_external/url
- toggle_language
- toggle_theme
- open_context_tab/tab
- open_command
- close_overlay
- clear_error
- dispatch_event/eventName/payload

14. MIGRATION PROOF RULE
Every missing DB value fix must include:
- migration
- seed
- validation query
- runtime proof

15. CI HARD GATE RULE
No merge unless these pass:
- @dos/ui-contracts build
- @dos/ui-system build
- @dos/platform-core build
- @dos/platform-app build
- lint-no-static-nav-fallback
- lint-no-legacy-uios-shell
- grep proof zero forbidden hits

16. RUNTIME PROOF RULE
Do not declare PASS from build only.
Must verify /api/ui-os/workspace-runtime:
- shell.nav exists
- no navigation alias
- shell.nav.items use action.kind/action.path
- no raw route
- surfaces use componentKey/permsRequired
- no component_key/perms_required
- zones.main/sidebar populated only from DB data
```

## Add this “do not patch around missing data” rule

```text id="missing-data-rule"
If runtime data is missing:
- do not add fallback in frontend
- do not add fallback in bootstrap service
- do not add local JSON
- do not add constants
- do not add temporary arrays

Instead:
1. find the missing DB owner table
2. add migration/seed
3. update UI-OS resolver
4. prove runtime emits it
5. prove frontend renders it
```

## Add this maintenance-mode rule

```text id="maintenance-mode-rule"
Server remains in maintenance mode until:
- zero static
- zero legacy
- zero fallback
- zero mirror
- zero hardcoded /workspace-home
- zero browser DB normalization
- runtime proof passes
```

## Why this is required

Your latest plan already shows `/workspace-home` fallback exists outside shell files in bootstrap services, and UI-system shell components can still carry browser-side fallback behavior, so true “0 legacy” requires DB/UI-OS fixes across shell, navigation, bootstrap, contracts, and UI-system components — not only shell-host cleanup. 

Final rule:

```text id="final-zero-rule"
If the frontend guesses, legacy is alive.
If bootstrap invents, legacy is alive.
If shell normalizes DB fields, legacy is alive.
If missing data is fixed with code instead of DB, legacy is alive.
```

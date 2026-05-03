Use this upgraded version. It adds **UI-System** and **Dynamic-UI** controls, so any model/agent must check platform UI contracts before preflight or implementation.

============================================================
VERIFIED ENVIRONMENT FACTS (2026-05-02 — keep current; re-verify when stale)
============================================================

These facts override any stale "not available / not accessible" claim.
Do NOT declare a capability missing without first running the verification
command listed beside it.

LIVE INFRASTRUCTURE (verified via pm2 list + curl + psql):
- Gateway: PORT=4000 (cluster x2), responding HTTP. Verify: `curl -sI http://localhost:4000/`
- Product-shell: PORT=3000, responding (currently 500 root, but live). Verify: `curl -sI http://localhost:3000/`
- Online PM2 processes: gateway, auth-service, tenant-service, user-service, ui-os-service, ai-engine-service, product-shell. Verify: `pm2 list`

DATABASE ACCESS (verified):
- Host: localhost:5432  DB: shahin_grc  User: dos_auth  Pwd: dos_auth_pass_2026
- Source of truth: `platform/config-center/env/auth-service.env` (DATABASE_URL=...)
- Verify: `PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -c '\dt dos.*'`
- An agent claiming "no DB access" without running the verify command is wrong.

CARBON CATALOG (verified counts as of 2026-05-02):
- `dos.ui_carbon_components` = 247 rows, all `is_active=true`, all `vendor='ibm-carbon'`.
  - by runtime_status: active=103, wrapper-required=45, blocked-react-only=96,
    missing-upstream-angular-binding=2, deprecated=1.
  - by category: component=194, utility=26, primitive=11, layout=8, ai=5, shell=1,
    chart=1, experimental=1.
  - "Usable Carbon Angular surface" = 247 − 96 (react-only) − 2 (missing-binding)
    − 1 (deprecated) = 148 components; 103 are runtime-active today.
- `dos.dynamic_ui_component_registry` = 152 rows, 100% `vendor='ibm-carbon'`, 100%
  `approval_status='approved'`, 0 missing `carbon_key`. Trigger
  `trg_carbon_only_runtime` actively rejects non-IBM rows on INSERT/UPDATE.
- Verify both:
  `PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -c "SELECT count(*),vendor FROM dos.ui_carbon_components GROUP BY vendor; SELECT count(*),vendor,approval_status FROM dos.dynamic_ui_component_registry GROUP BY vendor,approval_status;"`

SHELL-RESOLVER LOCATION (corrects prior misclassification):
- `shell-resolver.service.ts` lives in FE at `platform/core/platform/shell/`,
  NOT in any backend service. There is no separate `shell-resolver` service in
  `services/`. Therefore PrimeIcons cleanup is FE-only — no cross-tier blocker.
- Real test pin to update when removing `pi-` icons:
  `platform/core/platform/shell/shell-components.test.ts:259` →
  `expect(def.moduleIcon).toMatch(/^pi-/);`
- The `stripPiPrefix()` helper in `shell-host.component.ts:73` says "until the
  backend config flips" — that comment is misleading; the source is FE config.

VERTICAL-SLICE DoD (CLOSED 2026-05-03 by Phase F-F6 H4):
- `platform/config-center/test/tests/e2e/phase-f-vertical-slice-dod.spec.ts`
  hits the live ui-os-service resolver (`/api/ui-os/template-binding`) for
  all 21 V1-V6 routes and asserts: archetype matches the rebind contract,
  `template_export` is one of the 39 LOADERS, the archetype-extension
  `props` key holds ≥ the V1-V6 minimum row count, and a sentinel string
  from each seed JSON appears in the live response. 21/21 PASS in 1.2s.
  Verify (with PM2 ui-os-service ONLINE on :4015):
  `cd platform/config-center/test && npx playwright test phase-f-vertical-slice-dod.spec.ts --project=chromium`.

AUTHZ NEGATIVE-PATH HARNESS (CLOSED 2026-05-03 by Phase F-F6 H3):
- `platform/config-center/test/tests/e2e/phase-f-authz-negative.spec.ts`
  asserts the production AuthZ contract for unauthenticated visitors on
  every V1-V6 route (4 gates: route-guard redirect, render-time mutator
  absence, network 401/403 enforcement, no legacy "No widget configured").
  21/21 PASS in 16.8s against PM2 product-shell on :3000 (positive control
  skipped unless `ADMIN_STORAGE_STATE` is provided). Verify:
  `E2E_BASE_URL=http://localhost:3000 cd platform/config-center/test && npx playwright test phase-f-authz-negative.spec.ts --project=chromium`.

MARKETING LANDING ARCHETYPE (CLOSED 2026-05-04 by Phase M3.1):
- Root cause unblocked: the 17-section `<dos-marketing-home>` shipped with
  no `styles`/`styleUrl`/peer `.scss`, so all 33 layout selectors
  (`dos-marketing-home`, `dos-mh-section`, `dos-mh-container`, `dos-mh-hero`,
  `dos-mh-hero-content`, `dos-mh-hero-badge`, `dos-mh-hero-orb`,
  `dos-mh-hero-visual`, `dos-mh-hero-microcopy`, `dos-mh-eyebrow`,
  `dos-mh-eyebrow-on-dark`, `dos-mh-title`, `dos-mh-sub`, `dos-mh-sub-on-dark`,
  `dos-mh-cta-row`, `dos-mh-grid-3`, `dos-mh-pill-row`,
  `dos-mh-breadcrumb-row`, `dos-mh-section-title`, `dos-mh-trust`,
  `dos-mh-value-props`, `dos-mh-agentic`, `dos-mh-readiness`,
  `dos-mh-demo-skeleton`, `dos-mh-agent-tiles`, `dos-mh-agent-tile`,
  `dos-mh-agent-img`, `dos-mh-agent-letter`, `dos-mh-download-kit`,
  `dos-mh-toast-anchor`, `dos-mh-ai`, `dos-mh-ai-loop`, `dos-mh-quote`,
  `dos-mh-logo`, `dos-mh-cta-banner`, `dos-mh-cta-banner-inner`,
  `dos-mh-footer`, `dos-mh-footer-grid`, `dos-mh-footer-col`,
  `dos-mh-footer-brand`) had zero rules anywhere in the workspace and the
  page rendered as a flat unstyled stream of Carbon micro-widgets despite
  `@carbon/styles/css/styles.css` shipping correctly in `styles-*.css`.
  `services/product-shell/src/server.ts` cached `INDEX_EXISTS=false` at
  boot when PM2 started before the SPA build finished, returning
  `503 "SPA build missing"` plain-text — that masked the second deeper
  CSS gap until product-shell was restarted.
- Fix shipped:
    1. New stylesheet
       `platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.scss`
       (~530 LOC) covering all 40 unique selectors using `--cds-*` Carbon
       tokens with inline fallbacks, RTL via CSS logical properties (no
       left/right), responsive breakpoints 390/430/480/768/1440 per the
       Shahin-AI+ CSS closeout spec, `:host-context([dir='rtl'])` letter-
       spacing override for eyebrow/badge/eyebrow-on-dark, and a
       fixed-position
       `.dos-mh-toast-anchor` z-index=9999 with mobile safe-area fallback.
       Wired via `styleUrl: './marketing-home.page.scss'` (Angular
       Emulated encapsulation; no global bleed). Verified live: 40 unique
       `dos-mh-*` selectors present in the lazy ui-system chunk after
       `pnpm --filter shahin-ai-grc-frontend build`.
    2. Migration
       `platform/dos/migrations/public/20260504_0210_marketing_landing_archetype.sql`
       extends `chk_archetype` with the 33rd archetype `marketing-landing`,
       re-maps the 7 marketing rows in `dos.dynamic_ui_component_registry`
       from placeholder `carbon_key='tiles'` to representative active
       Carbon keys (`grid` for `marketing.home.page`, `structured-list` for
       `marketing.legal.page`, `tiles` for the rest — all
       `runtime_status='active'` per `dos.ui_carbon_components`, so
       `trg_carbon_only_runtime` stays satisfied), and inserts 7 rows in
       `dos.ui_route_template_binding` (`/`, `/pricing`, `/trust`,
       `/security`, `/contact`, `/about`, `/legal`) with
       `archetype='marketing-landing'`, bilingual EN/AR titles+subtitles,
       and `props='{}'::jsonb`. Per-section seed tables intentionally
       NOT introduced because content already streams live via
       `services/ui-os-service/src/routes/brand.routes.ts ::
       buildMarketingHomeContent()` and
       `MarketingPublicConfigService.marketingHomeContent()`.
    3. Loader registry
       `platform/core/platform/shell/template-binding.registry.ts` adds
       7 alias entries (`MarketingHomeTemplateComponent`,
       `MarketingPricingTemplateComponent`, `MarketingTrustTemplateComponent`,
       `MarketingSecurityTemplateComponent`, `MarketingContactTemplateComponent`,
       `MarketingAboutTemplateComponent`, `MarketingLegalTemplateComponent`)
       each thinly importing the existing `Dos*PageComponent` from
       `@dos/ui-system`. Aliases satisfy the `template-only-routing.mjs`
       naming contract (`*TemplateComponent`) without forcing a synthetic
       dispatcher page. ARCHETYPE_COUNT=33; LOADERS=47.
- Customer-gate state (`PROPS_COVERAGE_ENFORCE=1 pnpm platform:customer-gate`)
  GREEN end-to-end:
    [carbon-dynamic-ui-coherence] OK
    [loader-resolvability] PASS
    SPA build OK (≈18s)
    [props-coverage] bindings=179 archetypes-with-props=16 failures=0
    [workspace-shell-coverage] surfaces=10 failures=0
    [template-only-routing] non-archetype=0 no-binding=0 unknown-export=0
                            spa-bypass=0 (loaders=47, routes=176)
- Known follow-ups (not in this slice): (a) `DosCarbonTooltipComponent`
  is imported but unused — NG8113 warning to clean up; (b) per-section
  Phase-F seed tables (`dos.ui_route_marketing_section`, `..._faq_item`,
  `..._footer_group`, `..._testimonial`, …) for full DB-driven content
  authority — currently content lives in
  `buildMarketingHomeContent()`; migrating to per-section tables is a
  separate Phase-F deepening; (c) Playwright spec for marketing routes
  (3 widths × 2 directions) is GATED ON USER APPROVAL per workflow §6.5
  and not shipped here; (d) consider patching
  `services/product-shell/src/server.ts:167` to lazy-check `INDEX_EXISTS`
  per request so a future "SPA built after server boot" race self-heals.
- Verify:
  `PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -c "SELECT count(*) FROM dos.ui_route_template_binding WHERE archetype='marketing-landing'; SELECT count(*) FROM dos.dynamic_ui_component_registry WHERE component_key LIKE 'marketing.%';"`
  → expects `7` and `10` (7 page rows + 3 download-kit rows from M1.5).

WORKSPACE SHELL REGISTRY (CLOSED 2026-05-04 by Phase WS-1):
- Migration `20260504_0010_workspace_shell_registry.sql` registers the 10
  default `workspace.*` component_keys (header, sidebar, mobile-nav,
  command-search, status-bar, action-queue, agent-strip, inbox-center,
  context-panel, quick-create) in `dos.dynamic_ui_component_registry`
  (vendor='ibm-carbon', approved, mapped to ui-shell/tiles/search/tag/
  modal/accordion/button carbon_keys). Adds per-tenant
  `dos.workspace_shell_binding` table (UNIQUE(tenant_id, component_key),
  enabled/position/perms_required/props/version) with version-bump trigger
  and CHECK constraint locking the 10 keys. Backfilled 400 rows
  (40 tenants × 10 keys) with default perms (search.use, workqueue.read,
  agents.observe, inbox.read, records.create). Migration
  `20260504_0020_phase_ws_case_finalization_archetype.sql` adds the
  32nd archetype `case-finalization` to chk_archetype, registers
  `module.case_finalization.page` (carbon_key=tabs), and creates props
  table `dos.ui_route_case_finalization` (case_id, decision, signoff_status,
  status enums). TS contracts in
  `platform/ui-system/dos-ui-system/src/shell/workspace-shell.contracts.ts`
  (WorkspaceHeaderContext, WorkspaceNavItem, BottomNavItem,
  CommandSearchResult, StatusBarSignal, ActionQueueItem, AgentActivity,
  InboxMessage, ContextPanelView, QuickCreateAction — all PermissionAware
  + i18nKey + loading-state discriminator). 32nd template
  `CaseFinalizationTemplateComponent` shipped via templates/index.ts;
  ARCHETYPE_COUNT=32; LOADERS=40; ARCHETYPE_EXPORTS=39.
  `PROPS_COVERAGE_ENFORCE=1 pnpm platform:customer-gate` GREEN end-to-end
  (`bindings=159 archetypes-with-props=16 failures=0`). Verify:
  `PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -c "SELECT count(*) FROM dos.dynamic_ui_component_registry WHERE component_key LIKE 'workspace.%'; SELECT count(*) FROM dos.workspace_shell_binding;"`
  → expects `10` and `400`.

WORKSPACE SHELL WRAPPERS + RESOLVER + GATE (CLOSED 2026-05-04 by Phase WS-2..WS-6):
- 10 standalone Carbon-backed shell wrappers shipped under
  `platform/ui-system/dos-ui-system/src/shell/` and re-exported via
  `@dos/ui-system` barrel:
    workspace-header (existing, contracts-driven)
    workspace-sidebar (NEW selector dos-workspace-sidebar)
    mobile-bottom-nav (existing)
    command-search (NEW dos-command-search, cmd-k launch, mobile→full-screen)
    workspace-status-bar (NEW dos-workspace-status-bar)
    workspace-action-queue (NEW dos-action-queue SHELL strip; distinct from
      page-archetype renderer which was renamed to dos-module-workqueue-list)
    agent-activity-strip (NEW dos-agent-activity-strip)
    inbox-center (NEW dos-inbox-center, modal/drawer)
    context-panel (NEW dos-context-panel, accordion/full-sheet)
    quick-create (NEW dos-quick-create, FAB/sticky-bottom)
  Each consumes its typed contract from
  `platform/ui-system/dos-ui-system/src/shell/workspace-shell.contracts.ts`
  (PermissionAware, i18nKey labels, mobile_mode flag, RTL-safe).
- Backend resolver: `GET /api/ui-os/workspace-shell/:tenantId` mounted in
  `services/ui-os-service/src/routes/workspace-shell.routes.ts` returns
  `{tenantId, version, surfaces[10], knownKeys[10]}` from
  `dos.workspace_shell_binding`. Verified live on PM2 ui-os-service :4015
  (real tenant returns 10 enabled surfaces with sum-version=10).
- CI guard: `scripts/ci-guards/workspace-shell-coverage.mjs` cross-checks
  the 10 SURFACES (key↔selector pair) against:
    1. component declaring the selector under src/shell/
    2. WORKSPACE_SHELL_KEYS const in workspace-shell.contracts.ts
    3. registry migration 20260504_0010
    4. barrel re-export in src/index.ts
  Wired into `pnpm platform:customer-gate` with
  WORKSPACE_SHELL_COVERAGE_ENFORCE=1. Current state:
  `surfaces=10 failures=0 — PASS`.
- Customer-gate end-to-end (PROPS_COVERAGE_ENFORCE=1) GREEN in ~27s:
    [carbon-dynamic-ui-coherence] OK
    [loader-resolvability] PASS
    SPA build OK
    [props-coverage] bindings=159 archetypes-with-props=16 failures=0 — PASS
    [workspace-shell-coverage] surfaces=10 failures=0 — PASS
- Phase WS-7 (Playwright spec — 3 breakpoints × 2 directions × 3 auth states)
  is GATED ON USER APPROVAL per workflow §6.5 and is NOT shipped in this
  patch.

PROGRESSIVE-MODULE BINDINGS (CLOSED 2026-05-03 by Phase G):
- Migrations `20260503_0900_phase_g_progressive_modules_bindings.sql` (+95
  customer-bound rows, ON CONFLICT DO UPDATE) and
  `202605030910_phase_f_phase_g_progressive_props.sql` (+211 rows across
  all 14 archetype-props tables) lift the 10 productive modules (risk,
  compliance, controls, policy, audit, evidence, workflow, reporting,
  knowledge, foundation) onto the 31-archetype roster. Live totals:
  `total_bindings=159, distinct_archetypes=27`. 13 props-bearing routes
  (calendar-timeline, compliance-calendar, remediation-roadmap, ownership-map ×3,
  audit-trail-ledger, org-chart ×4, delegation-center, workflow-timeline)
  seeded with bilingual EN/AR fixtures via `pnpm ui-registry:import:props`.
  `PROPS_COVERAGE_ENFORCE=1 pnpm platform:customer-gate` GREEN end-to-end
  (dynamic-ui:gates + SPA build ~25s + props-coverage 159/0).

PROPS COVERAGE (CLOSED 2026-05-03 by Phase F-F6 V1-V6):
- Migration `202605030850_phase_f_phase_f_v2_v6_props.sql` (idempotent, ON
  CONFLICT DO UPDATE) seeded 143 rows across 14 archetype-props tables for
  29 customer-bound routes covering V1 (foundation), V2 (dauth+tenants),
  V3 (audit-trail-ledger × 11), V4 (agent-suite), V5 (incident-response),
  V6 (operational misc). `node scripts/ci-guards/props-coverage.mjs` →
  `bindings=64 archetypes-with-props=15 failures=0`. Live DB row tallies:
  calendar_event=8, roadmap_milestone=5, org_chart_node=9, ownership_edge=18,
  delegation_rule=5, agent_registry=11, agent_flow_step=7,
  incident_runbook_step=10, incident_communication=6, audit_ledger_row=44,
  audit_evidence_artifact=4, follow_up_item=5, export_artifact=5,
  workflow_timeline_step=6. `pnpm platform:customer-gate` GREEN end-to-end
  (dynamic-ui:gates + SPA build 20.8s + props-coverage). Verify:
  `PROPS_COVERAGE_ENFORCE=1 pnpm platform:customer-gate`.

PER-PRIMITIVE WRAPPER GAP (CLOSED 2026-05-03 by Phase F-F6 H1):
- `platform/dos/registry/component-map.ts` no longer carries any
  `DynamicPageHostComponent` fallback. Every entry in
  `CARBON_PRIMITIVE_COMPONENT_MAP` (62 primitives) and
  `REGISTRY_COMPONENT_MAP` (>340 entries) resolves to a real Carbon Angular
  wrapper from `carbon-primitive-renderers.ts` /
  `carbon-extended-renderers.ts` / `carbon-chart-renderers.ts`. The
  `loader-resolvability` CI gate enforces "every registry entry resolves
  to a real export" (462/462 currently). Verify:
  `pnpm dynamic-ui:gates 2>&1 | grep loader-resolvability`.

FOUNDATION MODULE BUILD STATE (verified 2026-05-02 evening):
- `platform/foundation/dist/` IS built (bootstrap.js + contracts present).
- `platform/foundation/ui/` exposes the 19 UI components consumed by
  `app.routes.ts`. The Phase A "Gates 2 & 3 PENDING" wording in the broader
  plan reflects validation/CI gates, NOT missing build artefacts.
- `platform/foundation/tsconfig.json` now declares `"lib": ["ES2022","DOM"]`
  (was `["ES2022"]`). This unblocks `@dos/ui-system` typechecking when
  pulled in transitively, because `@dos/ui-system/package.json` exposes
  `src/index.ts` directly (no built `dist`) so foundation's tsc walks
  ui-system source under foundation's lib set.

REAL @dos/ui-system BLOCKERS (after the lib fix; verify with
`pnpm --filter @dos/module-foundation build 2>&1 | grep -E "ui/workspace|ui-system"`):
- `platform/foundation/ui/workspace/workspace-icons.ts` imports
  `@carbon/icons/es/{qr-code,camera,wifi--off,email}/{16,32}` — package
  ships JS without `.d.ts`. Fix: add a one-line `declare module '@carbon/icons/es/*';`
  ambient shim under `platform/foundation/ui/types/`.
- `platform/foundation/ui/workspace/workspace-ignite-card.component.ts`
  imports `@app/modules` and `@app/dos/contracts/cockpit-config.contract`.
  These are SPA-only path aliases, not workspace packages. The file does
  not belong in foundation; either move it to the SPA or rewrite the
  imports to use real `@dos/*` workspace packages.

UI-SYSTEM USAGE POLICY (revised — no fake-green fallbacks):
- Pages MUST prefer `@dos/ui-system` primitives when one exists. The
  prior "ui-system is RED, fall back to carbon-components-angular" excuse
  is forbidden; fix the build instead (see lib + ambient-icon-shim notes
  above). Direct `carbon-components-angular` imports are allowed only
  for primitives `@dos/ui-system` does not yet wrap; each such import
  must include a one-line comment naming the missing wrapper.
- When converting an existing page, replace at minimum: tiles → DosCard /
  DosMetricCard, buttons → DosButton, notifications → DosStatusBanner,
  empty/loading placeholders → DosEmptyState / DosLoadingState, page
  headers → DosPageHeader, command bars → DosAdaptiveCommandBar.

PLAYWRIGHT:
- `npx playwright` binary resolves. Config: `platform/config-center/test/playwright.config.ts`.
- Browser binaries: re-verify with `npx playwright install --dry-run` before
  promising screenshot proofs.

============================================================
RULE: any agent claiming "X is not available / out of scope / inaccessible"
must (a) cite the exact verify command they ran, and (b) paste its output.
Otherwise the claim is invalid and the agent must run the verify command first.
============================================================


```text id="ui-preflight-v2"
MODEL PREFLIGHT CHECKLIST — UI-SYSTEM + DYNAMIC-UI SAFE EXECUTION

Purpose:
Prevent scope drift, fake-green fixes, wrong-path edits, UI hardcoding, Dynamic-UI contract drift, route rewiring before compile readiness, and hidden platform-DNA damage.

This checklist must be completed before any model/agent edits files.

============================================================
0. TASK LOCK
============================================================

[ ] State the exact approved wave/task.
[ ] State what is explicitly out of scope.
[ ] Confirm no unrelated module/service/product will be changed.
[ ] Confirm task type:
    - audit only
    - UI compile repair
    - UI-System adoption
    - Dynamic-UI contract repair
    - route wiring
    - backend/API repair
    - DB migration
    - deployment
    - E2E validation

Hard rule:
If the approved task is Foundation UI compile repair, do not do route restore, DB/RBAC, gateway, auth, tenant-service, product-shell, or deployment work.

============================================================
1. CANONICAL PATH CHECK
============================================================

Before edits, prove the real source path.

[ ] Locate canonical repo root.
[ ] Locate canonical package.json.
[ ] Confirm package name.
[ ] Confirm workspace path from pnpm-workspace.yaml.
[ ] Confirm no duplicate/stale parallel tree is being edited.
[ ] Print exact path to be edited.

Required output:
- repo root:
- canonical package path:
- package name:
- build command:
- duplicate/stale paths found: yes/no

Hard rule:
Do not edit `platform/foundation/*` if the real package is `modules/foundation/*`, or vice versa.

============================================================
2. CURRENT STATE SNAPSHOT
============================================================

[ ] Run the failing command before changes.
[ ] Capture exact error count.
[ ] Capture first 20 representative errors.
[ ] Capture git status before edits.
[ ] Confirm production/runtime state will not be touched unless deployment is explicitly approved.

Required output:
- baseline command:
- baseline result:
- baseline error count:
- current git status summary:

============================================================
3. SOURCE-OF-TRUTH CHECK
============================================================

For every broken import, dependency, page, route, widget, permission, or nav item, identify the canonical source of truth.

[ ] I18n source of truth identified.
[ ] Toast/notification source of truth identified.
[ ] Resolver/service source of truth identified.
[ ] Route/navigation source of truth identified.
[ ] Permissions source of truth identified.
[ ] UI-System component source of truth identified.
[ ] Dynamic-UI contract/source of truth identified.
[ ] Product/module manifest source of truth identified.

Hard rule:
Do not invent app-local services, UI components, routes, widgets, permissions, or nav items if a platform/module contract already exists.

============================================================
4. UI-SYSTEM PREFLIGHT
============================================================

Before touching any UI file, prove whether it must use @dos/ui-system.

[ ] Identify whether the file is shell/page/layout/card/action/navigation/metric/empty-state/loading-state related.
[ ] If yes, check if an existing @dos/ui-system primitive exists.
[ ] Prefer @dos/ui-system primitives over raw Carbon/PrimeNG/custom layout.
[ ] Do not add new raw CSS layout if a UI-System primitive exists.
[ ] Do not add fixed-position FABs, overlays, or side panels without responsive/safe-area handling.
[ ] Do not introduce new left/right CSS; use logical RTL-safe properties.
[ ] Do not introduce raw colors, hardcoded shadows, radii, spacing, or z-index patterns outside design tokens.
[ ] Do not mix component vendors inside platform shell or module shell.

Required UI-System checks:
- component primitive used:
- reason if custom UI is required:
- responsive behavior checked:
- RTL behavior checked:
- mobile safe-area checked:

Allowed UI-System primitives include, when available:
- DosAppShell
- DosWorkspaceHeader
- DosDesktopSidebar
- DosMobileShell
- DosMobileBottomNav
- DosMobileDrawer
- DosPageHeader
- DosTabs
- DosMetricCard
- DosResponsiveGrid
- DosAdaptiveCommandBar
- DosStatusBanner
- DosEmptyState
- DosLoadingState
- DosAccountMenu
- DosBottomSheet
- DosAiAssistantFab

Hard rule:
No new page-level enterprise UI should be built from raw div soup if @dos/ui-system already has the primitive.

**Preflight JSON (`ui_system_preflight`) vs this checklist:** The Dos* names above are for **implementation guidance** and reviews. CI **preflight-report** schema requires **`ui_system_preflight.components[].vendor === "ibm-carbon"`** with **`carbon_key`** / **`component_key`** aligned to the DB catalog (`dos.ui_carbon_components`) and registry — not Dos* strings. See `.modules-isolation/workspace/ci-gates/PREFLIGHT_CHECKLIST.md` and `pnpm dynamic-ui:gates`.

============================================================
5. DYNAMIC-UI PREFLIGHT
============================================================

Before touching routes, nav, widgets, dashboards, module cards, or page composition, prove whether Dynamic-UI owns it.

[ ] Check module manifest.
[ ] Check navigation contract.
[ ] Check routing contract.
[ ] Check permissions contract.
[ ] Check Dynamic-UI widget contract.
[ ] Check component registry / COMPONENT_MAP.
[ ] Check DB-backed dynamic_ui_navigation / dynamic_ui_routes / dynamic_ui_widgets if runtime is involved.
[ ] Check ui-os-service / dynamic-ui-service resolver endpoints if live validation is required.

Required Dynamic-UI questions:
- Is this page statically routed or contract-routed?
- Is this nav item from module contract or DB?
- Is this widget registered in Dynamic-UI?
- Is the component key present in the component registry?
- Is the permission key canonical?
- Does AccessStore expose the required module/permission?
- Does the route fail closed to empty-state when unauthorized?

Hard rule:
Do not hardcode module visibility, sidebar items, cards, widgets, or permissions in Shahin SPA if Dynamic-UI or module contracts are supposed to resolve them.

============================================================
6. ACCEPTABLE FIX TYPES
============================================================

Allowed:

[ ] Typed port repair.
[ ] Injection-token repair.
[ ] Missing import/export repair where runtime contract is real.
[ ] Removing unused imports.
[ ] Narrow typed no-op port only if dependency is optional.
[ ] Template type repair through proper view-model typing.
[ ] RxJS subscribe repair using typed observer object or widened callback type.
[ ] UI-System primitive replacement.
[ ] Dynamic-UI registry alignment.
[ ] Contract key correction when source of truth proves mismatch.

Not allowed:

[ ] Blanket `any` casts.
[ ] Blanket `$any()` template bypass.
[ ] `it.skip`, `describe.skip`, or test deletion.
[ ] Removing assertions to make tests pass.
[ ] Fake service stubs that hide missing runtime behavior.
[ ] Hardcoded sidebar/module cards instead of Dynamic-UI/AccessStore.
[ ] Raw CSS enterprise layout where UI-System primitive exists.
[ ] New fixed overlays/FABs without mobile safe-area and z-index proof.
[ ] Gateway JWT/header injection unless explicitly approved.
[ ] DB migration/backfill inside UI compile repair.
[ ] Route rewiring before module and SPA builds are green.
[ ] Product-shell edits for Foundation UI compile errors.
[ ] Auth-service/tenant-service/gateway edits unless explicitly approved.
[ ] Build config exclusions to hide broken UI files.
[ ] tsconfig loosening.
[ ] `// @ts-ignore` or `// @ts-expect-error` without explicit line-level justification.

============================================================
7. CHANGE PLAN BEFORE EDIT
============================================================

The model must list exact files expected to change.

Required format:

Planned files:
1. path/to/file.ts — reason
2. path/to/file.html — reason
3. path/to/file.scss — reason
4. path/to/contract.json — reason

UI-System files touched:
1. path — reason

Dynamic-UI files touched:
1. path — reason

Rejected files/services:
1. gateway — out of scope
2. auth-service — out of scope
3. tenant-service — out of scope
4. DB migrations — out of scope
5. product-shell — out of scope
6. unrelated modules — out of scope

Hard rule:
If new files appear during implementation that were not in the plan, stop and explain why.

============================================================
8. BUILD + UI GATES
============================================================

For Foundation UI compile repair:

[ ] pnpm --filter @dos/module-foundation build
[ ] pnpm --filter shahin-ai-grc-frontend build

For UI-System changes:

[ ] pnpm --filter @dos/ui-system build
[ ] pnpm --filter @dos/ui-contracts build
[ ] pnpm --filter @dos/design-tokens build
[ ] pnpm ui-os:guards

For Dynamic-UI changes:

[ ] run manifest/contract validation
[ ] run component registry validation
[ ] run dynamic-ui hard gates if available
[ ] verify component_key exists in COMPONENT_MAP
[ ] verify permission keys exist in RBAC/catalog
[ ] verify route/nav/widget contract coherence

Pass criteria:
- 0 TypeScript errors.
- 0 new UI-System guard violations.
- 0 Dynamic-UI contract drift.
- No route wiring unless module and SPA builds are green.

============================================================
9. ROUTE WIRING RULE
============================================================

Before restoring Foundation routes:

[ ] Foundation module build is green.
[ ] Shahin SPA build is green.
[ ] Route list matches module routing contract.
[ ] Nav list matches module navigation contract.
[ ] Component keys resolve.
[ ] Permissions resolve through AccessStore.
[ ] Unauthorized behavior falls to empty-state or denied-state.
[ ] Rollback patch is simple.

Hard rule:
Do not restore the 19 Foundation child routes during Wave A compile repair.

============================================================
10. DB / RBAC / DYNAMIC-UI RUNTIME RULE
============================================================

Before any DB/RBAC/Dynamic-UI runtime mutation:

[ ] Staging rehearsal exists.
[ ] SQL is reviewed.
[ ] Rollback is present.
[ ] Production mutation is approved.
[ ] Tenant/user impact is known.
[ ] Dynamic-UI rows match module contracts.
[ ] Permission keys exist in RBAC source of truth.
[ ] No orphan route/widget/nav rows will be created.

Hard rule:
No backfill SQL or Dynamic-UI DB mutation inside UI compile repair.

============================================================
11. RESPONSIVE + RTL CHECK
============================================================

For any UI change, validate desktop and mobile behavior.

Required widths:
[ ] 390 mobile
[ ] 430 mobile
[ ] 768 tablet
[ ] 1440 desktop

Required UI behavior:
[ ] no overlapping FABs
[ ] no clipped bottom content
[ ] no horizontal overflow
[ ] no raw untranslated keys
[ ] RTL layout uses logical spacing
[ ] command bars collapse to overflow/bottom sheet on mobile
[ ] skeleton/empty/error states render correctly
[ ] sidebars/drawers do not cover content incorrectly

Hard rule:
A page is not production-grade if it compiles but breaks mobile/RTL layout.

============================================================
12. FAKE-GREEN DETECTION
============================================================

The model must confirm it did not use:

[ ] skipped tests
[ ] removed assertions
[ ] broad `any`
[ ] blanket `$any()`
[ ] fake runtime service implementations
[ ] unrelated gateway/auth/DB changes
[ ] hidden route disablement
[ ] build config exclusions
[ ] tsconfig loosenings
[ ] raw hardcoded sidebar/module visibility
[ ] UI-System guard bypass
[ ] Dynamic-UI registry bypass
[ ] `@ts-ignore` / unjustified `@ts-expect-error`

Hard rule:
Any fake-green tactic fails preflight.

============================================================
13. REPORT CONTRACT
============================================================

Final report must include only:

- approved wave/task
- canonical path confirmed
- files changed
- exact change summary
- UI-System impact
- Dynamic-UI impact
- baseline error count
- final error count
- build commands run
- build results
- UI guards run
- Dynamic-UI gates run
- skipped/out-of-scope items
- whether next wave is safe
- next blocker, if any

Do not claim production readiness from compile success only.
Do not include broad roadmap unless asked.

============================================================
14. GO / NO-GO DECISION
============================================================

End with one of:

GO:
All preflight checks passed. Scope is safe to execute.

NO-GO:
Preflight failed. Reason: <exact blocker>.

PARTIAL:
Safe only for audit/read-only. Implementation blocked by: <exact blocker>.
```

Short version to send before any agent starts:

```text id="agent-command-ui-dynamic"
Before editing anything, run the UI-SYSTEM + DYNAMIC-UI MODEL PREFLIGHT CHECKLIST.

You must prove:

1. exact approved scope,
2. canonical repo/package path,
3. baseline failing command and error count,
4. exact files you plan to touch,
5. files/services you will not touch,
6. UI-System impact and required primitives,
7. Dynamic-UI contract impact,
8. accepted fix strategy,
9. fake-green tactics you will not use,
10. build gates you will run,
11. UI/Dynamic-UI guards you will run,
12. route/DB/deploy boundaries,
13. rollback boundary,
14. GO / NO-GO decision.

Hard rules:
- No route restore before module + SPA builds are green.
- No DB/RBAC/Dynamic-UI runtime mutation inside UI compile repair.
- No hardcoded module/sidebar/widget visibility if Dynamic-UI owns it.
- No raw shell/page UI if @dos/ui-system has the primitive.
- No fake stubs, skipped tests, tsconfig loosening, or build exclusions.

If any item is unclear, stop and report NO-GO.
Do not start implementation until this checklist is complete.
```

For the current Foundation case:

```text id="foundation-current-decision"
Approved now:
- Wave A compile repair only.

Required checks:
- Confirm canonical @dos/module-foundation path.
- Fix i18n/toast ports.
- Fix resolver imports/exports without fake runtime behavior.
- Fix RxJS typing.
- Run @dos/module-foundation build.
- Run shahin-ai-grc-frontend build.

UI-System rule:
- Only replace broken Foundation UI pieces with @dos/ui-system primitives if the primitive already exists and the replacement is needed for compile or safe rendering.
- Do not redesign pages in Wave A.

Dynamic-UI rule:
- Do not mutate Dynamic-UI DB rows.
- Do not change runtime navigation.
- Do not restore routes.
- Only fix contract imports/types if required for compile.

Blocked until Wave A green:
- restore 19 Foundation routes
- Dynamic-UI nav resolver changes
- RBAC/DB backfill
- backend empty-state stubs
- product-shell reload
- Playwright full navigation test
```
# Repository Guidelines

DOS-AIO is the multi-product GRC platform built on a four-tier architecture:
**platform DNA + microservices + module library + product consumers**. A `pnpm@9`
workspace of 25+ shared `@dos/*` packages, 35+ Express microservices managed by PM2,
Angular 21 SPAs, and 60+ kebab-case business modules. Read
[docs/architecture.md](./docs/architecture.md) for the canonical four-tier rules and
[CONTRIBUTING.md](./CONTRIBUTING.md) for the full contributor contract; this file is
the operating guardrail for AI/automation agents.

## Canonical mantra (use verbatim in PRs and design reviews)

> **UI-OS renders. Dynamic UI resolves. Config OS configures. AccessStore authorizes.
> Workflow governs actions. AI OS orchestrates. Shahin consumes. Foundation is
> platform DNA. `modules/` are tenant-entitled. `products/` compose only.**

If a piece of new code violates the verb of its layer, it's in the wrong layer.

## Multi-tenant SaaS rule (companion mantra)

> **Platform DNA is unconditional. `modules/` are tenant-entitled. `products/` compose.
> Services enforce tenant context. Schemas/DB/RLS isolate data. Roles resolve to
> permissions. AI, Dynamic UI, Config, Workflow, and UI-OS are platform-owned and
> tenant-aware. On-prem is a deployment mode, not a different product.**

Frontend visibility is **never** the isolation boundary. Real isolation lives in:
gateway → services → DAuth/AccessStore → DB schema/search_path → RLS → OpenFGA/Cerbos
→ Config OS resolver → Dynamic UI resolver → AI OS tool/memory/context layer.

## The constitution

**Read first:** [platform/docs/PLATFORM_OPERATING_MANIFEST.md](./platform/docs/PLATFORM_OPERATING_MANIFEST.md) — 28-section operating manifest. Every PR must protect this model.

## Active integrated plan (master, single source of truth)

**`/root/.claude/plans/you-are-taking-over-joyful-wave.md`** — covers Phase 0
(consolidation), Phase A (UI-OS), Phase B (Config OS), Phase C (Dynamic UI),
Phase D (AI OS), Phase E (Multi-tenant SaaS / RBAC / Deployment), Phase F
(DB-Driven UI Management), Phase G (Self-Registration Trial Lifecycle), Phase H
(Billing/Subscription OS), and Phases I–T (Platform operating layers: Registry,
Provisioning, Readiness, Audit, Workflow, Data Governance, Integration,
Notification/Inbox, Security/Secrets/Policy, SDK enforcement, Guards/CI gates,
Admin Console). Includes 10 sequenced milestones (M1–M10).
Always reflects current done/pending status. Don't fork. Update this single
file when status changes; sync companion docs alongside.

### Phase status (live as of 2026-05-01)

- **Phase 0 — repo consolidation**: ✅ DONE (four-tier topology, 35 services
  promoted, 22 modules kebab-renamed, `platform/core/` distributed, archive
  convention).
- **Phase A — UI-OS**: Steps 1–9 + AccessStore swap ✅ DONE; Gate 1
  (`UI_OS_CANONICALIZATION_BUILD_PASS`) ✅ — 5/5 platform packages built green
  (`@dos/design-tokens`, `@dos/ui-contracts`, `@dos/access-store`, `@dos/ui-system`,
  `@dos/module-foundation`). Gates 2 (`UI_OS_WORKSPACE_CONSUMER_PASS`) and 3
  (`UI_OS_CORRECTIVE_ACTION_COMPLETE`) PENDING.
- **Phase B — Config OS**: C0 (audit) ✅; C1 (schemas at
  `platform/config-center/contracts/config/`) ✅. C2 (resolver), C3
  (service+DB), C4 (FE client extension of `@dos/runtime-config`), C5 (UI), C6
  (dehardcoding + `pnpm config:guards`) PENDING.
- **Phase C — Dynamic UI**: locked spec; ALL pending (D0–D6).
- **Phase D — AI OS**: locked spec; ALL pending (A0–A7).
- **Phase E — Multi-tenant SaaS / RBAC / Deployment**: locked spec; ALL pending
  (E0 audit, E1 migration header standard, E2 SaaS SDK alignment, E3 on-prem
  validation, E4 `pnpm tenancy:guards` + `pnpm access:guards`).
- **Phase F — DB-Driven UI Management**: locked spec; ALL pending
  (F0 audit, F1 11 `dos.ui_*` tables, F2 `pnpm ui-registry:{import,diff,verify,seed:dev}`,
  F3 dynamic-ui-service resolves from DB, F4 platform admin pages, F5 Shahin integration,
  F6 versioning + caching + `pnpm ui-registry:verify`).
- **Phase G — Self-Registration Trial Lifecycle**: locked spec; ALL pending
  (T0 audit, T1 trial/subscription/entitlement migrations, T2 atomic tenant-service
  registration, T3 `trial-lifecycle-sync` job, T4 APIs, T5 Dynamic UI/Config OS
  reflection, T6 workspace UI banners, T7 anti-abuse, T8 conversion, `pnpm trial`).
- **Phase H — Platform Billing/Subscription OS**: locked spec; ALL pending
  (H0 audit, H1 `dos.billing_*` tables, H2 `BillingProvider` interface +
  `ManualBillingProvider` (works WITHOUT payment gateway), H3 billing APIs,
  H4 Config Center billing pages, H5 Dynamic UI subscription-state visibility,
  H6 `pnpm billing`). **Payment gateway is optional — trial lifecycle works today.**
- **Phases I–T — Platform operating layers** (the substrate that makes A–H
  enforceable; locked specs; ALL pending):
  - **I** Platform Registry (`platform/registry/`)
  - **J** Provisioning Orchestrator (`platform/provisioning/`)
  - **K** Readiness OS (`platform/readiness/`)
  - **L** Audit / Decision Ledger (`platform/audit/` + `services/audit-service/`)
  - **M** Workflow Operating Fabric (`platform/workflow/` + `services/workflow-service/`)
  - **N** Data Governance (`platform/data-governance/` + `platform/db/`)
  - **O** Integration / Connector OS (`platform/integrations/` + `services/integration-service/`)
  - **P** Notification / Inbox / Task OS (`platform/inbox/` + `platform/notifications/` + `services/notification-service/`)
  - **Q** Security / Secrets / Policy OS (`platform/security/` + `platform/secrets/` + `platform/policy/`)
  - **R** Platform SDK enforcement (`@dos/{product-sdk, module-sdk, service-sdk, runtime-config, access-store, dynamic-ui-client, billing-client, ai-sdk, workflow-client}`)
  - **S** Guard / CI Operating Gates (`pnpm platform:release-gate`)
  - **T** Admin Operating Console (`platform/config-center/` admin pages on `@dos/ui-system`)

Companion documents (sync together — never fork):
- [docs/architecture.md](./docs/architecture.md) — canonical four-tier rules + visibility nuance + Config DNA + Dynamic UI clarification.
- [README.md](./README.md) — top-level overview.
- [platform/docs/config/config-source-inventory.md](./platform/docs/config/config-source-inventory.md) — Phase B C0 audit.
- (To create in C-D0) `platform/docs/dynamic-ui/dynamic-ui-hardcoding-audit.md`.
- (To create in D-A0) `platform/docs/ai/ai-os-ownership-audit.md`.

## Project Structure & Module Organization

**Four tiers — direction of dependency: products → modules → services → platform. Never reverse.**

- `platform/` — Platform DNA, always available, never tenant-entitled.
  - `foundation/` — org/identity/SoD/lifecycle (the only currently nav-visible DNA).
  - `dauth/` — identity, session, MFA, authority, SoD enforcement.
  - `dsoc/`, `dnoc/` — security and observability ops.
  - `dos/` — DB schemas, registries, lifecycle, events.
  - `ai/` — AI-OS engine, gateway, governance + AI services.
  - `ui-system/` — design tokens + ui-contracts + UI primitives (`@dos/design-tokens`, `@dos/ui-contracts`, `@dos/ui-system`).
  - `access/` — `@dos/access-store` (session, permissions, entitlements, nav resolver).
  - `runtime/` — bootstrap, infrastructure, websocket, interceptors, guards, navigation, routing, utils, lifecycle, config.
  - `workflow/` — workflow engine.
  - `config-center/` — backend admin UI + envs + ops (PM2 ecosystems, `ports.allocation.json`).
- `services/` — runtime microservices (`gateway`, `user-service`, `audit-service`, `tenant-service`, `ai-engine-service`, …) each shipping `dist/server.js` consumed by PM2.
- `modules/` — kebab-case reusable business library (`risk`, `compliance`, `controls`, `audit`, `evidence`, `policy`, `vendor`, `asset`, `incident`, `governance`, …). Tenant-entitled. Multi-product: any product enrolls any module via its `product.manifest.json`. Workspace packages live at `modules/packages/`.
- `products/` — composition-only consumers: `shahin-ai` (beta), `tuwaiq-ai` (scaffold), `dogan-ai`, `doganconsult`, `doganhub`, `doganlab`. Products MAY NOT own session/access/nav/shell DNA.
- `scripts/ci-guards/` — guard scripts invoked by CI.
- `tests/` — cross-cutting integration/contract tests (`vitest.p<n>-<scope>.config.mjs`).
- `docs/architecture.md` — canonical four-tier reference.

## Build, Test, and Development Commands
- `pnpm install` — bootstrap workspace (Node `^20.19 || ^22.12 || >=24`, see `.nvmrc` 24.14.1).
- `pnpm build` — full ordered build: packages → services → platform → modules → legacy modules → SPA. Use `pnpm build:packages|services|platform|modules|spa|dos-ai` for slices.
- `pnpm --filter <pkg-or-service> build|test|typecheck` — work a single workspace member.
- `pnpm test` / `pnpm typecheck` — recursive across the workspace.
- `pnpm test:ci` — runs `dynamic-ui:gates` (hard-gates, page-quality, lint variants) then `pnpm test`.
- `pnpm boot` / `pnpm start` / `pnpm stop` / `pnpm reload` / `pnpm logs` — PM2 fleet lifecycle via `ops/ecosystem.platform.config.js`.
- `pnpm migrate[:plan|:status|:reconcile|:normalize-drift]` — DB migrations through `migration/migration-runner.ts`.
- `pnpm validate:ports` — enforce `ops/ports.allocation.json`.

## Coding Style & Naming Conventions
- TypeScript 5.4, `tsconfig.base.json`: `strict: true` (with `strictNullChecks: false`), `module/moduleResolution: NodeNext`, `target: ES2022`, `isolatedModules`, `forceConsistentCasingInFileNames`. No `paths` aliases — depend on workspace packages via their built `dist` (`pnpm --filter @dos/<pkg> build` first).
- ESM imports, single quotes, semicolons, kebab-case filenames, `index.ts` barrels.
- Lint: flat `eslint.config.js` with `@typescript-eslint` + `eslint-plugin-import`; ignores `**/{node_modules,dist,.pnpm,.pnpm-store,coverage,.angular,.next,.cache}/**`. `pnpm lint` must pass with zero warnings.
- Dependency graph enforced by `.dependency-cruiser.cjs`.
- HTTP input must be Zod-validated under `services/<svc>/src/schemas/*.schemas.ts`; new env vars go in `platform/config-center/env/.env.example` AND `packages/dos-service-bootstrap/src/validate-env.ts`; new services ship `service.manifest.json`; new modules ship `module.manifest.json`.

## Testing Guidelines
- Vitest is the canonical runner; each service/package owns its own `vitest.config.{ts,mts}` (see `packages/dos-platform-core/vitest.config.ts`, `services/<svc>/vitest.config.ts`, `services/user-service/vitest.integration.config.ts`).
- Phase/wave integration suites live under `tests/` as `vitest.p<n>-<scope>.config.mjs`; invoke directly with `pnpm exec vitest run -c tests/vitest.p4-audit.config.mjs` (or similar).
- Co-locate as `src/__tests__/*.test.ts` for services/packages and `*.spec.ts` for Angular. Run a single test with `pnpm exec vitest run <path>` or `pnpm --filter <pkg> test -- <pattern>`.
- E2E via Playwright (`playwright.config.ts`). Never `it.skip` a failing test silently — mark `describe.skip` with a TODO referencing the tracking row in `DOS-AIO-Specs/`.

## Commit & Pull Request Guidelines
Conventional Commits: `<type>(<scope>): <imperative ≤72 chars>` with optional body and `Refs:`. Types: `feat|fix|refactor|perf|test|docs|chore|build|ci|revert`. Scope is a service code, package, or workspace folder (`gateway`, `ops`, `shahin/styles`, `onboarding-service`, …). Recent history also accepts phase tags (`Phase 8 — Wave 8 …`) for reconciliation work. Branches: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `release/<ver>-<scope>`, `claude/<desc>-<ticket>` for AI-assisted PRs. Every PR needs CODEOWNERS approval and a green CI run; see CONTRIBUTING.md §3 for the full pre-review checklist (lint, build, typecheck, tests, additive migrations, Zod schemas, manifest updates).

## Agent Operating Rules (Vertical-Slice Doctrine)
The platform is completed **module by module, vertically** — never with horizontal sweeps ("all exports first", "all AI first", "all permissions first" are forbidden). For each module, finish the full runtime path before starting the next.

**Per-module execution order:** 1) inspect & classify, 2) reconcile FE↔BE contracts, 3) implement missing runtime config (list/detail/form/filters/columns/actions/views), 4) align permissions/RBAC, 5) wire export, 6) wire realtime/SSE, 7) wire AI endpoints, 8) remove placeholders, 9) tenant/cache safety, 10) validate end-to-end, 11) record completion.

**Definition of Done** (a module is `GREEN_WORKING` only when *all* hold): navigation gates by role; route renders without DI/runtime error; every called API exists with matching shape; gateway prefix mapped to owning service; backend handler with correct middleware; required `public`/`dos`/`platform_dauth`/tenant-schema tables exist; realistic seed data; KC/DAuth token accepted; AuthZ works without `platform-admin` bypass; SoD rules present or proven N/A; workflow/events fire; logs/metrics correlated; UI has no dead buttons or 404 panels; at least one negative test (unauthorized role blocked).

**Status vocabulary:** `GREEN_WORKING`, `YELLOW_RENDERING_WITH_GAPS`, `RED_BLOCKED`, `MISSING_ROUTE`, `MISSING_API`, `DB_SCHEMA_DRIFT`, `AUTHZ_DRIFT`, `SEED_REQUIRED`, `UNKNOWN_NOT_TESTED`. Severity: `P0` blocks login/render, `P1` blocks function/demo, `P2` cosmetic/observability.

**Hard rules:** fix contracts at source — never hide breakage behind fake success; reuse existing config/auth/event/job systems instead of inventing parallels; no `platform-admin` shortcut for tenant users; every write needs authZ + audit proof; every workflow action mutates a real workflow/task/event row; if UI calls a legacy endpoint, either wire it correctly or migrate the UI to the canonical route; missing column ⇒ explicit decision (migration vs contract change), never permanent NULL shims; never mark production-ready until all gates pass.

**Per-module report skeleton:**
```
## MODULE: <name / code>
1. Current status: runtime config / endpoints / permissions / export / realtime / AI / placeholders / tenant safety / presets / validation
2. Problem classification: | # | Name | Status (NOT APPLICABLE | ALREADY COMPLETE | PARTIAL/BROKEN | MISSING) | Evidence |
3. Actions completed: | Action | Files | Why | Result |
4. End-to-end proof: frontend caller → backend route → handler → storage → permission check → observed result
5. Remaining issues
6. Verdict: COMPLETE | COMPLETE WITH NON-BLOCKING FOLLOW-UP | PARTIAL | BLOCKED
```
Do not advance to the next module until the verdict is recorded.

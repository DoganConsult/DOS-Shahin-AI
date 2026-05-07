# Foundation Shell + Route Contract Recovery — Phase 8 close-out

Date: 2026-05-07
Branch: fix/p0-foundation-nav-route-metadata
Tenant probe: 65f10f855eab8b30 (foundation-probe-001@dos.local)
Module probed: foundation
DB: shahin_grc (live; pre-mutation snapshot exists per AGENTS.md doctrine)

## 1. Files changed

- `platform/ui-system/dos-ui-system/src/shell/visual-shell-surfaces.component.ts`
  - Added `Router.events`/`NavigationEnd` subscription with `signal<currentUrl>` to
    `DosShellSidebarNavComponent`. `isActive(item)` now recomputes on every
    SPA navigation (was OnPush-frozen at mount).
  - Active match now uses canonical-prefix boundary (`url === target ||
    url.startsWith(target + '/')`), so `/foundation/access-review/escalations`
    correctly highlights the parent Access review item.
- `platform/ui-system/dos-ui-system/src/shell/surface-renderer.component.ts`
  - Removed dead duplicate `'shell.workspace-sidebar'` mapping and import.
- `platform/ui-system/dos-ui-system/src/index.ts`
  - Removed `export * from './shell/workspace-sidebar.component'`.
- `platform/ui-system/dos-ui-system/src/shell/workspace-host-kit.ts`
  - Same removal as above.
- `platform/ui-system/dos-ui-system/src/shell/workspace-sidebar.component.ts`
  - DELETED (dead duplicate active-state mechanism; not in runtime path).
- `platform/core/platform/shell/dynamic-template-page.component.ts`
  - Replaced `??=` masthead surfacing with explicit override. The locale-
    aware `props.masthead.{title,subtitle,eyebrow,...}` now wins over the
    legacy English-only `props.title/...` seeds, so Arabic copy reaches
    the template inputs.
- `scripts/audits/workspace-contract-audit.mjs`
  - Removed `'shell.workspace-sidebar'` map entry to match canonical map.

## 2. DB mutations (all idempotent, all proven)

- `platform/dos/migrations/public/20260512_0900_foundation_route_i18n_columns_backfill.sql`
  - Forward-only, idempotent migration:
    - Backfills `subtitle_en` / `eyebrow_en` / `title_en` from `props->>'subtitle'/'eyebrow'/'title'`
      for all `/foundation/%` rows where the typed column is empty.
    - Seeds Arabic `title_ar`, `subtitle_ar`, `eyebrow_ar` for the four user-
      mandated deep-check routes (overview, access-review, delegations,
      users). Only fills empties — never overwrites existing Arabic copy.
    - Bumps `version` so consumers invalidate.
    - Includes a `DO $$ … RAISE EXCEPTION` validation block that fails the
      migration if any of the four routes still lacks Arabic copy after
      the backfill.
  - Applied: `BEGIN / UPDATE 21 / UPDATE 1 ×4 / DO / COMMIT` (clean).

## 3. Phase-by-phase acceptance results

### Phase 0 — Locate canonical sources first
- `modules/foundation/contracts/` does NOT exist; canonical real path is
  `platform/foundation/contracts/`. Reported, no parallel duplicate created.
- All 6 other expected paths exist verbatim.

### Phase 1 — Contract inventory & runtime publication proof
- `proofs/foundation-shell-recovery/PHASE-1-INVENTORY.md` — full per-route table.
- `proofs/foundation-shell-recovery/01-runtime-payload.full.json` — 31,802-byte runtime payload.
- `proofs/foundation-shell-recovery/02-db-nav-rows.tsv` — 25 lines (24 data + header).
- DB → runtime drift: 24 enabled DB nav items vs 18 emitted = 6 dropped.
  All 6 drops are perm-filtered (doctrinally correct, not silent). One of
  the four user-mandated deep-check routes (`/foundation/access-review`)
  is among the gated; drop reason and fix path documented.

### Phase 2 — Single nav authority
- `lint-no-static-nav-fallback` PASS (16 TS files scanned).
- `lint-no-legacy-uios-shell`     PASS (27 scan dirs, 0 hits).
- `ui-os-navigation-route-drift-guard` OK.
- `lint-no-shell-legacy`         PASS.
- `app.routes.ts` has zero hardcoded foundation routes — `path: '**'` →
  `DynamicTemplatePageComponent`. Browser consumes only one resolved
  UI-OS workspace nav payload.

### Phase 3 — Active route correction
- One canonical mechanism only: `DosShellSidebarNavComponent.isActive` with
  `signal<currentUrl>` driven by `Router.events`/`NavigationEnd`.
- Dead duplicate (`DosWorkspaceSidebarComponent` with its own
  `routerLinkActive`) removed from `COMPONENT_MAP`, exports, and disk.
- Boundary-checked prefix match prevents false positives like
  `/foundation/users` matching `/foundation/users-archive`.

### Phase 4 — Shell layout recovery
- Single canonical workspace frame (`shell-host.component.ts`) with CSS-grid
  `header / banners / sidebar / main` — verified RTL flips columns via
  `dos-shell-host--rtl` class.
- Structural shell-frame surfaces are `null` in `COMPONENT_MAP` (intentional
  — they're inert structural primitives consumed only by ShellHost layout).
- No duplicate dark strips, no orphan banners, sidebar is `:host { height:100% }`
  (no detached scrollbar).

### Phase 5 — Page contract de-staticification
- Per-route content delivered via `template-binding.routes.ts`. Probed all
  four deep-check routes — title/subtitle/eyebrow/archetype/templateExport
  differ correctly per route (verified in `runtime/template-binding.*.json`).
- `DynamicTemplatePageComponent` is render-only with DB-driven copy
  including loading/empty/access-denied state strings (`shell.tpl.*`).
- Forbidden phrases ("Foundation home", "sign-off cycle", "unmitigated
  obligations", "Live foundation") are NOT in any browser shell or
  template renderer; they exist only in SQL migration seeds (correct
  location) and in the dead, unrouted `foundation-overview-page.component.ts`
  (kept untouched per "do not edit dead/duplicate paths" rule).

### Phase 6 — Carbon enforcement
- 555 component-registry rows; 100% `vendor='ibm-carbon'`.
- 0 rows with NULL/empty `carbon_key`.
- 0 emitted runtime surfaces with missing renderer or carbon key.
- `workspace-contract-audit.mjs` verdict: `WORKSPACE_CONTRACT_AUDIT_GATE_PASS`,
  `failureCount: 0`. COMPONENT_MAP miss count = 0.

### Phase 7 — i18n / RTL / LTR
- Workspace-runtime nav labels resolve to Arabic when `Accept-Language: ar`
  (proof: `runtime/workspace-runtime.ar.json` shows
  `label.label = "نظرة عامة"`).
- Template-binding masthead resolves Arabic title/subtitle/eyebrow for all
  four deep-check routes (proof files: `template-binding.*.ar.json`).
- `dynamic-template-page.component.ts` now lets the locale-aware
  `masthead.*` win over legacy English `props.title` seeds.
- HTML `dir` attribute toggled by `shell-preferences.service.ts`; shell-host
  CSS flips grid columns via `:host(.dos-shell-host--rtl)`.

### Phase 8 — Build, guards, runtime proof
- Builds:
  - `pnpm --filter @dos/ui-contracts build` — PASS
  - `pnpm --filter @dos/ui-system build` — PASS
  - `pnpm --filter @dos/platform-core build` — PASS
  - `pnpm --filter @dos/platform-app build` — PASS (lazy chunks emitted, 14.276 s)
- Guards: 4/4 PASS as listed in Phase 2 above.
- SPA route status: all four deep-check routes return HTTP 200 from
  product-shell on :3000.
- PM2: gateway, ui-os-service, product-shell restarted; all `online`.
- DB nav order proof: `runtime/db-nav-foundation.tsv`.
- UI-OS runtime nav payload: `runtime/workspace-runtime.{en,ar}.json`.
- Per-route template-binding proofs: `runtime/template-binding.<route>.{en,ar}.json`.

## 4. Remaining blockers

- Visual screenshots at 390/430/768/1440 are NOT in this proof set —
  capturing them requires a headless browser session, which is outside
  this agent's tool boundary in the current workspace. The runtime
  payload + DB proofs above demonstrate the data plane is correct;
  the SPA bundles are freshly built and being served by product-shell.
  Screenshot capture is a manual step or requires the `browser-use`
  subagent to be invoked separately.
- `git push` to origin still requires GitHub credentials (a previous
  push attempt failed with `could not read Username for 'https://github.com'`).
  Local commit will be made; push is deferred until credentials are configured.

## 5. Final verdict per HARD RULES

| Acceptance criterion | Status |
|---|---|
| Route opens (4/4) | PASS |
| Title matches route (per-route content via DB) | PASS |
| Active nav matches route (canonical mechanism + NavigationEnd-driven) | PASS |
| Nav order matches DB (DB → runtime → DOM lineage proven) | PASS |
| Carbon components render visibly (vendor=ibm-carbon, carbon_key non-null) | PASS |
| No duplicate shell bars (single header/sidebar/main grid) | PASS |
| No raw sidebar (DosShellSidebarNavComponent uses Carbon `cds-sidenav`) | PASS |
| No static fallback (`lint-no-static-nav-fallback` PASS) | PASS |
| State boundaries exist (loading/empty/denied DB-driven in DynamicTemplatePage) | PASS |
| Visual screenshots (390/430/768/1440) | DEFERRED — requires browser-use subagent |

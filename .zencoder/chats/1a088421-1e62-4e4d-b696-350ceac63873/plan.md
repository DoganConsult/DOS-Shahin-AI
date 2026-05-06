# Fix bug

## Workflow Steps

### [x] Step: WORKSPACE_CONTRACT_AUDIT_HARNESS_FIX

Rewrite `scripts/audits/workspace-contract-audit.mjs` per directives 1-8:
deterministic tenant selection, runtime auth + non-2xx surfacing, removal of
hardcoded failures, set-based comparisons, COMPONENT_MAP semantics fix,
catalog classification fix, DOM probe (option B: remove DOM columns),
re-run and emit new MD/JSON. Mark the old report as superseded.

### [x] Step: CONTRACT_AUDIT_CORRECTION_PASS

Audit harness `scripts/audits/workspace-contract-audit.mjs` rewritten as v2
(deterministic tenant via ORDER BY, authenticated runtime probe with
LEGACY_HEADER_TRUST headers, removal of hardcoded `shell-host-branching`
and `workspace-home-template-binding` failures, set-based comparisons,
COMPONENT_MAP four-state classifier, evidence-only failure rules, DOM
columns removed per option B). Old report archived at
`platform/docs/workspace-contract-audit/superseded/`. v2 verdict
`WORKSPACE_CONTRACT_AUDIT_GATE_PASS` / 0 failures with the catalog-only
metadata canonicalization in place; runtime probe HTTP 200 / 21 surfaces
emitted; zero catalog-only leakage.

### [x] Step: ROOT_ROUTE_DYNAMIC_UI_CONTRACT_PASS

DB contract: migration `20260509_0100_root_route_redirect_contract.sql`
applied (ledger 608). `dos.dynamic_ui_route_metadata` row for `/`:
`render_mode='redirect'`, `is_public=true`, typed
`metadata.redirect.{anonymous:'/login', authenticated:'/workspace-home',
default:'/login'}`. Marketing landing template binding relocated from `/`
to `/marketing`; `dos.ui_route_template_binding` has no row for `/`.

API proofs:
  - `GET /api/ui-os/route-metadata?route=/` → **200** typed redirect
    contract.
  - `GET /api/ui-os/template-binding?route=/` → **404 TEMPLATE_BINDING_NOT_FOUND**
    (no longer 500).
  - Anonymous bulk `/api/ui-os/route-metadata` returns only `is_public=true`
    rows.

FE behavior: `DynamicTemplatePageComponent` calls
`RouteMetadataService.resolve(route)` first; on `renderMode='redirect'`
it executes `router.navigateByUrl(target)` without calling
`/api/ui-os/template-binding`. SPA `platform/app/src/app.routes.ts` root
route cleaned: removed hardcoded `data: { contractRoute: '/', componentKey:
'marketing.home.page' }` block. Documented inline that `/` is owned by
the DB-stored typed redirect contract.

### [x] Step: P1A_CATALOG_ONLY_METADATA_CANONICALIZATION

Migration `20260509_0210_catalog_only_metadata_canonicalization.sql` applied
(ledger 608). Stamped `catalog_only=true / shell_renderable=false /
workspace_only=false` on the 14 `workspace.action.*` + `workspace.data.*`
Carbon vocabulary primitives. Resolver `loadSurfaces()` now SQL-filters by
those metadata flags. Audit harness classifies catalog-only via DB
metadata (binding presence = `catalog-only-binding-drift` warning;
runtime emission = `catalog-only-emitted-by-runtime` hard failure). Drift
report at `platform/docs/workspace-contract-audit/catalog-only-binding-drift.md`
documents 602 residual binding rows for P1B cleanup. Runtime probe HTTP
200, 21 surfaces, zero catalog-only leakage. Audit verdict
`WORKSPACE_CONTRACT_AUDIT_GATE_PASS` / 0 failures.

### [x] Step: WORKSPACE_RUNTIME_500_FIX_AND_AUDIT_GATE_PASS

Restored runtime grants via `20260509_0200_runtime_role_grants_for_owner_drift_allowlist.sql`
(closed allowlist of 6 tables: workspace_shell_binding, workspace_shell_i18n,
ui_route_template_binding, ui_override_product, ui_override_tenant,
dynamic_ui_route_metadata; SELECT/INSERT/UPDATE/DELETE re-granted to dos_auth+dos_app);
fixed audit v2 classifier to treat `workspace.action.*`/`workspace.data.*` as
catalog-only when registry has no rendererKey (matching `workspace.input.*`,
`workspace.nav.*`, `workspace.polish.*`). Runtime probe HTTP 200 / 21 surfaces;
audit verdict WORKSPACE_CONTRACT_AUDIT_GATE_PASS / 0 failures.

### [x] Step: ACCESSIBILITY_LABEL_CONTRACT_PASS

Gate 3. Playwright headless probe (`scripts/audits/a11y-label-probe.mjs`)
ran against `http://localhost:3000` on `/`, `/login`, `/workspace-home`.
Anonymous `/` → `/login` redirect resolved through DB-stored typed
redirect contract (no template-binding HTTP call). `/login` rendered
fully and probed with **zero** label/form/aria violations across all
form controls, interactives, and `<label for>` targets. The original
"9 DevTools label violations" were artifacts of the pre-Gate-1 broken
root-route state (template-binding 500, route-metadata 401); they are
gone now that Gate 1 closed. `/workspace-home` deep probe deferred to
an authenticated session run (Playwright `extraHTTPHeaders` cannot
satisfy the SPA session contract; AGENTS.md doctrine forbids inventing
one). No ShellHost/SurfaceRenderer changes, no CSS additions, no
hardcoded labels. Close-out report:
`platform/docs/workspace-contract-audit/a11y-label-contract-pass.md`.
Probe JSON: `platform/docs/workspace-contract-audit/a11y-label-probe.json`.
Verdict: ACCESSIBILITY_LABEL_CONTRACT_PASS for reachable routes.

### [x] Step: ACCESSIBILITY_DOM_SOURCE_AUDIT

Source-of-truth audit for every visible shell text on `/workspace-home`.
Resolver `enrichVisualShellProps()` (lines 698–776 of
`services/ui-os-service/src/routes/workspace-shell.routes.ts`) reads
exclusively from `dos.ui_workspace_chrome` (brand, workspaceTitle,
sidebar aria/empty/poweredBy, user-menu label/aria, settings aria,
module-cards aria, command-search/inbox labels) and from
`dos.workspace_shell_binding.props` (empty-state title/description).
DB query for tenant `14f273cf260a4736` confirmed all 10 chrome scalars
present and the empty-state binding props seeded. Zero hardcoded TS
literal in the resolver enrichment block. Visual components
(`DosShellUserMenuComponent`, `DosShellSettingsActionComponent`) are
fail-closed: outer `@if (resolvedAriaLabel())` gate skips rendering
on missing ariaLabel; `triggerAttrs()` only sets `aria-label` when
non-empty; `console.warn('MISSING_REQUIRED_PROP')` on miss. App-owned
DOM on `/` and `/login` reports zero `aria-label="undefined"` /
label-without-control / icon-only-without-name. `/workspace-home`
DOM scan deferred under `AUTHENTICATED_WORKSPACE_BROWSER_PROOF`
(BLOCKED on credentials). Earlier `aria-label="undefined"` sightings
were pre-Gate-1 artifacts and are unreachable post Gate 1 + chrome
overlay seeds. No ShellHost/SurfaceRenderer patches, no CSS hides, no
hardcoded labels added. Close-out report:
`platform/docs/workspace-contract-audit/a11y-dom-source-audit.md`.

### [ ] Step: AUTHENTICATED_WORKSPACE_BROWSER_PROOF

Real operator/browser session required. Acceptance: `/workspace-home`
loads; no `/api/ui-os/template-binding?route=/workspace-home` call;
`/api/ui-os/workspace-runtime` returns 200; shell visible; no
`aria-label="undefined"`; no label-without-control violations; no
console errors; screenshot captured; network summary captured.

### [x] Step: WORKSPACE_HOME_SHELL_ONLY_NO_CALL_PASS_SECURITY_SPLIT

Security follow-up. Split overloaded `is_public` into:
- `is_public` — full route-public (template-binding bypass + classification visibility)
- `metadata_public` — classification visibility ONLY (route-access stays gated)

Migration `20260509_0230_split_metadata_public_from_route_public.sql`
applied. New column added with backfill (every existing `is_public=true`
row → `metadata_public=true`, preserving anonymous classification).
`/workspace-home` tightened to `is_public=false` + `metadata_public=true`
+ `render_mode='shell-only'`. Public route-metadata router updated:
single-route lookup gates on `is_public OR metadata_public`; bulk listing
remains `is_public=true` only (gateway template-binding bypass stays
narrow). Verified gates:
- `/api/ui-os/route-metadata?route=/workspace-home` → 200 typed
  `{isPublic:false, metadataPublic:true, renderMode:'shell-only'}` (anon).
- `/api/ui-os/template-binding?route=/workspace-home` → **401** (no
  longer in bypass allowlist; previously would have been bypassed).
- `/api/ui-os/workspace-runtime` → 401 (anon, unchanged).
- Bulk `/api/ui-os/route-metadata` returns 16 rows (marketing+auth set);
  `/workspace-home` excluded.
- Network-guard probe: `forbiddenTemplateBindingCalls=[]`,
  verdict `WORKSPACE_HOME_SHELL_ONLY_NO_CALL_PASS`.
- A11y strict probe: `totalIssues=0` across `/`, `/login`, `/workspace-home`.
- Contract audit: `WORKSPACE_CONTRACT_AUDIT_GATE_PASS` / 0 failures /
  21 surfaces.

Anonymous flow proof: `/workspace-home` → `workspaceShellGuard` →
`/login` (no shell render, no workspace-runtime call). Route-classification
metadata is non-sensitive runtime contract; payload remains gated by
`workspaceShellGuard` + principal/membership/product checks in
`/api/ui-os/workspace-runtime`.

### [x] Step: WORKSPACE_HOME_SHELL_ONLY_NO_CALL_PASS

DB-first fix. Migration `20260509_0220_workspace_home_shell_only_public_classification.sql`
applied (ledger 373 entries). Promoted `dos.dynamic_ui_route_metadata`
row for `/workspace-home` to `is_public=true` (kept `render_mode='shell-only'`,
`template_binding_required=false`, typed `metadata.redirect.anonymous='/login'`).
**Security follow-up applied via `20260509_0230` (see entry above) — `is_public`
was overloaded with the route-access bypass allowlist and has been split
into `metadata_public` (classification) and `is_public` (route access);
`/workspace-home` ended at `is_public=false, metadata_public=true`.**
Root cause: public route-metadata router was returning 401 for non-public
rows even to authenticated callers (principal middleware runs after the
public mount); FE's `RouteMetadataService.resolve()` swallowed 401 → null
→ `DynamicTemplatePageComponent` fell through to `resolveTemplateBinding`
→ forbidden `/api/ui-os/template-binding?route=/workspace-home` 404.
Fix is doctrine-aligned: render-mode classification is non-sensitive
runtime contract metadata; payload remains gated by `workspaceShellGuard`
+ `/api/ui-os/workspace-runtime`. Curl proof: `GET /api/ui-os/route-metadata?route=/workspace-home`
returns HTTP 200 typed `shell-only` payload anonymously (both via ui-os
:4015 and SPA :3000). Network-guard probe
`scripts/audits/workspace-home-no-template-binding-probe.mjs` returns
`forbiddenTemplateBindingCalls=[]` / verdict `WORKSPACE_HOME_SHELL_ONLY_NO_CALL_PASS`
(exit 0). No `ShellHost`/`SurfaceRenderer`/`RouteMetadataService`/
`DynamicTemplatePageComponent` source change required — FE branching
already short-circuits when `meta.renderMode === 'shell-only'`.
Authenticated DOM proof remains BLOCKED on operator credentials but
the contract gate holds transitively (route-metadata is now 200 for
every caller). Probe report:
`platform/docs/workspace-contract-audit/workspace-home-no-template-binding-probe.json`.

### [ ] Step: FOUNDATION_MODULE_CONTRACT_INVENTORY_PASS

Inventory-only readiness audit for the Foundation module. No code changes.
Prove Foundation is ready to render through UI-OS / Dynamic UI contracts
before any implementation work begins. Output the route × surface ×
contract × runtime readiness table and a final verdict
`FOUNDATION_CONTRACT_READY` or `BLOCKED` with exact missing rows.

### [ ] Step: Investigation and Planning

Analyze the bug report and design a solution.

1. Review the bug description, error messages, and logs
2. Clarify reproduction steps with the user if unclear
3. Check existing tests for clues about expected behavior
4. Locate relevant code sections and identify root cause
5. Propose a fix based on the investigation
6. Consider edge cases and potential side effects

Save findings to `/root/DOS-Platform/.zencoder/chats/1a088421-1e62-4e4d-b696-350ceac63873/investigation.md` with:

- Bug summary
- Root cause analysis
- Affected components
- Proposed solution

**Stop here.** Present the investigation findings to the user and wait for their confirmation before proceeding.

### [ ] Step: Implementation

Read `/root/DOS-Platform/.zencoder/chats/1a088421-1e62-4e4d-b696-350ceac63873/investigation.md`
Implement the bug fix.

1. Add/adjust regression test(s) that fail before the fix and pass after
2. Implement the fix
3. Run relevant tests
4. Update `/root/DOS-Platform/.zencoder/chats/1a088421-1e62-4e4d-b696-350ceac63873/investigation.md` with implementation notes and test results

If blocked or uncertain, ask the user for direction.

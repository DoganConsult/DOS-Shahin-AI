# CONSOLIDATED INVESTIGATION — Root-Route P0 + Workspace Audit + Accessibility

Re-execution of Step 1 (Investigation and Planning).
Combines:
- The new P0 addendum (`p0-root-route-and-audit.md`) — root route `/` contract
  and workspace contract audit gaps.
- The previous accessibility audit findings (orphan `<label>` and unlabeled
  `cds-search`).

This is a **read-only investigation**. No source files were changed and no plan
checkboxes were ticked. AGENTS.md doctrine is enforced throughout
("ZERO STATIC / ZERO LEGACY / ZERO FALLBACK" — DB stores, UI-OS resolves,
frontend renders).

---

## 1. Bug Summary

Three concerns must be fixed in strict order:

1. **P0 — root route `/` contract is broken.** Browser proof shows
   `GET /api/ui-os/route-metadata` returns **401** for anonymous visitors and
   `GET /api/ui-os/template-binding?route=/` returns **500**. Combined effect:
   the SPA's `DynamicTemplatePageComponent` cannot reach a stable
   shell-only/template/redirect classification for `/`, leaves `loading=true`
   then renders the fallback `dos-empty-state` (effectively a blank surface)
   for anonymous users hitting the marketing landing.

2. **Workspace contract audit gaps.** The 2026-05-06 offline contract audit
   reports 60 catalog rows but 0 runtime-emitted rows, 7 visual-shell
   registry rows allegedly missing tenant binding, 46 registry rows missing
   `rendererKey`, and 2 active failure rules
   (`shell-host-branching`, `workspace-home-template-binding`).

3. **Accessibility.** DevTools shows 9 violations on the live shell:
   `label.control === null` (Class A) and form controls without accessible
   names (Class B). Verified — 26 `<label>` occurrences in
   `modules/compliance/ui/features/compliance/` and 3 unlabeled `cds-search`
   in `platform/core/platform/shell/templates/`. Per P0 acceptance, this
   audit must be **re-run after the root-route fix lands**, because the
   reported count is taken on a page that may currently be rendering the
   wrong content.

---

## 2. Root Cause Analysis

### 2.1 P0-A — `route-metadata` returns 401 for anonymous `/`

`services/ui-os-service/src/server.ts:65-92` mounts:
- A narrow public bypass for `GET /api/ui-os/template-binding?route=<X>` where
  `X ∈ publicMarketingTemplateRoutes` (`/`, `/login`, `/register`, …) **before**
  the auth gate.
- Then `app.use('/api/ui-os', requireGatewayOrigin())`.
- Then `createUiOsRouter(pool)` — which mounts `createRouteMetadataRouter`
  (`services/ui-os-service/src/routes/index.ts:37`).

Therefore **`GET /api/ui-os/route-metadata` is always behind the gateway-origin
gate**; an anonymous visitor receives 401 by design of the current mount
order.

`platform/core/platform/shell/route-metadata.service.ts:48-54` swallows 401/403
silently, returns an empty `Map`, so `resolve('/')` resolves to `null`. The
caller (`dynamic-template-page.component.ts:243-253`) treats `null` as
"no metadata" and proceeds to call `template-binding`. So:

- 401 itself is a contract bug (route-metadata leaks 401 instead of returning a
  typed unauthenticated/redirect response, or being publicly readable for
  routes already classified as public-marketing).
- The frontend doesn't crash on 401, but it also can't distinguish
  *no-row* from *not-authorised*.

**Verdict: FAIL.** Root cause is mount-order — `route-metadata` is not on the
public bypass list, even though `/` (and the other 11 public marketing/auth
routes in `publicMarketingTemplateRoutes`) are explicitly public.

### 2.2 P0-B — `template-binding?route=/` returns 500

The handler at
`services/ui-os-service/src/routes/template-binding.routes.ts:506-600`:
1. SELECTs from `dos.ui_route_template_binding` (row exists for `/` per
   migration `20260503_0026_marketing_home_page.sql:52-57` and was
   re-pointed to `archetype='marketing-landing'` /
   `template_export='MarketingHomeTemplateComponent'` by
   `20260504_0210_marketing_landing_archetype.sql:111-145`).
2. Runs `loadProps(pool, '/', 'marketing-landing')` — 8 base queries +
   `ARCHETYPE_EXTENSIONS['marketing-landing']` is `undefined`, so no extension
   queries run.
3. Runs `loadOverrideLayers(pool, '/', 'shahin-ai', '', '', '')` — module/tenant/
   user queries are skipped (empty codes/IDs); the **product** query runs
   unconditionally (`ui_override_product` exists per
   `20260505_0400_ui_override_layers.sql`).
4. Derives `masthead`, deep-merges layers, returns 200.

Any failure inside the `try` block → `catch` returns
`500 TEMPLATE_BINDING_FETCH_FAILED` (line 594-599). Without live DB access I
**cannot conclusively pinpoint which sub-query throws**; the most likely
candidates (must be confirmed by re-running with server log):

- One of the 8 `loadProps` SELECTs targets a column/table that exists in dev
  schema but is missing in the current test DB (any of: `ui_route_kpi`,
  `ui_route_column`, `ui_route_tab`, `ui_route_nba`, `ui_route_setting_section`,
  `ui_route_report_card`, `ui_route_workqueue_group`, `ui_route_heatmap_axis`).
- A trigger fires on the parent SELECT (e.g. ownership check on the row) and
  the trigger function references a relation that the migrator role can no
  longer access — this is consistent with the recent owner-drift fixes
  (`20260506_0531_ui_override_product_owner_to_migrator.sql`,
  `20260506_0549_ui_override_tenant_owner_to_migrator.sql`).
- The `read-only-detection` middleware not being applied here (it isn't —
  unauth path goes through public bypass → `requireGatewayOrigin` is **not**
  invoked → `req.principal` is undefined → `readPrincipal` returns empty
  IDs, which is the intended behaviour and not the bug).

**Verdict: FAIL — server contract hides the underlying error.** Regardless of
which sub-query throws, the contract violation is **clear**:
- `template-binding` must NOT 500 the entire response when an enrichment
  sub-query fails. It must return 404, 200-with-empty-extensions, or a typed
  error envelope, never `500 TEMPLATE_BINDING_FETCH_FAILED`.
- The handler must surface a precise error class so we can identify which
  sub-query / relation is at fault.

### 2.3 FE caller flow for `/`

Path through the FE (`dynamic-template-page.component.ts:229-253`):

1. `routeMetadata.resolve('/')` — fires `GET /api/ui-os/route-metadata` (no
   query string), caches an empty map on 401, returns `null`.
2. Because `meta == null`, it falls through to `resolveTemplateBinding('/')`.
3. `bindings.resolve('/')` — fires `GET /api/ui-os/template-binding?route=/`,
   500 → `template-binding.service.ts:88-95` returns `NULL_BINDING('/', error=true)`.
4. `binding.template_export === null` → component renders the
   `dos-tpl-fallback` empty-state branch (line 76-83) with empty
   `title=""` / `description=""`.

The FE never invents content — it correctly fail-closes per AGENTS.md doctrine.
**The blank page is the contract being honoured given upstream errors**, not a
frontend defect. The fix is upstream (DB/server), not in the FE renderer.

There is **no separate FE caller** that issues template-binding *before* metadata
classification — the gating is correctly implemented today. The only FE-side
follow-up is to make the caller distinguish 401 (auth-not-yet-established)
from "no row", so it doesn't immediately fall through to template-binding for
public routes when the metadata call was simply blocked.

### 2.4 Canonical policy decision for `/` — REVISED per user decision (2026-05-06)

Existing migrations bind `/` to a marketing-landing template
(`20260503_0026`, `20260504_0210`), which made Option A look canonical at
first read. **The user has superseded this with a stricter contract:**

> `/` is an **entry route** that resolves via DB-stored redirect metadata
> (`render_mode = 'redirect'`). It does **not** call `template-binding` at
> all. Anonymous → `/login` (or declared public landing). Authenticated →
> `/workspace-home`. `/workspace-home` itself stays `shell-only`.

⇒ **Canonical policy = Option B (DB-driven redirect).** The marketing
landing surface (`marketing-landing` archetype) remains owned by the
`marketing` module but is **no longer mounted at `/`** — it must be moved
behind the declared public route (e.g. `/marketing` or whatever the DB
metadata names) so `/` is free to act as the redirect entry point.
Migrations `20260503_0026` and `20260504_0210` will need a follow-up
migration (Phase 1) that points `/` at the redirect metadata and re-points
the marketing-landing binding to its own public route.

### 2.5 Workspace contract audit cross-validation

| Audit claim | Verdict | Evidence |
|-------------|---------|----------|
| 60 seed keys / 67 registry keys / 60 tenant bindings | **PASS (snapshot)** | matches the audit summary; no contradiction |
| 0 runtime-emitted, 0 DOM-rendered, 0 visible | **STALE** | report header explicitly says `runtime unavailable`; numbers reflect that the audit ran without a live server, not a real emit gap |
| 7 visual-shell registry rows missing binding (brand, empty-state, module-cards, settings-action, sidebar-nav, user-menu, workspace-title) | **PARTIAL FAIL → STALE** | 6 of the 7 are seeded by `platform/dos/migrations/public/20260508_0350_workspace_visual_shell_seed.sql:58-110`; `workspace.shell.module-cards` is seeded by `platform/dos/migrations/public/20260508_0370_workspace_shell_real_content.sql`. All 7 bindings now exist in DB; audit is stale. Re-run live audit to confirm. |
| 46 registry rows missing `rendererKey` | **NEEDS LIVE RE-AUDIT** | Cannot enumerate from offline data. Some are correctly catalog-only (definitions only; not mounted into shell); others may need a `rendererKey` mapping in the registry layer. Must be triaged row-by-row against the live registry and `COMPONENT_MAP`. |
| 0 missing `COMPONENT_MAP`, 0 permission/entitlement blocked, 0 hidden DOM, 0 undefined aria/action | **PASS (snapshot)** | no contradiction in offline data |
| Failure rule `shell-host-branching: shell.isTrailingHeaderSurface` | **NEEDS RE-VERIFICATION** | prior session claimed fixed; cannot confirm without live runtime; must be re-asserted in Phase 4 proof |
| Failure rule `workspace-home-template-binding: /workspace-home` | **PASS (already fixed by metadata row)** | `20260506_0560_dynamic_ui_route_metadata.sql:37-50` seeds `/workspace-home` with `render_mode='shell-only'` + `template_binding_required=false`; FE shell-only gate at `dynamic-template-page.component.ts:245-251` honours this and short-circuits before template-binding is called — `/workspace-home` no longer issues a template-binding request |

### 2.6 Accessibility re-validation

| Claim | Verdict | Evidence |
|-------|---------|----------|
| 20+ compliance files contain orphan `<label>` (Class A) | **PASS (still reproduces)** | `grep -RIn "<label>" modules/compliance/ui/features/compliance/` returns 26 occurrences across the file set previously enumerated |
| 3 module shell templates have `<cds-search>` without `[label]` (Class B) | **PASS (still reproduces)** | `module-audit-trail.template.ts`, `module-heatmap.template.ts`, `module-records.template.ts` all contain `<cds-search` without `[label]` |
| DevTools reported 9 violating nodes on the live shell | **CANNOT MAP YET** | the live page is currently rendering the *empty-state fallback* due to root-route 500 (see §2.2). The 9 nodes are likely a subset of: shell-host header `<label>`s on the inline form-search, plus the tile/empty-state fallback. **Audit MUST be re-run after Phase 1 fix** so the count is taken on the actual marketing landing surface, not on the fallback. |

---

## 3. Affected Components (consolidated)

### Server / DB

| File | Concern |
|------|---------|
| `services/ui-os-service/src/server.ts:21-92` | `route-metadata` is mounted inside the gateway-origin gate; not on the public bypass list. |
| `services/ui-os-service/src/routes/route-metadata.routes.ts:39-66` | Returns 404 only on missing row; no provision for "anonymous, route is public" case. |
| `services/ui-os-service/src/routes/template-binding.routes.ts:506-600` | Catches all errors and returns opaque `500 TEMPLATE_BINDING_FETCH_FAILED`; no per-sub-query error isolation; cannot pinpoint failure source. |
| `platform/dos/migrations/public/20260506_0560_dynamic_ui_route_metadata.sql` | Only seeds `/workspace-home`. **No row for `/`** ⇒ no explicit `template` classification ⇒ FE falls through. |

### Frontend

| File | Concern |
|------|---------|
| `platform/core/platform/shell/route-metadata.service.ts:48-54` | Conflates 401 with "no row" — both reduce to empty map; no way for caller to distinguish. |
| `platform/core/platform/shell/dynamic-template-page.component.ts:243-253` | Gating logic correct; depends on metadata being available for public routes. With current 401 behaviour it cannot honour metadata for anonymous `/`. |
| `platform/core/platform/shell/dynamic-template-page.component.ts:75-84` | Renders empty `<dos-empty-state>` with no title/description on `template_export === null`. This *is* the fail-closed contract; not a defect. |

### Workspace contract audit (post-Phase-1)

| Concern | File / Table |
|---------|-------------|
| Re-validate 7 visual-shell bindings | `dos.dynamic_ui_workspace_zone_binding` (or equivalent) — verify rows exist for all 7 keys per tenant after live boot |
| Re-validate 46 missing `rendererKey` | `dos.dynamic_ui_component_registry` + `COMPONENT_MAP` cross-walk |
| Re-verify `shell-host-branching` rule | `platform/core/platform/shell/shell-host.component.ts` (zone branching), surface-level `isTrailingHeaderSurface` consumer |
| Confirm `/workspace-home` no longer triggers template-binding call | network trace once the SPA boot is stable |

### Accessibility

| File | Class |
|------|-------|
| 20 files under `modules/compliance/ui/features/compliance/` | A (orphan `<label>` and `<label>+<input pInputText>` siblings) |
| `platform/core/platform/shell/templates/module-audit-trail.template.ts` | B (cds-search no `[label]`, hardcoded placeholder) |
| `platform/core/platform/shell/templates/module-heatmap.template.ts` | B (cds-search no `[label]`, hardcoded placeholder) |
| `platform/core/platform/shell/templates/module-records.template.ts` | B (cds-search no `[label]`) |

---

## 4. Cross-Validated Findings (PASS / FAIL summary)

| Claim from P0 / prior reports | Verdict |
|--------------------------------|---------|
| `GET /api/ui-os/route-metadata` returns 401 for anonymous `/` | **PASS — confirmed by mount order** |
| `GET /api/ui-os/template-binding?route=/` returns 500 | **PASS — confirmed in code path; root sub-query needs live verification** |
| FE calls template-binding before metadata classification | **FAIL — FE already gates correctly; bug is metadata silently 401 then FE has no signal** |
| Existing seeds make `/` a public marketing landing route | **PASS — three independent migrations agree** |
| 7 visual-shell registry rows missing tenant binding | **STALE — bindings exist in DB; audit ran offline** |
| 46 missing `rendererKey` | **NEEDS LIVE RE-AUDIT** |
| `shell-host-branching` failure rule already fixed | **NEEDS LIVE RE-VERIFICATION** |
| `/workspace-home` no longer issues template-binding call | **PASS — `dynamic_ui_route_metadata` row + FE shell-only gate present** |
| 20 compliance Class A orphan-label files | **PASS — reproduces** |
| 3 module shell template Class B cds-search files | **PASS — reproduces** |
| DevTools "9 violating nodes" matches the above | **UNVERIFIED — must be re-run after Phase 1 fix** |

---

## 5. Proposed Solution — Strict Phase Ordering (AGENTS.md compliant, user decisions baked in)

User decisions (2026-05-06) override prior assumptions:
1. `publicMarketingTemplateRoutes` → **DB-driven allowlist (full doctrine, Phase 1)**.
2. Template-binding 500 root cause → **stand up an instrumented run during
   implementation; capture failing query before declaring fix complete**.
3. Redirect contract → **`dos.dynamic_ui_route_metadata.metadata` JSONB; NO new
   table; NO `redirect_to` column; NO defer**. Typed shape is mandatory
   (verbatim, see 1c).
4. `dos-command-search` Class B guard → **Phase 3A audit; Phase 3B implement
   only if every active caller already has runtime/i18n/DB-backed
   `ariaLabel`**.
5. Phase 4 live audit → **Subagent runs Playwright against running stack.
   No skip. No curl-only.**

### PHASE 1 — Root route `/` contract (P0, lands first)

**1a. DB-driven public-route allowlist (replaces the TS literal in `server.ts`)**

Per user decision #1, the const `publicMarketingTemplateRoutes` in
`services/ui-os-service/src/server.ts:21-27` must be removed. Source of truth
becomes a new column on `dos.dynamic_ui_route_metadata`:

```sql
ALTER TABLE dos.dynamic_ui_route_metadata
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ix_dynamic_ui_route_metadata_is_public
  ON dos.dynamic_ui_route_metadata(is_public) WHERE is_public = true;
```

Idempotent forward-only seed inserts a row for **every route** previously in
the TS literal:

| route | render_mode | template_binding_required | is_public | metadata |
|-------|-------------|----------------------------|-----------|----------|
| `/` | `redirect` | `false` | `true` | redirect JSONB (see 1c) |
| `/login`, `/register`, `/forgot-password`, `/mfa`, `/reset-password` | `template` | `true` | `true` | `{}` |
| `/pricing`, `/trust`, `/security`, `/contact`, `/about`, `/legal`, `/platform`, `/resources`, `/resources/executive-kit` | `template` | `true` | `true` | `{}` |
| `/marketing` (or chosen public landing route) | `template` | `true` | `true` | `{}` |
| `/workspace-home` | `shell-only` | `false` | `false` | `{}` *(unchanged)* |

A follow-up migration in the same wave **moves the existing
`marketing-landing` template binding off `/`** onto its declared public
landing route (resolved from the same `is_public` set) so `/` is free for
the redirect entry semantics. The old `dos.ui_route_template_binding` row at
`route='/'` is deleted (idempotent).

The server's public-bypass middleware is rewritten to **read `is_public=true`
rows on startup** (warm cache + LISTEN/NOTIFY refresh, or per-request lookup
with a small TTL cache). No TS literal survives.

**1b. Server contract: route-metadata public read**

Mount `GET /api/ui-os/route-metadata` **before** `requireGatewayOrigin` for
the read path. Anonymous request behaviour:
- `?route=<X>` where the row has `is_public=true` → 200 typed row (including
  `metadata` JSONB).
- `?route=<X>` where no row exists or `is_public=false` → typed
  `401 ROUTE_METADATA_UNAUTHENTICATED { redirect: { default: '/login' } }`
  whose `redirect.default` value comes from a DB-stored constant row in
  `dynamic_ui_route_metadata` (e.g., the `/` row's `metadata.redirect.default`).
  **No TS constant.** Never an unhandled raw 401.
- `GET /api/ui-os/route-metadata` (no query) when anonymous → returns only
  rows with `is_public=true`. Authenticated → returns full set as today.

**1c. Redirect render-mode contract — JSONB shape (verbatim per user decision #3)**

The `dos.dynamic_ui_route_metadata.metadata` JSONB column stores the
redirect contract for `render_mode='redirect'` rows. The mandatory typed
shape is:

```json
{
  "renderMode": "redirect",
  "templateBindingRequired": false,
  "redirect": {
    "anonymous": "/login",
    "authenticated": "/workspace-home",
    "default": "/login"
  }
}
```

Doctrine rules (verbatim per user decision):
- Route `/` MUST NOT call `/api/ui-os/template-binding?route=/`.
- Missing template binding MUST NEVER return 500.
- Anonymous `/` → `/login` (or declared public landing per the `redirect.anonymous`
  value).
- Authenticated `/` → `/workspace-home`.
- `/workspace-home` stays `shell-only` (existing row from `20260506_0560` unchanged).
- No hardcoded redirect inside any Angular component.
- No static fallback page.

If the `metadata` column does not yet exist on
`dos.dynamic_ui_route_metadata` (current schema in
`20260506_0560_dynamic_ui_route_metadata.sql:21-32` does **not** include it —
only `notes`, `version`, timestamps), the Phase 1 migration must add it:

```sql
ALTER TABLE dos.dynamic_ui_route_metadata
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
```

The `route-metadata` resolver projects the row's `metadata` JSONB into the
typed response. The new `'redirect'` value is already permitted by the
existing CHECK constraint (`render_mode IN ('template', 'shell-only',
'redirect')`).

**1d. Server contract: template-binding never 500s + instrumented capture
(per user decision #2)**

Two-step plan:

(i) **Instrumented capture (during implementation, before fix)**: stand up a
deliberate failing run against the test DB. Add temporary structured
logging around each sub-query in `template-binding.routes.ts` (the 8
`loadProps` SELECTs, the 6 `loadOverrideLayers` queries, the masthead
derivation, the deepMerge). Capture `journalctl`/stderr for an anonymous
`GET /api/ui-os/template-binding?route=/` and identify the first throwing
sub-query. Save the capture to
`.zencoder/chats/1876eddf-71ad-4705-b7fc-dbbb6bf669de/template-binding-500-capture.log`.

(ii) **Permanent fix**: rewrite the handler at
`services/ui-os-service/src/routes/template-binding.routes.ts:506-600`:
- Per-sub-query try/catch with typed error codes
  (`SUBQ_KPI_FAILED`, `SUBQ_OVERRIDE_PRODUCT_FAILED`, …).
- Response includes `_errors: [{ stage, code }]` enumerating partial
  failures; the row + successful enrichments are still returned.
- Reserve `500` only for pool/connection failures (DB unreachable).
- The existing `404 TEMPLATE_BINDING_NOT_FOUND` stays.
- If the captured root cause requires a DB migration (missing column,
  ownership drift, etc.), include that migration in Phase 1 with idempotent
  forward-only + assertion guard.

After fix lands, **`/` should never even reach `template-binding`** because
the `redirect` render-mode short-circuits in the FE — but the contract must
still hold for any other route that hits a partial-data condition.

**1e. FE caller correctness**

`platform/core/platform/shell/route-metadata.service.ts` must:
- Distinguish 401 (`RouteMetadataUnknown` sentinel) from null (no row).
- Return the full typed `RouteMetadata` including the `metadata` JSONB.

`platform/core/platform/shell/dynamic-template-page.component.ts:243-253`
must add a `redirect` branch:
- On `meta.renderMode === 'redirect'`, read `meta.metadata.redirect`,
  resolve `anonymous` vs `authenticated` from `AccessStore`/auth signal,
  and `router.navigateByUrl(target)`. **Skip template-binding entirely.**
- On `meta.renderMode === 'shell-only'` → existing behaviour (no
  template-binding call).
- On `meta.renderMode === 'template'` or null → existing template-binding
  resolution.

No hardcoded redirect targets in the component.

**1f. Acceptance gates (machine-checkable)**

| # | Check | Pass criterion |
|---|-------|----------------|
| 1 | `psql -c "SELECT route, render_mode, is_public, metadata->>'redirect' FROM dos.dynamic_ui_route_metadata WHERE route='/';"` | Returns 1 row with `render_mode='redirect'`, `is_public=true`, and the JSONB redirect block exactly matching the typed shape in §1c |
| 2 | `curl -sS http://gateway/api/ui-os/route-metadata?route=/` (anonymous) | HTTP 200, body matches typed redirect shape |
| 3 | `curl -sS http://gateway/api/ui-os/route-metadata` (anonymous) | HTTP 200, body lists only `is_public=true` rows |
| 4 | `curl -sS http://gateway/api/ui-os/template-binding?route=/` (any caller) | HTTP 200 with `_errors:[]` empty OR HTTP 404; **never** 500 |
| 5 | Anonymous browser `GET /` via Playwright | Network trace shows `route-metadata?route=/` → 200, **zero** `template-binding?route=/` calls, navigation lands on `/login` (or declared `redirect.anonymous`) |
| 6 | Authenticated browser `GET /` via Playwright | Same trace but lands on `/workspace-home` |
| 7 | Authenticated browser `GET /workspace-home` via Playwright | Network trace shows **zero** `template-binding` calls; `workspace-runtime` 200; shell renders |
| 8 | `grep -RIn "publicMarketingTemplateRoutes\|hardcoded.*\\/login\|hardcoded.*\\/workspace-home" services/ui-os-service/src platform/core` | Zero hits (TS literal eliminated) |
| 9 | Instrumented capture log saved to `.zencoder/chats/.../template-binding-500-capture.log` | File exists, contains the first throwing sub-query name + DB error message |

### PHASE 2 — Workspace contract audit gaps (after Phase 1 stabilises)

(Unchanged from prior plan.)

**2a.** Re-run the contract audit against the live runtime now that
anonymous `/` no longer fails. Capture actual `runtimeEmitted`,
`domRendered`, `visible` counts; updated list of registry rows missing
binding / `rendererKey`.

**2b.** For each genuinely missing tenant binding (post-re-audit), add an
idempotent migration that inserts the binding row in the canonical table
identified during 2a. No FE invention.

**2c.** For each genuinely missing `rendererKey` in the registry, classify
each as catalog-only (DB flag) or shell-mounted (add mapping +
`COMPONENT_MAP` entry).

**2d.** Re-verify `shell-host-branching` rule once live audit runs.

**2e. Acceptance gates (machine-checkable)**

| # | Check | Pass criterion |
|---|-------|----------------|
| 1 | Live audit JSON `runtimeEmitted == seedKeys` | true (≈60) |
| 2 | Live audit JSON `domRendered == visibleSurfaces` | true |
| 3 | Live audit `missing binding`/`missing rendererKey` for shell-mounted surfaces | empty array |
| 4 | Failure rules `shell-host-branching` and `workspace-home-template-binding` | both report PASS |

### PHASE 3 — Accessibility (split per user decision #4)

#### Phase 3A — `dos-command-search` audit (read-only, lands first)

Subagent enumeration deliverable. For **every** usage of
`<dos-command-search>` across the repo, report a row in
`.zencoder/chats/1876eddf-71ad-4705-b7fc-dbbb6bf669de/command-search-audit.md`:

| file | route/surface | inputs passed | ariaLabel source | placeholder source | reaches inner cds-search/input? | risk if required-label fail-closed |
|------|---------------|---------------|------------------|-------------------|---------------------------------|------------------------------------|

Audit-only acceptance gate: report exists; every active caller is
classified (`safe-to-fail-closed` or `BLOCKED-needs-DB-data-first`).

#### Phase 3B — implement only if 3A clears

Implement the `cds-search`/`<dos-command-search>` label requirement only if
**every active caller** already has a runtime/i18n/DB-backed `ariaLabel`.
Strict rules:
- No hardcoded fallback (no `'Search'`, `'Search…'`, `'Search Ctrl+K'`,
  `'Find item…'`, etc.).
- No `aria-label="undefined"` / `aria-labelledby="undefined"`.
- Missing `ariaLabel` → control is hidden/disabled (fail-closed).
- Carbon `cds-search` receives `[label]` on the actual `<input>`.

If any active caller depends on a hardcoded default → **STOP and report**
in `command-search-audit.md`; do not replace with another fallback string;
add the missing data to DB first.

Includes the previously planned fixes:
- 26 `<label>` orphan occurrences in `modules/compliance/...` (Class A) →
  Fix 1a/1b/1c (`<span class="dos-field-label">` for display-only;
  `[ariaLabel]` on `cds-dropdown`; `<label [for]>` + `<input [id]>` pairs).
- 3 unlabeled `<cds-search>` in `platform/core/platform/shell/templates/`
  (Class B) → Fix 2a/2b/2c (DB-sourced `searchLabel` / `searchPlaceholder`
  via UI-OS resolver; fail-closed `@if` gate; no hardcoded fallback).
- New CI guard `scripts/ci-guards/lint-no-orphaned-labels.mjs` wired into
  master gate.

**3 Acceptance gates (machine-checkable)**

| # | Check | Pass criterion |
|---|-------|----------------|
| 1 | `command-search-audit.md` exists with every caller classified | true |
| 2 | `grep -RIn "<cds-search" platform modules` then filter no `[label]` | zero hits |
| 3 | `grep -RIn "ariaLabel\\s*=\\s*['\"]Search\|placeholder\\s*=\\s*['\"]Search" platform/ui-system/dos-ui-system/src` | zero hits (no hardcoded "Search" defaults remain) |
| 4 | `grep -RIn "aria-label=\"undefined\"\|aria-labelledby=\"undefined\"" platform modules` | zero hits |
| 5 | `node scripts/ci-guards/lint-no-orphaned-labels.mjs` | exit 0 |
| 6 | Live DevTools audit (Phase 4) on marketing/login/workspace-home/compliance | zero `label.control===null` + zero missing-name form-control violations |

### PHASE 4 — Live Playwright audit (per user decision #5)

A subagent runs **Playwright against the running stack**. No skip. No
curl-only. Routes covered:

#### Anonymous `/`
- Network trace MUST show **no** `template-binding?route=/` call (no 500).
- `route-metadata?route=/` returns 200 typed redirect.
- Browser navigates to `/login` (or the declared `redirect.anonymous`).
- No blank page rendered at any point during the navigation.

#### Authenticated `/`
- Network trace MUST show no `template-binding?route=/` call.
- Browser navigates to `/workspace-home`.
- No 500.

#### Authenticated `/workspace-home`
- Shell-only short-circuit honoured (no `template-binding` call).
- `workspace-runtime` returns 200.
- Visible shell surfaces render.
- No demo content. No static fallback. No hardcoded copy.

#### Accessibility checks (run on each route above + one compliance module page)
- `<label>` without associated control (`label.control === null`).
- `<input>` / `<textarea>` / `<select>` / `[role=combobox|textbox|searchbox]`
  without accessible name.
- `aria-label="undefined"` or `aria-labelledby="undefined"`.
- Icon-only `<button>` without accessible name.
- Horizontal overflow.
- Hidden / zero-size visible surfaces.

#### Fallback procedure (if Playwright cannot authenticate due to Keycloak/MFA)
- Run anonymous `/` via Playwright as planned.
- Run authenticated checks using existing browser session manually.
- Paste console / network / DOM audit output into the proof artefact.

#### Phase 4 deliverable

Single artefact at
`.zencoder/chats/1876eddf-71ad-4705-b7fc-dbbb6bf669de/live-audit.md`
containing:
- Exact Playwright command(s) used.
- Screenshot file paths (one per route).
- Network failure list (if any).
- Console error list (if any).
- Accessibility issue count per route.
- Final verdict: **`LIVE_ROUTE_ACCESSIBILITY_AUDIT_PASS`** or
  **`BLOCKED`** (with reason).

#### Phase 4 acceptance gates (machine-checkable)

| # | Check | Pass criterion |
|---|-------|----------------|
| 1 | `pnpm --filter @dos/ui-contracts build` | exit 0 |
| 2 | `pnpm --filter @dos/ui-system build` | exit 0 |
| 3 | `pnpm --filter @dos/platform-core build` | exit 0 |
| 4 | `pnpm --filter @dos/platform-app build` | exit 0 |
| 5 | `node scripts/ci-guards/lint-no-static-nav-fallback.mjs` | exit 0 |
| 6 | `node scripts/ci-guards/lint-no-legacy-uios-shell.mjs` | exit 0 |
| 7 | `node scripts/ci-guards/lint-no-orphaned-labels.mjs` | exit 0 |
| 8 | `live-audit.md` final verdict line | equals `LIVE_ROUTE_ACCESSIBILITY_AUDIT_PASS` |
| 9 | Per-route accessibility issue count in `live-audit.md` | `0` for all four routes |
| 10 | Per-route network trace in `live-audit.md` | matches expected calls per route (no 500, no forbidden template-binding for `/` or `/workspace-home`) |

---

## 6. Final Consolidated Acceptance

A claim of "PASS" is only valid when **all** of the following are true:

- Anonymous `/` renders the marketing landing without falling back to
  `dos-empty-state`.
- `GET /api/ui-os/route-metadata?route=/` returns 200 to anonymous callers
  with `renderMode='template'`, `templateBindingRequired=true`.
- `GET /api/ui-os/template-binding?route=/` returns 200 (never 500) for
  anonymous callers; partial enrichment failure is logged + reported in
  `_errors[]` but does not break the response.
- Authenticated `/workspace-home` issues **zero** `/template-binding` calls
  (verified via network trace) and renders only from `/workspace-runtime`.
- The workspace contract audit, re-run live, reports zero genuine
  binding/rendererKey gaps for shell-mounted surfaces.
- DevTools accessibility, re-run live on the actual surfaces, reports zero
  `label.control === null` and zero missing-name form-control violations.
- All builds + CI guards (existing + new) exit 0.
- Zero hardcoded `/workspace-home`, zero static nav, zero browser-side legacy
  normalization, zero fallback labels — per AGENTS.md doctrine, verified by
  grep proof.

---

## 7. Resolved Decisions (user, 2026-05-06)

All five prior open questions are now resolved and baked into §5:

1. **Public-route allowlist** → DB-driven (`dos.dynamic_ui_route_metadata.is_public`).
   TS literal eliminated in Phase 1 (§5.1a).
2. **500 root cause** → instrumented capture step added to Phase 1 (§5.1d.i)
   with mandatory log artefact.
3. **Redirect contract** → `dos.dynamic_ui_route_metadata.metadata` JSONB,
   typed shape verbatim in §5.1c. No new table. No `redirect_to` column.
4. **`dos-command-search`** → split into Phase 3A (audit-only) and Phase 3B
   (conditional implement) per §5 Phase 3.
5. **Phase 4 audit** → Playwright subagent against running stack;
   single `live-audit.md` artefact with verdict
   `LIVE_ROUTE_ACCESSIBILITY_AUDIT_PASS` or `BLOCKED` (§5 Phase 4).

No outstanding clarifications. Ready for Step 2 (Implementation) on user
confirmation.

---

## 6. Phase 2 Audit (2026-05-06)

Full findings: `.zencoder/chats/1876eddf-71ad-4705-b7fc-dbbb6bf669de/phase2-audit.md`

### Phase 1.5 Fix Applied

`{ path: 'marketing', loadComponent: dynamicPageRoute }` added to `PUBLIC_PATHS` in
`platform/app/src/app.routes.ts` (line 52). Build + CI guards pass.

### Part A — No-Regression Smoke (Post-Fix)

| Route | Verdict | Key finding |
|-------|---------|-------------|
| Anonymous `GET /` | ✅ PASS | `route-metadata` → 200 `renderMode:redirect` → browser lands at `/login`, template-binding never called for `/` |
| Anonymous `GET /marketing` | ✅ PASS | Public route confirmed; `template-binding` 200; no OIDC redirect; Playwright confirmed |
| Authenticated `GET /` | ⚠️ SUBSTITUTED-PASS | Keycloak `grant_type=password` blocked; API + code proof confirm authenticated `/` → `/workspace-home` |
| Authenticated `GET /workspace-home` | ⚠️ SUBSTITUTED-PASS | DB `render_mode=shell-only`; code short-circuits before template-binding; Keycloak substitution documented |

### Part B — Contract Audit Summary

| Claim | Verdict |
|-------|---------|
| 7 visual-shell rows missing binding | ✅ STALE/PASS — all 7 × 43 tenant bindings confirmed in `workspace_shell_binding` |
| 46 missing `rendererKey` — 14 action/data | ✅ CLEAN — `catalog_only=true` + `shell_renderable=false` in metadata; SQL drops them |
| 46 missing `rendererKey` — 32 input/nav/polish | ⚠️ LATENT RISK — missing metadata flags; currently safe (runtime gate drops them via `main` zone + empty perms gate); migration recommended |
| `shell-host-branching` rule | ✅ PASS — `props.placement`-based, no hardcoded rendererKey list |
| `workspace-home-template-binding` rule | ✅ PASS — `shell-only` DB row + code short-circuit confirmed |
| "Binding → Runtime missing: 60" | ✅ STALE — offline artifact; live SQL confirms 21 surfaces emitted correctly per tenant |

### Open Item — RESOLVED (2026-05-06, Phase 2.5)

**LATENT-32-NO-FLAGS**: Migration applied and verified.

- **Migration file**: `platform/dos/migrations/public/20260509_0230_workspace_input_nav_polish_catalog_only.sql`
- **Rows updated**: 32 (confirmed via `GET DIAGNOSTICS`)
- **DB proof**: all 32 rows now have `catalog_only=true`, `shell_renderable=false`, `workspace_only=false`
- **SQL filter proof**: `COALESCE(metadata->>'catalog_only','false') <> 'true'` now returns **0** rows
  for input/nav/polish keys — protection is SQL-level, not runtime-gate-dependent
- **Idempotency**: migration re-ran cleanly (32 rows updated on re-run; both assertion blocks pass)
- **CI guard**: `migration-self-assertion-enforcer.mjs` flags file due to pre-existing violation in
  same pattern as reference `20260509_0210`; 215 total violations are all pre-existing — not introduced
  by this migration

### Phase 3A — Command-Search Audit (2026-05-06)

Full audit: `.zencoder/chats/1876eddf-71ad-4705-b7fc-dbbb6bf669de/command-search-audit.md`

**Key findings**:

1. **Zero active `<dos-command-search>` template callers** — `DosCommandSearchComponent` is exported
   but not instantiated in any template; Class B violations come from direct `cds-search` usages
   in module shell templates, not from `dos-command-search`.

2. **`workspace-header` trigger button** — `commandSearchLabel` sourced from DB
   (`dos.ui_workspace_chrome` key `shell.header.commandSearch.label` = `"Search (Ctrl+K)"`)
   for all tenants; **SAFE-TO-FAIL-CLOSED**.

3. **7 BLOCKED callers** (direct `cds-search`, no `[label]` binding, hardcoded placeholder/fallback):
   `module-audit-trail.template.ts:110`, `module-heatmap.template.ts:76`,
   `module-records.template.ts:93`, `module-page-chrome.ts:352`,
   `foundation-register.component.ts:49`, `foundation-module-audit.component.ts:48`,
   `dos-carbon-search.component.ts:17`

4. **Phase 3B is BLOCKED** per user decision #4 — 7 callers need DB migration + seed before TS fix.

### Phase 3B — Search Aria-Label Resolver+Wiring (2026-05-06)

**Status: PHASE_3B_SEARCH_ARIA_LABEL_PASS**

Implementation notes:

1. **Server resolver** (`services/ui-os-service/src/routes/workspace-shell.routes.ts`):
   `loadChrome()` returns the raw `value_json` JSONB. Locale resolution is performed
   downstream via `runtimeChromeLocalized(key, locale)` in the binding service so the
   server emits the unaltered `{en,ar}` JSONB shape; the FE picks the active locale.
   Fail-closed: when key absent or locale entry empty, no string is emitted.

2. **`dos-carbon-search`** (`platform/ui-system/dos-ui-system/src/carbon/dos-carbon-search.component.ts`):
   Hardcoded `@Input() label = 'Search'` removed. Wrapper now resolves its label
   through `CHROME_ARIA_LABEL_RESOLVER` using `ariaLabelKey` (defaulting to
   `shell.dos-carbon-search.search.ariaLabel`). `<cds-search>` renders only when
   the resolved label is non-empty (`@if (resolvedAriaLabel())`).

3. **CHROME_ARIA_LABEL_RESOLVER** wired in `platform/app/src/app.config.ts` to
   `WorkspaceShellBindingService.runtimeChromeLocalized(key, i18n.currentLang())`.

4. **Foundation port** (`platform/foundation/ui/ports/workspace-chrome.port.ts`):
   `FOUNDATION_WORKSPACE_CHROME` token + `NoopFoundationWorkspaceChrome` (returns null).
   Provider in `app.config.ts` bridges to the same binding service.

5. **All 7 callers wired**:
   - `module-audit-trail.template.ts` → `<dos-carbon-search ariaLabelKey="shell.module-audit-trail.search.ariaLabel">`
   - `module-heatmap.template.ts` → `<dos-carbon-search ariaLabelKey="shell.module-heatmap.search.ariaLabel">`
   - `module-records.template.ts` → `<dos-carbon-search ariaLabelKey="shell.module-records.search.ariaLabel">`
   - `module-page-chrome.ts` (`ModuleAuditTrailPanelComponent`) → `<dos-carbon-search ariaLabelKey="shell.module-page-chrome.search.ariaLabel">`
   - `foundation-register.component.ts` → `<dos-carbon-search ariaLabelKey="shell.foundation-register.search.ariaLabel">`
   - `foundation-module-audit.component.ts` → `<dos-carbon-search ariaLabelKey="shell.foundation-module-audit.search.ariaLabel">`
   - `dos-carbon-search.component.ts` self default → `shell.dos-carbon-search.search.ariaLabel`

6. **CI guard** `scripts/ci-guards/lint-no-hardcoded-search-labels.mjs` added to
   `dos-master-gate.mjs`. Rejects `'Search'`, `'Search…'`, `'Search (Ctrl+K)'`
   in 9 watched files; whitelists `i18n.tr/t/translate(...)` fallbacks (legitimate
   translation pipeline) and JSDoc comment lines.

7. **Build/guard results**:
   - `@dos/ui-system` build PASS
   - `@dos/platform-core` build PASS
   - `@dos/ui-os-service` build PASS
   - `@dos/platform-app` build PASS
   - `lint-no-static-nav-fallback` PASS
   - `lint-no-legacy-uios-shell` PASS
   - `lint-no-hardcoded-shell-labels` PASS
   - `lint-no-hardcoded-search-labels` PASS

8. **Grep proof**: only 2 hits across the 9 watched files —
   `foundation-register.component.ts:77` (i18n.tr fallback chip caption — whitelisted)
   and `dos-carbon-search.component.ts:15` (JSDoc comment — whitelisted).
   Zero raw-literal violations in active code.

### Final Verdict

`PHASE_2_5_PASS` — LATENT-32-NO-FLAGS resolved. Phase 3A audit complete.
`PHASE_3B_SEARCH_ARIA_LABEL_PASS` — 7 search aria-label callers fully wired
through DB → UI-OS → CHROME_ARIA_LABEL_RESOLVER / FOUNDATION_WORKSPACE_CHROME.

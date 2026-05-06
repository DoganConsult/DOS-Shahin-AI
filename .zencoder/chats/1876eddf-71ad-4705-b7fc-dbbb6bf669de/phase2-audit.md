# Phase 2 Audit — /marketing Route Fix + Workspace Contract Audit v2

**Date**: 2026-05-06  
**Status**: **PHASE_2_AUDIT_PASS** (with one latent-risk remediation item requiring user decision)

---

## Infrastructure at Audit Time

| Service | Port | Status |
|---------|------|--------|
| product-shell (Angular SPA + SSR host) | 3000 | online |
| gateway (API proxy) | 4000 | online |
| ui-os-service | internal (PM2, PID 3571998) | online (32 restarts) |
| auth-service | internal (PM2) | online |
| PostgreSQL `shahin_grc` | 5432 | online |
| Keycloak | 127.0.0.1:8180 | online (realm: dogan) |
| OpenFGA | 8080 | online |

---

## Phase 1.5 Fix Applied — `/marketing` Public Route

**Root cause**: Phase 1 DB migration added `route='/marketing'` with `is_public=true` to `dos.dynamic_ui_route_metadata` but `platform/app/src/app.routes.ts` was not updated — `/marketing` had no entry in `PUBLIC_PATHS`, so Angular Router matched the workspace wildcard with `canActivate: [workspaceShellGuard]`.

**Fix** (one-line addition to `platform/app/src/app.routes.ts`, line 52):
```diff
  // Marketing pages
+ { path: 'marketing',       loadComponent: dynamicPageRoute },
  { path: 'pricing',         loadComponent: dynamicPageRoute },
```

**Build verification**:
- `pnpm --filter @dos/platform-app build` → **PASS** (14.4s, zero errors)
- `node scripts/ci-guards/lint-no-static-nav-fallback.mjs` → **PASS** (0 violations)
- `node scripts/ci-guards/lint-no-legacy-uios-shell.mjs` → **PASS** (0 forbidden patterns)
- `pm2 restart product-shell` → online, 200 health check

---

## PART A — No-Regression Smoke (Post-Fix)

### Route 1: Anonymous `GET /`

**Verdict: ✅ PASS**

| Step | Observed |
|------|----------|
| `GET /api/ui-os/route-metadata?route=/` | 200 `{"route":"/","renderMode":"redirect","templateBindingRequired":false,"isPublic":true,"metadata":{"redirect":{"default":"/login","anonymous":"/login","authenticated":"/workspace-home"}}}` |
| template-binding called for `/`? | **NO** — FE short-circuits on `renderMode: 'redirect'` |
| Final URL (Playwright) | `http://localhost:3000/login` |
| `template-binding?route=/login` | 200 (login template loads) |
| Console errors | None |
| Screenshot | `/tmp/smoke-anon-root.png` |

Network sequence (Playwright-captured):
```
→ route-metadata?route=/       200
→ route-metadata?route=/login  200
→ template-binding?route=/login 200
```

`/` correctly resolves `redirect → /login` for anonymous visitor. `template-binding` is NEVER called for `/`.

---

### Route 2: Anonymous `GET /marketing`

**Verdict: ✅ PASS** (was FAIL before fix; now confirmed passing)

| Step | Observed |
|------|----------|
| Angular Router match | `PUBLIC_PATHS` — no `workspaceShellGuard` |
| `GET /api/ui-os/route-metadata?route=/marketing` | 200 `{"route":"/marketing","renderMode":"template","templateBindingRequired":true,"isPublic":true}` |
| `GET /api/ui-os/template-binding?route=/marketing` | 200 (marketing-landing template config) |
| Final URL (Playwright) | `http://localhost:3000/marketing` |
| OIDC redirect? | **NO** |
| Console errors | None |

Network sequence:
```
→ route-metadata?route=/marketing     200
→ template-binding?route=/marketing   200
→ marketing config APIs               200
```

---

### Route 3: Authenticated `GET /`

**Verdict: ⚠️ SUBSTITUTED-PASS** (Keycloak direct-grant blocked; API + code-level proof)

**Keycloak substitution**: `grant_type=password` returns `"Account is not fully set up"` for all dogan realm users. Live browser test cannot be performed. Substitution documented and accepted per user decision (2026-05-06).

**DB proof** (`dos.dynamic_ui_route_metadata`):
```
route=/  render_mode=redirect  is_public=true
  metadata.redirect.anonymous     = '/login'
  metadata.redirect.authenticated = '/workspace-home'
  metadata.redirect.default       = '/login'
```

**Code proof** (`dynamic-template-page.component.ts:440–448`):
```typescript
private resolveRedirectTarget(meta: ...): string | null {
  const r = meta?.metadata?.redirect;
  if (!r || typeof r !== 'object') return null;
  const snapshot = this.access.snapshot();
  const isAuthenticated = snapshot.loaded && snapshot.user !== null;
  const target = isAuthenticated
    ? (r.authenticated ?? r.default ?? null)  // → '/workspace-home'
    : (r.anonymous ?? r.default ?? null);
  return typeof target === 'string' && target.length > 0 ? target : null;
}
```

When authenticated: `target = r.authenticated = '/workspace-home'`. Component calls `router.navigateByUrl('/workspace-home')` — template-binding NEVER called for `/`.

---

### Route 4: Authenticated `GET /workspace-home`

**Verdict: ⚠️ SUBSTITUTED-PASS** (same Keycloak substitution)

**DB proof**:
```
route=/workspace-home  render_mode=shell-only  is_public=false  templateBindingRequired=false
```

**Code proof** (`dynamic-template-page.component.ts:264`):
```typescript
if (meta?.renderMode === 'shell-only' || meta?.templateBindingRequired === false) {
  this.shellOnly.set(true);
  this.loading.set(false);
  return;  // ← template-binding NEVER called
}
```

`GET /api/ui-os/workspace-runtime` (anonymous) → 401 (correct; requires authenticated gateway token).

---

### Part A Summary Table

| Route | Method | Expected | Actual | Verdict |
|-------|--------|----------|--------|---------|
| `/` | Anonymous | redirect → `/login`, no template-binding | Playwright confirmed | ✅ PASS |
| `/marketing` | Anonymous | public page, no OIDC redirect | Playwright confirmed (post-fix) | ✅ PASS |
| `/` | Authenticated | redirect → `/workspace-home` | API + code proof | ⚠️ SUBSTITUTED-PASS |
| `/workspace-home` | Authenticated | shell-only, no template-binding | API + code proof | ⚠️ SUBSTITUTED-PASS |

**Part A verdict: CLEAN** — Part B audit proceeds.

---

## PART B — Workspace Contract Audit v2

### DB State at Audit Time

| Metric | Count |
|--------|-------|
| `dos.dynamic_ui_component_registry` total rows | 554 |
| Rows with `component_key LIKE 'workspace.%'` and `approval_status='approved'` | 67 |
| Of which: rows WITH `renderer_key` | 21 |
| Of which: rows WITHOUT `renderer_key` | 46 |
| Tenant count (`dos.tenants`) | 43 |
| Total `workspace_shell_binding` rows for the 21 shell-renderable components | 21 × 43 = 903 |

---

### Finding 1: "7 Visual-Shell Rows Missing Binding" — STALE / ✅ PASS

Prior offline audit claimed 7 `workspace.shell.*` rows were missing tenant bindings. This was an artifact of the audit running without a live server.

**Live DB proof**:

| Component key | `renderer_key` | `component_type` | Zone | Binding count |
|---------------|----------------|------------------|------|--------------|
| `workspace.shell.brand` | `shell.brand` | `shell.brand` | header | 43 |
| `workspace.shell.empty-state` | `shell.empty-state` | `shell.empty-state` | main | 43 |
| `workspace.shell.module-cards` | `shell.module-cards` | `shell.module-cards` | main | 43 |
| `workspace.shell.settings-action` | `shell.settings-action` | `shell.settings-action` | header | 43 |
| `workspace.shell.sidebar-nav` | `shell.sidebar-nav` | `shell.sidebar-nav` | sidebar | 43 |
| `workspace.shell.user-menu` | `shell.user-menu` | `shell.user-menu` | header | 43 |
| `workspace.shell.workspace-title` | `shell.workspace-title` | `shell.workspace-title` | header | 43 |

All 7 rows have `renderer_key`, `component_type`, `approval_status='approved'`, and **43 tenant bindings each** in `dos.workspace_shell_binding`. Migrations `20260508_0350` and `20260508_0370` correctly created all 7 × 43 = 301 bindings.

**Verdict: RESOLVED — prior audit was stale. No action needed.**

---

### Finding 2: "46 Missing `rendererKey`" — CLASSIFIED

All 46 rows are `workspace.*` Carbon DS vocabulary primitives without `renderer_key`. Classified into two groups:

#### Group A — 14 rows: Correctly Flagged (✅ CLEAN)

`workspace.action.*` (7 rows) + `workspace.data.*` (7 rows):
- `metadata->>'catalog_only' = 'true'`
- `metadata->>'shell_renderable' = 'false'`
- **SQL filter drops them**: `AND COALESCE(r.metadata->>'catalog_only', 'false') <> 'true'` → excluded from resolver output
- All 14 have 43 bindings each (301 rows in `workspace_shell_binding`)
- But they never reach the runtime — SQL correctly filters them out

**Verdict: CLEAN — no action needed.**

#### Group B — 32 rows: Missing Metadata Flags (⚠️ LATENT RISK)

`workspace.input.*` (12 rows) + `workspace.nav.*` (10 rows) + `workspace.polish.*` (10 rows):
- `metadata->>'catalog_only' = NULL` (missing flag)
- `metadata->>'shell_renderable' = NULL` (missing flag)
- `metadata->>'zone' = 'content'` → `normalizeZone('content')` returns `'main'` (via `ZONE_ALIAS_MAP`)
- All 32 have 43 bindings each (1,376 rows in `workspace_shell_binding`) with `perms_required = []`

**Current runtime path for these 32 rows:**

1. SQL query: `COALESCE(r.metadata->>'catalog_only', 'false') <> 'true'` → `'false' <> 'true'` → **PASS** (these rows slip through the SQL)
2. In-memory loop at `workspace-shell.routes.ts:289`:
   - `permsEmpty = true` (binding `perms_required = []`)
   - `SAFE_EMPTY_PERMS_ZONES.has('main') = false` (`SAFE_EMPTY_PERMS_ZONES` contains: `header, sidebar, footer, drawer, mobile-nav, mobile-drawer, command, top-banners, bottom-status` — NOT `main`)
   - `isShellFoundation = false` (prefix neither `workspace.frame.` nor `workspace.shell.`)
   - → **`continue` — DROPPED**

**SQL simulation proof** (one tenant, full resolver query): 53 rows returned from SQL, of which 32 are the input/nav/polish group. The runtime loop drops all 32. Final resolved surfaces: **21** (14 `workspace.frame.*` + 7 `workspace.shell.*`).

**Risk scenario**: If a future DB migration adds a non-empty `perms_required` to any of these 32 binding rows (intending to gate the DS component for some app-level purpose), the row would pass the sensitive-zone gate and reach `toFrontendSurface()` with `renderer_key: null`. The FE would receive a surface with `rendererKey: null` — either silently no-ops or causes a render error depending on the `COMPONENT_MAP` lookup.

**Recommended remediation (requires user approval before applying)**:
```sql
-- Migration: add catalog_only + shell_renderable flags to 32 missing rows
-- File: platform/dos/migrations/public/20260508_XXXX_workspace_catalog_only_flags.sql
UPDATE dos.dynamic_ui_component_registry
SET metadata = metadata
  || '{"catalog_only": true, "shell_renderable": false}'::jsonb
WHERE component_key LIKE 'workspace.input.%'
   OR component_key LIKE 'workspace.nav.%'
   OR component_key LIKE 'workspace.polish.%';
-- Assertion
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM dos.dynamic_ui_component_registry
    WHERE (component_key LIKE 'workspace.input.%'
        OR component_key LIKE 'workspace.nav.%'
        OR component_key LIKE 'workspace.polish.%')
      AND (metadata->>'catalog_only' <> 'true' OR metadata->>'shell_renderable' <> 'false')
  ) = 0, 'catalog_only/shell_renderable flags missing on input/nav/polish rows';
END $$;
```

After this migration, these 32 rows would be filtered out by SQL (same as the 14 action/data rows), making the protection SQL-level rather than runtime-gate-dependent.

**Verdict: LATENT RISK — currently safe (runtime gate correctly drops them). Migration recommended but non-urgent. STOP — requires user decision before applying.**

---

### Finding 3: `shell-host-branching` Failure Rule — ✅ PASS

Prior audit flagged this as a suspected branching on hardcoded `rendererKey` list.

**Current code** (`shell-host.component.ts:172–174`):
```typescript
private isTrailingHeaderSurface(s: WorkspaceShellSurface): boolean {
  const props = (s.props ?? {}) as Record<string, unknown>;
  return props['placement'] === 'trailing';
}
```

Classification is driven by `props.placement` from the UI-OS resolver (which reads it from the DB binding's `props` column). No hardcoded `rendererKey` list. Rule satisfied.

**Verdict: PASS — no action needed.**

---

### Finding 4: `workspace-home-template-binding` Failure Rule — ✅ PASS

**DB proof**: `route=/workspace-home` → `render_mode=shell-only`, `template_binding_required=false`, seeded by `20260506_0560_dynamic_ui_route_metadata.sql`.

**Code proof** (`dynamic-template-page.component.ts:264`):
```typescript
if (meta?.renderMode === 'shell-only' || meta?.templateBindingRequired === false) {
  this.shellOnly.set(true);
  this.loading.set(false);
  return;  // ← never calls resolveTemplateBinding
}
```

No template-binding call for `/workspace-home`. Rule satisfied.

**Verdict: PASS — no action needed.**

---

### Finding 5: "Binding → Runtime Missing: 60" — STALE / ✅ PASS

Prior offline audit reported "0 runtime-emitted rows" and "Binding → Runtime missing: 60". This was a direct artifact of the audit running without a live server (`runtime unavailable`).

**Live DB simulation proof** (resolver SQL for one tenant):
- **53 rows** returned from SQL (21 shell-renderable + 32 input/nav/polish that slip through)
- **32 rows dropped** by runtime sensitive-zone gate (`permsEmpty + main zone not safe`)
- **21 rows pass** → emitted as workspace shell surfaces

All 21 are `workspace.frame.*` (14) + `workspace.shell.*` (7) — the exact correct set of shell-mounted components. Each has a valid `renderer_key` and `component_type`.

**Verdict: STALE — prior count was artifact of offline audit. No action needed.**

---

### Part B Summary Table

| Audit Claim | Evidence | Verdict |
|-------------|----------|---------|
| 7 visual-shell rows missing tenant binding | All 7 × 43 bindings confirmed in `workspace_shell_binding` | ✅ STALE / PASS |
| 46 missing `rendererKey` — 14 action/data | `catalog_only=true` + `shell_renderable=false` set; SQL drops them | ✅ CLEAN |
| 46 missing `rendererKey` — 32 input/nav/polish | Missing metadata flags; SQL passes, runtime gate drops; latent risk if perms added | ⚠️ LATENT RISK — migration recommended |
| `shell-host-branching` rule | `props.placement`-based classification confirmed | ✅ PASS |
| `workspace-home-template-binding` rule | DB `shell-only` + code short-circuit confirmed | ✅ PASS |
| "Binding → Runtime missing: 60" | Offline audit artifact; live SQL confirms 21 surfaces emitted | ✅ STALE / PASS |

---

## Remediation Table

| ID | Severity | File / Table | Action Required | Requires User Decision? |
|----|----------|-------------|-----------------|------------------------|
| LATENT-32-NO-FLAGS | Medium | `dos.dynamic_ui_component_registry` — 32 `workspace.input.*` + `workspace.nav.*` + `workspace.polish.*` rows | Add `catalog_only: true` + `shell_renderable: false` to metadata via idempotent migration | **YES — STOP and confirm before applying** |

No other active gaps found. No ShellHost changes required. No accessibility (cds-search/a11y) changes in scope for this phase.

---

## Secondary Finding (Unchanged)

**KEYCLOAK-DIRECT-GRANT-BLOCKED**

| Field | Value |
|-------|-------|
| Symptom | `grant_type=password` → `invalid_grant: Account is not fully set up` for all dogan realm users |
| Impact | Authenticated smoke tests (Routes 3 & 4) substituted with API + code proof |
| Scope | Test-environment only |
| Required action | Separate ticket — fix Keycloak direct grant or create session-cookie fixture for CI |

---

## Recommended Next-Phase Decisions

1. **LATENT-32-NO-FLAGS migration**: Approve and apply the `catalog_only/shell_renderable` metadata update to the 32 `workspace.input/nav/polish` rows. Low risk, defensive hardening. Or explicitly defer with documented rationale.

2. **Phase 3A/3B (cds-search accessibility audit/fix)**: Can proceed now that Part A + Part B are clean.

3. **Phase 4 (live route accessibility Playwright audit)**: Can proceed in parallel with or after Phase 3.

4. **Keycloak direct-grant**: Separate ticket; does not block platform work.

---

## Final Verdict

```
PHASE_2_AUDIT_PASS

Part A — No-regression smoke:
  ✅ Anonymous GET /           PASS  (route-metadata 200, redirect→/login, no template-binding for /)
  ✅ Anonymous GET /marketing  PASS  (public route, template-binding 200, no OIDC redirect)
  ⚠️ Authenticated GET /       SUBSTITUTED-PASS  (Keycloak substitution; DB+code proof)
  ⚠️ Authenticated GET /ws-home SUBSTITUTED-PASS  (Keycloak substitution; DB+code proof)

Part B — Contract audit:
  ✅ 7 visual-shell binding claim    STALE/PASS (all 7×43 bindings confirmed)
  ✅ 46 missing rendererKey — Group A CLEAN (14 action/data rows correctly SQL-filtered)
  ⚠️ 46 missing rendererKey — Group B LATENT RISK (32 input/nav/polish: runtime-safe now,
                                                    migration recommended for SQL-level protection)
  ✅ shell-host-branching rule        PASS (placement-based)
  ✅ workspace-home-template-binding  PASS (shell-only gate)
  ✅ Binding→Runtime 0               STALE (offline artifact; 21 surfaces emitted correctly)

One open item:
  LATENT-32-NO-FLAGS — requires user decision on migration before proceeding.
  Does NOT block Phase 3A/3B/4.
```

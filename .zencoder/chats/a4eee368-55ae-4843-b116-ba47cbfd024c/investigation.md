# Bug Investigation: Angular NG0201 + 504 Gateway Timeout

## Bug Summary

Three concurrent runtime errors appear in the browser console when navigating to `shahin-ai.com`:

1. **NG0201 NullInjectorError** — Angular DI failure during lazy component load (occurs 2–3 times per page load)
2. **504 Gateway Timeout** — `GET /api/shell/config/foundation?product=shahin-ai&role=viewer`
3. **404 Not Found** — `GET /api/config-center/gateway/shell-override`

---

## Root Cause Analysis

### Bug 1 (CONFIRMED): 504 Gateway Timeout — Missing `dashboard-widgets-service`

**Symptom:** Every shell load triggers a 504 on `/api/shell/config/foundation`.

**Cause chain:**
- `gateway.env` has `DASHBOARD_WIDGETS_SERVICE_URL=http://127.0.0.1:4023` set.
- `services/gateway/src/server.ts` lines 1063–1084: when `DASHBOARD_WIDGETS_SERVICE_URL` is set, the gateway registers a proxy for `/api/shell/*` → port 4023.
- `dashboard-widgets-service` is **NOT running** — it is absent from the PM2 process list (confirmed: `pm2 list` shows no such process).
- When `ShellResolverService.fetchOverrides()` fires `moduleOverrides$` (calling `/api/shell/config/foundation`), the gateway proxy attempts port 4023, gets TCP connection refused, and responds with **504 after full connection timeout** (~30–60 seconds on typical Linux).
- `ShellResolverService.fetchOverrides()` at line 445: `catchError(() => of([]))` *does* handle the failure — but only **after the full TCP timeout**. There is **no `timeout()` operator** on the observable.
- Result: the shell hangs in `loading` state for 30–60 seconds on every navigation before the graceful fallback kicks in.

**Affected files:**
- `platform/core/platform/shell/shell-resolver.service.ts` — `fetchOverrides()` (lines 440–458)
- `platform/config-center/env/gateway.env` — `DASHBOARD_WIDGETS_SERVICE_URL` (line 22)

---

### Bug 2 (CONFIRMED): 404 Not Found — Missing tenant-service endpoint

**Symptom:** Browser console shows `GET /api/config-center/gateway/shell-override 404`.

**Cause chain:**
- `ShellResolverService.fetchOverrides()` at line 448–453 also calls `/api/config-center/gateway/shell-override`.
- The gateway routes `/api/config-center/*` → `tenant-service` (port 4002, running).
- `tenant-service` has **no handler** for `GET /config-center/gateway/shell-override`.
- Returns 404 immediately; `catchError(() => of([]))` handles it gracefully.
- Non-fatal but generates console noise on every shell load.

**Affected files:**
- `platform/core/platform/shell/shell-resolver.service.ts` — `workspaceOverrides$` (lines 448–453)

---

### Bug 3 (LIKELY STALE BUILD): NG0201 NullInjectorError

**Symptom:** `chunk-3JMMBR3O.js:4 ERROR w: NG0201` fires during `loadComponent` (twice per page load cycle).

**Investigation outcome:**
- The current source builds cleanly: `ng build` exits 0, zero TypeScript errors, Angular's `strictInjectionParameters: true` found no missing providers.
- All directly-injected services in `ShellHostComponent`, `WorkspaceHomeComponent`, and every sub-component and nav adapter are **`@Injectable({ providedIn: 'root' })`**.
- All `InjectionToken`s used (`COCKPIT_CONFIG`, `FOUNDATION_I18N`, `ACCESS_STORE_CONFIG`) are provided in `app.config.ts`.
- The error occurs from minified code (`chunk-HU6RFBS6.js`, `chunk-B7JFUUZI.js`); the actual missing token name is not visible in the log excerpt.
- The current source has a comment in `app.config.ts` line 74: *"Without this, NG0201 fires"* — indicating `COCKPIT_CONFIG` was previously the culprit and was already fixed.

**Most probable causes (in order of likelihood):**

1. **Stale production deployment**: The running SPA build predates the `COCKPIT_CONFIG` fix. The current source already has the fix. A fresh rebuild + redeploy of `products/shahin-ai/app` should resolve this.

2. **504 timing race**: The shell template renders `<router-outlet />` immediately when `isWorkspaceHome()` is true (template line 171–174) **without waiting for `shellState` to leave `loading`**. During the 30–60 second 504 hang, Angular loads `WorkspaceHomeComponent` and `ShellHostComponent` while shell config is still pending. If any component relies on data that the shell resolver was supposed to provide before rendering, this race could expose a secondary provider issue. Fixing Bug 1 (adding `timeout()`) will reduce the window for this race from 30–60s to 5s.

**Affected files:**
- `products/shahin-ai/app/dist/` — stale production build (redeploy required)
- Potentially `platform/core/platform/shell/shell-host.component.ts` line 171–174 — `isWorkspaceHome()` bypasses the loading guard

---

## Affected Components

| Component / File | Bug | Evidence |
|---|---|---|
| `platform/core/platform/shell/shell-resolver.service.ts` | Bug 1 + Bug 2 | `fetchOverrides()` — no timeout, broken endpoints |
| `platform/config-center/env/gateway.env` | Bug 1 | `DASHBOARD_WIDGETS_SERVICE_URL=:4023` pointing at dead service |
| `services/gateway/src/server.ts` | Bug 1 | Proxy registered for `/api/shell/*` only when `DASHBOARD_WIDGETS_SERVICE_URL` is set |
| `products/shahin-ai/app/` (deployed build) | Bug 3 | Stale build predates COCKPIT_CONFIG provider fix |
| `platform/core/platform/shell/shell-host.component.ts` | Bug 3 (secondary) | `isWorkspaceHome()` bypasses shell loading guard |

---

## Proposed Solution

### Fix 1 (HIGH PRIORITY — 1 file, 1 line change): Add timeout to `moduleOverrides$`

**File:** `platform/core/platform/shell/shell-resolver.service.ts`

Add `timeout(5000)` before `catchError` on `moduleOverrides$`. This makes the 504 fail fast (5 seconds) instead of waiting for the full TCP connection timeout (30–60 seconds). The `catchError` already handles the failure gracefully.

```typescript
// Before (line 440–446):
const moduleOverrides$ = this.http.get<{ overrides: ShellOverride[] }>(
  `/api/shell/config/${input.moduleCode}`,
  { params: { product: input.productCode, role: input.roleCode } },
).pipe(
  map(res => res.overrides || []),
  catchError(() => of([] as ShellOverride[])),
);

// After:
const moduleOverrides$ = this.http.get<{ overrides: ShellOverride[] }>(
  `/api/shell/config/${input.moduleCode}`,
  { params: { product: input.productCode, role: input.roleCode } },
).pipe(
  map(res => res.overrides || []),
  timeout(5000),
  catchError(() => of([] as ShellOverride[])),
);
```

Import needed: `timeout` from `rxjs/operators` (or `rxjs`).

### Fix 2 (MEDIUM PRIORITY — 1 file, remove call): Remove `workspaceOverrides$` or stub the endpoint

**Option A (preferred — remove dead call):** Remove the `workspaceOverrides$` call from `fetchOverrides()` since the `/api/config-center/gateway/shell-override` endpoint doesn't exist and the fallback is always empty. The `combineLatest` then simplifies to just `moduleOverrides$`.

**Option B (stub the endpoint):** Add a `GET /config-center/gateway/shell-override` handler to `tenant-service` that returns `{ override: null }`.

### Fix 3 (HIGH PRIORITY — redeploy): Rebuild and redeploy Shahin SPA

```bash
pnpm --filter shahin-ai-grc-frontend build
pm2 reload product-shell
```

This will pick up the existing `COCKPIT_CONFIG` provider fix and may fully resolve NG0201.

---

## Edge Cases and Side Effects

- **Fix 1 side effect**: A 5-second timeout means the shell config loads in at most 5 seconds when `dashboard-widgets-service` is down, instead of 30–60 seconds. Once `dashboard-widgets-service` is running, the override call will succeed within normal latency. The timeout value of 5000ms can be tuned.
- **Fix 2 side effect**: Removing `workspaceOverrides$` means no workspace-level shell overrides will ever be applied. This is already the effective behavior (the endpoint returns 404 and the fallback is empty). No functional regression.
- **Fix 3 side effect**: A rebuild will also compile any other pending source changes. Ensure the build is green before deploying.

---

## Summary Table

| Bug | Severity | Root Cause | Fix | File Count |
|---|---|---|---|---|
| 504 Gateway Timeout (30–60s hang) | P1 | `dashboard-widgets-service` not running, no HTTP timeout | Add `timeout(5000)` to `moduleOverrides$` | 1 |
| 404 shell-override (noise) | P2 | Missing tenant-service endpoint | Remove dead call from `fetchOverrides()` | 1 |
| NG0201 NullInjectorError | P0 | Stale production build (COCKPIT_CONFIG fix not deployed) | Rebuild + redeploy SPA | 0 (build only) |

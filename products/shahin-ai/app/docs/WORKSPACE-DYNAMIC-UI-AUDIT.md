# Workspace × Dynamic UI — focused audit (L1 nav only)

**Scope:** How the **workspace shell** obtains **L1 navigation** from Dynamic UI (`GET /api/dynamic-ui/workspace/nav`), how that is merged in `WorkspaceNavigationAdapter`, and how `ui-os-service` serves it.  
**Out of scope:** Full workspace content audit (cockpit, stubs, manifest drift, all L2–L6), module hubs, route restoration, DB backfill.

**Date:** 2026-05-02

---

## 1. End-to-end path (authoritative)

| Step | Component | Behavior |
|------|-------------|----------|
| 1 | `DynamicUiNavSource` | `HttpClient.get('/api/dynamic-ui/workspace/nav', { withCredentials: true })`, **800ms timeout**, `catchError` → `null` |
| 2 | Gateway | `authGuard` + `injectIdentityHeaders` → proxy to `UI_OS_SERVICE_URL` with path `/api/dynamic-ui` preserved |
| 3 | `ui-os-service` | `requireGatewayOrigin()` then contract router: `GET /workspace/nav` (full path `/api/dynamic-ui/workspace/nav`) |
| 4 | SQL | Reads `dos.dynamic_ui_routes` (platform + tenant rows), `readiness = active`, `title_key IS NOT NULL` |
| 5 | Response | `{ items: [...] }`; on error **still 200** with `{ items: [], warning }` |
| 6 | FE map | Each item gets `group ?? 'dynamic-ui'` |
| 7 | `WorkspaceNavigationAdapter` | L1 runs **concurrently** with L2–L5; merge by **`id`**; then tier-aware filter |

---

## 2. Source files (verification)

- **L1 client:** `platform/access/dos-access-store/src/nav-sources/dynamic-ui-nav.source.ts`
- **Merge / filter:** `platform/access/dos-access-store/src/nav-sources/workspace-navigation.adapter.ts`
- **Contract type:** `platform/ui-system/dos-ui-contracts/src/nav-contract.ts` (`DosNavItem`)
- **Backend handler:** `services/ui-os-service/src/routes/dynamic-ui-contract.routes.ts` (`router.get('/workspace/nav', ...)`)
- **Service mount:** `services/ui-os-service/src/server.ts` (`app.use('/api/dynamic-ui', ...)`)
- **Gateway proxy:** `services/gateway/src/server.ts` (`/api/dynamic-ui` → ui-os when `UI_OS_SERVICE_URL` set)

---

## 3. Backend payload vs `DosNavItem` (contract drift)

`ui-os-service` maps each DB row to:

```ts
{
  id: `${module_code}.${path_pattern}`,
  label: title_key,           // i18n key stored in `label` (not `labelKey`)
  route: path_pattern,
  group: module_code,
  permission: permission_key, // note field name
  enabled: true,
}
```

**Issues for the adapter and UI:**

| Finding | Severity | Detail |
|---------|----------|--------|
| `permission` vs `requiredPermission` | **High** | `DosNavItem` uses `requiredPermission`. Angular does not rename JSON fields. Unless another layer merges the same `id` with `requiredPermission`, **L1 items do not participate in `missing-permission` filtering** in `WorkspaceNavigationAdapter`. |
| `label` vs `labelKey` | **Medium** | `title_key` is placed in `label`. If the shell expects `labelKey` for i18n, **raw keys may display** unless the nav renderer resolves `label` as a key. |
| No `moduleCode` on item | **Medium** | Adapter’s **module tier** logic uses `moduleCode` for entitlement. L1 items default `__tier` to **`product`** (`it.__tier ?? 'product'`), so **they skip module entitlement / trial gates** (`not-entitled`, `trial-*`). Only `route-not-wired` and optional permission apply. |
| No `enabled: false` / `disabledReason` from API | Low | Adapter recomputes `enabled`; initial `enabled: true` from API is fine. |

---

## 4. Server-side authorization on `/workspace/nav`

- Handler selects rows by `(tenant_id IS NULL OR tenant_id = $1)` using **principal tenant** or **`x-dos-tenant-id` header**.
- **No permission join:** every matching active route with a title is returned to the browser for that tenant scope. Page-level authorization still applies on navigation targets, but this endpoint **enumerates navigable-looking routes** to any authenticated user who can call the gateway.
- Comparison: `GET /page-experience` applies `permission_key` vs `req.principal.permissions`; **`/workspace/nav` does not**.

---

## 5. Failure and “silent skip” behavior

| Condition | FE behavior | UX impact |
|-----------|-------------|-----------|
| Timeout (>800ms) | `catchError` → `null` → **entire L1 skipped** | No Dynamic UI contributions; reliance on L2–L6 only |
| Non-2xx | Same | Same |
| `items` missing / not array | `null` | Same |
| ui-os down | Gateway may return **503** with `items: []` (see gateway `onError`) | L1 likely null/empty |
| DB error in handler | **200 + `items: []` + `warning`** | L1 contributes nothing; no throw to shell |

Comment in `DynamicUiNavSource` references dynamic-ui being **`.skipped`** historically; with gateway + ui-os wired, L1 is **best-effort** and still easy to lose to timeout or empty DB.

---

## 6. Merge semantics (layer order `[L1, L2, L3, L4?, L5]`)

When an `id` is already present and a later layer adds the same `id`, the merged object uses:

```ts
{ ...it, ...existing, icon: existing.icon ?? it.icon, route: ...,
  requiredPermission: existing.requiredPermission ?? it.requiredPermission, ... }
```

- **`{ ...it, ...existing }`**: `existing` wins on overlapping literal keys (`id`, `enabled`, etc.).
- **Explicit `??` lines**: **`requiredPermission`** (and `icon`, `route`, `labelKey`, `moduleCode`, `group`) take **`existing` first**, then **`it`** — so **later layers fill gaps left by earlier layers** for those fields.

**Takeaway:** If L1 emits `permission` (non-standard) instead of `requiredPermission`, a **later layer must emit the same `id`** with `requiredPermission` set — otherwise **workspace nav never receives a permission gate** from Dynamic UI rows alone.

`enabled` / `disabledReason` are **recomputed** in the filter pass below this merge (`WorkspaceNavigationAdapter` lines ~118–163).

---

## 7. Recommended follow-ups (audit-only; no code in this doc)

1. Align JSON: backend emits `requiredPermission` (or FE maps `permission → requiredPermission` in `DynamicUiNavSource`).
2. Set `labelKey` from `title_key` and reserve `label` for a fallback string, **or** document that shells must treat `label` as i18n key.
3. Decide tier: either set `__tier: 'module'` + `moduleCode` on Dynamic UI items, or explicitly document L1 as **product-tier-only** (no entitlement gate).
4. Optionally filter `/workspace/nav` by principal permissions server-side (defense in depth vs enumeration).
5. Revisit **800ms** timeout vs latency of DB + cold gateway; observability on L1 skip rate.

---

## 8. Quick verification commands (environment permitting)

```bash
# Gateway + ui-os paths (authenticated — use session/cookie as appropriate)
curl -sI "http://localhost:4000/api/dynamic-ui/workspace/nav"

# ui-os health (direct if exposed)
curl -s "http://localhost:4015/api/dynamic-ui/health"

# DB row counts (credential from workspace rules / auth-service.env)
PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc \
  -c "SELECT COUNT(*) AS active_workspace_nav_rows FROM dos.dynamic_ui_routes WHERE COALESCE(readiness,'active')='active' AND title_key IS NOT NULL;"
```

---

## 9. Relation to full workspace audit

The broader pre-code audit lives in **`WORKSPACE-CONTENT-AUDIT.md`**. **This document** is the narrow slice: **Dynamic UI ↔ workspace sidebar L1 only**.

# Workspace Entry — Production Baseline (2026-04-24)

Frozen reference point for the first end-to-end working
`https://shahin-ai.com/login → /workspace-home` flow. No further changes
should be merged without first re-validating against this baseline.

---

## 1. Login user used for proof

| Field | Value |
|------|------|
| email | `doganlap+e2e-1777020322813@gmail.com` |
| temporary password (KC reset) | `DoganLap!Proof2026#01` |
| keycloak realm | `dogan` |
| keycloak sub | `2b02a774-de4c-45e3-9a36-0ac738a77930` |
| `public.users.user_id` | `271ef79a-82fe-4896-a648-2bc916af3e86` |
| `public.tenants.tenant_id` | `35c6a887-389f-433e-abb3-3dedc8911406` |
| `public.iam_identities` mapping | present (`provider='keycloak'`, `external_subject=<sub>`) |
| `public.tenant_user_memberships` | present, `status='active'` |

---

## 2. Final route reached

```
/login (SPA)
 → /api/auth/oidc/start?mode=login&returnUrl=%2Fworkspace-home
 → https://auth.shahin-ai.com/realms/dogan/protocol/openid-connect/auth (KC form)
 → /api/auth/oidc/callback?code=…&state=…
 → 302 Location: /workspace-home?token=<RS256>&tenantId=<...>&userId=<...>
 → SPA absorbs token via SessionService.bootstrapToken() (URL param scrubbed)
 → /workspace-home renders (KPI band + sidebar visible)
```

Observed visual: workspace shell mounts, KPI grid (6 cards = 0), Risk
module page reachable at `/risk/home`. **No NG0201, no Arabic
GlobalErrorHandler toast, no blank page.**

---

## 3. Endpoint statuses (token-authorized, via gateway :4000)

| Endpoint | Status | Notes |
|---------|-------|-------|
| `GET /api/access/my-permissions` | **200** | returns `permissions:[]` because owner-branch SQL drift; middleware short-circuits via `is_tenant_owner=true` so APIs are still authorized. |
| `GET /api/tenants/home/overview` | **200** | full payload; tenant-isolation gate verified before `requirePermission('platform.tenant.read')`. |
| `GET /api/users` | **200** | NULL-shimmed columns return shape valid for SPA. |

---

## 4. Files changed in this baseline

### A — Source tree (tracked, uncommitted)

| File | Hunks | Purpose |
|------|------|---------|
| `platform/dauth/packages/shared/src/adapters/keycloak-payload.mapper.ts` | +10 lines (after `is_super_admin` block) | surface `is_tenant_owner=true` when KC token has `dos_role_profile='tenant_admin'` or realm role `tenant_admin`. |
| `services/user-service/src/domain/user.service.ts` | `USER_COLUMNS` constant rewritten | alias missing schema columns with typed NULL casts (`dashboard_role`, `department_id`, `language`, `job_title`); remap `last_login AS last_login_at`. |
| `frontend/products/shahin/src/app/blueprint/app.config.ts` | +2 lines | import + register `provideShahinCockpitConfig` so `inject(COCKPIT_CONFIG)` resolves. |

### B — Already committed (prior portion)

| Commit | Files | Purpose |
|-------|-------|---------|
| `2c0b3129e` | `platform/dauth/services/auth-service/src/domain/identity/keycloak-oidc-flow.service.ts` (and helpers) | route OIDC backchannel through `KEYCLOAK_INTERNAL_BASE_URL=http://127.0.0.1:8180` with forged `Host: auth.shahin-ai.com` + `X-Forwarded-Proto: https`. Issuer integrity preserved. |

### C — Untracked working files (NOT to commit)

```
platform/dauth/docs/OIDC_TOKEN_EXCHANGE_RUNBOOK.md   (draft runbook from prior portion)
platform/dauth/scripts/                              (debug scripts directory)
platform/dauth/services/auth-service/src/__tests__/keycloak-oidc-token-exchange.test.ts
frontend/products/shahin/.angular/cache/...          (build cache; gitignore candidate)
```

---

## 5. Env / runtime changes

`platform/config-center/env/.env.shared` (already present, no edit this session — included
for completeness because services depend on these values):

```
KEYCLOAK_BASE_URL=https://auth.shahin-ai.com
KEYCLOAK_INTERNAL_BASE_URL=http://127.0.0.1:8180
KEYCLOAK_ISSUER=https://auth.shahin-ai.com/realms/dogan
KEYCLOAK_AUDIENCE=shahin-bff
KEYCLOAK_OIDC_CLIENT_ID=shahin-bff
KEYCLOAK_OIDC_REDIRECT_URI=https://shahin-ai.com/api/auth/oidc/callback
KEYCLOAK_JWKS_URL=http://127.0.0.1:8180/realms/dogan/protocol/openid-connect/certs
```

All non-auth services (37 of them) re-read this via
`pm2 startOrReload ops/ecosystem.all.config.js --update-env` in the
prior portion so JWKS verification uses the loopback URL.

`product-shell` runs with `SPA_DIR=/root/DOS-AIO/frontend/products/shahin/dist/shahin-grc/browser`
(overrides default `frontend/products/shahin-ai/...` path baked into the
compiled `services/product-shell/dist/server.js`).

---

## 6. Nginx changes

`/etc/nginx/sites-enabled/dos-platform`. Backups: `/tmp/dos-platform.nginx.bak`, `/tmp/dos-platform.nginx.bak2`.

Added to **all four** `location = /api/auth/oidc/callback` blocks
(lines 192, 342, 566, 706 — covers `dogan-ai.com`,
`admin.dogan-ai.com`, `shahin-ai.com`, `www.shahin-ai.com`):

```
proxy_buffer_size 32k;
proxy_buffers 8 32k;
proxy_busy_buffers_size 64k;
```

Reload performed: `nginx -t && nginx -s reload`. Both clean.

Reason: 302 `Location` header carries the full ~1.9 KB RS256 access
token in the query string; default 4 KB `proxy_buffer_size` triggers
`upstream sent too big header → 502 Bad Gateway`.

---

## 7. PM2 reload commands actually used

```
pm2 startOrReload ops/ecosystem.all.config.js --update-env   # (prior portion — JWKS env propagation)
pm2 restart auth-service tenant-service user-service gateway --update-env   # (prior portion — payload mapper)
pm2 restart user-service --update-env                        # (prior portion — USER_COLUMNS)
pm2 restart product-shell --update-env                       # (this portion — cockpit provider)
```

Current state (verified):

```
auth-service     online  restarts=6   pid=543782
gateway          online  restarts=8   pid=543711 / 543729 (cluster=2)
tenant-service   online  restarts=12  pid=543747
user-service     online  restarts=9   pid=546038
onboarding-service online restarts=10 pid=538333
product-shell    online  restarts=12  pid=559870
```

No KC, OpenFGA, Postgres, Redis restart this session.

---

## 8. Frontend build

Performed once this session:

```
PATH=/usr/bin:$PATH pnpm --dir frontend/products/shahin run build
```

Output: `frontend/products/shahin/dist/shahin-grc/browser` — 84.2 s,
`main-52LZ35RS.js` (337 kB transfer), `chunk-77IGM5VF.js`
(workspace-home-component, 18.74 kB transfer). Bundle confirmed to
import `chunk-EHIHIQUQ.js` (the `COCKPIT_CONFIG` token).

Node v24.14.1 (`/usr/bin/node`) used because Angular CLI requires
≥ v20.19; default `/root/.cursor-server/bin/.../node` is v20.18.2.

---

## 9. Browser-side proof

| Check | Result |
|------|-------|
| KC login form rendered | yes |
| Callback HTTP status | 302 (no more 502) |
| Final URL | `/workspace-home?token=…&tenantId=…&userId=…` |
| `localStorage.dos_access_token` populated | yes |
| URL token scrubbed by `readUrlToken()` | yes |
| `WorkspaceHomeComponent` mounted | yes (visible in screenshot) |
| Risk module routed (`/risk/home`) | yes |
| GlobalErrorHandler Arabic toast | not displayed |

---

## 10. Remaining issues (NOT addressed in this baseline)

Ranked by user-visible severity.

### S1 — Functional but cosmetically broken
- `/risk/home` template shows two narrow vertical tab strips (`AI`, `النشاط`, `مرتبط`, `التدقيق`, `تعليقات`) docked oddly to the left and a 404 placeholder below the KPI band. Likely `data-driven` widgets failing to load detail/list configs from a non-existent module-config endpoint.
- Cloudflare beacon CSP block (`static.cloudflareinsights.com`). Pure noise; not user-facing.

### S2 — Authorization/permissions still synthetic
- `access-snapshot.service.ts` owner branch executes
  `SELECT code FROM platform_dauth.permissions WHERE is_active = TRUE`
  against a schema where the actual columns are `permission_code` and
  there is no `is_active` column. The `.catch(() => ({rows: []}))`
  swallows the failure → `permissions:[]` always for owners.
  - Today this works only because the tenant-owner short-circuit at
    [./platform/dauth/packages/shared/src/canonical-middleware.ts:326](./platform/dauth/packages/shared/src/canonical-middleware.ts:326)
    bypasses `requirePermission`.
  - Any feature gating purely on `access.hasPermission(...)` in the
    SPA will under-report.

### S3 — `SessionService` claims-mapping mismatch
- The KC token uses `dos_tenant_id`, `dos_user_id`, `dos_role_profile`,
  and `realm_access.roles`. The frontend [./frontend/products/shahin/src/app/blueprint/core/dauth/session/session.service.ts:60](./frontend/products/shahin/src/app/blueprint/core/dauth/session/session.service.ts:60)
  reads `tenantId`, `userId`, and a flat `role` field that don't exist
  on the JWT.
  - `currentRole()` returns `'viewer'`
  - `tenantId()` returns `null`
  - `isSuperAdmin()` always false
  - `userId()` falls back to KC `sub` (not platform user_id)
- These don't block render today but will break any
  `enterprisePermissionGuard`, `hasPermission` UI gating,
  or tenant-scoped network call that depends on SessionService.

### S4 — `user-service` write paths still drift
- `createUser` / `updateUser` reference `department_id`, `language`,
  `job_title` columns that don't exist on `public.users`. These will
  500 on first write. SELECT path was patched; write path was not.

### S5 — Dual callback location blocks for the dogan side
- `admin.dogan-ai.com` vhost still has its own `/api/auth/oidc/callback`
  block. It now carries the buffer fix, but the admin vhost was never
  validated against a real KC login this session — only shahin.

### S6 — Operational hygiene
- Backup files left at `/tmp/dos-platform.nginx.bak{,.2}`. Consider
  retaining or moving to `ops/backups/`.
- Unbuilt frontend cache dir (`.angular/cache/...`) shows up in
  `git status`. Already-known noise; should be in `.gitignore` if
  not.

---

## 11. Change classification

| # | Change | Class | Notes |
|---|--------|------|------|
| 1 | `keycloak-payload.mapper.ts` — surface `is_tenant_owner` | **A keep & commit** | Correct semantic mapping; tenant isolation gate prevents privilege leakage. |
| 2 | `app.config.ts` — register `provideShahinCockpitConfig` | **A keep & commit** | Provider was always intended; just never wired. Unblocks workspace-home render. |
| 3 | nginx `proxy_buffer_size 32k` on callback blocks (×4) | **A keep & commit** (config-as-code if mirrored to repo) | Standard fix; no downside; required while KC tokens remain in 302 query string. |
| 4 | `kcInternalFetch` backchannel commit `2c0b3129e` | **A keep** (already committed) | Foundational; required for any deployment where public KC host is not server-reachable. |
| 5 | `user-service` `USER_COLUMNS` NULL shims | **C temporary workaround** | Hides schema drift, doesn't fix it. Real fix: add the columns via migration **or** remove fields from `UserProfile` interface and frontend. Re-evaluate during Step 7. |
| 6 | KC password reset for test user | **C temporary workaround** | Test-data state, not code. Acceptable until self-register flow proven. |
| 7 | PM2 watch + `--update-env` reloads | **A keep** | Standard ops step; document in runbook. |
| 8 | `SPA_DIR` override on `product-shell` | **B refactor later** | The compiled `services/product-shell/dist/server.js` still defaults to `frontend/products/shahin-ai/...`. Either rename the dir or update the source default. |

No **D revert candidates** at this baseline.

---

## 12. Pre-merge checklist (when committing this baseline)

1. `git diff` review of the three tracked files (no debug logs, no
   `console.log`, no commented-out blocks).
2. Run `pnpm --filter @dos/dauth-shared build` to confirm the payload
   mapper still compiles.
3. Run `pnpm --filter @shahin/frontend build` (with Node ≥ 20.19) to
   confirm the SPA bundle is reproducible.
4. Mirror the nginx delta into the repo's
   `ops/nginx/dos-platform.conf` (or wherever the source-of-truth
   config lives) so the next host bootstrap inherits the buffer fix.
5. Tag the commit `baseline/workspace-entry-2026-04-24` so the next
   stabilization step has a precise rollback target.

---

*Recorded: 2026-04-24, Asia/Riyadh evening. No code, env, or
service-level state changes were made while writing this baseline.*

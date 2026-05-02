  # onboarding-service Runbook

## What it owns

Tenant onboarding flow end-to-end: registration (CAPTCHA + password), email verification, the question-bank-driven interview, AI-suggested governance context, foundation-intake preview (regulators/frameworks/modules), provisioning intent derivation + provisioning_jobs orchestration, workspace handoff, post-provision dispatch. Also hosts the public invitation accept/validate/accept-register surfaces (A1 backend, commit `bef196e8`).

Not owned (lives elsewhere):
- Auth tokens, sessions, MFA, SCIM → `auth-service`
- Tenant-user CRUD after onboarding completes → `user-service`
- Notification delivery → `notification-service`
- DAuth invitation entity (`platform_dauth.invitations`) writer is owned by `auth-service`; onboarding-service is a *reader* + accept-flow consumer

## Startup

```bash
# Build (writes to dist/)
pnpm --filter @dos/onboarding-service build

# Start via pm2 (declared in ops/ecosystem.m1.config.js)
pm2 startOrReload ops/ecosystem.m1.config.js --only onboarding-service --update-env
```

Path note: the source tree lives at `Onboarding Module/services-onboarding-service/`. The pm2 entry uses `cwd: path.join(repoRoot, 'Onboarding Module', 'services-onboarding-service')` + `script: 'dist/server.js'` so the space in the legacy folder name never reaches a shell. Do NOT change the absolute-path form — it breaks pm2's bash-wrapped exec.

### Required env vars

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection (loaded by platform/config-center/env loader) |
| `REDIS_URL` | — | Event-bus + CAPTCHA cache + rate-limit |
| `PORT` | 4010 | HTTP port |
| `LOG_LEVEL` | info | pino level |
| `RLS_ENABLED` | true (prod) | Required for RLS-on-tquery to take effect |
| `INVITATION_TTL_HOURS` | 72 | Default expiry on `POST /invitations` |
| `DEFAULT_PLATFORM_MODE` | manual | Fallback when `tenants.settings.platform_mode` is unset |
| `JWT_SECRET` | — | Used by `lifecycle-registration-helpers.issueAccessToken/issueRefreshToken` |

### Health endpoints

- `GET /health` — 200 once Redis + DB are reachable. Bootstrap fails fast on Redis NOAUTH.
- `GET /api/onboarding/info` — service metadata (version, time)
- (TODO) `/metrics`, `/ready`

## Common failure modes

### Service won't start: `[onboarding-service] Redis connection failed at startup`
- Service hard-fails when Redis is unreachable because CAPTCHA + rate-limiter rely on it. Verify `REDIS_URL` and that the password matches.

### Service won't start: `/usr/bin/bash: line 1: /root/DOS-AIO/DOS: No such file or directory`
- The pm2 entry is using the legacy `script:` absolute-path form. The space in `DOS Platform` breaks bash invocation. Switch the entry to `cwd:` + relative `script: 'dist/server.js'`. See `ops/ecosystem.m1.config.js` and the entry comment.

### `POST /api/onboarding/invitations/validate` → 401
- Wrong URL: the public routes are at `/api/onboarding/invitations/validate`, NOT `/api/onboarding/public/invitations/validate`. The 401 means an authenticated handler intercepted the request, which means either the path is wrong or the public router was mounted *after* an auth-applying parent (regression).

### `POST /api/onboarding/invitations/validate` → 404 with `code: NOT_FOUND` for a known token
- The token has been consumed, expired, or was never issued. Constant-shape error means the body intentionally doesn't disclose token-vs-tenant mismatch — check `platform_dauth.invitations` directly:
  ```sql
  SELECT id, email, tenant_id, expires_at, accepted_at FROM platform_dauth.invitations WHERE token_hash = $1;
  ```

### Provisioning stuck in `queued`
- Provisioning is driven by `provisioning_jobs` rows + `provisioning-step-runner.service.ts`. Stuck state usually means the worker process isn't draining. Check pm2 status and `provisioning_step_runs` for the latest job:
  ```sql
  SELECT step_code, status, started_at, completed_at, error_message FROM public.provisioning_step_runs WHERE job_id = $1 ORDER BY attempt DESC, started_at DESC;
  ```

### `[runtime-config] failed to load X`
- Non-fatal. The runtime-config bridge falls back to env-vars. If a feature flag isn't taking effect, verify the row exists in `dos.platform_operation_config`.

### Recommendations endpoint returns empty
- `recommendations.service.ts` opens one client per call. If it returns empty, check that one of the seven rule files isn't throwing — each individual rule is wrapped in `.catch(() => [])` so a SQL error fails silently. Tail logs for `[recommendations]` warnings.

### Inference resolver inconsistency between requests
- `inference-resolver.service.ts` caches by inputs-fingerprint. If a client modifies answers but sees stale inference, verify the bundle's `inputsFingerprint` changed. Force a refresh by `DELETE FROM public.onboarding_inference_bundles WHERE session_id = $1`.

## Rollback

```bash
# Service-level — restart with previous dist
git checkout HEAD~1 -- "Onboarding Module/services-onboarding-service"
pnpm --filter @dos/onboarding-service build
pm2 reload onboarding-service --update-env

# Migration-level — see SQL Reorg note: Onboarding migrations live at
# `modules/onboarding/db/`. Roll a single migration with the dos_migrator
# down command; never roll past 001 without coordinating with auth-service
# (which co-owns public.users + public.tenants).
```

## Tenant isolation invariant

Every DB access in onboarding-service MUST go through one of:
- `tquery(tenantId, sql, params)` — for tenant-scoped reads/writes; wraps `withTenantClient` so RLS sees the right `app.current_tenant_id`.
- `pquery(sql, params)` — for genuinely cross-tenant paths (catalog lookups, registration before a tenant exists, operator dashboards).

Both helpers live in [`src/db/with-tenant.ts`](../../Onboarding%20Module/services-onboarding-service/src/db/with-tenant.ts). The CI gate `ops/scripts/check-no-bare-safequery.sh "Onboarding Module/services-onboarding-service"` enforces this — passes as of 2026-04-30. If the gate starts allowing violations, treat it as a P0 incident.

## Open follow-ups (P1)

- Migrate `services/journey-resolver.service.ts` and `services/inference-resolver.service.ts` from `pquery` to `tquery` (requires threading `tenantId` through their callers).
- Build the integration test suite (`tests/integration/cross-tenant-isolation.test.ts`).
- Snapshot `openapi.json` and add CI diff guard.
- Replace stub `__prr*` markers with real PRR-tracking metrics in `src/observability/metrics.ts`.

## Escalation

- Primary: platform-platform-team
- Secondary: dauth-team (invitation accept flow, KC interaction)
- Compliance questions (RLS regressions, tenant leak): security-team

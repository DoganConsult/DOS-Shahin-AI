# Production Readiness Review — user-service

> PR cannot merge unless every box below is green. This file is the single source of truth for the gate.

Service: `services/user-service/`
Owner: platform team
Reviewer: (fill in)

## 1. Data layer

- [ ] Every table has `tenant_id` or is explicitly global
- [ ] Missing tables created:
  - [ ] `dos.user_role_assignments` (migration `002_user_role_assignments.sql`)
  - [ ] `public.user_view_preferences` (migration `003_user_view_preferences.sql`)
- [ ] Indices present on `(tenant_id)`, `(tenant_id, user_id)`, `(tenant_id, team_id)`, `(tenant_id, role_id)` (migration `004_user_rls_and_indices.sql`)
- [ ] RLS enabled + `tenant_isolation` policy on `dos.teams`, `dos.departments`, `dos.user_role_assignments`, `public.user_view_preferences`
- [ ] All migrations have `*_down.sql`

## 2. Tenant isolation

- [ ] `ops/scripts/check-no-bare-safequery.sh services/user-service` exits 0
- [ ] Every DB access is via `withTenantClient(tenantId, async (c) => c.query(...))`
- [ ] Allowlist in gate is minimal and documented (currently `src/server.ts` healthcheck)
- [ ] Cross-tenant leak test extended to cover user-service endpoints (`tests/integration/cross-tenant-isolation.test.ts`)

## 3. Validation & security

- [ ] Every POST/PUT/PATCH goes through Zod `validate()` — no inline `if (!field)` checks
- [ ] Rate limiting on writes: `POST /api/users`, `POST /api/users/:id/roles`, `POST /api/teams`, bulk-invite
- [ ] Ownership guard (`requireSelfOrAdmin`) on profile mutation
- [ ] Admin-only guard on destructive ops
- [ ] Error envelope matches `UserServiceError` contract

## 4. Observability

- [ ] `logger` from `@dos/platform-core/observability` used everywhere (no `console.*`)
- [ ] `correlationId` propagated (inherited from bootstrap `correlationMiddleware`)
- [ ] User-service business counters registered on shared registry (`src/observability/metrics.ts`)
- [ ] Health checks cover: database, redis, schema (migrations applied)
- [ ] `/metrics`, `/ready`, `/health` all respond

## 5. Error handling

- [ ] `src/domain/contracts/user-errors.ts` covers all documented error codes
- [ ] Every thrown error uses `UserServiceError` (status, code, message, correlationId, detail)

## 6. Event bus

- [ ] Every state transition publishes an event (user.*, team.*, role.*, raci.*, dept.*, view_pref.*)
- [ ] Publisher errors logged (no swallowed `.catch(() => {})`)
- [ ] Consumer handlers wrapped in `safeHandler` with metrics + logging
- [ ] Subscriptions cover: `auth.login_success`, `tenant.user_provisioned`, `foundation.dept_updated`, `tenant.deleted`, `auth.user_suspended`

## 7. Tests (gate)

- [ ] Unit tests co-located with each service (`*.service.test.ts`)
- [ ] Route integration tests under `src/__tests__/` cover every registered endpoint
- [ ] Each route test covers: 200, 400 (validation), 401 (unauth), 403 (permission), 404 (not found), 409 (conflict), tenant-isolation (A-into-B → 404)
- [ ] `pnpm --filter user-service test --coverage` passes thresholds: **lines ≥ 90 %**, **branches ≥ 85 %**, **functions ≥ 90 %**
- [ ] `pnpm --filter user-service stryker run` passes **mutation score ≥ 75 %**

## 8. OpenAPI contract

- [ ] Every Zod schema uses `.describe()` on fields
- [ ] `services/user-service/openapi.json` snapshot committed
- [ ] CI diff: runtime-generated spec matches snapshot

## 9. Runbook & alerts

- [ ] `ops/runbooks/user-service.md` present (startup, env vars, failure modes, rollback, escalation)
- [ ] `ops/monitoring/alerts.yml` entries: 5xx rate, DB p99, event consumer lag, health probe

## 10. Load test baseline

- [ ] `ops/scripts/load/user-service.ts` present
- [ ] Baseline documented in runbook
- [ ] p95: GET ≤ 100 ms, PUT ≤ 250 ms, 500 RPS sustained read mix

## 11. Foundation routes (deferred, but tracked)

- [x] Tenant isolation via `tenantQuery(req, …)` helper (WS-2 minimum bar)
- [ ] Per-entity `foundation/<entity>.service.ts` extraction (inline SQL still in routes)
- [ ] Zod schemas on all foundation write endpoints

## Sign-off

- [ ] Owner: ___________________________  Date: __________
- [ ] Reviewer: ________________________  Date: __________

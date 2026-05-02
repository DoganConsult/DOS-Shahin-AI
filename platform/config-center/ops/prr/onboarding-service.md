  # Production Readiness Review — onboarding-service

> PR cannot merge unless every box below is green. This file is the single source of truth for the gate.

Service: `Onboarding Module/services-onboarding-service/`
Owner: platform team
Reviewer: (fill in)

## 1. Data layer

- [ ] Every table has `tenant_id` or is explicitly global
- [ ] Tables in scope:
  - [x] `public.onboarding_sessions` (tenant_id present)
  - [x] `public.onboarding_session_answers` (session_id → onboarding_sessions.tenant_id)
  - [x] `public.onboarding_session_progress` (session_id linkage)
  - [x] `public.onboarding_inference_bundles` + `_items` (session linkage)
  - [x] `public.provisioning_jobs` + `provisioning_steps` + `provisioning_step_runs`
  - [x] `public.onboarding_provisioning_intent` (tenant_id present)
  - [x] `public.onboarding_session_journey` (session linkage)
  - [x] `onb.ai_suggestions` (session linkage)
  - [x] `onb.product_packs`, `onb.pack_modules` (catalog — global)
  - [x] `platform_dauth.invitations` (tenant_id present, used by A1 backend)
- [ ] Indices: confirm `(tenant_id, status)` on `onboarding_sessions`, `(session_id)` on every child table
- [ ] RLS enabled + `tenant_isolation` policy on every tenant-scoped table
- [ ] All migrations have `*_down.sql`

## 2. Tenant isolation

- [x] `ops/scripts/check-no-bare-safequery.sh "Onboarding Module/services-onboarding-service"` exits 0 (94 files scanned, 0 violations as of 2026-04-30)
- [x] Service-local helpers in `src/db/with-tenant.ts`:
  - `tquery(tenantId, sql, params)` wraps `withTenantClient` for tenant-scoped queries
  - `pquery(sql, params)` wraps `withClient` for cross-tenant operator/catalog/pre-tenant paths
- [x] Recommendations subsystem refactored to bind `query` to a single client per evaluation (no per-rule connection churn)
- [ ] **Follow-up: services/journey-resolver.service.ts and services/inference-resolver.service.ts currently use `pquery` because their function signatures predate the tenantId-as-arg pattern. They preserve current isolation semantics (the legacy `safeQuery` they replaced did not set the RLS GUC either) but should migrate to `tquery` once their callers are refactored to thread `tenantId` through.**
- [ ] Cross-tenant leak test extended to cover onboarding endpoints (`tests/integration/cross-tenant-isolation.test.ts` — does not yet exist for this service)

## 3. Validation & security

- [x] Public invitation routes (`routes/invitations.public.routes.ts`) use Zod `validate({ body })` on every handler
- [x] Rate-limiter wired on `invitations:validate` (30/min), `invitations:accept` (10/min), `invitations:accept-register` (5/min)
- [ ] Authenticated route audit: confirm every `POST/PUT/PATCH` goes through Zod
- [ ] Ownership guard (`requireSelfOrAdmin`-equivalent) on session mutations
- [x] CAPTCHA verification on registration path (`@dos/platform-core verifyCaptcha`)
- [ ] Error envelope matches a single `OnboardingServiceError` contract (currently mixed shapes; see invitations.public.routes.ts → constant-shape errors as the target)

## 4. Observability

- [x] `logger` from `@dos/platform-core/observability` used in routes; no `console.*` in service src (verified by grep 2026-04-30)
- [x] `correlationId` propagated via bootstrap middleware
- [ ] Onboarding business counters registered on shared registry (`src/observability/metrics.ts` does not yet exist)
- [x] Health endpoint (`/health`) responds 200 (verified live 2026-04-30)
- [ ] `/metrics`, `/ready` endpoints

## 5. Typecheck (gate)

- [x] `npx tsc --noEmit -p .` exits 0 (was 298 errors on 2026-04-30; landed clean after `tsconfig.base.json` paths drop + 81 narrowing/return-type fixes)

## 6. Error handling

- [ ] `src/contracts/onboarding-errors.ts` covers all documented error codes
- [ ] Every thrown error uses a typed error class with `{status, code, message, correlationId, detail}`
- [x] DB error classification in `routes/session-data.routes.ts:classifyDbError` (503 for connection-class, 500 for others)

## 7. Event bus

- [x] Domain events published on session lifecycle (`session_created`, `provisioning.requested`, etc.) via `events/publisher.ts`
- [x] Consumer registered in `events/consumer.ts`
- [ ] Subscription audit: confirm coverage of `auth.user_registered`, `tenant.created`, `provisioning.completed`

## 8. Tests (gate)

- [ ] Unit tests co-located with each service (`*.service.test.ts`)
- [ ] Route integration tests cover every registered endpoint (currently `__tests__/invitations-public-routes.test.ts` exists for A1 backend; many other routes lack tests)
- [ ] Known failures (must fix before promotion):
  - [ ] `provisioning-controller-path.test.ts`
  - [ ] `workspace-ready-event.test.ts`
  - [ ] `onboarding-contract.test.ts`
- [ ] `pnpm --filter @dos/onboarding-service test --coverage` passes: lines ≥ 90 %, branches ≥ 85 %, functions ≥ 90 %
- [ ] `pnpm --filter @dos/onboarding-service stryker run` passes mutation score ≥ 75 %

## 9. OpenAPI contract

- [ ] Every Zod schema uses `.describe()` on fields
- [ ] `Onboarding Module/services-onboarding-service/openapi.json` snapshot committed
- [ ] CI diff: runtime-generated spec matches snapshot

## 10. Runbook & alerts

- [ ] `ops/runbooks/onboarding-service.md` present (startup, env vars, failure modes, rollback, escalation)
- [ ] `ops/monitoring/alerts.yml` entries: 5xx rate, DB p99, event consumer lag, invitation-token-validation failures, provisioning_jobs queue depth

## 11. Load test baseline

- [ ] `ops/scripts/load/onboarding-service.ts` present
- [ ] Baseline documented in runbook
- [ ] p95: GET ≤ 150 ms, POST ≤ 400 ms, 200 RPS sustained mix

## 12. A1 invitation backend (bef196e8) — extra checklist

- [x] Public invitation routes (`/validate`, `/accept`, `/accept-register`) deployed and serving (verified 2026-04-30 — 404 NOT_FOUND on fake token)
- [x] `optionalAuthenticate` adapter wired (so authenticated re-accept and unauthenticated magic-link both work)
- [x] Constant-shape error envelope on `/validate` so timing/body don't leak token vs tenant mismatch
- [ ] End-to-end test against a real Keycloak realm
- [ ] Frontend `invitation-accept.component.ts` regression test

## Sign-off

- [ ] Owner: ___________________________  Date: __________
- [ ] Reviewer: ________________________  Date: __________

# ADR 002: CSRF policy GET — anonymous defaults + JWT-only tenant

## Status

Accepted

## Context

The SPA (Shahin Angular) calls `GET /api/csrf/policy` on a timer after CSRF token bootstrap. Some callers have **no** `Authorization: Bearer` yet. The gateway previously mounted `GET /api/csrf/policy` with **`authenticate`**, which rejects missing Bearer with **401** before the route handler could return `getCsrfPolicyDefaults()`.

## Decision

**Contract B — public read for policy defaults**

1. **`GET /api/csrf/policy`** uses **`optionalAuthenticate`** (not mandatory `authenticate`).
2. **Tenant-specific** `getCsrfPolicy(tenantId)` is used only when a **verified principal** exists (`req.user` after optional JWT validation). Optional `x-tenant-id` is considered **only** together with that authenticated context — not for anonymous reads (avoids tenant policy probing).
3. If there is no authenticated tenant context, respond with **`getCsrfPolicyDefaults()`** from `@dos/dauth-csrf` (HTTP **200**).
4. Mutating or sensitive CSRF routes (`PUT /policy`, diagnostics, failures, session-health) remain **`authenticate`** + permissions as before.

## Alternatives considered

- **Contract A — authenticated-only:** Require Bearer before any policy read; SPA would need to defer `_loadPolicy()` until after login — higher friction and inconsistent with cookie/bootstrap flows.

## Consequences

### Positive

- Anonymous and cookie-first clients can align CSRF rotation intervals with server defaults without a prior auth round-trip.
- Reduces spurious **401** noise in DevTools on policy refresh.

### Negative

- Deploy drift: environments running an older gateway build will still return **401** until redeployed; operators must verify with `curl` after release (see `docs/evidence/2026-04-17-csrf-policy-and-register.md`).

## Implementation reference

- `services/gateway/src/routes/csrf.routes.ts`
- Module note: `docs/modules/onboarding-new-user-lifecycle.md`

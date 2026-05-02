# ADR 003: Public vs. Authenticated Route Split at the Gateway

## Status

Accepted

## Context

The platform gateway (`services/gateway`) proxies requests to downstream services. Before this ADR, the route ownership rules were implicit: some routes required a valid JWT at the service level, others were genuinely public (e.g. registration, CSRF policy), but the gateway had no structural boundary separating the two.

This caused two concrete problems:

1. **Public routes were accidentally protected.** The gateway's old `GET /api/csrf/policy` mount used `authenticate` (mandatory JWT), causing 401 for anonymous SPA bootstrap callers — fixed in ADR-002.
2. **Developer confusion.** No canonical list of which route prefixes are public-read vs. always-authenticated made it easy to misconfigure a new route the same way.

The gateway also startup-validated 30+ `*_SERVICE_URL` environment variables and threw on any missing one. This meant a developer running only gateway + onboarding + auth services could not start the gateway at all — addressed in the same batch (see implementation reference).

## Decision

### Route classification

Routes proxied by the gateway fall into one of three classes:

| Class | Auth enforcement point | Examples |
|-------|------------------------|---------|
| **PUBLIC** | None (anonymous allowed) | `POST /api/public/onboarding/*/register`, `GET /api/csrf/policy` |
| **SERVICE-AUTHENTICATED** | Downstream service (JWT verified there) | All `/api/*` routes not in PUBLIC list |
| **GATEWAY-AUTHENTICATED** | Gateway middleware before proxy (future) | Reserved for cross-cutting security policies |

For **Phase 1** (current), the split is enforced **only at the downstream service**. The gateway proxies all traffic and relies on each service to enforce its own authentication policy. The PUBLIC classification is a documentation contract only — downstream services still apply `optionalAuthenticate` or no auth as appropriate.

### Public route prefix registry

The following route prefixes are declared **public** (no mandatory auth before the gateway proxy):

```
POST  /api/public/onboarding/*        — self-service registration flows
POST  /api/public/platform-onboarding/* — platform onboarding variants
GET   /api/csrf/policy                — CSRF default policy (anonymous allowed; ADR-002)
GET   /health                         — gateway health probe
GET   /api/*/health                   — service health probes
```

Any new public route MUST be added to this registry before shipping.

### Gateway startup validation

Environment variable validation is **mandatory in `NODE_ENV=production`** and emits a **warning-only in non-production** modes. This allows developers running partial service stacks to start the gateway without all 30+ `*_SERVICE_URL` vars set.

```
NODE_ENV=production  →  missing var → throw (fail-fast)
NODE_ENV=development →  missing var → console.warn, continue (localhost fallbacks used)
NODE_ENV=(unset)     →  same as development
```

## Alternatives considered

- **Gateway-level JWT verification for all non-public routes:** Adds latency (second token verification after downstream service also checks) and creates a single point of coupling for JWT key rotation. Deferred to Phase 3 security hardening.
- **Static allowlist in a config file:** More operational overhead for a list that changes rarely. Chosen documentation approach (this ADR + comments in `service-registry.ts`) is sufficient for Phase 1.

## Consequences

### Positive

- Explicit contract: teams know which prefixes are public before adding a route.
- Gateway starts successfully in dev/CI environments with partial service stacks.
- No silent 401s on anonymous public routes.

### Negative

- Public classification is enforced by convention (downstream service), not by gateway middleware. A misconfigured downstream service could expose a route without auth. Addressed in Phase 3 by adding gateway-level middleware enforcement for non-PUBLIC prefixes.

## Implementation reference

- `services/gateway/src/domain/service-registry.ts` — `validateRequiredServiceUrls()` NODE_ENV gate (BUG-4 fix)
- `services/gateway/src/routes/csrf.routes.ts` — `optionalAuthenticate` on `GET /api/csrf/policy` (ADR-002)
- `services/onboarding-service/src/routes/new-user-lifecycle.routes.ts` — public `POST /register` (no authenticate)
- Related: ADR-001 (architecture), ADR-002 (CSRF anonymous read)

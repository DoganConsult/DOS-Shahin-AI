# ADR 005: JWT, Email Verification JWS, and SSE Token Signing — Rotation Runbook

## Status
Accepted

## Context
Platform services (`auth-service`, `onboarding-service`, gateways) sign access tokens with `JWT_SECRET`. Email verification links and SSE stream auth may use separate or scoped signing material (`EMAIL_VERIFY_SIGNING_SECRET`, `SSE_STREAM_KEY`, or scoped `kid` headers). Staging and production must never accept known-weak or missing secrets (`resolveJwtSigningSecret` / `assertJwtSigningSecret` in `@dos/platform-core`).

## Decision

### 1. Secret inventory (per environment)
| Name | Purpose | Min length / rule | Rotation cadence (default) |
|------|---------|-------------------|------------------------------|
| `JWT_SECRET` | HS256 access + refresh signing | ≥32 chars; not in weak list | 90 days or on compromise |
| `JWT_REFRESH_SECRET` | Optional separate refresh signing | Same as JWT if used | Same as JWT or offset by 30d |
| `EMAIL_VERIFY_SIGNING_SECRET` | JWS for verify-email links | ≥32 chars; dedicated from JWT | 180 days |
| `SSE_STREAM_KEY` or short-lived JWT | EventSource / realtime | Short TTL (60–120s) if JWT | Rotate with JWT or faster |

### 2. Dual-key acceptance window
1. Deploy config with **new** secret primary and **old** secret in `JWT_SECRET_PREVIOUS` (optional env; document in `platform/config-center/env/*.env` when adopted).
2. Issuers sign only with primary; verifiers accept signatures from **either** primary or previous for **T = max(access TTL, 24h)**.
3. After T, remove previous secret from env and redeploy.

### 3. Deploy order (no user-visible mass logout if possible)
1. Set `JWT_SECRET_PREVIOUS` = current `JWT_SECRET`.
2. Set `JWT_SECRET` = new value on all services that verify tokens (gateway, auth, onboarding, any worker).
3. Rolling restart services (PM2 / k8s).
4. Wait T, then remove `JWT_SECRET_PREVIOUS`.

### 4. NODE_ENV
Unset `NODE_ENV` is treated as **`development`** (`resolveNodeEnv`). Production/staging **must** set `NODE_ENV` explicitly and **must** set `JWT_SECRET`; weak or short secrets are rejected in staging/production.

### 5. Evidence
Rotation events must appear in ops logs or change ticket; run `ops/scripts/env-audit.ts` (when present) after rotation.

## Consequences
- **Positive**: Single policy module (`jwt-env-policy.ts`) keeps failure modes consistent across services.
- **Negative**: Emergency rotation requires coordinated multi-service deploy; document on-call steps in `docs/modules/onboarding-new-user-lifecycle.md` proof section when exercised.

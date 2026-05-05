# Self-registration: product wiring vs signup-bff (audit supplement)

**Purpose:** Close the plan item “trace product flow” — how the **Shahin SPA / OIDC** path relates to **`signup-bff`** and **`tenant-service POST /register`**.

**Date:** 2026-05-04

## Summary

| Path | Creates `dos.tenants`? | Calls `signup-bff`? | Notes |
|------|------------------------|---------------------|--------|
| **Shahin SPA — OIDC register/login** (`/api/auth/oidc/*`) | **Yes** (via tenant-service) | **No** | After Keycloak token exchange, **auth-service** dispatches to **`TENANT_SERVICE_URL`** — `POST /register` on register mode, `GET /me` on login (with 409 → fallback `POST /register`). |
| **signup-bff** `POST …/attempts/complete` | **No** (M7 D1 only) | N/A (this *is* signup-bff) | Mints `tenant_id`, queues **`dos_master.provisioning_job`**, writes invalidation log; **does not** insert `dos.tenants` or `dos.workspace_shell_binding`. |

**Conclusion:** The **primary product workspace onboarding** today is **auth-service OIDC callback → tenant-service `/register`**, not a chained **signup-bff complete → `/register`**. There is **no** SPA code path found that calls **`/api/public/signup`** or **`attempts/complete`**.

## Evidence (code)

### 1) OIDC → tenant-service `/register`

`services/auth-service/src/routes/oidc.routes.ts` — after successful token exchange, **`mode === 'register'`** triggers:

- `POST ${TENANT_SERVICE_URL}/register` with optional org names from Keycloak claims.

Login mode uses `GET /me`; on **409** with `NO_USER` / `NO_MEMBERSHIP`, it **falls back** to `POST /register`.

### 2) Shahin SPA auth bridge

`products/shahin-ai/app/src/app/pages/auth-pages/auth-bridge.component.ts` — thin bridge to **`/api/auth/oidc/start`** (and register link); **no** HTTP client references to signup-bff.

### 3) Gateway public API

`services/gateway/src/server.ts` — under **`/api/public`**, only **stub** handlers exist (`landing-content`, `agents`, `stats`). **No** proxy mount for **`/api/public/signup`** despite **`ports.allocation.json`** listing `gatewayPrefix: "/api/public/signup"` for **signup-bff**.

**Implication:** **`signup-bff`** is consumed by **CLI / direct port 4009 / future edge routing**, not by the current gateway Express app for `/api/public/signup`.

Repo-wide grep (`signup`, `attempts/complete`, `public/signup`) shows **no** product SPA or gateway wiring to signup-bff beyond allocation metadata and the service itself.

## DB verification (signup-bff–only completion)

After a **`signup_attempt` → `succeeded`** row whose provisioning was driven **only** by signup-bff **`completeAttempt`** (no tenant-service `/register`):

- **`dos_master.provisioning_job`**: row present, typically **`status = queued`**, **`temporal_workflow_id` NULL**.
- **`dos.tenants`**: **no row** for that UUID until **`tenant-service /register`** or a **future provisioning worker** runs.
- **`dos.workspace_shell_binding`**: **COUNT = 0** for that tenant until tenant exists and bindings are seeded.

**Note:** If `dos.tenants.tenant_id` is stored as **varchar/text**, filter with **`tenant_id::text = '<uuid>'`** (not `::uuid` equality on varchar).

## Related docs

- Locked audit plan (do not edit): `.cursor/plans/self-registration_provisioning_audit_*.plan.md`
- Master ledger: `platform/docs/DOS_MASTER_PLAN.md` §11 — **M7 D2** row tracks provisioning-service + Temporal consumer gap.

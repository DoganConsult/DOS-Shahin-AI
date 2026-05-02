# DAuth — Dogan Authentication & Authorization Module

**Layer:** Platform · **`kind`:** `platform`
**Module Code:** `dauth`
**Owner Team:** `platform-core`
**Version:** 1.0.0
**Lifecycle stage:** `ga`

DAuth is one of the **four platform modules** (DOS · **DAuth** · DSOC · DNOC).
It is the canonical source of identity, sessions, RBAC, MFA and consent in
the Dogan-AI OS platform. Every other module — and every product — reaches
authentication and authorisation through `@dos/ports/auth.DAuthPort`, never
through direct package imports.

## Layout

```
platform/dauth/
├── module.manifest.json                # Canonical module declaration (kind: "platform", lifecycle.stage: "ga")
├── bundles/
│   └── default.bundle.json             # Default deployment bundle
├── contracts/
│   └── dauth-port.openapi.yaml         # REST contract (1:1 with DAuthPort)
├── docs/                               # Phase docs + G8 schema migration plan
├── packages/
│   ├── core/                           # @dos/dauth-core (in-process port impl)
│   ├── frontend/                       # @dos/dauth-frontend (DI tokens + helpers)
│   └── shared/                         # @dos/dauth-shared (typed errors)
├── migrations/
│   ├── migrations-index.json
│   ├── public/                         # Idempotent CREATE TABLE statements
│   ├── shared/                         # platform_dauth.* views over public
│   └── __tests__/                      # Drift + isolation tests
└── services/
    └── auth-service/                   # The runtime service (port 4001)
        ├── service.manifest.json
        └── src/
            ├── bootstrap/              # Port binding (Pg adapters + DI wiring)
            ├── routes/port/            # REST /api/dauth/port/v1 (6 endpoints)
            ├── middleware/             # Unified error middleware
            └── server.ts
```

> **Manifest standardization (Phase 3.5, 2026-04-29):** the canonical manifest moved from
> `platform/dauth/manifest/platform-module.manifest.json` (legacy `layer:"platform"` schema)
> to `platform/dauth/module.manifest.json` (v1 schema with required `kind:"platform"` and
> `lifecycle.stage:"ga"`). Module-specific rich metadata (schemas, events, routes, etc.)
> is preserved verbatim under `metadata.*`. The legacy file is archived under
> `_quarantine/legacy-manifests/dauth/` for audit purposes only.

## Public surface

| Surface | Where |
|---------|-------|
| In-process port | `@dos/ports/auth.DAuthPort` |
| Runtime implementation | `@dos/dauth-core.createDAuthPort(deps)` |
| Singleton accessor | `@dos/dauth-core.getDAuthPort()` |
| REST API | `auth-service` exposes `/api/dauth/port/v1` (6 endpoints matching the port 1:1) |
| Module-facing shim | `@dos/module-auth` |
| Frontend tokens | `@dos/dauth-frontend/ports` (4 InjectionTokens) |
| Database schema | `platform_dauth` (35 read-only views over `public.*` and `dos.*`) |
| Events published | `dauth.session.opened`, `dauth.session.closed`, `dauth.token.revoked`, `dauth.role.assigned`, `dauth.role.revoked` |
| Audit events forwarded | All identity/session/role/permission changes mirrored to DSOC via `audit.event` |

## DAuthPort (6 methods)

| Method | Shape |
|--------|-------|
| `verifyToken(token)` | `Promise<TokenContext \| null>` |
| `getUserContext(userId, tenantId)` | `Promise<UserContext \| null>` |
| `evaluatePermissions(input)` | `Promise<PermissionDecision[]>` |
| `issueServiceToken(input)` | `Promise<ServiceTokenIssued>` |
| `revokeToken(input)` | `Promise<TokenRevocationResult>` |
| `assertCanCallTool(input)` | `Promise<ToolAuthorizationDecision>` |

The methods are intentionally narrow. Anything richer (group management,
OIDC client registration, password reset workflows) lives **inside**
auth-service and is exposed through ABP/REST endpoints under `/api/auth/*`,
not through the port.

## Isolation contract

Two CI rules in `.dependency-cruiser.cjs` are dedicated to DAuth:

- `dauth-isolation` — `platform/dauth/` cannot import from
  `platform/dos/`, `platform/dsoc/`, `platform/dnoc/`, `products/`,
  `packages/*-product`, or `frontend/products/`. Allowed dependencies
  are declared in `platform/dauth/module.manifest.json` →
  `metadata.consumes`.
- `modules-cannot-import-dauth-direct` — `modules/` cannot import from
  `platform/dauth/` or `@dos/dauth-{core,shared,frontend}`. Modules
  consume DAuth via `@dos/module-auth`.

These two rules are part of the **8 platform isolation rules**
(2 per module × 4 modules) enforced in CI.

## Database isolation (G8 plan)

Phase 1 (current) ships a defensive view layer:

- `platform_dauth.*` exposes 35 read-only views over `public.*` (Identity,
  PermissionManagement, FeatureManagement, OpenIddict, BackgroundJobs,
  AuditLogs) and `dos.*` (5 GRC tables historically owned by DAuth's
  app-layer for tenant context, lockout policies, MFA settings, OIDC
  identities, OIDC role bindings).
- All DAuth code paths read these views. Writes still go to the source
  tables. No cross-schema joins. No app-level access to other modules'
  tables.

Phase 2 (planned): physically own the 5 `dos.*` tables and migrate
authoritative ownership into `platform_dauth.*`. Tracked in
`docs/G8-SCHEMA-MIGRATION.md`.

## DoD scorecard

| # | Item | Status |
|---|------|--------|
| 1 | Physical isolation under `platform/dauth/` | DONE |
| 2 | Package structure (core + frontend + shared + service) | DONE |
| 3 | Platform-module manifest (canonical schema, lifecycle.stage GA) | DONE |
| 4 | Ports contract in `@dos/ports/auth` | DONE |
| 5 | DB isolation (Phase 1 views, 35 views) | DONE |
| 6 | Event contracts in manifest | DONE |
| 7 | CI isolation rules (2 dedicated rules, positive + negative tested) | DONE |
| 8 | Tests — schema drift, isolation, port behaviour, REST round-trip | DONE |
| 9 | Observability — auth-service emits structured logs + metrics into DNOC | DONE |
| 10 | Security/audit — every state change forwarded to DSOC | DONE |
| 11 | Resilience — circuit-breakers + retries on outbound port calls | CODE PRESENT |
| 12 | Docs — README + manifest + OpenAPI + Phase docs | DONE |
| 13 | CI gate enforcement | DONE |
| 14 | Bundle + deployment spec | DONE |

**14/14.**

## Cross-module summary (the 4 platform modules)

| Module | Schema | Service port | Ports interface | Module shim |
|---|---|---|---|---|
| DOS | `platform_dos` (5 tables) | 4100 `/api/dos/port/v1` | `DOSPort` (6 methods) | `@dos/module-dos` |
| DAuth | `platform_dauth` (35 views, Phase 2 planned) | 4001 `/api/dauth/port/v1` | `DAuthPort` (6 methods) | `@dos/module-auth` |
| DSOC | `platform_dsoc` (3 tables) | 4101 `/api/dsoc/port/v1` | `DSOCPort` (3 methods) | `@dos/module-soc` |
| DNOC | `platform_dnoc` (5 tables) | 4102 `/api/dnoc/port/v1` | `DNOCPort` (5 methods) | `@dos/module-telemetry` |

8 CI rules enforce the boundaries (4 × `<module>-isolation` +
4 × `modules-cannot-import-<module>-direct`).

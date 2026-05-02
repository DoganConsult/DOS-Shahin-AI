# DAuth — Allowed External Dependencies

DAuth is one of four platform modules (DOS, DAuth, DSOC, DNOC). It lives
at `platform/dauth/` and exposes its public surface through
`@dos/ports/dauth.DAuthPort`. This document enumerates, and justifies,
every external package DAuth source code may import.

Every import path outside this list is an isolation violation and must
either be (a) added to this list with justification, (b) replaced with a
port call, or (c) removed.

## Explicitly allowed (infrastructure)

| Import | Rows | Category | Why allowed |
|--------|------|----------|-------------|
| `@dos/platform-core/observability` | 89 | Logger, metrics, tracing | Infrastructure utility. Migrates to `DNOCPort` when DNOC module ships. |
| `@dos/platform-core/http` | 84 | `asyncHandler`, `auditMiddleware`, Express helpers | HTTP utility. Platform-wide middleware, not cross-module coupling. |
| `@dos/platform-core/resilience` | 48 | `catchHandler`, retry, circuit breaker, `withTimeout` | Cross-cutting resilience primitive. Infrastructure. |
| `@dos/platform-core/events` (only `subscribe`, `setPlatformEvents`, `emitEvent`) | 16 | Backbone wiring on bootstrap + subscribers | Bootstrap + subscriber registration. `publish` from this path is **forbidden** — use `publishDAuthEvent` from `@dos/dauth-core`. |
| `@dos/platform-core` (bare) | 12 | `SYSTEM_TENANT`, `SYSTEM_JOB_ACTOR`, `resolveJwtSigningSecret`, `withTimeout`, `generateSvgCaptcha`, `verifyCaptcha` | Pure-data constants + small utilities. |
| `@dos/platform-core/modules` | 6 | `ALWAYS_ON_MODULES`, `GRC_CORE_MODULES`, `getEffectiveModules` | Module classification. TODO: migrate to `DOSPort.isModuleRegistered` once the port exposes module-registry queries. |
| `@dos/platform-core/jobs` | 1 | `registerJob`, scheduler | Job scheduler. Infrastructure; moves to `DOSPort.scheduleJob` when DOS registry stabilizes. |
| `@dos/db` | many | Postgres pool + helpers | Platform-wide DB access. |
| `@dos/types`, `@dos/contracts` | many | Shared types / contracts | Type-only. Zero runtime coupling. |
| `@dos/ports` (+ `/dauth`, `/dsoc`, `/dnoc`, `/dos`) | 4 | Public port interfaces | This IS the contract. |
| `@dos/module-sdk` | few | Module registry hooks | Only from the auth-service bootstrap path. |
| `@dos/event-backbone` | 1 | Redis-backed event bus | Only from the auth-service bootstrap path. |
| `@dos/runtime-config`, `@dos/service-bootstrap`, `@dos/service-client` | few | Service bootstrap utilities | Only from the auth-service entry point. |
| `@dos/dauth-shared`, `@dos/dauth-core` (internal) | many | Own packages | Intra-DAuth. |
| `express`, `zod`, `uuid`, `jsonwebtoken`, `jose`, `bcryptjs`, `otplib`, `pg` | many | Third-party runtime | Direct third-party deps listed in `package.json`. |

## Explicitly forbidden

| Pattern | Enforcement |
|---------|-------------|
| `from 'platform/dsoc/…'` | `dauth-isolation` rule in `.dependency-cruiser.cjs` |
| `from 'platform/dnoc/…'` | same |
| `from 'products/…'` | same |
| `from 'packages/shahin-product'` / `from 'packages/*-product'` | same |
| `from 'frontend/products/…'` | same |
| `from '../../../modules/…'` | No direct file-path reach — audited by grep in CI |
| `import { publish } from '@dos/platform-core/events'` | Hot path must use `publishDAuthEvent` from `@dos/dauth-core` so the DSOCPort mirror fires. Audited by grep. |

## Verification commands

```bash
# 1. No products / sibling platform modules reached
pnpm run verify:imports:platform | grep -c dauth-isolation   # → 0

# 2. No cross-tree file-path reach
grep -rnE "from ['\"]\\.\\./\\.\\./\\.\\./(modules|services|packages|frontend)|from ['\"]\\.\\./\\.\\./dos/" \
    platform/dauth/packages/ platform/dauth/services/        # → empty

# 3. No bypasses of the DSOC-aware publisher
grep -rn "import { publish } from '@dos/platform-core/events'" platform/dauth/   # → empty

# 4. Full external dependency inventory
grep -rh "from ['\"]@dos/platform-core" \
    platform/dauth/packages/core/ \
    platform/dauth/packages/shared/src/ \
    platform/dauth/services/auth-service/src/ \
  | grep -oE "@dos/platform-core[^'\"]*" | sort -u
```

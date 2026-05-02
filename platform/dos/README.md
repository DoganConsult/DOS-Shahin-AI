# DOS — Dogan OS Core (Orchestrator)

**Layer:** Platform · **`kind`:** `platform`
**Module Code:** `dos`
**Owner Team:** `platform-core`
**Version:** 1.0.0
**Lifecycle stage:** `ga`

DOS is the 4th of the four platform modules (DOS · DAuth · DSOC · DNOC).
It owns **orchestration**: the tenant registry, the module registry,
the product registry, the durable platform-event log, and the scheduled-
job definitions. Every other platform module and every product reaches
the orchestrator through `@dos/ports/dos.DOSPort`.

## Layout

```
platform/dos/
├── module.manifest.json                  # Canonical module declaration (kind: "platform", lifecycle.stage: "ga")
├── bundles/default.bundle.json
├── contracts/dos-port.openapi.yaml
├── migrations/
│   ├── migrations-index.json
│   └── public/20260423_0100_create_platform_dos_schema.sql (+ _down.sql)
├── packages/
│   ├── core/                    # @dos/dos-core
│   │   └── src/
│   │       ├── repositories.ts  # 4 repos × (InMemory + Pg)
│   │       ├── dos-port.impl.ts
│   │       ├── dos-port.registry.ts
│   │       ├── agent-tools.ts
│   │       └── index.ts
│   └── frontend/                # @dos/dos-frontend
│       ├── ports/
│       ├── services/dos-http.client.ts
│       └── components/registry-explorer/
└── services/dos-service/
    ├── service.manifest.json
    └── src/
        ├── bootstrap/            # binds DOSPort, wires modules list
        ├── routes/port/          # /api/dos/port/v1 (6 endpoints)
        ├── middleware/           # unified error middleware
        └── server.ts             # HTTP + health + graceful shutdown
```

> **Manifest standardization (Phase 3.5, 2026-04-29):** the canonical manifest moved from
> `platform/dos/manifest/platform-module.manifest.json` (legacy `layer:"platform"` schema)
> to `platform/dos/module.manifest.json` (v1 schema with required `kind:"platform"` and
> `lifecycle.stage:"ga"`). Module-specific rich metadata (schemas, events, routes, etc.)
> is preserved verbatim under `metadata.*`. The legacy file is archived under
> `_quarantine/legacy-manifests/dos/` for audit purposes only.

## Public surface

| Surface | Where |
|---------|-------|
| In-process port | `@dos/ports/dos.DOSPort` |
| Runtime implementation | `@dos/dos-core.createDOSPort(deps)` |
| Singleton accessor | `@dos/dos-core.getDOSPort()` |
| REST API | `dos-service` at `/api/dos/port/v1` (6 endpoints matching the port 1:1) |
| Module-facing shim | `@dos/module-dos` |
| Frontend DI tokens | `@dos/dos-frontend/ports` (4 tokens) |
| Database schema | `platform_dos` (tenants_registry, modules_registry, products_registry, platform_events_log, scheduled_jobs) |
| Gateway prefix | `/api/dos` → `DOS_SERVICE_URL` (default `http://127.0.0.1:4100`) |
| PM2 entry | `dos-service` port 4100 |

## DOSPort (6 methods)

| Method | Shape |
|--------|-------|
| `getTenant(tenantId)` | `Promise<TenantRef \| null>` |
| `publishEvent(event)` | Durable log FIRST + backbone SECOND — on bus failure the log row persists for replay |
| `subscribeEvent(eventType, subscriberId, handler)` | Delegates to backbone subscriber |
| `registerModule(descriptor)` | Fire-and-forget — never blocks module bootstrap |
| `isModuleRegistered(moduleCode)` | Synchronous boolean (observability contract; not an authz gate) |
| `listProducts()` | `Promise<ProductDescriptor[]>` |

## Isolation

Two new CI rules:

- `dos-isolation` — `platform/dos/` cannot import from `platform/dauth/`,
  `platform/dsoc/`, `platform/dnoc/`, `products/`, `packages/*-product`,
  or `frontend/products/`.
- `modules-cannot-import-dos-direct` — `modules/` cannot import from
  `platform/dos/` or `@dos/dos-{core,shared,frontend}`. Modules consume
  DOS via `@dos/module-dos`.

The repo now has **8 platform isolation rules** (2 per module × 4
modules).

## Adoption

| Module | Via |
|--------|-----|
| `modules/compliance` | `ports/dos.port.ts` + `publishPlatformEvent('compliance.finding_raised')` |
| `modules/governance` | `ports/dos.port.ts` re-export |
| `modules/risk` | `ports/dos.port.ts` re-export |

Every re-export route checked by the CI rule above.

## DoD scoreboard

| # | Item | Status |
|---|------|--------|
| 1 | Physical isolation | DONE |
| 2 | Package structure (core + frontend + service) | DONE |
| 3 | Platform-module manifest | DONE |
| 4 | Ports in `@dos/ports/dos` | DONE |
| 5 | DB schema isolation (`platform_dos` + 5 tables) | DONE |
| 6 | Event contracts in manifest | DONE (11 publishes) |
| 7 | CI isolation rules | DONE (2 new rules, positive + negative tested) |
| 8 | Tests — 41/41 green across 7 files | DONE |
| 9 | Observability | CODE PRESENT — DOS self-logs 5xx as durable event-log rows |
| 10 | Security/audit | Manifest declares config_change audits mirrored to DSOC |
| 11 | Resilience — graceful shutdown, log-first event durability | DONE |
| 12 | Docs | DONE |
| 13 | CI gate | DONE |
| 14 | Bundle + deployment spec | DONE |

**14/14.**

## Legacy-package note

`packages/dos-platform-core` continues to ship infrastructure utilities
(observability, http, resilience, jobs, modules classification). DAuth
/ DSOC / DNOC still consume those via `@dos/platform-core/<subpath>`.
Consolidating that package's 47 subdirectories into `platform/dos/` is
a separate, longer effort tracked outside this session.

## Four-module summary

| Module | Schema | Service | Port | Module shim | REST prefix |
|---|---|---|---|---|---|
| DOS | `platform_dos` (5 tables) | :4100 | DOSPort (6 methods) | `@dos/module-dos` | `/api/dos` |
| DAuth | `platform_dauth` (35 tables, Phase 2b migration shipped) | :4001 | DAuthPort (6 methods) | `@dos/module-auth` | `/api/dauth` |
| DSOC | `platform_dsoc` (3 tables) | :4101 | DSOCPort (3 methods) | `@dos/module-soc` | `/api/dsoc` |
| DNOC | `platform_dnoc` (5 tables) | :4102 | DNOCPort (5 methods) | `@dos/module-telemetry` | `/api/dnoc` |

**8 CI rules** enforce the boundaries (4 × `<module>-isolation` +
4 × `modules-cannot-import-<module>-direct`).

# DNOC — Dogan Network & Observability Center

**Layer:** Platform · **`kind`:** `platform`
**Module Code:** `dnoc`
**Owner Team:** `platform-core`
**Version:** 1.0.0
**Lifecycle stage:** `ga`

DNOC is one of the **four platform modules** (DOS · DAuth · DSOC · **DNOC**).
It owns everything operational: metrics, logs, traces, route registry, and
per-service health. Where DSOC stores *security* events, DNOC stores
*operational* events. Both are persistent, queryable, and observable.

## Layout

```
platform/dnoc/
├── module.manifest.json                  # Canonical module declaration (kind: "platform", lifecycle.stage: "ga")
├── bundles/
│   └── default.bundle.json               # Standard deployment bundle
├── contracts/
│   └── dnoc-port.openapi.yaml            # REST contract (1:1 with DNOCPort)
├── migrations/
│   ├── migrations-index.json             # Declared ownership
│   └── public/20260422_0020_create_platform_dnoc_schema.sql
├── packages/
│   ├── core/                             # @dos/dnoc-core
│   │   ├── src/
│   │   │   ├── repositories.ts           # 5 repos × (InMemory + Pg) = 10 adapters
│   │   │   ├── dnoc-port.impl.ts         # createDNOCPort(deps)
│   │   │   ├── dnoc-port.registry.ts     # get/set/reset singleton
│   │   │   └── index.ts
│   │   └── __tests__/                    # 6 tests
│   └── frontend/                         # @dos/dnoc-frontend
│       ├── ports/                        # 5 Angular DI tokens
│       └── index.ts
└── services/
    └── dnoc-service/                     # The runtime service
        ├── service.manifest.json
        └── src/
            ├── bootstrap/                # Port binding (5 Pg repos)
            └── routes/port/              # REST /api/dnoc/port/v1
```

> **Manifest standardization (Phase 3.5, 2026-04-29):** the canonical manifest moved from
> `platform/dnoc/manifest/platform-module.manifest.json` (legacy `layer:"platform"` schema)
> to `platform/dnoc/module.manifest.json` (v1 schema with required `kind:"platform"` and
> `lifecycle.stage:"ga"`). Module-specific rich metadata (schemas, events, routes, etc.)
> is preserved verbatim under `metadata.*`. The legacy file is archived under
> `_quarantine/legacy-manifests/dnoc/` for audit purposes only.

## Public surface

| Surface | Where |
|---------|-------|
| In-process port | `@dos/ports/dnoc.DNOCPort` |
| Runtime implementation | `@dos/dnoc-core.createDNOCPort({metrics, logs, traces, routes, health})` |
| Singleton accessor | `@dos/dnoc-core.getDNOCPort()` |
| REST API | `dnoc-service` exposes `/api/dnoc/port/v1` (5 endpoints matching the port 1:1) |
| Module-facing shim | `@dos/module-telemetry` (recordMetric, emitLog, emitSpan, registerRoute, getHealth, bindModuleTelemetry) |
| Frontend tokens | `@dos/dnoc-frontend/ports` (5 InjectionTokens) |
| Database schema | `platform_dnoc` (metrics, logs, traces, routes, health_checks) |
| Events published | `dnoc.health.changed`, `dnoc.route.registered`, `dnoc.route.deregistered` |
| Events subscribed (optional) | `dnoc.metric.recorded`, `dnoc.log.emitted`, `dnoc.span.emitted` (not enabled today) |

## Why DNOC ingests via REST/direct calls instead of pure events

Metrics + logs + traces are high-volume. Routing them through the event
backbone adds latency and back-pressure. DNOC accepts them via:

1. **In-process port** — `@dos/dnoc-core.getDNOCPort()` for code in the same process.
2. **REST `/api/dnoc/port/v1/*`** — for cross-process emitters.
3. **`@dos/module-telemetry`** — for product modules (always indirect through the product shell).

The PgMetricsRepository batches writes (250ms flush window) so high-rate
emitters don't overwhelm the DB. Logs and traces are fire-and-forget at
the port; failures are swallowed (logging-of-logs would loop).

## Isolation contract

- `dnoc-isolation` CI rule: `platform/dnoc/` cannot import from
  `platform/dauth/`, `platform/dsoc/`, `products/`, `packages/*-product`,
  or `frontend/products/`.
- `modules-cannot-import-dnoc-direct` CI rule: `modules/` cannot import
  from `platform/dnoc/` or `@dos/dnoc-{core,shared,frontend}`. Modules
  consume DNOC via `@dos/module-telemetry`.

## DoD scorecard

| # | Item | Status |
|---|------|--------|
| 1 | Physical isolation | DONE |
| 2 | Package structure (core + frontend + service) | DONE |
| 3 | Platform-module manifest | DONE |
| 4 | Ports contract in `@dos/ports/dnoc` | DONE |
| 5 | DB schema isolation (native `platform_dnoc`, 5 tables) | DONE |
| 6 | Event contracts in manifest | DONE |
| 7 | CI isolation rules (2 new rules) | DONE |
| 8 | Tests — 24/24 green across 4 files | DONE |
| 9 | Observability — DNOC IS the observability target | DONE (self-hosted) |
| 10 | Security/audit | Manifest declares emission of config_change audits to DSOC |
| 11 | Resilience (PgMetricsRepository batch+flush, fire-and-forget logs/traces) | CODE PRESENT |
| 12 | Docs (README + manifest + OpenAPI + contracts) | DONE |
| 13 | CI gate | DONE (2 rules validated positive + negative) |
| 14 | Bundle + deployment spec | DONE |

**13/14 fully done. Item 11 has the high-volume strategy implemented;
runtime back-pressure tuning remains environment-specific.**

## External blockers

- None. DNOC has no inbound port dependencies on other platform modules
  at runtime. DSOC and DAuth can call its REST surface (or import the
  port) but it does not require them.

## Cross-module summary (the 4 platform modules)

| Module | Schema | Service port | Ports interface | Module shim |
|---|---|---|---|---|
| DOS | (host platform) | n/a | `DOSPort` | n/a |
| DAuth | `platform_dauth` (35 tables, Phase 1 views) | 4001 `/api/dauth/port/v1` | `DAuthPort` (6 methods) | `@dos/module-auth` |
| DSOC | `platform_dsoc` (3 tables) | 4002 `/api/dsoc/port/v1` | `DSOCPort` (3 methods) | `@dos/module-soc` |
| DNOC | `platform_dnoc` (5 tables) | 4003 `/api/dnoc/port/v1` | `DNOCPort` (5 methods) | `@dos/module-telemetry` |

Six CI rules enforce the boundaries (3 × `<module>-isolation` +
3 × `modules-cannot-import-<module>-direct`).

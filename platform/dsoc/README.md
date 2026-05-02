# DSOC — Dogan Security Operations Center

**Layer:** Platform · **`kind`:** `platform`
**Module Code:** `dsoc`
**Owner Team:** `platform-core`
**Version:** 1.0.0
**Lifecycle stage:** `ga`

DSOC is one of the **four platform modules** (DOS · DAuth · **DSOC** · DNOC).
It is the centralized security audit, threat detection, and posture
management module: every platform module and product emits
security-relevant events, and DSOC durably stores them, raises alerts
on high-severity events, and computes per-tenant posture snapshots.

## Layout

```
platform/dsoc/
├── module.manifest.json                  # Canonical module declaration (kind: "platform", lifecycle.stage: "ga")
├── bundles/
│   └── default.bundle.json               # Standard deployment bundle
├── contracts/
│   └── dsoc-port.openapi.yaml            # REST contract (1:1 with DSOCPort)
├── migrations/
│   ├── migrations-index.json             # Declared ownership
│   └── public/20260422_0010_create_platform_dsoc_schema.sql
├── packages/
│   ├── core/                             # @dos/dsoc-core
│   │   ├── src/
│   │   │   ├── audit-log.repository.ts   # InMemory + Pg adapters
│   │   │   ├── alerts.repository.ts      # InMemory + Pg adapters
│   │   │   ├── posture.repository.ts     # InMemory + Pg adapters
│   │   │   ├── dsoc-port.impl.ts         # createDSOCPort(deps)
│   │   │   ├── dsoc-port.registry.ts     # get/set/reset singleton
│   │   │   ├── event-subscriber.ts       # 15 backbone subscribers
│   │   │   └── index.ts
│   │   └── __tests__/                    # 9 tests
│   └── frontend/                         # @dos/dsoc-frontend
│       ├── ports/                        # 3 Angular DI tokens
│       └── index.ts
└── services/
    └── dsoc-service/                     # The runtime service
        ├── service.manifest.json
        └── src/
            ├── bootstrap/                # Port binding + subscriber wiring
            └── routes/port/              # REST /api/dsoc/port/v1
```

> **Manifest standardization (Phase 3.5, 2026-04-29):** the canonical manifest moved from
> `platform/dsoc/manifest/platform-module.manifest.json` (legacy `layer:"platform"` schema)
> to `platform/dsoc/module.manifest.json` (v1 schema with required `kind:"platform"` and
> `lifecycle.stage:"ga"`). Module-specific rich metadata (schemas, events, routes, etc.)
> is preserved verbatim under `metadata.*`. The legacy file is archived under
> `_quarantine/legacy-manifests/dsoc/` for audit purposes only.

## Public surface

| Surface | Where |
|---------|-------|
| In-process port | `@dos/ports/dsoc.DSOCPort` |
| Runtime implementation | `@dos/dsoc-core.createDSOCPort({auditLog, alerts, posture})` |
| Singleton accessor | `@dos/dsoc-core.getDSOCPort()` |
| REST API | `auth-service` exposes `/api/dsoc/port/v1` (3 endpoints matching the port 1:1) |
| Module-facing shim | `@dos/module-soc` (emitAudit, raiseAlert, bindModuleSOC) |
| Frontend tokens | `@dos/dsoc-frontend/ports` (3 InjectionTokens) |
| Database schema | `platform_dsoc` (audit_log, alerts, posture_snapshots) |
| Events subscribed | 10 × `dsoc.audit.<category>` + 5 × `dsoc.alert.<severity>` |
| Events published | `dsoc.alert.acknowledged`, `dsoc.alert.resolved`, `dsoc.posture.computed` |

## How DAuth events flow into DSOC (zero additional code)

1. A DAuth service emits a security-relevant event via `publishDAuthEvent(eventType, tenantId, payload)`.
2. That wrapper publishes on both:
   - the legacy `dauth.<event>` topic (domain-event back-compat),
   - `dsoc.audit.<category>` or `dsoc.alert.<severity>` (DSOC-normalized).
3. `dsoc-service` registered 15 subscribers on boot (10 audit + 5 alert).
4. Subscriber calls `DSOCPort.recordAuditEvent` (or `raiseAlert`) → `PgAuditLogRepository.insert` → row in `platform_dsoc.audit_log` (and `platform_dsoc.alerts` for alerts).

No change at the publisher side when DSOC ships — DAuth already emitted
to the right topics since DAuth Session 2.

## Isolation contract

- `dsoc-isolation` CI rule: `platform/dsoc/` cannot import from
  `platform/dauth/`, `platform/dnoc/`, `products/`, `packages/*-product`,
  or `frontend/products/`.
- `modules-cannot-import-dsoc-direct` CI rule: `modules/` cannot import
  from `platform/dsoc/` or `@dos/dsoc-{core,shared,frontend}`. Modules
  consume DSOC via `@dos/module-soc`.

## DoD scorecard

| # | Item | Status |
|---|------|--------|
| 1 | Physical isolation | DONE |
| 2 | Package structure (core + frontend + service) | DONE |
| 3 | Platform-module manifest | DONE |
| 4 | Ports contract in `@dos/ports/dsoc` | DONE |
| 5 | DB schema isolation (native `platform_dsoc`) | DONE |
| 6 | Event contracts in manifest | DONE |
| 7 | CI isolation rules (2 new rules) | DONE |
| 8 | Tests — 23/23 green across 5 files | DONE |
| 9 | Observability (health/ready endpoints declared) | CODE PRESENT (runtime infra verification deferred) |
| 10 | Security/audit — DSOC IS the audit target | DONE |
| 11 | Resilience | CODE PRESENT (runtime infra verification deferred) |
| 12 | Docs (README + manifest + OpenAPI + contracts) | DONE |
| 13 | CI gate | DONE (2 rules validated positive + negative) |
| 14 | Bundle + deployment spec | DONE |

**12/14 fully done. 2 with code present; runtime infra belongs to
integration hardening.**

## External blockers

- None. DSOC does not depend on any other platform-module runtime.
- DAuth already publishes to the topics DSOC subscribes to; no DAuth
  change required.

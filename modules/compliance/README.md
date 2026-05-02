# Compliance Module

The Compliance Module is the **regulatory and controls backbone** of the DOS platform. It owns frameworks, controls, control objectives, control testing, compliance assessments, gaps, attestations, mappings, and regulatory submissions (KSA-NCA, SAMA, PDPL, DORA, ECC, …) — and publishes the events that risk, audit, evidence, governance, vendor and reporting modules consume.

It is implemented as a **self-contained vertical slice** following Vertical Slice Architecture (VSA), Feature-Sliced Design (FSD), and Domain-Driven Design (DDD): contract → API → domain → data → UI → tests → infra. No reverse dependencies into the platform; communication only via published contracts and events.

---

## Top-Level Layout

```
modules/compliance/
├── module.manifest.json          # capability, routes, events, permissions, version
├── package.json                  # workspace package: @dos/module-compliance
├── tsconfig.json / tsconfig.build.json
├── bootstrap.ts                  # registerCompliance() + lifecycle hooks
├── index.ts                      # public barrel re-export
├── README.md
├── .prettierrc.json
│
├── contracts/      # PUBLIC API surface (other modules import only from here)
│   ├── v1/                       # versioned stable surface
│   ├── errors/                   # public error codes
│   └── *.contract.ts
├── domain/         # pure business logic (framework-agnostic)
│   ├── policies/                 # SoD / control-effectiveness / regulatory rules
│   ├── types/
│   ├── events/                   # domain event shapes
│   └── manifest/
├── application/    # use-cases / application services (slices)
│   ├── compliance/               # core compliance services
│   ├── ccm/                      # continuous control monitoring
│   ├── regulatory/               # regulatory submissions (NCA/SAMA/PDPL)
│   ├── regulatory-submission/
│   ├── advanced/                 # advanced analytics
│   ├── analytics/
│   ├── misc/                     # rcsa / compensating / saudi score / drift
│   ├── jobs/
│   ├── workflows/
│   └── incident/                 # incident-response integrations
├── infrastructure/ # outbound adapters (DB, messaging, mappers, integrations)
│   ├── persistence/              # repositories, ORM mappers, raw SQL
│   ├── messaging/                # event publishers / consumers
│   ├── mappers/
│   ├── observability/
│   ├── shared/
│   ├── utils/
│   ├── data/                     # canonical reference data (KSA frameworks)
│   └── integrations/             # ai / audit / dora / ksa-regulatory / vendor / workflow / remediation / evidence / governance / admin / notification / ports
├── interface/      # inbound adapters (HTTP, controllers, admin, security, diagnostics)
│   ├── http/                     # 75 route files / 406 endpoints
│   │   ├── compliance/
│   │   ├── cws/
│   │   ├── ksa/
│   │   ├── misc/
│   │   └── regulator/
│   ├── controllers/
│   ├── admin/
│   ├── security/
│   ├── diagnostics/
│   └── server.ts                 # standalone controls-service entrypoint
├── ports/          # hexagonal interfaces (ai/auth/database/dos/errors/events/jobs/lifecycle/logger/middleware/platform/resilience/schemas)
├── schemas/        # JSON Schema / Zod / OpenAPI fragments
├── ui/             # module-owned frontend slice
│   ├── pages/                    # compliance-hub
│   ├── services/
│   ├── contracts/
│   ├── routes/
│   └── i18n/
├── db/             # schema-as-code (migrations, canonical, public, tenant, RLS)
├── config/         # runtime configs (list/detail/form/views/filters)
├── tests/          # unit, integration, contract, smoke
├── ops/            # CI scripts, boot-harness, migrate, verify-permissions, env, manifests
└── docs/           # AS-BUILT
```

---

## Capability Snapshot

| Surface | Count |
|---|---|
| HTTP route files | 75 |
| HTTP endpoints | 406 |
| Application services | 129 |
| Infrastructure adapters | 113 |
| Hexagonal ports | 13 |
| Zod / validation schemas | 12 |
| DB migrations | 13 |
| Owned tables (manifest) | 9 |
| Referenced tables (manifest) | 7 |
| Domain events — published | 13 |
| Domain events — consumed | 8 |
| Route bases | 23 (`/api/compliance`, `/api/controls`, `/api/ucf`, `/api/frameworks`, `/api/ksa-*`, …) |
| UI pages | compliance-hub |
| Lifecycle hooks | onInstall, onActivate, onMigrate, onUninstall |

Owned tables: `frameworks`, `controls`, `compliance_mappings`, `compliance_assessments`, `compliance_gaps`, `compliance_requirements`, `control_objectives`, `control_testing`, `control_evidence_links`.

---

## Folder-by-Folder Reference

### `module.manifest.json`
Declarative manifest read by the platform at boot. Lists capability id (`compliance`), version, route bases, owned/referenced tables, published/consumed events, permissions, and lifecycle hooks. Platform discovers Compliance through this file — never hardcodes.

### `bootstrap.ts`
Module entrypoint. Exposes:
- `registerCompliance(options)` — binds host adapters and mounts routers.
- `bindCompliancePorts(bindings)` — bind-only entrypoint without mount.
- Lifecycle hooks `onInstall`, `onActivate`, `onMigrate`, `onUninstall`.

### `index.ts`
Public barrel. Re-exports the typed contract surface (`contracts/v1`), bootstrap, lifecycle hooks, and the migration runner.

### `contracts/` — Public API Surface
Files exported as `@dos/module-compliance/contracts`. Anything importable from outside the module lives here. Other modules MUST import only from this barrel.

| File | Purpose |
|---|---|
| `compliance.contract.ts` | High-level contract |
| `compliance.contracts.ts` | DTO / event-name shapes |
| `compliance.ts` | Type aliases shared across boundaries |
| `errors/` | Public error codes |
| `v1/` | Versioned stable surface (re-exports control-status types from `@dos/types` plus the module versioned constants) |

### `domain/` — Pure Business Logic
Framework-agnostic. No Express/Nest/ORM imports.

| Subfolder | Contents |
|---|---|
| `policies/` | `compliance.policies.ts` — control-effectiveness, SoD, regulatory rules |
| `types/` | Domain entity & value-object type definitions |
| `events/` | Domain event shapes |
| `manifest/` | Manifest-typed helpers |

### `application/` — Use-Case Services
One folder per slice / capability area. Orchestrates domain + ports.

- `compliance/` — core compliance, gaps, attestation, drift, as-code
- `ccm/` — continuous control monitoring
- `regulatory/`, `regulatory-submission/` — KSA-NCA, SAMA, PDPL, DORA, ECC submissions
- `advanced/`, `analytics/` — analytics & advanced workflows
- `misc/` — RCSA, compensating-controls, saudi-score, requirement-normalization
- `jobs/` — scheduled jobs
- `workflows/` — long-running orchestrations
- `incident/` — incident-response integrations

### `infrastructure/` — Outbound Adapters
| Subfolder | Purpose |
|---|---|
| `persistence/` | Repositories, ORM mappers, raw SQL adapters, controls-service event/db adapters |
| `messaging/` | Event publishers, outbox dispatchers |
| `mappers/` | DTO ↔ row mappers |
| `observability/` | Metrics |
| `shared/` | Cross-aggregate helpers |
| `utils/` | Generic utilities |
| `data/` | Canonical KSA framework reference data |
| `integrations/` | Sub-domain backends (ai, audit, dora, ksa-regulatory, vendor, workflow, remediation, evidence, governance, admin, notification, ports) |

### `interface/` — Inbound Adapters
| Subfolder | Purpose |
|---|---|
| `http/` | Express routers (compliance / cws / ksa / misc / regulator). 75 files, 406 endpoints. |
| `controllers/` | Request handlers |
| `admin/` | Admin / operator endpoints |
| `security/` | Module-level guards, RBAC bindings |
| `diagnostics/` | Health, readiness endpoints |
| `server.ts` | Standalone `compliance-controls-service` entrypoint |

### `ports/` — Hexagonal Interfaces
Pure TypeScript ports. Default impls re-export from `@dos/db`, `@dos/module-sdk`, `@dos/platform-core/resilience`. Host can rebind through the bootstrap `bindCompliancePorts(...)`.

`ai`, `auth`, `database`, `dos`, `errors`, `events`, `jobs`, `lifecycle`, `logger`, `middleware`, `platform`, `resilience`, `schemas`.

### `schemas/`
Zod / JSON-schema fragments shared across layers (request-validation, event payloads).

### `ui/` — Module-Owned Frontend Slice
| Subfolder | Purpose |
|---|---|
| `pages/` | `compliance-hub` route-level component |
| `services/` | Frontend services calling the public HTTP contracts |
| `contracts/` | Frontend-visible type contracts (mirrors backend `contracts/`) |
| `routes/` | Angular route definitions for the module |
| `i18n/` | English / Arabic bundles |

### `db/` — Schema as Code
| Subfolder | Purpose |
|---|---|
| `migrations/` | 13 versioned SQL migrations (controls, qiyas, enterprise expansion, advanced controls, sod_rules, sod_waivers, KSA seed) |
| `canonical/` | Canonical schema snapshot (public + tenant) |
| `public/` | Public-schema migrations |
| `tenant/` | Per-tenant migrations |
| `manifest.yml` | DB ownership manifest |

### `config/` — Runtime Module Config
Backend-driven config that powers dynamic UIs (list/detail/form/views/filters).

### `tests/`
| Subfolder | Layer |
|---|---|
| `unit/` | Domain & application units (controls-service `__tests__`) |
| `integration/` | Application + infra |
| `contract/` | Consumer-driven contract tests |
| `smoke/` | Standalone smoke (`node --test`) |

### `ops/` — Operational Assets
| File | Purpose |
|---|---|
| `controls-service.manifest.json` | Service manifest for the standalone controls-service |
| `.env.example` | Required env vars |
| `scripts/ci.mjs` | Local CI: typecheck → build → verify → smoke |
| `scripts/boot-harness.mjs` | Boot module standalone with stub adapters |
| `scripts/migrate.mjs` | DB migration runner |
| `scripts/verify-permissions.mjs` | Permission catalog drift check |

### `docs/`
| File | Purpose |
|---|---|
| `AS-BUILT.md` | Canonical as-built reference |

---

## Design Rules

1. **Manifest-driven** — the platform discovers Compliance via `module.manifest.json`. Never hardcode Compliance routes/events into the platform.
2. **Public via `contracts/`, private everywhere else** — only `contracts/` and `module.manifest.json` may be imported from outside. `domain/`, `application/`, `infrastructure/`, `interface/`, `ports/`, `schemas/`, `ui/`, `db/`, `config/` are private.
3. **One slice = one folder** — each use case in `application/` keeps handler + command + validation + tests colocated.
4. **Domain has zero framework imports** — no Express/Nest/ORM in `domain/`.
5. **DB owned by module** — `db/migrations/` runs through the module's lifecycle hook, not by a central migrator.
6. **UI is a vertical companion** — frontend lives in `ui/` so route, API, page, i18n, and permissions ship together.
7. **Multi-tenant context is a port** — injected via `ports/`, never read from globals.
8. **Tests mirror layers** — unit (domain), integration (infra+app), contract (consumer-driven), smoke (standalone).
9. **Versioning at contract boundary** — breaking changes go to `contracts/v2/`; `v1` stays stable.
10. **Lifecycle hooks** — `onInstall`, `onActivate`, `onMigrate`, `onUninstall` exposed via the manifest for tenant provisioning.

---

## Build, Test, Run

```bash
# Build
pnpm --filter @dos/module-compliance build

# Smoke
pnpm --filter @dos/module-compliance test:smoke

# Local CI (typecheck → build → verify-permissions → smoke)
pnpm --filter @dos/module-compliance ci

# Migrate against host-provided Postgres (DATABASE_URL)
node "modules/compliance/ops/scripts/migrate.mjs"

# Boot harness (stub adapters; prove module wires up standalone)
node "modules/compliance/ops/scripts/boot-harness.mjs"
```

---

## Migration Note

This folder layout was reorganized from the legacy
`modules/compliance/`,
`services/compliance-controls-service/`,
`packages/modules/compliance/`,
`packages/shared-compliance-types/`,
`frontend/modules/compliance/`
trees to the canonical VSA/FSD/DDD shape on 2026-04-26. 552 files were placed under the canonical layout. Internal imports still reference legacy paths and will need rewriting before the package builds cleanly. Cross-module consumers reference `@dos/module-compliance` — their import paths need updating once the new internal layout is finalized.

# Foundation Module

The Foundation Module is the **organizational backbone** of the DOS platform. It owns tenant-scoped organizational data — organizations, business units, departments, positions, locations, users, teams, roles, permissions, committees, delegations, access reviews, ownership mappings, and SoD (Separation-of-Duties) rules — and publishes the events that every other GRC module (governance, risk, compliance, audit, evidence, controls, …) reacts to.

It is implemented as a **self-contained vertical slice** following Vertical Slice Architecture (VSA), Feature-Sliced Design (FSD), and Domain-Driven Design (DDD): contract → API → domain → data → UI → tests → infra. No reverse dependencies into the platform; communication only via published contracts and events.

---

## Top-Level Layout

```
platform/foundation/
├── module.manifest.json          # capability, routes, events, permissions, version
├── foundation.manifest.ts        # typed manifest helper
├── package.json                  # workspace package: @dos/module-foundation
├── tsconfig.json / tsconfig.build.json
├── index.ts                      # module entrypoint (registers with platform)
├── openapi.yaml                  # OpenAPI 3.x spec for the module HTTP surface
├── postman.collection.json       # Postman collection mirroring openapi
├── integration-backlog.json      # tracked integration gaps
├── AS-BUILT.md                   # current as-built design notes
├── vitest.config.ts / .mts       # test runners
│
├── contracts/      # PUBLIC API surface (other modules import only from here)
├── domain/         # pure business logic (framework-agnostic)
├── application/    # use cases / application services (slices)
├── infrastructure/ # outbound adapters (DB, messaging, cache, external)
├── interface/      # inbound adapters (HTTP, events, lifecycle, security)
├── ports/          # hexagonal interfaces (driving + driven)
├── schemas/        # JSON Schema / Zod / OpenAPI fragments
├── ui/             # module-owned frontend slice (Angular)
├── db/             # schema-as-code (migrations, seeds, canonical, RLS)
├── config/         # runtime config (list/detail/form/views/filters)
├── tests/          # unit, integration, contract, e2e, perf, security, audits
├── ops/            # CI, observability, scripts, runbooks, reports, proofs
└── docs/           # AS-BUILT, audits, consolidation notes, ADRs
```

---

## Folder-by-Folder Reference

### `module.manifest.json` & `foundation.manifest.ts`
Declarative manifest read by the platform at boot. Lists:
- Capability id (`foundation`) and version
- HTTP routes the module mounts (with permission codes)
- Domain events the module publishes/consumes
- Permission catalog
- Lifecycle hooks (`onInstall`, `onActivate`, `onMigrate`, `onUninstall`)

The platform never hardcodes Foundation; it discovers it through this file.

### `index.ts`
Module entrypoint. Wires the application services, infrastructure adapters, and HTTP routes into the platform's runtime via `lifecycle-registration.ts`.

### `openapi.yaml` / `postman.collection.json`
Single source of truth for the public HTTP surface. Used by codegen, contract tests, and Postman runs.

---

### `contracts/` — Public API Surface
Files exported as `@dos/module-foundation/contracts`. Anything importable from outside the module lives here.

| File | Purpose |
|---|---|
| `foundation.contract.ts` | High-level contract describing the module's published API |
| `foundation.dto.ts` | DTO shapes for HTTP request/response bodies |
| `foundation.types.ts` | Shared type aliases used across boundaries |
| `foundation.events.ts` | Event names and topic constants |
| `foundation.event-payloads.ts` | Event payload schemas (org-created, role-assigned, …) |
| `foundation.permissions.ts` | Canonical permission codes (`foundation:org:read`, etc.) |
| `foundation.errors.ts` | Public error codes & shapes |
| `user-errors.ts` | User-facing error catalog |
| `registries/` | Route-catalog manifests consumed by the platform router |
| `index.ts` | Barrel re-exporting the public surface |

**Rule:** other modules MUST import only from `contracts/`. They MUST NOT reach into `domain/`, `application/`, etc.

---

### `domain/` — Pure Business Logic
Framework-agnostic. No Express, NestJS, ORM, or HTTP imports allowed.

| Subfolder | Contents |
|---|---|
| `contracts/` | Internal domain contracts (aggregate-level invariants, repository interfaces seen by the domain) |
| `policies/` | Business rules (e.g. SoD policy, access-review policy, ownership rules) |
| `errors/` | Domain-level error classes |
| `types/` | Domain entity & value-object type definitions |
| `shared/` | Cross-aggregate helpers (e.g. `error-catalog.types.ts`) |

---

### `application/` — Use-Case / Application Services
One service file (or sub-folder) per use case/slice. Orchestrates domain + ports.

Notable services:
- `foundation.service.ts` — root orchestrator
- `foundation-bootstrap.service.ts` — tenant bootstrap routine
- `foundation-lifecycle.service.ts` — lifecycle hooks implementation
- `foundation-event.service.ts` — outbox/event emission
- `foundation-workflow.service.ts` — workflow integration
- `foundation-sync.job.ts` — scheduled sync
- `foundation-ai.service.ts`, `foundation-claude-ai.service.ts` — AI adapters
- `organization.service.ts`, `business-unit.service.ts`, `department.service.ts`, `positions.service.ts`
- `org-hierarchy.service.ts`, `org-hierarchy-admin.service.ts`, `org-hierarchy-ops.service.ts`
- `org-profile-engine.service.ts`
- `permission-derivation.service.ts`
- (Plus colocated `*.test.ts` for unit + integration coverage at this layer.)

---

### `infrastructure/` — Outbound Adapters
Concrete implementations of `ports/outbound/`.

| Subfolder / File | Purpose |
|---|---|
| `persistence/` | Repositories, ORM mappers, raw SQL adapters |
| `messaging/` | Event bus publishers/subscribers, outbox dispatchers |
| `cache/` | Cache adapters (Redis or in-memory) |
| `auth.adapter.ts` | Adapter to the platform auth-service |

---

### `interface/` — Inbound Adapters
| Subfolder / File | Purpose |
|---|---|
| `http/` | Express/Fastify route binding (organizations, BU, departments, positions, users, roles, committees, delegations, access-review, sod-check, audit-trail, …); also `controllers/` and `middleware/` |
| `events/` | Inbound event handlers (consumer side) |
| `admin/` | Admin/operator endpoints |
| `security/` | Module-level guards, RBAC bindings |
| `i18n/` | Translation bundles for server-rendered messages |
| `diagnostics/` | Health, readiness, debug endpoints |
| `foundation.module.ts` | Composition root (module class) |
| `lifecycle-registration.ts` | Hooks the module into the platform lifecycle |

---

### `ports/` — Hexagonal Interfaces
Pure TypeScript interfaces; no implementations.

| File | Direction | Purpose |
|---|---|---|
| `ai.port.ts` | outbound | AI provider abstraction |
| `auth.port.ts` | outbound | Auth/token verification |
| `database.port.ts` | outbound | Persistence access |
| `events.port.ts` | outbound | Event publishing |
| `errors.port.ts` | outbound | Error reporter |
| `lifecycle.port.ts` | outbound | Platform lifecycle integration |
| `logger.port.ts` | outbound | Structured logging |
| `middleware.port.ts` | inbound | HTTP middleware contract |
| `platform.port.ts` | outbound | Platform services (tenancy, config, registries) |
| `inbound/`, `outbound/` | grouping | Extra direction-scoped ports |
| `index.ts` | barrel | Re-exports |

---

### `schemas/`
Validation/serialization schemas (Zod / JSON Schema) shared across layers.

- `foundation.schemas.ts` — entity schemas
- `positions.schemas.ts` — position-specific schemas
- `common.schemas.ts` — shared primitives (ids, pagination, audit headers)

---

### `ui/` — Module-Owned Frontend Slice (Angular)
The UI ships in the same package so route, API call, page, i18n, and permissions stay aligned.

| Subfolder / File | Purpose |
|---|---|
| `pages/` | Route-level components (overview, organization, BU, departments, positions, locations, users, roles, role-detail, role-profiles, permission-matrix, committees, delegations, policies, access-review, ownership-mapping, audit, data-processing, operations-readiness, reference-data, settings, account-settings, profile, security-settings, setup-wizard) |
| `components/` | Reusable presentational components |
| `services/` | Frontend services calling the public HTTP contracts |
| `core/` | App-level wiring (interceptors, providers) |
| `state/` | NgRx feature state |
| `dashboards/` | Dashboard widgets owned by Foundation |
| `guards/` | Route guards (permissions, tenancy) |
| `ports/` | Frontend-side ports (DI tokens) |
| `shared/` | Shared UI primitives within Foundation |
| `i18n/` | English / Arabic translation bundles |
| `foundation.constants.ts` | Frontend constants (route ids, permission codes mirror) |
| `index.ts` | Public UI barrel |

---

### `db/` — Schema as Code
Module owns its tables; migrations run via the lifecycle hook, not centrally.

| Subfolder / File | Purpose |
|---|---|
| `migrations/` | Versioned, sequential SQL/TS migrations |
| `seeds/` | Idempotent seed data (default roles, system orgs) |
| `canonical/` | Canonical schema snapshot (source of truth for diffing) |
| `rls/` | Row-level security policies (tenant isolation) |
| `tenant/` | Per-tenant schema migrations (multi-tenant schema strategy) |
| `manifest.yml` | DB ownership manifest |
| `module-migration-bundle.json` | Bundle metadata consumed by the platform migrator |

---

### `config/` — Runtime Module Config
Backend-driven config that powers dynamic UIs.

| File / Subfolder | Purpose |
|---|---|
| `list.config.ts` | List view config (columns, default filters, actions) |
| `detail.config.ts` | Detail view config |
| `form.config.ts` | Form schema |
| `filters.config.ts` | Filter definitions |
| `views.config.ts` | Saved views / presets |
| `database.ts` | DB client config wiring |
| `claude-client.ts` | AI client config |
| `runtime/` | Runtime-resolved configs served via `/api/module-config/foundation/...` |
| `index.ts` | Barrel |

---

### `tests/`
Tests mirror the layered architecture.

| Subfolder | Layer |
|---|---|
| `unit/` (colocated `*.unit.test.ts`) | Domain & application units |
| `integration/` (colocated `*.integration.test.ts`) | Application + infra (DB, outbox, scope, manager-chain, inheritance, access-snapshot) |
| `contract/` | Consumer-driven contract tests against `contracts/` |
| `e2e/` | End-to-end module flows |
| `perf/` | Performance / load benchmarks |
| `security/` | AuthN/AuthZ negative tests, SoD bypass attempts |
| `audits/` | Audit-trail correctness tests |
| `_lib/` | Shared test utilities & fixtures |

Top-level integration tests live directly in `tests/` (e.g. `foundation-outbox.integration.test.ts`, `manager-chain.integration.test.ts`, `org-scope.integration.test.ts`, `inheritance.integration.test.ts`, `access-snapshot.integration.test.ts`).

---

### `ops/` — Operational Assets
| Subfolder | Purpose |
|---|---|
| `ci/` | CI workflows (`foundation-module-ci.yml`) |
| `observability/` | Dashboards, alerts, SLOs |
| `scripts/` | Operator scripts (`foundation-dod.sh`, `foundation-runtime-proof.sh`, `module-foundation-overview-dod.sh`) |
| `setup/` | Environment setup (`foundation-db-backup.sh`, `foundation-extract-tag.sh`) |
| `reports/` | Truth-pass and extraction CSV/MD reports |
| `proofs/` | DoD JSON proofs from CI runs |
| `vitest.p8-foundation.config.mjs` | Module-scoped vitest config used by CI |

---

### `docs/`
| File / Subfolder | Purpose |
|---|---|
| `foundation-ai-os-audit-1.md`, `foundation-ai-os-audit-2.md` | AI-OS audit prompts |
| `consolidation/` | Migration consolidation notes from the legacy estate |
| (recommended) `architecture.md`, `adr/` | Architecture & ADRs (add as decisions are made) |

`AS-BUILT.md` lives at the module root and is the canonical as-built reference.

---

## Design Rules

1. **Manifest-driven** — the platform discovers Foundation via `module.manifest.json`. Never hardcode Foundation routes/events into the platform.
2. **Public via `contracts/`, private everywhere else** — only `contracts/` and `module.manifest.json` may be imported from outside. `domain/`, `application/`, `infrastructure/`, `interface/`, `ports/`, `schemas/`, `ui/`, `db/`, `config/` are private.
3. **One slice = one folder** — each use case in `application/` keeps handler + command + validation + tests colocated.
4. **Domain has zero framework imports** — no Express/Nest/ORM in `domain/`.
5. **DB owned by module** — `db/migrations/` runs through the module's lifecycle hook, not by a central migrator.
6. **UI is a vertical companion** — frontend lives in `ui/` so route, API, page, i18n, and permissions ship together.
7. **Multi-tenant context is a port** — injected via `ports/`, never read from globals.
8. **Tests mirror layers** — unit (domain), integration (infra+app), contract (consumer-driven), e2e (full slice), security (negative), perf (load).
9. **Versioning at contract boundary** — breaking changes go to `contracts/v2/`; `v1` stays stable.
10. **Lifecycle hooks** — `onInstall`, `onActivate`, `onMigrate`, `onUninstall` exposed via the manifest for tenant provisioning.

---

## Module Capability Snapshot

- **Backend HTTP route groups (~25):** organizations, business-units, departments, positions, locations, users, user-lifecycle, invitations, bulk-invite, profiles, foundation-roles, committees, committee-management, delegation, access-review, access-snapshot, sod-check, org-hierarchy, org-scope, ownership-mapping, inheritance, manager-chain, governance-policies, audit-trail, foundation-health, foundation-aggregator
- **Frontend pages (~26):** overview, organization, business-units, departments, positions, locations, users, teams, roles, role-detail, role-profiles, permission-matrix, committees, delegations, policies, access-review, ownership-mapping, audit, data-processing, operations-readiness, reference-data, settings, account-settings, profile, security-settings, setup-wizard
- **Permissions:** declared in `contracts/foundation.permissions.ts` and seeded via `config/permissions.seed.json` (when present)
- **Events published:** org-created, org-updated, dept-created, role-assigned, position-assigned, manager-changed, scope-changed, role-changed, unassigned (consumed by governance, compliance, evidence, audit, policy, vendor, incident, asset, remediation, action, training, controls, exception, privacy, knowledge, dashboard, issues, packs, attestation, risk-incident-service)

---

## Build, Test, Run

```bash
# Build
pnpm --filter @dos/module-foundation build

# Test
pnpm exec vitest run -c "platform/foundation/vitest.config.ts"

# Module-scoped CI vitest
pnpm exec vitest run -c "platform/foundation/ops/vitest.p8-foundation.config.mjs"

# Operational DoD checks
"platform/foundation/ops/scripts/foundation-dod.sh"
"platform/foundation/ops/scripts/foundation-runtime-proof.sh"
```

---

## Migration Note

This folder layout was reorganized from the legacy `platform/foundation/source/{backend,frontend}` tree to the canonical VSA/FSD/DDD shape on 2026-04-26. Imports inside the module still reference the legacy paths and need to be updated before the package builds cleanly. Cross-module consumers (other modules' event handlers, frontend manifests, tsconfig path aliases, `pnpm-workspace.yaml`) reference `@dos/module-foundation` — their import paths need updating once the new internal layout is finalized.

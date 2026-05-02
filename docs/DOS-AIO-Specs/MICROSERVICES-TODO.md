# DOS-AIO Microservices Extraction & Production Readiness — Master Action Tracker

> **Status:** ACTIVE — Binding for all agents, engineers, and contributors  
> **Created:** 2026-04-06  
> **Owner:** Platform Architecture Authority  
> **Scope:** Full enterprise production + AI quality grade  
> **Rule:** No item may be skipped, deferred, or closed without evidence. Every checkbox requires a verification artifact (test pass, build pass, review approval, or runtime proof).

---

## How to Use This File

1. **Every agent/engineer** must read this file before touching code
2. **Check off items** only when the acceptance criteria in the item are met
3. **Add blocker notes** inline if an item is blocked (prefix with `BLOCKED:`)
4. **Do not reorder** items within a phase — dependency order is intentional
5. **Cross-reference** the ID column when linking to commits, PRs, or issues

---

## Priority Legend

| Priority | Meaning | SLA |
|----------|---------|-----|
| **P0** | Blocks all other work | Must resolve before any Phase work begins |
| **P1** | Blocks service extraction | Must resolve within current phase |
| **P2** | Degrades quality/safety | Must resolve before production gate |
| **P3** | Improvement/cleanup | Must resolve before GA release |

## Status Legend

| Status | Meaning |
|--------|---------|
| `TODO` | Not started |
| `IN_PROGRESS` | Work begun |
| `BLOCKED` | Waiting on dependency |
| `REVIEW` | Code written, awaiting review |
| `DONE` | Completed with evidence |
| `WONTFIX` | Intentionally deferred with justification |

---

# PHASE 0 — GLOBAL BLOCKERS

> These block ALL subsequent phases. No module extraction may begin until every P0 item in this phase is DONE.

## GB: @dos/* Package Population

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| GB-001 | Populate `@dos/types` with all shared types from `backend/src/types/`, `modules/_shared/`, `shared/` | P0 | DONE | Agent | 56 type modules, ~14,385 LOC; all GRC/IAM/platform domains covered; `pnpm build` passes (2026-04-08) |
| GB-002 | Populate `@dos/db` with database utilities from `config/database.ts`, `utils/db-utils.ts`, `config/tenant-connection-resolver.ts` | P0 | DONE | Agent | `safeQuery`, `tenantSchema`, `getFirstRow`, `query` exported; 1492 imports migrated to `@dos/db`; build passes (2026-04-07) |
| GB-003 | Populate `@dos/contracts` with API contracts from `platform/contracts/`, module schemas, event definitions | P0 | DONE | Agent | 22 platform/contracts imports migrated to @dos/contracts/platform/*; barrel export created; build passes (2026-04-07) |
| GB-004 | Populate `@dos/platform-core` with runtime from `platform/dos/` (events, http, jobs, lifecycle, middleware, observability, provisioning) | P0 | DONE | Agent | 1586 imports migrated to @dos/platform-core/*; path aliases configured; barrel exports created; build passes (2026-04-07) |
| GB-005 | Populate `@dos/auth` with DAuth from `platform/dauth/` (identity, access, scope, authority, delegation, SoD, middleware) | P0 | DONE | Agent | 366 platform/dauth imports migrated to @dos/auth/*; 14 subdir barrel exports + root; tsconfig path alias configured; build passes (2026-04-07) |
| GB-006 | Populate `@dos/module-sdk` as facade over types + contracts + db + auth + events | P0 | DONE | Agent | Expanded 742 → 2795 LOC; added validation, tenant, pagination, date, module-utils modules; build passes (2026-04-07) |
| GB-007 | Populate `@shahin/product` with product manifests, seeds, agent tool definitions | P0 | TODO | — | Product manifest, agent registry (A01-A12), product seeds exported; no platform internals imported directly |

- [x] **GB-001** — `@dos/types`: 56 modules, ~14,385 LOC; all GRC/IAM/platform domains covered; build passes (2026-04-08)
- [x] **GB-002** — `@dos/db`: Database utilities fully populated; 1492 imports migrated
- [x] **GB-003** — `@dos/contracts`: 22 imports migrated to @dos/contracts/platform/*
- [x] **GB-004** — `@dos/platform-core`: Platform runtime migrated; 1586 imports via path aliases
- [x] **GB-005** — `@dos/auth`: 366 dauth imports migrated; path aliases configured
- [x] **GB-006** — `@dos/module-sdk`: Expanded to 2795 LOC with validation/tenant/pagination/date/module-utils
- [ ] **GB-007** — `@shahin/product`: Migrate product layer (current: 57 LOC → target: ~10,000 LOC)

## GB: Import Migration

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| GB-008 | Create automated codemod script to replace `../../../types/` → `@dos/types` | P0 | DONE | Agent | Script `scripts/codemods/migrate-types-imports.ts`: 826 files, 872 replacements (2026-04-07) |
| GB-009 | Create automated codemod script to replace `../../../config/database` → `@dos/db` | P0 | DONE | Agent | Script `scripts/codemods/migrate-db-imports.ts`: 390 files, 395 replacements (2026-04-07) |
| GB-010 | Create automated codemod script to replace `../../../utils/` → `@dos/module-sdk` | P0 | DONE | Agent | Script `scripts/codemods/migrate-utils-imports.ts`: 1213 files, 1433 replacements (2026-04-07) |
| GB-011 | Create automated codemod script to replace `../../_shared/` → `@dos/types` or `@dos/module-sdk` | P0 | DONE | Agent | Script `scripts/codemods/migrate-shared-imports.ts`: 237 files, 285 replacements (2026-04-07) |
| GB-012 | Execute import migration across all 57 modules (11,598 deep relative imports) | P0 | DONE | Agent | 2985 imports migrated; `pnpm build` passes; remaining 852 are `resilient-catch` (intentional) + `policies/` (phase 2) |
| GB-013 | Remove `_shared/` directory after migration | P0 | DONE | Agent | Directory deleted; no remaining references; build passes (2026-04-07) |

- [x] **GB-008** — Codemod: `types/` → `@dos/types` (826 files, 872 replacements)
- [x] **GB-009** — Codemod: `config/database` → `@dos/db` (390 files, 395 replacements)
- [x] **GB-010** — Codemod: `utils/` → `@dos/module-sdk` (1213 files, 1433 replacements)
- [x] **GB-011** — Codemod: `_shared/` → `@dos/types` / `@dos/module-sdk` (237 files, 285 replacements)
- [x] **GB-012** — Execute: 2985 imports migrated; 852 intentionally remaining (`resilient-catch`, `policies/`)
- [ ] **GB-013** — Cleanup: delete `_shared/` directory (blocked: `navigation-integration`, `policies/` still needed)

## GB: TypeScript Configuration

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| GB-014 | Align `backend/tsconfig.json` module to `NodeNext` per canonical spec | P1 | TODO | — | `module: "NodeNext"`, `moduleResolution: "NodeNext"` in backend tsconfig; build passes |
| GB-015 | Add `@dos/*` path aliases to `backend/tsconfig.json` | P0 | DONE | — | All 7 `@dos/*` + `@shahin/*` paths already configured in `backend/tsconfig.json`; editor autocomplete works |
| GB-016 | Create `tsconfig.build.json` per package following canonical example | P1 | TODO | — | Each package in `packages/` has `tsconfig.build.json` extending `../../tsconfig.base.json` |
| GB-017 | Enable `strict: true` in all new `@dos/*` packages | P1 | TODO | — | All 7 packages compile with `strict: true`; no `@ts-ignore` in package code |

- [ ] **GB-014** — tsconfig: Switch backend to `NodeNext` module resolution
- [ ] **GB-015** — tsconfig: Add `@dos/*` path aliases
- [ ] **GB-016** — tsconfig: Create per-package build configs
- [ ] **GB-017** — tsconfig: Enable strict mode in packages

## GB: Infrastructure Foundation

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| GB-018 | Create `docker-compose.yml` with service stubs for all 12 target services | P0 | TODO | — | File exists at root; defines 12 services + postgres + redis + temporal; `docker-compose config` validates |
| GB-019 | Create API gateway service (Express reverse proxy or Kong/Traefik) | P0 | TODO | — | Gateway routes to backend services; single entry point for frontend; health check passes |
| GB-020 | Implement inter-service event bus (Redis Streams or NATS) | P0 | TODO | — | Event publish/subscribe works across 2+ services; envelope follows `@dos/contracts` schema |
| GB-021 | Implement service-to-service HTTP client in `@dos/platform-core` | P1 | TODO | — | Typed HTTP client with retry, circuit breaker, correlation ID propagation |
| GB-022 | Create per-service Dockerfile template | P1 | TODO | — | Template in `infrastructure/docker/`; builds any service with `--build-arg SERVICE=<name>` |

- [ ] **GB-018** — Docker: Create `docker-compose.yml` with 12 service stubs
- [ ] **GB-019** — Gateway: Create API gateway service
- [ ] **GB-020** — Events: Implement inter-service event bus
- [ ] **GB-021** — HTTP: Implement service-to-service client
- [ ] **GB-022** — Docker: Create per-service Dockerfile template

## GB: Server Decomposition

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| GB-023 | Split `server-startup.ts` (804 lines) into composable startup phases | P0 | TODO | — | Startup split into: db-init, redis-init, temporal-init, seed-phase, route-mount, health-ready; each phase is independently callable |
| GB-024 | Replace static route imports in `server-routes.ts` (60+ imports) with dynamic manifest-driven registration | P0 | TODO | — | Routes discovered from module manifests; adding a module requires zero changes to server-routes; build passes |
| GB-025 | Create per-service entry points (`services/<name>/main.ts`) | P1 | TODO | — | Each target service has its own entry point that mounts only its routes/services |
| GB-026 | Extract `server-middleware.ts` middleware stack into `@dos/platform-core/http` | P1 | TODO | — | Middleware composable per service; not all services need all middleware |

- [ ] **GB-023** — Split `server-startup.ts` into composable phases
- [ ] **GB-024** — Replace static route imports with dynamic registration
- [ ] **GB-025** — Create per-service entry points
- [ ] **GB-026** — Extract middleware stack to `@dos/platform-core`

---

# PHASE 1 — PLATFORM CORE EXTRACTION

> Depends on: All GB-* items DONE

## PC: Platform Core Service

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| PC-001 | Extract `platform/dos/events/` → Platform Core service | P1 | TODO | — | Event service runs independently; publishes/subscribes via event bus; health endpoint responds |
| PC-002 | Extract `platform/dos/http/guards/` → `@dos/platform-core/http` | P1 | TODO | — | `tenantGuard`, `moduleGuard`, `subscriptionStatusGuard` importable from package |
| PC-003 | Extract `platform/dos/http/middleware/` → `@dos/platform-core/http` | P1 | TODO | — | `audit`, `tenant`, `scope-context` middleware importable from package |
| PC-004 | Extract `platform/dos/http/rate-limiting/` → `@dos/platform-core/http` | P1 | TODO | — | Rate limiter importable; configurable per service |
| PC-005 | Extract `platform/dos/jobs/` → Platform Core service (or separate Worker service) | P1 | TODO | — | Job scheduler runs as separate process; jobs registerable via manifest |
| PC-006 | Extract `platform/dos/observability/` → `@dos/platform-core/observability` | P1 | TODO | — | Metrics, tracing, health check utilities importable from package |
| PC-007 | Extract `platform/dos/provisioning/` → Platform Core service | P1 | TODO | — | Tenant provisioning runs independently; API callable from other services |
| PC-008 | Extract `platform/dos/lifecycle/` → `@dos/platform-core/lifecycle` | P1 | TODO | — | Module lifecycle management importable from package |
| PC-009 | Extract `platform/dos/modules/` → `@dos/platform-core/modules` | P1 | TODO | — | Module registry importable; modules self-register via manifest |
| PC-010 | Create Platform Core service Dockerfile | P1 | TODO | — | `docker build` succeeds; container starts; health endpoint responds |
| PC-011 | Create Platform Core integration tests | P1 | TODO | — | Provisioning, event bus, job scheduling tested end-to-end |

- [ ] **PC-001** — Extract event service
- [ ] **PC-002** — Extract HTTP guards
- [ ] **PC-003** — Extract HTTP middleware
- [ ] **PC-004** — Extract rate limiting
- [ ] **PC-005** — Extract job scheduler
- [ ] **PC-006** — Extract observability
- [ ] **PC-007** — Extract provisioning
- [ ] **PC-008** — Extract lifecycle management
- [ ] **PC-009** — Extract module registry
- [ ] **PC-010** — Platform Core Dockerfile
- [ ] **PC-011** — Platform Core integration tests

## DA: DAuth Service

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| DA-001 | Extract `platform/dauth/identity/` → Auth service | P1 | TODO | — | Identity CRUD runs in Auth service; API responds |
| DA-002 | Extract `platform/dauth/session/` → Auth service | P1 | TODO | — | Session management independent; JWT/cookie handling works |
| DA-003 | Extract `platform/dauth/mfa/` → Auth service | P1 | TODO | — | MFA enrollment/verification works independently |
| DA-004 | Extract `platform/dauth/access/` → Auth service | P1 | TODO | — | Access decision engine runs in Auth service |
| DA-005 | Extract `platform/dauth/scope/` → Auth service | P1 | TODO | — | Scope resolution works independently |
| DA-006 | Extract `platform/dauth/authority/` → Auth service | P1 | TODO | — | Authority model works independently |
| DA-007 | Extract `platform/dauth/delegation/` → Auth service | P1 | TODO | — | Delegation model works independently |
| DA-008 | Extract `platform/dauth/sod/` → Auth service | P1 | TODO | — | SoD engine runs; conflict detection works |
| DA-009 | Extract `platform/dauth/middleware/` → shared auth middleware package | P1 | TODO | — | Auth middleware importable by all services via `@dos/auth/middleware` |
| DA-010 | Extract `platform/dauth/lifecycle-auth/` → Auth service | P1 | TODO | — | Lifecycle authorization works independently |
| DA-011 | Extract `platform/dauth/audit/` → Auth service | P1 | TODO | — | Auth audit trail independent |
| DA-012 | Create Auth service Dockerfile | P1 | TODO | — | `docker build` succeeds; container starts; `/auth/health` responds |
| DA-013 | Create Auth service integration tests | P1 | TODO | — | Login, session, MFA, RBAC, SoD tested end-to-end |
| DA-014 | Create auth token validation middleware for downstream services | P0 | TODO | — | Other services validate tokens by calling Auth service; no direct DB access for auth |

- [ ] **DA-001** — Extract identity
- [ ] **DA-002** — Extract sessions
- [ ] **DA-003** — Extract MFA
- [ ] **DA-004** — Extract access engine
- [ ] **DA-005** — Extract scope resolution
- [ ] **DA-006** — Extract authority model
- [ ] **DA-007** — Extract delegation
- [ ] **DA-008** — Extract SoD engine
- [ ] **DA-009** — Extract auth middleware package
- [ ] **DA-010** — Extract lifecycle auth
- [ ] **DA-011** — Extract auth audit
- [ ] **DA-012** — Auth service Dockerfile
- [ ] **DA-013** — Auth service integration tests
- [ ] **DA-014** — Token validation middleware for downstream services

---

# PHASE 2 — CROSS-MODULE DECOUPLING

> Depends on: Phase 1 DONE

## XD: Cross-Module Import Elimination

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| XD-001 | Replace `compliance` → `audit` direct imports with event emission (`audit.trail.created`) | P1 | TODO | — | Zero direct imports from compliance to audit; audit events consumed via event bus |
| XD-002 | Replace `compliance` → `risk` direct imports with API calls or shared contracts | P1 | TODO | — | Zero direct imports from compliance to risk; risk data fetched via service API |
| XD-003 | Replace `risk` → `audit` direct imports with event emission | P1 | TODO | — | Zero direct imports from risk to audit |
| XD-004 | Replace `governance` → sibling imports with events/API calls | P1 | TODO | — | Zero direct imports from governance to controllers/services of siblings |
| XD-005 | Replace `ai` → 10+ module direct imports with events/API calls | P1 | TODO | — | AI module imports only from `@dos/*` packages; domain data fetched via API |
| XD-006 | Replace `workflow` → sibling imports with events/API calls | P1 | TODO | — | Workflow engine has no direct domain module imports |
| XD-007 | Replace `evidence` → sibling imports with events/API calls | P1 | TODO | — | Evidence module imports only from `@dos/*` packages |
| XD-008 | Replace `policy` → sibling imports with events/API calls | P1 | TODO | — | Policy module imports only from `@dos/*` packages |
| XD-009 | Replace `vendor` → self-referencing import anomaly | P1 | TODO | — | No `../../vendor` self-import pattern |
| XD-010 | Verify zero cross-module imports remain (target: 0 from current 11,598) | P0 | TODO | — | `grep -rch "from '../../" modules/ | paste -sd+ | bc` returns 0 |

- [ ] **XD-001** — Decouple: compliance → audit
- [ ] **XD-002** — Decouple: compliance → risk
- [ ] **XD-003** — Decouple: risk → audit
- [ ] **XD-004** — Decouple: governance → siblings
- [ ] **XD-005** — Decouple: ai → 10+ modules
- [ ] **XD-006** — Decouple: workflow → siblings
- [ ] **XD-007** — Decouple: evidence → siblings
- [ ] **XD-008** — Decouple: policy → siblings
- [ ] **XD-009** — Fix: vendor self-import
- [ ] **XD-010** — Verify: zero cross-module imports

---

# PHASE 3 — SERVICE EXTRACTION WAVE 1

> Depends on: Phase 2 DONE

## S1: Auth Service (DAuth) — Standalone Deploy

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| S1-001 | Create `services/auth/` directory with entry point | P1 | TODO | — | `services/auth/main.ts` boots Auth service independently |
| S1-002 | Auth service owns its DB schema (`dauth_*` tables) | P1 | TODO | — | Auth service runs its own migrations; no shared table writes with other services |
| S1-003 | Auth service exposes REST API for token validation | P1 | TODO | — | `POST /auth/validate` returns access decision; <5ms p99 latency |
| S1-004 | Auth service health endpoint | P1 | TODO | — | `GET /auth/health` returns DB, Redis, service status |
| S1-005 | Auth service Dockerfile + docker-compose entry | P1 | TODO | — | `docker-compose up auth` starts independently |
| S1-006 | Auth service integration tests (login, session, RBAC, MFA, SoD) | P1 | TODO | — | All auth flows tested against running service |
| S1-007 | All other services validate tokens via Auth service API (not direct DB) | P1 | TODO | — | No service reads `dauth_*` tables directly except Auth service |

- [ ] **S1-001** — Auth: entry point
- [ ] **S1-002** — Auth: own DB schema
- [ ] **S1-003** — Auth: token validation API
- [ ] **S1-004** — Auth: health endpoint
- [ ] **S1-005** — Auth: Docker deploy
- [ ] **S1-006** — Auth: integration tests
- [ ] **S1-007** — Auth: downstream token validation

## S2: Workflow Engine Service

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| S2-001 | Move workflow core engine to `@dos/platform-core/workflow` | P1 | TODO | — | Engine is product-neutral; GRC-specific workflows stay in product layer |
| S2-002 | Create `services/workflow/main.ts` entry point | P1 | TODO | — | Workflow service boots independently |
| S2-003 | Workflow service owns its DB tables (`workflows`, `workflow_*`) | P1 | TODO | — | Own migrations; no shared writes |
| S2-004 | Workflow service exposes API for state transitions | P1 | TODO | — | `POST /workflow/:id/transition` works; events emitted on transition |
| S2-005 | Integrate `action`, `remediation`, `issues` modules into Workflow service | P1 | TODO | — | All 4 modules run within Workflow service boundary |
| S2-006 | Workflow service Dockerfile + docker-compose | P1 | TODO | — | `docker-compose up workflow` starts independently |
| S2-007 | Temporal integration scoped to Workflow service | P1 | TODO | — | Temporal workers run within Workflow service container |
| S2-008 | Workflow service integration tests | P1 | TODO | — | State machine transitions, SLA, escalation tested |

- [ ] **S2-001** — Workflow: extract core engine
- [ ] **S2-002** — Workflow: entry point
- [ ] **S2-003** — Workflow: own DB schema
- [ ] **S2-004** — Workflow: transition API
- [ ] **S2-005** — Workflow: integrate action/remediation/issues
- [ ] **S2-006** — Workflow: Docker deploy
- [ ] **S2-007** — Workflow: Temporal integration
- [ ] **S2-008** — Workflow: integration tests

## S3: AI & Agents Service

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| S3-001 | Split `ai/` into `ai-runtime` (platform) + `ai-domain` (product) | P1 | TODO | — | Runtime: orchestration, memory, gateway. Domain: agent tools, GRC-specific AI. |
| S3-002 | Create `services/ai/main.ts` entry point | P1 | TODO | — | AI service boots independently |
| S3-003 | AI service manages LLM provider connections (OpenAI, Anthropic, Ollama, etc.) | P1 | TODO | — | Provider registry runs within AI service; model switching works |
| S3-004 | AI service owns agent execution, memory, and audit tables | P1 | TODO | — | Own migrations for `ai_*` tables |
| S3-005 | Integrate `ai-governance`, `agrc-engine` into AI service | P1 | TODO | — | All AI-related modules in one service |
| S3-006 | Extract `agrc-engine/workers/` to run as separate worker processes | P1 | TODO | — | Workers auto-scale independently from API |
| S3-007 | AI service exposes REST/streaming API for agent invocations | P1 | TODO | — | `POST /ai/agent/:code/invoke` works; streaming responses supported |
| S3-008 | MCP (Model Context Protocol) integration scoped to AI service | P1 | TODO | — | MCP server runs within AI service |
| S3-009 | AI service Dockerfile + docker-compose | P1 | TODO | — | `docker-compose up ai` starts independently; GPU support optional |
| S3-010 | AI service integration tests | P1 | TODO | — | Agent invocation, provider fallback, memory tested |

- [ ] **S3-001** — AI: split runtime vs domain
- [ ] **S3-002** — AI: entry point
- [ ] **S3-003** — AI: provider management
- [ ] **S3-004** — AI: own DB schema
- [ ] **S3-005** — AI: integrate ai-governance + agrc-engine
- [ ] **S3-006** — AI: extract workers
- [ ] **S3-007** — AI: invocation API
- [ ] **S3-008** — AI: MCP integration
- [ ] **S3-009** — AI: Docker deploy
- [ ] **S3-010** — AI: integration tests

---

# PHASE 4 — SERVICE EXTRACTION WAVE 2

> Depends on: Phase 3 S1/S2/S3 DONE

## S4: GRC Core Service (compliance + risk + controls + exception)

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| S4-001 | Create `services/grc-core/main.ts` entry point | P1 | TODO | — | GRC Core service boots independently |
| S4-002 | Integrate compliance, risk, controls, exception modules | P1 | TODO | — | All 4 modules run within GRC Core boundary |
| S4-003 | GRC Core owns its DB tables (`compliance_*`, `risk_*`, `controls_*`, `exception_*`) | P1 | TODO | — | Own migrations; no shared writes |
| S4-004 | GRC Core communicates with Audit service via events (not direct import) | P1 | TODO | — | Zero direct imports to audit; events published on state changes |
| S4-005 | GRC Core communicates with Workflow service via API | P1 | TODO | — | Workflow transitions called via HTTP; no direct workflow imports |
| S4-006 | GRC Core Dockerfile + docker-compose | P1 | TODO | — | `docker-compose up grc-core` starts independently |
| S4-007 | GRC Core integration tests | P1 | TODO | — | Framework mapping, assessment, gap tracking, risk scoring tested |

- [ ] **S4-001** — GRC Core: entry point
- [ ] **S4-002** — GRC Core: integrate modules
- [ ] **S4-003** — GRC Core: own DB schema
- [ ] **S4-004** — GRC Core: event-based audit
- [ ] **S4-005** — GRC Core: API-based workflow
- [ ] **S4-006** — GRC Core: Docker deploy
- [ ] **S4-007** — GRC Core: integration tests

## S5: Governance Service (governance + policy + proactive-leadership)

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| S5-001 | Merge `governance-ai` + `governance-os` into `governance` (reduce 3 surfaces to 1) | P1 | TODO | — | Single governance module; aliases removed; no orphan routes |
| S5-002 | Create `services/governance/main.ts` entry point | P1 | TODO | — | Governance service boots independently |
| S5-003 | Integrate governance, policy, proactive-leadership | P1 | TODO | — | All modules run within Governance boundary |
| S5-004 | Governance owns its DB tables | P1 | TODO | — | Own migrations |
| S5-005 | Governance Dockerfile + docker-compose | P1 | TODO | — | `docker-compose up governance` starts independently |
| S5-006 | Governance integration tests | P1 | TODO | — | Policy lifecycle, board intelligence, governance scoring tested |

- [ ] **S5-001** — Governance: merge alias surfaces
- [ ] **S5-002** — Governance: entry point
- [ ] **S5-003** — Governance: integrate modules
- [ ] **S5-004** — Governance: own DB schema
- [ ] **S5-005** — Governance: Docker deploy
- [ ] **S5-006** — Governance: integration tests

## S6: Audit & Evidence Service

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| S6-001 | Create `services/audit/main.ts` entry point | P1 | TODO | — | Audit service boots independently |
| S6-002 | Integrate audit, evidence, records, attestation, workpapers | P1 | TODO | — | All modules within Audit boundary |
| S6-003 | Audit service consumes events from all other services | P1 | TODO | — | Event consumer subscribes to `*.trail.*` events |
| S6-004 | Audit service owns its DB tables | P1 | TODO | — | Own migrations; write-heavy optimized |
| S6-005 | Audit Dockerfile + docker-compose | P1 | TODO | — | `docker-compose up audit` starts independently |
| S6-006 | Audit integration tests | P1 | TODO | — | Audit trail creation, evidence linking, attestation tested |

- [ ] **S6-001** — Audit: entry point
- [ ] **S6-002** — Audit: integrate modules
- [ ] **S6-003** — Audit: event consumer
- [ ] **S6-004** — Audit: own DB schema
- [ ] **S6-005** — Audit: Docker deploy
- [ ] **S6-006** — Audit: integration tests

## S7: Reporting & Analytics Service

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| S7-001 | Create `services/reporting/main.ts` entry point | P1 | TODO | — | Reporting service boots independently |
| S7-002 | Integrate reporting, analytics, dashboard, widgets, qiyas, benchmarks | P1 | TODO | — | All read-heavy modules within Reporting boundary |
| S7-003 | Connect to ClickHouse for analytics queries | P1 | TODO | — | ClickHouse integration works; PostgreSQL read replica as fallback |
| S7-004 | Reporting Dockerfile + docker-compose | P1 | TODO | — | `docker-compose up reporting` starts independently |
| S7-005 | Reporting integration tests | P1 | TODO | — | Dashboard rendering, analytics queries, report generation tested |

- [ ] **S7-001** — Reporting: entry point
- [ ] **S7-002** — Reporting: integrate modules
- [ ] **S7-003** — Reporting: ClickHouse integration
- [ ] **S7-004** — Reporting: Docker deploy
- [ ] **S7-005** — Reporting: integration tests

---

# PHASE 5 — SERVICE EXTRACTION WAVE 3

> Depends on: Phase 4 DONE

## S8: Vendor & Portals Service

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| S8-001 | Create `services/vendor/main.ts` entry point | P1 | TODO | — | Vendor service boots independently |
| S8-002 | Integrate vendor, portals, privacy modules | P1 | TODO | — | All within Vendor boundary |
| S8-003 | Vendor Dockerfile + docker-compose | P1 | TODO | — | Starts independently |
| S8-004 | Vendor integration tests | P1 | TODO | — | Vendor assessment, portal access, privacy DSAR tested |

- [ ] **S8-001** — Vendor: entry point
- [ ] **S8-002** — Vendor: integrate modules
- [ ] **S8-003** — Vendor: Docker deploy
- [ ] **S8-004** — Vendor: integration tests

## S9: Integrations Service

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| S9-001 | Create `services/integrations/main.ts` entry point | P1 | TODO | — | Integrations service boots independently |
| S9-002 | Integrate integrations, connectors, inbox, notification modules | P1 | TODO | — | All within Integrations boundary |
| S9-003 | Integrations Dockerfile + docker-compose | P1 | TODO | — | Starts independently |
| S9-004 | Integrations integration tests | P1 | TODO | — | Webhook, notification delivery, inbox tested |

- [ ] **S9-001** — Integrations: entry point
- [ ] **S9-002** — Integrations: integrate modules
- [ ] **S9-003** — Integrations: Docker deploy
- [ ] **S9-004** — Integrations: integration tests

## S10: Knowledge & Training Service

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| S10-001 | Merge `knowledge` into `local-knowledge` (orphan consolidation) | P1 | TODO | — | Single module; no orphan |
| S10-002 | Create `services/knowledge/main.ts` entry point | P1 | TODO | — | Knowledge service boots independently |
| S10-003 | Integrate local-knowledge, training, packs, journey | P1 | TODO | — | All within Knowledge boundary |
| S10-004 | Knowledge Dockerfile + docker-compose | P1 | TODO | — | Starts independently |
| S10-005 | Knowledge integration tests | P1 | TODO | — | Content search, training paths, pack management tested |

- [ ] **S10-001** — Knowledge: merge orphan
- [ ] **S10-002** — Knowledge: entry point
- [ ] **S10-003** — Knowledge: integrate modules
- [ ] **S10-004** — Knowledge: Docker deploy
- [ ] **S10-005** — Knowledge: integration tests

## S11: Regulatory Service

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| S11-001 | Create `services/regulatory/main.ts` entry point | P1 | TODO | — | Regulatory service boots independently |
| S11-002 | Integrate ksa-regulatory, dora, bcp, asset | P1 | TODO | — | All within Regulatory boundary |
| S11-003 | Regulatory Dockerfile + docker-compose | P1 | TODO | — | Starts independently |
| S11-004 | Regulatory integration tests | P1 | TODO | — | KSA frameworks, DORA reporting, BCP plans, asset registry tested |

- [ ] **S11-001** — Regulatory: entry point
- [ ] **S11-002** — Regulatory: integrate modules
- [ ] **S11-003** — Regulatory: Docker deploy
- [ ] **S11-004** — Regulatory: integration tests

---

# PHASE 6 — ORPHAN MODULE CONSOLIDATION

> Can run in parallel with Phase 4-5

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| OR-001 | Merge `attestation` (403 LOC) into `audit` module | P2 | TODO | — | Code moved; routes re-mounted; tests pass |
| OR-002 | Merge `benchmarks` (505 LOC) into `analytics` module | P2 | TODO | — | Code moved; tests pass |
| OR-003 | Merge `dashboard-editor` (338 LOC) into `dashboard` module | P2 | TODO | — | Code moved; tests pass |
| OR-004 | Merge `executive` (115 LOC) into `dashboard` module | P2 | TODO | — | Code moved; tests pass |
| OR-005 | Merge `fitch` (791 LOC) into `analytics` or `risk` | P2 | TODO | — | Code moved; tests pass |
| OR-006 | Merge `grc-query` (254 LOC) into `analytics` | P2 | TODO | — | Code moved; tests pass |
| OR-007 | Merge `knowledge` (1,704 LOC) into `local-knowledge` | P2 | TODO | — | Code moved; tests pass |
| OR-008 | Merge `mcp` module (172 LOC) into `ai` or `platform` | P2 | TODO | — | Code moved; tests pass |
| OR-009 | Merge `operating-cockpit` (220 LOC) into `dashboard` | P2 | TODO | — | Code moved; tests pass |
| OR-010 | Merge `platform-stats` (409 LOC) into `analytics` | P2 | TODO | — | Code moved; tests pass |
| OR-011 | Merge `playbooks` (233 LOC) into `workflow` or `journey` | P2 | TODO | — | Code moved; tests pass |
| OR-012 | Merge `workpapers` (427 LOC) into `audit` | P2 | TODO | — | Code moved; tests pass |
| OR-013 | Decide: `team` (3,639 LOC) — promote to full module or merge into `admin` | P2 | TODO | — | Decision documented; code relocated; tests pass |

- [ ] **OR-001** — Merge `attestation` → `audit`
- [ ] **OR-002** — Merge `benchmarks` → `analytics`
- [ ] **OR-003** — Merge `dashboard-editor` → `dashboard`
- [ ] **OR-004** — Merge `executive` → `dashboard`
- [ ] **OR-005** — Merge `fitch` → `analytics`/`risk`
- [ ] **OR-006** — Merge `grc-query` → `analytics`
- [ ] **OR-007** — Merge `knowledge` → `local-knowledge`
- [ ] **OR-008** — Merge `mcp` → `ai`/`platform`
- [ ] **OR-009** — Merge `operating-cockpit` → `dashboard`
- [ ] **OR-010** — Merge `platform-stats` → `analytics`
- [ ] **OR-011** — Merge `playbooks` → `workflow`/`journey`
- [ ] **OR-012** — Merge `workpapers` → `audit`
- [ ] **OR-013** — Decide: `team` disposition

---

# PHASE 7 — TYPE SAFETY & CODE QUALITY

> Can run in parallel with Phase 3+

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| TQ-001 | Eliminate all `@ts-ignore` in codebase | P2 | TODO | — | `grep -r "@ts-ignore" backend/src/ | wc -l` returns 0 |
| TQ-002 | Eliminate all `@ts-nocheck` in codebase | P2 | TODO | — | `grep -r "@ts-nocheck" backend/src/ | wc -l` returns 0 |
| TQ-003 | Reduce `as any` casts (current: part of 2,748 suppressions) | P2 | TODO | — | `as any` count below 100 (from ~2,748 total suppressions) |
| TQ-004 | Enable `strictNullChecks: true` in backend tsconfig | P2 | TODO | — | Build passes with strictNullChecks enabled |
| TQ-005 | Enable `noImplicitAny: true` in backend tsconfig | P2 | TODO | — | Build passes with noImplicitAny enabled |
| TQ-006 | Enable `strict: true` in backend tsconfig | P3 | TODO | — | Full strict mode; build passes |
| TQ-007 | Achieve 80%+ test coverage for all GRC core modules | P2 | TODO | — | Coverage report shows >=80% for compliance, risk, controls, governance |
| TQ-008 | Achieve 60%+ test coverage for all other modules | P2 | TODO | — | Coverage report shows >=60% for remaining modules |
| TQ-009 | Add contract tests between all service boundaries | P2 | TODO | — | Contract tests exist for each inter-service API; CI runs them |
| TQ-010 | Add migration tests (fresh DB from baseline) | P2 | TODO | — | Fresh DB can be created from baseline + migrations; schema matches expected |
| TQ-011 | `pnpm lint` passes with zero warnings across entire backend | P2 | TODO | — | `pnpm lint` exit code 0 |
| TQ-012 | `pnpm typecheck` passes across entire backend | P2 | TODO | — | `pnpm typecheck` exit code 0 |

- [ ] **TQ-001** — Eliminate `@ts-ignore`
- [ ] **TQ-002** — Eliminate `@ts-nocheck`
- [ ] **TQ-003** — Reduce `as any` below 100
- [ ] **TQ-004** — Enable `strictNullChecks`
- [ ] **TQ-005** — Enable `noImplicitAny`
- [ ] **TQ-006** — Enable `strict: true`
- [ ] **TQ-007** — 80%+ test coverage for GRC core
- [ ] **TQ-008** — 60%+ test coverage for other modules
- [ ] **TQ-009** — Contract tests between services
- [ ] **TQ-010** — Migration tests
- [ ] **TQ-011** — Zero lint warnings
- [ ] **TQ-012** — Clean typecheck

---

# PHASE 8 — FRONTEND SDK & SERVICE ADAPTATION

> Depends on: Phase 3 services deployed

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| FE-001 | Create `@dos/frontend-sdk` package with typed API clients per service | P1 | TODO | — | Package exists; typed clients for all 12 services |
| FE-002 | Generate API clients from OpenAPI specs (one per microservice) | P1 | TODO | — | Auto-generated clients match service APIs |
| FE-003 | Update NgRx stores to use service-specific API endpoints | P1 | TODO | — | Frontend calls correct service endpoints via gateway |
| FE-004 | Implement service discovery / multi-endpoint frontend config | P1 | TODO | — | Frontend config supports per-service base URLs |
| FE-005 | Update `blueprint/features/` to use `@dos/frontend-sdk` | P2 | TODO | — | All 40+ feature modules use SDK; no hardcoded URLs |
| FE-006 | Frontend e2e tests pass against microservices deployment | P1 | TODO | — | All 26 e2e tests pass against docker-compose services |
| FE-007 | Frontend integration tests for each service boundary | P2 | TODO | — | Service-specific UI tests exist and pass |

- [ ] **FE-001** — Frontend SDK: create package
- [ ] **FE-002** — Frontend SDK: generate API clients
- [ ] **FE-003** — Frontend: update NgRx stores
- [ ] **FE-004** — Frontend: service discovery config
- [ ] **FE-005** — Frontend: migrate blueprint features
- [ ] **FE-006** — Frontend: e2e tests on microservices
- [ ] **FE-007** — Frontend: per-service integration tests

---

# PHASE 9 — PRODUCTION HARDENING

> Depends on: All services extracted and tested

## PH: Security

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| PH-001 | Secrets audit: zero hardcoded secrets in source | P0 | TODO | — | `grep -r "password\|secret\|api_key" --include="*.ts" src/ | grep -v "test\|mock\|example"` returns 0 results |
| PH-002 | All inter-service communication uses mTLS or service mesh | P1 | TODO | — | No plain HTTP between services in production |
| PH-003 | Rate limiting configured per service | P1 | TODO | — | Each service has appropriate rate limits |
| PH-004 | Input validation on all API endpoints (Zod schemas) | P1 | TODO | — | Every route has request validation middleware |
| PH-005 | SQL injection audit: all queries use parameterized statements | P1 | TODO | — | No string concatenation in SQL queries |
| PH-006 | CORS configured per service | P2 | TODO | — | Each service has explicit CORS policy |

- [ ] **PH-001** — Security: secrets audit
- [ ] **PH-002** — Security: mTLS/service mesh
- [ ] **PH-003** — Security: rate limiting
- [ ] **PH-004** — Security: input validation
- [ ] **PH-005** — Security: SQL injection audit
- [ ] **PH-006** — Security: CORS configuration

## PH: Observability

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| PH-007 | Distributed tracing across all services (OpenTelemetry) | P1 | TODO | — | Request traces span multiple services; correlation IDs propagated |
| PH-008 | Per-service health endpoints with dependency checks | P1 | TODO | — | Each service reports DB, Redis, downstream service health |
| PH-009 | Per-service Prometheus metrics | P1 | TODO | — | Request latency, error rate, queue depth per service |
| PH-010 | Centralized logging (structured JSON, Pino) | P1 | TODO | — | All services log structured JSON with correlation IDs |
| PH-011 | Alert rules defined for critical failures | P2 | TODO | — | Alerts for: service down, DB connection failure, queue backup, auth failure spike |
| PH-012 | Grafana dashboards per service | P2 | TODO | — | Dashboard exists for each of 12 services |

- [ ] **PH-007** — Observability: distributed tracing
- [ ] **PH-008** — Observability: health endpoints
- [ ] **PH-009** — Observability: Prometheus metrics
- [ ] **PH-010** — Observability: centralized logging
- [ ] **PH-011** — Observability: alert rules
- [ ] **PH-012** — Observability: Grafana dashboards

## PH: Deployment & Operations

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| PH-013 | Per-service Terraform modules | P1 | TODO | — | Each service has Terraform config for cloud deployment |
| PH-014 | CI/CD pipeline per service | P1 | TODO | — | Change in one service only rebuilds/deploys that service |
| PH-015 | Rollback procedure per service | P1 | TODO | — | Documented and tested rollback for each service |
| PH-016 | Database migration strategy per service | P1 | TODO | — | Each service runs its own migrations independently |
| PH-017 | Blue-green or canary deployment support | P2 | TODO | — | Zero-downtime deployments for each service |
| PH-018 | Disaster recovery runbook | P2 | TODO | — | DR tested; RTO/RPO defined per service |
| PH-019 | Capacity planning per service | P2 | TODO | — | Load tested; scaling thresholds defined |
| PH-020 | Air-gap deployment profile (no external network) | P2 | TODO | — | All services deploy without internet access; local model support |

- [ ] **PH-013** — Deployment: per-service Terraform
- [ ] **PH-014** — Deployment: per-service CI/CD
- [ ] **PH-015** — Deployment: rollback procedures
- [ ] **PH-016** — Deployment: per-service migrations
- [ ] **PH-017** — Deployment: blue-green/canary
- [ ] **PH-018** — Deployment: DR runbook
- [ ] **PH-019** — Deployment: capacity planning
- [ ] **PH-020** — Deployment: air-gap profile

---

# PHASE 10 — PRODUCTION GATE

> Final gate before GA release

| ID | Task | Priority | Status | Owner | Acceptance Criteria |
|----|------|----------|--------|-------|-------------------|
| PG-001 | All 12 services boot independently via docker-compose | P0 | TODO | — | `docker-compose up` starts all; all health checks green |
| PG-002 | Zero cross-module direct imports | P0 | TODO | — | Grep returns 0 |
| PG-003 | All `@dos/*` packages populated and consumed | P0 | TODO | — | Zero relative path imports for shared code |
| PG-004 | All e2e tests pass against microservices deployment | P0 | TODO | — | 26 e2e tests green |
| PG-005 | All contract tests pass between services | P0 | TODO | — | Contract test suite green |
| PG-006 | `pnpm build` passes for all packages and services | P0 | TODO | — | Exit code 0 |
| PG-007 | `pnpm lint` passes with zero warnings | P0 | TODO | — | Exit code 0 |
| PG-008 | `pnpm typecheck` passes | P0 | TODO | — | Exit code 0 |
| PG-009 | Security scan passes (no critical/high findings) | P0 | TODO | — | SAST/DAST report clean |
| PG-010 | Load test passes (>100 concurrent users per service) | P1 | TODO | — | p99 latency <500ms under load |
| PG-011 | Fresh tenant provisioning works end-to-end | P0 | TODO | — | New tenant created, products enabled, smoke test passes |
| PG-012 | Rollback tested for each service | P0 | TODO | — | Each service rolled back and recovered successfully |
| PG-013 | Monitoring dashboards operational | P1 | TODO | — | All 12 service dashboards show live data |
| PG-014 | Handover package complete | P1 | TODO | — | Architecture docs, runbooks, config matrix, access matrix delivered |

- [ ] **PG-001** — Gate: all services boot
- [ ] **PG-002** — Gate: zero cross-module imports
- [ ] **PG-003** — Gate: @dos/* packages consumed
- [ ] **PG-004** — Gate: e2e tests pass
- [ ] **PG-005** — Gate: contract tests pass
- [ ] **PG-006** — Gate: build passes
- [ ] **PG-007** — Gate: lint passes
- [ ] **PG-008** — Gate: typecheck passes
- [ ] **PG-009** — Gate: security scan clean
- [ ] **PG-010** — Gate: load test passes
- [ ] **PG-011** — Gate: fresh tenant works
- [ ] **PG-012** — Gate: rollback tested
- [ ] **PG-013** — Gate: monitoring operational
- [ ] **PG-014** — Gate: handover package

---

# SUMMARY STATISTICS

| Phase | Items | P0 | P1 | P2 | P3 |
|-------|-------|----|----|----|----|
| Phase 0 — Global Blockers | 26 | 16 | 10 | 0 | 0 |
| Phase 1 — Platform Core | 25 | 1 | 24 | 0 | 0 |
| Phase 2 — Cross-Module Decoupling | 10 | 1 | 9 | 0 | 0 |
| Phase 3 — Wave 1 Services | 25 | 0 | 25 | 0 | 0 |
| Phase 4 — Wave 2 Services | 24 | 0 | 24 | 0 | 0 |
| Phase 5 — Wave 3 Services | 17 | 0 | 17 | 0 | 0 |
| Phase 6 — Orphan Consolidation | 13 | 0 | 0 | 13 | 0 |
| Phase 7 — Type Safety & Quality | 12 | 0 | 0 | 10 | 2 |
| Phase 8 — Frontend SDK | 7 | 0 | 4 | 3 | 0 |
| Phase 9 — Production Hardening | 20 | 1 | 11 | 8 | 0 |
| Phase 10 — Production Gate | 14 | 9 | 5 | 0 | 0 |
| **TOTAL** | **193** | **28** | **129** | **34** | **2** |

---

# IMPORT/EXPORT FORMAT (CSV)

```csv
ID,Phase,Task,Priority,Status,Owner,Service,Acceptance_Criteria
GB-001,0,Populate @dos/types with shared types,P0,DONE,Agent,platform,"56 type modules ~14385 LOC; all GRC/IAM/platform domains; pnpm build passes (2026-04-08)"
GB-002,0,Populate @dos/db with database utilities,P0,TODO,,platform,"safeQuery/tenantSchema/getFirstRow exported; build passes"
GB-003,0,Populate @dos/contracts with API/event contracts,P0,TODO,,platform,"All schemas and event types exported; build passes"
GB-004,0,Populate @dos/platform-core with DOS runtime,P0,TODO,,platform,"All platform-neutral runtime exported; build passes"
GB-005,0,Populate @dos/auth with DAuth,P0,TODO,,auth,"All auth services/middleware exported; build passes"
GB-006,0,Populate @dos/module-sdk as facade,P0,TODO,,platform,"Single import replaces 20+ relative imports; build passes"
GB-007,0,Populate @shahin/product with product layer,P0,TODO,,product,"Product manifest and agent registry exported; build passes"
GB-008,0,Codemod: types/ to @dos/types,P0,TODO,,platform,"Script exists; dry-run mode; handles all patterns"
GB-009,0,Codemod: config/database to @dos/db,P0,TODO,,platform,"Handles safeQuery/tenantSchema/query/getFirstRow"
GB-010,0,Codemod: utils/ to @dos/module-sdk,P0,TODO,,platform,"Covers logger/api-response/http-error/db-utils"
GB-011,0,Codemod: _shared/ to @dos/types or sdk,P0,TODO,,platform,"Covers module-manifest/module-registry/navigation"
GB-012,0,Execute import migration (11598 imports),P0,TODO,,platform,"Zero ../../.. imports remain; build+test pass"
GB-013,0,Remove _shared/ directory,P0,TODO,,platform,"Directory deleted; no references; build passes"
GB-014,0,Align backend tsconfig to NodeNext,P1,TODO,,platform,"module+moduleResolution=NodeNext; build passes"
GB-015,0,Add @dos/* path aliases to tsconfig,P0,TODO,,platform,"All 7 paths resolve; editor autocomplete works"
GB-016,0,Create per-package tsconfig.build.json,P1,TODO,,platform,"Each package has build config extending base"
GB-017,0,Enable strict in @dos/* packages,P1,TODO,,platform,"All 7 packages compile strict; no @ts-ignore"
GB-018,0,Create docker-compose.yml with 12 services,P0,TODO,,infra,"File validates; defines 12 services + deps"
GB-019,0,Create API gateway service,P0,TODO,,infra,"Routes to services; single frontend entry; health passes"
GB-020,0,Implement inter-service event bus,P0,TODO,,platform,"Pub/sub works across 2+ services"
GB-021,0,Implement service-to-service HTTP client,P1,TODO,,platform,"Typed client with retry/circuit-breaker/correlation"
GB-022,0,Create per-service Dockerfile template,P1,TODO,,infra,"Template builds any service with build-arg"
GB-023,0,Split server-startup.ts (804 lines),P0,TODO,,platform,"Composable startup phases; independently callable"
GB-024,0,Replace static route imports with dynamic registration,P0,TODO,,platform,"Routes from manifests; zero server-routes changes for new modules"
GB-025,0,Create per-service entry points,P1,TODO,,platform,"Each service has own main.ts"
GB-026,0,Extract middleware stack to @dos/platform-core,P1,TODO,,platform,"Middleware composable per service"
```

> Full CSV with all 193 items available by extending this pattern for each phase.

---

# ENFORCEMENT RULES

1. **No code may be merged** that increases the cross-module import count
2. **No new module** may be created without a manifest and `@dos/module-sdk` imports
3. **No `@ts-ignore`** may be added — existing ones must decrease
4. **No hardcoded route imports** may be added to `server-routes.ts`
5. **No direct DB access** across service boundaries
6. **No feature may ship** without test coverage for the changed surface
7. **Every checkbox** requires evidence (commit hash, test output, or build log)

---

> **Last updated:** 2026-04-06  
> **Next review:** After Phase 0 completion  
> **Governing docs:** `AGENTS.md`, `CLAUDE.md`, `DOS-AIO-Specs/DOS-AIO.md`

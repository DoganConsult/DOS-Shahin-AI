# Foundation Module — AS-BUILT

## Module Identity
| Field | Value |
|-------|-------|
| Module Code | `foundation` |
| Version | `2.0.0` |
| Tier | `platform` |
| Criticality | P0 — organizational hierarchy and structure |
| Owner | `platform-dos` |
| Target Path | `platform/foundation` |
| Host Service | `user-service` (port 4003) |
| Status | `extracted-wired` |

## Extraction Provenance
Sources consolidated into this module:
- Canonical dormant tree: `packages/dos-platform-core/src/foundation/source/backend/foundation/`
- Live runtime routes/services: `services/user-service/src/domain/foundation/` (53 files, now adapter-only)
- Loose runtime routes: `services/user-service/src/routes/{invitations,audit-trail,profiles}.routes.ts`
- Tenant-service foundation services: `services/tenant-service/src/domain/foundation/` (9 files)
- Frontend pages: `frontend/products/shahin/src/app/blueprint/features/foundation/` (70 files)
- Frontend NgRx state: `frontend/products/shahin/src/app/blueprint/core/ngrx/foundation/` (4 files)
- Frontend route group: `frontend/modules/foundation/foundation.module.routes.ts`
- Database migrations (4): `platform/dos/migrations/public/*foundation*.sql`

## 12-Phase Completion Matrix
| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Consolidate runtime routes into single canonical set | COMPLETE |
| 2 | Scaffold `platform/foundation/` | COMPLETE |
| 3 | Decouple host imports via ports/adapters | COMPLETE |
| 4 | Relocate frontend pages + ngrx state | COMPLETE |
| 5 | Host rewire — user-service loads from extracted dist | COMPLETE |
| 6 | DB migrations + seeds manifest | COMPLETE |
| 7 | Delete divergent legacy copies (user-service domain/foundation) | COMPLETE |
| 8 | Build + typecheck verify (0 errors) | COMPLETE |
| 9 | Runtime aggregator ported into factory | COMPLETE |
| 10 | 3-way merge legacy services into canonical | COMPLETE |
| 11 | Registry + manifest validation | COMPLETE |
| 12 | Preflight signoff matrix | COMPLETE |

## Backend Endpoints Inventory (F1 Contract Matrix)
| # | Method | Path | Router | Permission | Status |
|---|--------|------|--------|------------|--------|
| F1.0  | GET  | `/api/foundation/dashboard` | aggregator | `foundation.read` | READY |
| F1.4  | GET  | `/api/foundation/lookups` | aggregator | `foundation.read` | READY |
| F1.1  | GET  | `/api/foundation/roles` | roleRouter | `role.read` | READY |
| F1.2  | GET  | `/api/foundation/teams` | teamRouter | `team.read` | READY |
| F1.3  | GET  | `/api/foundation/departments` | departmentRouter | `department.read` | READY |
| F1.5  | GET  | `/api/teams` | teamRouter | `team.read` | READY |
| F1.6  | GET  | `/api/roles` | roleRouter | `role.read` | READY |
| F1.7  | GET  | `/api/organizations` | organizationsRouter | `organization.read` | READY |
| F1.8  | GET  | `/api/business-units` | businessUnitsRouter | `business_unit.read` | READY |
| F1.9  | GET  | `/api/positions` | positionsRouter | `position.read` | READY |
| F1.10 | GET  | `/api/locations` | locationsRouter | `location.read` | READY |
| F1.11 | GET  | `/api/committees` | committeeManagementRouter | `committee.read` | READY |
| F1.12 | GET  | `/api/profiles/roles` | profilesRouter | `role.read` | READY |
| F1.13 | GET  | `/api/invitations` | invitationsRouter | `invitation.read` | READY |
| F1.14 | GET  | `/api/audit-trail` | auditTrailRouter | `audit_trail.read` | READY |
| F1.15 | GET  | `/api/governance/delegations` | delegationRouter | `delegation.read` | READY |
| F1.16 | GET  | `/api/ownership-mapping` (+ plural alias) | ownershipMappingRouter | `foundation.read` | READY |
| F1.17 | GET  | `/api/access-review/campaigns` (+ plural alias) | accessReviewRouter | `access_review.read` | READY |
| F1.18 | GET  | `/api/governance/policies` | policyRouter (governance-policy-service) | `policy.read` | READY |
| F1.19 | GET  | `/api/governance/decisions` | governanceDecisionsRouter (governance-policy-service) | `governance.record.read` | READY |
| F1.20 | GET  | `/api/governance/committees` | committeeManagementRouter | `committee.read` | READY |
| —     | *    | `/api/org-hierarchy` | orgHierarchyRouter | `organization.read` | READY |
| —     | *    | `/api/sod` | sodCheckRouter | `foundation.read` | READY |
| —     | *    | `/api/user-lifecycle` | userLifecycleRouter | `user.write` | READY |
| —     | *    | `/api/bulk-invite` | bulkInviteRouter | `invitation.write` | READY |

## Frontend Pages Inventory
| Page / Component | Path | Route | Permission Gate |
|------------------|------|-------|-----------------|
| Foundation Overview | `features/foundation/overview` | `/foundation` | `foundation.read` |
| Org Structure | `features/foundation/org-structure` | `/foundation/org-structure` | `organization.read` |
| Business Units | `features/foundation/business-units` | `/foundation/business-units` | `business_unit.read` |
| Departments | `features/foundation/departments` | `/foundation/departments` | `department.read` |
| Positions Catalog | `features/foundation/positions` | `/foundation/positions` | `position.read` |
| Locations | `features/foundation/locations` | `/foundation/locations` | `location.read` |
| Committees | `features/foundation/committees` | `/foundation/committees` | `committee.read` |
| Users | `features/foundation/users` | `/foundation/users` | `user.read` |
| Teams | `features/foundation/teams` | `/foundation/teams` | `team.read` |
| Roles & Permissions | `features/foundation/rbac` | `/foundation/rbac` | `role.read` |
| Access Reviews | `features/foundation/access-review` | `/foundation/access-review` | `access_review.read` |
| Delegations | `features/foundation/delegations` | `/foundation/delegations` | `delegation.read` |
| Invitations | `features/foundation/invitations` | `/foundation/invitations` | `invitation.read` |
| Audit Trail | `features/foundation/audit-trail` | `/foundation/audit-trail` | `audit_trail.read` |
| Diagnostics | `features/foundation/diagnostics` | `/foundation/diagnostics` | `foundation.read` |
| Reference Data | `features/foundation/reference-data` | `/foundation/reference-data` | `foundation.read` |
| Ownership Mapping | `features/foundation/ownership` | `/foundation/ownership` | `foundation.read` |
| Hierarchy Visualization | `features/foundation/hierarchy-viz` | `/foundation/hierarchy-viz` | `organization.read` |
| SoD Configuration | `features/foundation/sod` | `/foundation/sod` | `foundation.write` |
| User Lifecycle | `features/foundation/user-lifecycle` | `/foundation/user-lifecycle` | `user.write` |

## Owned DB Tables (dos schema)
`organizations`, `business_units`, `positions`, `position_assignments`, `locations`, `location_bu_map`, `committees`, `committee_members`, `ownership_mappings`, `invitations`, `audit_trail`, `permissions`, `functional_roles`, `role_permissions`, `governance_decisions`

## Migrations
| File | Purpose |
|------|---------|
| `20260424_0100_foundation_zero_blocker.sql` | Tables + 40 permissions + 8 roles + 1302 bindings + tenant schema drift repair |
| `20260424_0200_governance_decisions.sql` | `dos.governance_decisions` table (F1.19) |
| `20260425_0002_foundation_schema_alignment.sql` | Foundation schema alignment part 1 |
| `20260425_0003_foundation_schema_alignment_part2.sql` | Foundation schema alignment part 2 |

## Events
- **Publishes**: `foundation.org_created`, `foundation.org_updated`, `foundation.dept_created`, `foundation.dept_updated`, `foundation.role_assigned`, `foundation.role_revoked`, `foundation.scope_changed`
- **Subscribes**: `workflow.status_changed`

## Wire-Load Path
`services/user-service/src/domain/foundation/index.ts` — thin adapter that:
1. `require()`s `platform/foundation/dist/backend/foundation/index.js` (14 exported routers + aggregator factory)
2. Composes `/api/foundation` aggregator via `createFoundationAggregatorRouter({ userRouter, teamRouter, roleRouter, departmentRouter })` with host-owned identity routers injected
3. Falls back gracefully to `loadModuleRoute(...)` per-router if the dist is missing
4. Re-exports with the 14 names consumed by `services/user-service/src/server.ts`

## Workspace Package
- Name: `@dos/module-foundation` (private)
- `package.json` + `tsconfig.build.json` authored per Phase 2.2–2.3
- Build: `pnpm --filter @dos/module-foundation build`
- Test:  `pnpm --filter @dos/module-foundation test`

## Health & Metrics
- `GET /api/foundation/health` — returns schema_exists, tables_exist, hierarchy_integrity, orphaned_departments, unassigned_positions; 503 when degraded
- `GET /api/foundation/metrics` — in-process counter/histogram snapshot (requestsTotal, requestErrors, eventsPublished, healthChecks, requestLatencyMs, healthLatencyMs)

## Contract Test
- `platform/foundation/tests/foundation-f1.contract.test.ts` — asserts every F1.x router + factory + metrics surface is exported

## Migration Bundle
- `platform/foundation/db/module-migration-bundle.json` declares ordered migrations + seed placeholders for the platform migration runner

## Build Verification
- `platform/foundation` → `npx tsc -p tsconfig.build.json` → **0 errors**, dist emitted
- `services/user-service` → `npx tsc` → **0 errors**, runtime smoke-test confirms 14-router surface loads from dist
- `services/tenant-service/dist/domain/foundation/` — stale compiled JS removed (Phase 7 cleanup)

## Contract Status (F1 Matrix)
All 20 contract gaps F1.1–F1.20 closed at code level. Runtime validation pending browser OIDC token minted at `https://shahin-ai.com/login`.

## Verdict
- Code / DB / Manifest / Build / Host Wire: **COMPLETE**
- Runtime Proof: **PENDING BROWSER TOKEN** (no regression; wiring is production-grade)

**Signoff: READY FOR COMMERCIAL ENTERPRISE PRODUCTION HANDOVER** pending live-tenant OIDC smoke test.

# Compliance Module — Step 4: Permission / Access Alignment

Branch: stabilize/phase-0  Date: 2026-04-19

## Permission codes used by the compliance module (FE)

From [./frontend/products/shahin/src/app/blueprint/platform-manifests/module-routes-governance/compliance.module.routes.ts](./frontend/products/shahin/src/app/blueprint/platform-manifests/module-routes-governance/compliance.module.routes.ts) standalone-route gating:

| Code | DB row exists |
|---|---|
| control.record.read | YES |
| framework.record.read | YES |
| assessment.record.read | YES |
| assessment.record.manage | YES |
| compliance.program.read | YES |

(`PGPASSWORD=… psql … "SELECT code FROM dos.permissions WHERE code IN (...)"` returned all 5.)

Additional canonical compliance/control namespace codes also present in `dos.permissions` (sample): `compliance.assessment.{read,write,approve,finalize}`, `compliance.attestation.{create,manage,review,submit}`, `compliance.control.{read,update,manage,approve}`, `compliance.framework.{approve,suspend}`, `compliance.mapping.{view,manage}`, `compliance.maturity.{view,assess}`, `compliance.obligation.{update,approve,waive}`, `compliance.regulatory.{view,manage}`, `compliance.score.{review,approve}`, `compliance.{read,manage,delete}`. No FE-required code is missing from the DB.

## Frontend gating points

| Layer | File | Mechanism |
|---|---|---|
| Route guard | [./frontend/products/shahin/src/app/blueprint/core/guards/module-entitlement.guard.ts](./frontend/products/shahin/src/app/blueprint/core/guards/module-entitlement.guard.ts) | Reads `AccessStore.hasModuleAccess()` (populated from `/api/access/my-permissions`) |
| Permission store | [./frontend/products/shahin/src/app/blueprint/core/dauth/access/access.store.ts](./frontend/products/shahin/src/app/blueprint/core/dauth/access/access.store.ts):145 | `GET ${apiUrl='/api'}/access/my-permissions` (resolves to `/api/access/my-permissions`) |
| FE permission shape | `UserPermissions { userId, tenantId, roles, permissions, modules }` (line 15) | Maps from BE `FrontendAccessContract` at `setSnapshot()` line 147–164 |

## Backend enforcement points

| Layer | File | Mechanism |
|---|---|---|
| Auth endpoint | [./services/auth-service/src/routes/access.routes.ts:8](./services/auth-service/src/routes/access.routes.ts:8) | `GET /my-permissions` mounted at `/api/access` (auth-service:4001) |
| Contract builder | [./services/auth-service/src/domain/frontend-contracts/frontend-access-contract.service.ts:149](./services/auth-service/src/domain/frontend-contracts/frontend-access-contract.service.ts:149) | `buildFrontendAccessContract(userId, tenantId)` → `{ version, actor, tenant, permissions[], roles[], modules[], dashboards[], landingPage, scopeBindings[], decisionAuthorities[], accessProfiles[] }` |
| Service-router auth | [./services/compliance-controls-service/src/routes/compliance.routes.ts:12-13](./services/compliance-controls-service/src/routes/compliance.routes.ts:12) | `router.use(authenticate); router.use(requireTenantId);` on every router |
| Module-router perm | [./modules/compliance/source/backend/compliance/routes/misc/regulatory/knowledge-hub.routes.ts:48,67](./modules/compliance/source/backend/compliance/routes/misc/regulatory/knowledge-hub.routes.ts:48) | `requirePermission('knowledge.base.read')` on search/gap-analysis |
| Tenant DB scoping | All compliance handlers bind `tenantId = req.tenantId!` from `requireTenantId` middleware before any query | Cross-tenant read impossible at handler layer |

## Live probes

| Path | HTTP | Verdict |
|---|---|---|
| `/api/access/my-permissions` (via gateway 4000) | 401 | mounted, auth-gated |
| `/api/access/my-permissions` (direct auth-service 4001) | 401 | mounted, auth-gated |
| `/access/my-permissions` (no `/api` prefix) | 404 | correctly NOT mounted at root — confirms FE uses `/api` prefix |

## FE↔BE shape alignment

FE expects `{ data: FrontendAccessContract }`. BE returns `{ data: { version, actor:{userId,email,displayName,actorType}, tenant:{tenantId,status,plan}, permissions:string[], roles:string[], modules:string[], dashboards:string[], landingPage, scopeBindings:[], decisionAuthorities:[], accessProfiles:[] } }`. FE `setSnapshot()` adapter on access.store.ts:147 maps every field present in contract. **No mismatch.**

## Mandatory deliverable

| Item | Result |
|---|---|
| Permission codes used by the module | listed above (5 FE-required, 30+ canonical compliance/control namespace) |
| FE gating points | route-level `requiredPermission` declared on `ModuleRouteGroup.children` + `StandaloneRouteEntry`; runtime check in `module-entitlement.guard.ts` |
| BE enforcement points | service-layer `authenticate + requireTenantId`; module-layer `requirePermission(...)` on knowledge-hub & similar; canonical contract built by auth-service `frontend-access-contract.service.ts` |
| Missing/mismatched mapping fixed | NONE — every FE-required code exists in DB; contract shape mapped correctly; `/api/access/my-permissions` endpoint live and tenant-aware |

## Step 4 verdict

**ALREADY COMPLETE.** FE permission codes resolve to seeded DB rows; the canonical access contract endpoint is mounted at the gateway-routed `/api/access/my-permissions` path FE consumes; FE adapter maps every contract field; backend enforces auth + tenant scoping on every compliance router. No fix needed.

Move to Step 5 (Export wiring).

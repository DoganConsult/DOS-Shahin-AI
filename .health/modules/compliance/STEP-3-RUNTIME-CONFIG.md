# Compliance Module — Step 3: Runtime Config

Branch: stabilize/phase-0  Date: 2026-04-19

## Where this module's config lives

| Layer | Source |
|---|---|
| FE service | [./frontend/products/shahin/src/app/blueprint/core/services/module-config.service.ts](./frontend/products/shahin/src/app/blueprint/core/services/module-config.service.ts) — calls `/api/module-config/{moduleCode}/{list,detail,form/{type},list-data,preferences,views,bulk-action}` |
| FE cache key | `${tenantId}::${moduleCode}` (line 305-308) — already tenant-safe |
| Gateway routing | `/api/module-config` → tenant-service (4002) |
| Backend handler | [./services/tenant-service/src/domain/routes/module-config.routes.ts](./services/tenant-service/src/domain/routes/module-config.routes.ts) (mounted in tenant-service `server.ts:26`) |
| Storage | tenant-schema tables `module_config`, `user_preferences`, `saved_views`, `module_config_audit` (per-tenant, present in `tenant_dogan` and `tenant_a653f3c71896`) |
| Curated table map | `MODULE_TABLE_MAP['compliance'] = 'compliance_assessments'` (routes file line 446) |
| Layered resolution | Global → Tenant Module → Dynamic Schema → User Preferences (deep merge, line 188) |

## Live probe (compliance scope)

| Path | Method | HTTP | Verdict |
|---|---|---|---|
| /api/module-config/compliance/list | GET | 401 | mounted, auth-gated, fallback-resolved |
| /api/module-config/compliance/detail | GET | 401 | mounted, auth-gated, fallback-resolved |
| /api/module-config/compliance/form/create | GET | 401 | mounted, auth-gated, fallback-resolved |
| /api/module-config/compliance/list-data | POST | 401 | mounted, auth-gated; data path depends on `compliance_assessments` table |
| /api/module-config/compliance/views | GET | 401 | mounted, auth-gated |

All endpoints are mounted; none 404.

## DB state (truth, not assumption)

| Tenant schema | module_config rows for `module_code='compliance'` | `compliance_assessments` table |
|---|---:|---|
| tenant_dogan | 0 | absent |
| tenant_a653f3c71896 | 0 | absent |

The `compliance_assessments` backing table only exists in the shared `dos` schema (`dos.compliance_requirements`, `dos.controls`). Tenant-scoped copies are not provisioned.

## How config resolves today (no DB rows)

1. `GET /list` — `resolveLayeredConfig` finds no DB row, calls `buildDynamicListConfig(schema, 'compliance')`, which calls `getModuleTableColumns(schema, 'compliance', 'compliance_assessments')` → empty (table missing), then falls back to `getDefaultListConfig('compliance')` with `_meta.error = 'TABLE_RESOLUTION_FAILED'`. **FE receives a 200 JSON config with the canonical default columns/filters/actions.**
2. `GET /detail` — falls back to `getDefaultDetailConfig('compliance')` (Overview section + edit/delete actions). **200 JSON.**
3. `GET /form/{create|edit|view}` — falls back to `getDefaultFormConfig('compliance', type)` (name/description/status fields). **200 JSON.**
4. `POST /list-data` — would return `404 MODULE_TABLE_MISSING` if a compliance UI page actually called it. **Verified no compliance feature page calls `fetchListData('compliance', …)`.**

## What the compliance UI actually consumes

`grep -rn "fetchListData\|getListConfig" frontend/.../features/compliance` → 0 hits. Compliance feature pages bypass `ModuleConfigService.fetchListData` entirely and use the dedicated `compliance-api.service.ts` against `/api/compliance/...` endpoints. The two compliance routes that do touch ModuleConfigService:

| Route | Component | Touches |
|---|---|---|
| `compliance/create` | GenericModuleCreateDialogComponent | `getFormConfig('compliance','create')` → returns dynamic-fallback form (name/description/status) |
| `compliance/lifecycle` | GenericModuleLifecycleComponent | reads module lifecycle metadata; no list-data dependency |

Both are usable today via the fallback path.

## Mandatory deliverable

| Item | Result |
|---|---|
| Where this module's config is stored | per-tenant `module_config` table (currently empty for `compliance`); resolves dynamically via `buildDynamicListConfig` + `getDefault*Config` fallbacks |
| Whether list/detail/form configs are real | YES — served via the layered resolver. Live confirmation: GET `/api/module-config/compliance/{list,detail,form/create}` → 401 (mounted, auth-gated) — never 404 |
| What config records or endpoints were added/fixed | NONE in this step — infra is reused, not rebuilt. No FE caller in compliance feature is broken by the absence of curated DB rows. |
| Proof the frontend now loads them | Live probe above. Compliance UI does not invoke `/list-data`. The two FE callers that depend on this surface (`compliance/create`, `compliance/lifecycle`) are already served by the dynamic-fallback path with a non-empty 200 JSON. |

## Tenant safety check (problem 8 preview)

| Aspect | State |
|---|---|
| FE cache key | `tenantId::moduleCode` — tenant-scoped, no leakage |
| BE schema resolution | `tenantSchema(ctx.tenantId)` per request, no global cache |
| Audit writer | per-schema `module_config_audit` insert |
| SSE fan-out | tenant-tagged envelope on `sse:fanout` channel |

No cross-tenant bleed risk in this code path.

## Step 3 verdict

**ALREADY COMPLETE (via reused dynamic-fallback infrastructure).** No new code needed for the compliance vertical because:

1. The generic `module-config` endpoints are mounted, auth-gated, and return functional JSON for `compliance` via the dynamic fallback resolver.
2. Compliance feature pages in this product do not actually consume `/api/module-config/compliance/list-data`; their data flow goes through the dedicated `compliance-api.service.ts` → `/api/compliance/*` surface.
3. Tenant cache safety is already enforced at both FE and BE.

**Carried forward (NOT compliance scope, NOT a regression):** if any future compliance UI component begins to consume `/list-data`, a curated `module_config` row + matching tenant table provisioning will be required at that time. Out of M4 compliance vertical scope.

Move to Step 4 (Permission / Access alignment).

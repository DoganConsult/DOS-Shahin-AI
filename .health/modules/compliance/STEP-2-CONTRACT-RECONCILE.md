# MODULE: compliance — Step 2 Contract Reconcile

Branch: stabilize/phase-0  Date: 2026-04-19

## Re-classification after live POST/GET method probe

Step 1 listed 7 candidate gaps (C-01 … C-07). After probing both
GET and POST, only 2 are real, the rest were false positives from
GET-only probing or are out-of-scope:

| ID | Path | Re-verdict | Reason |
|---|---|---|---|
| C-01 | /api/compliance-ext/obligations/:id/activity | **REAL — fixed in this step** | wrong prefix + missing handler |
| C-02 | /api/knowledge-hub/gap-analysis | **REAL — fixed in this step** | wrong prefix |
| C-03 | /api/ksa-regulatory/dashboard | OUT OF SCOPE | belongs to `ksa-regulatory` module vertical |
| C-04 | /api/ksa-sector-maturity/assess | EXISTS (POST 401) | step-1 GET probe was wrong method |
| C-05 | /api/lifecycle/controls/:id/* | EXISTS | sub-paths return 401, bare path is parameter-required |
| C-06 | /api/rcsa/responses/:id | EXISTS (POST 401) | step-1 GET probe was wrong method |
| C-07 | /api/assessment-templates | OUT OF SCOPE — ALREADY DISABLED | FE route is `redirectTo: /compliance/overview`, sidebar link removed, hub tab removed (Phase 10C drift 5) |

## C-01 — ACTIONS COMPLETED

| Field | Value |
|---|---|
| Frontend caller | [./frontend/products/shahin/src/app/blueprint/features/compliance/pages/regulatory-group/compliance-regulatory/obligation-detail-page.component.ts:509](./frontend/products/shahin/src/app/blueprint/features/compliance/pages/regulatory-group/compliance-regulatory/obligation-detail-page.component.ts:509) |
| Old expected endpoint | `/api/compliance-ext/obligations/:id/activity` |
| New canonical endpoint | `/api/compliance/obligations/:id/activity` |
| Backend route file | [./services/compliance-controls-service/src/routes/compliance.routes.ts:206](./services/compliance-controls-service/src/routes/compliance.routes.ts:206) |
| Backend handler | proxies to `audit-service /api/audit/entries?entityType=obligation&entityId=:id` via new `listAuditEntries` adapter helper |
| Adapter file | [./services/compliance-controls-service/src/adapters/audit.adapter.ts:50](./services/compliance-controls-service/src/adapters/audit.adapter.ts:50) |
| Auth | `authenticate + requireTenantId` (router-level), forwards bearer token + x-tenant-id to audit-service |
| Datastore | none — reuses canonical audit-service trail (no parallel store) |
| Live verification | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4012/api/compliance/obligations/abc-123/activity` → **401** (mounted, auth-gated) — was **404** before |

## C-02 — ACTIONS COMPLETED

| Field | Value |
|---|---|
| Frontend caller | [./frontend/products/shahin/src/app/blueprint/features/compliance/services/compliance-api.service.ts:560](./frontend/products/shahin/src/app/blueprint/features/compliance/services/compliance-api.service.ts:560) |
| Old expected endpoint | `/api/knowledge-hub/gap-analysis` |
| New canonical endpoint | `/api/compliance/knowledge-hub/gap-analysis` |
| Backend route file | [./modules/compliance/source/backend/compliance/routes/misc/regulatory/knowledge-hub.routes.ts:67](./modules/compliance/source/backend/compliance/routes/misc/regulatory/knowledge-hub.routes.ts:67) |
| Backend mount | aggregator mounts `knowledge-hub.routes` under `/compliance/knowledge-hub`; gateway routes `/api/compliance` → 4012; final URL `/api/compliance-controls/compliance/knowledge-hub/gap-analysis` AND `/api/compliance/knowledge-hub/gap-analysis` (latter through service.ts moduleComplianceRouter fall-through) |
| Live verification | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4012/api/compliance/knowledge-hub/gap-analysis` → **401** (mounted, auth-gated) — was **404** before |
| Permission required | `knowledge.base.read` (already enforced at module router) |

## Files changed in Step 2

| File | Change | Why |
|---|---|---|
| services/compliance-controls-service/src/adapters/audit.adapter.ts | + `listAuditEntries(...)` + `AuditEntry` interface | audit-service GET wrapper for activity feeds — single audit source of truth |
| services/compliance-controls-service/src/routes/compliance.routes.ts | + `GET /obligations/:obligationId/activity` handler | C-01 backend handler |
| frontend/.../obligation-detail-page.component.ts | retarget `/api/compliance-ext/...` → `/api/compliance/...` | C-01 caller alignment |
| frontend/.../compliance-api.service.ts | retarget `/api/knowledge-hub/...` → `/api/compliance/knowledge-hub/...` | C-02 caller alignment |

## Service rebuild + restart

- `pnpm --filter compliance-controls-service build` → 0 errors
- `pm2 restart compliance-controls-service` → online, /health=ok
- New routes confirmed live (404 → 401 transition)

## Out-of-scope items registered for other module verticals

| Caller path | Owning module |
|---|---|
| `/api/ksa-regulatory/dashboard` | ksa-regulatory (own vertical) |
| `/api/exception/*`, `/api/exceptions` | exception (gated, own vertical) |
| `/api/playbooks` | playbooks (own vertical) |
| `/api/policy-coverage`, `/api/policy-exceptions` | policy (own vertical) |
| `/api/risk-compliance/mappings` | risk (own vertical) |
| `/api/ai-governance/conformity-assessments` | ai-governance (own vertical) |
| `/api/external-services/*` | integrations (own vertical) |
| `/api/dashboard/control-drift`, `/api/dashboard/exceptions-aging` | dashboard-widgets (own vertical) |

These are NOT compliance-module gaps and are **not** addressed here per
no-horizontal-sweep rule.

## Step 2 verdict

CLOSED. The two real compliance-module FE↔BE contract gaps are fixed
end-to-end (route mounted, FE caller realigned, service rebuilt and
restarted, live probe confirms). Other 5 step-1 candidates were either
false positives, already-existing under correct method, or already
disabled. Move to Step 3 (runtime config).

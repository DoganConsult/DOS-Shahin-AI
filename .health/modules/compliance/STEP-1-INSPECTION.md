# MODULE: compliance — Step 1 Inspection

Branch: stabilize/phase-0  Date: 2026-04-19
Owning service: compliance-controls-service (port 4012, PM2 online, /health=ok, db=ok)

## 1. Inventory snapshot (ground truth, not docs)

| Source | Count |
|---|---|
| FE distinct call literals (compliance area) | 78 |
| BE distinct route literals (service routes/) | 40 |
| Manifest published events | 13 |
| Manifest subscribed events | 6 |
| FE-orphans by raw grep | 64 (overstates — see live probe) |

## 2. Gateway → service prefix map (compliance scope)

Routed to compliance-controls-service (4012) by gateway service-registry:
`/api/compliance, /api/compliance-ws, /api/controls, /api/control,
/api/ucf, /api/frameworks, /api/framework-mapping, /api/mappings,
/api/objects, /api/scoring-policies, /api/ksa-regulatory,
/api/compliance-assertions, /api/compliance-attestation, /api/lifecycle,
/api/nca-assessment, /api/nca-export, /api/rcsa, /api/sama-assessment,
/api/ksa-sector-maturity, /api/ksa-regulatory-changes,
/api/ksa-regulatory-reports, /api/ksa-cross-framework,
/api/compliance-controls`

Explicitly NOT routed here (out of M4 scope, documented in
service-registry.ts header):
- `/api/exceptions`, `/api/exception/*` → exception module (gated off)
- `/api/playbooks` → playbooks module
- `/api/policy-coverage`, `/api/policy-exceptions` → policy module
- `/api/risk-compliance/*` → risk module
- `/api/ai-governance/*` → ai-governance module
- `/api/external-services/*` → integrations service
- `/api/dashboard/control-drift`, `/api/dashboard/exceptions-aging` →
  dashboard-widgets-service

These are NOT compliance-module orphans. They will be addressed during
their respective module verticals.

## 3. Live probe of remaining FE-called paths

Direct curl against http://127.0.0.1:4012 (no auth header).

| Path | HTTP | Verdict |
|---|---|---|
| /api/compliance | 401 | exists (auth required) |
| /api/compliance/obligations | 401 | exists |
| /api/compliance/remediations | 401 | exists |
| /api/compliance/gap-analysis | 401 | exists |
| /api/compliance-assertions | 401 | exists |
| /api/compliance-assertions/dashboard | 401 | exists |
| /api/compliance-attestation/campaigns | 401 | exists |
| /api/compliance-ws/controls | 401 | exists |
| /api/controls | 401 | exists |
| /api/controls/dashboard | 401 | exists |
| /api/controls/actions | 401 | exists |
| /api/controls/bulk-assign-team | 401 | exists |
| /api/controls/ccm-dashboard | 401 | exists |
| /api/controls/failures | 401 | exists |
| /api/controls/monitoring | 401 | exists |
| /api/controls/team-distribution | 401 | exists |
| /api/controls/tests | 401 | exists |
| /api/framework-mapping | 401 | exists |
| /api/frameworks | 401 | exists |
| /api/ksa-cross-framework/mappings | 401 | exists |
| /api/ksa-cross-framework/summary | 401 | exists |
| /api/ksa-regulatory-changes | 401 | exists |
| /api/ksa-sector-maturity/model | 401 | exists |
| /api/ksa-sector-maturity/models | 401 | exists |
| /api/ksa-sector-maturity/benchmark/:id | 401 | exists |
| /api/nca-assessment | 401 | exists |
| /api/nca-assessment/structure | 401 | exists |
| /api/rcsa/campaigns | 401 | exists |
| **/api/compliance-ext/obligations** | **404** | **TRUE GAP — wrong prefix in caller** |
| **/api/knowledge-hub/gap-analysis** | **404** | **TRUE GAP — sub-path missing** |
| **/api/ksa-regulatory/dashboard** | **404** | **TRUE GAP — sub-path missing** |
| **/api/ksa-sector-maturity/assess** | **404** | **TRUE GAP — sub-path missing** |
| **/api/lifecycle/controls** | **404** | **TRUE GAP — sub-path missing** |
| **/api/rcsa/responses/:id** | **404** | **TRUE GAP — sub-path missing** |
| **/api/assessment-templates** | **404** | **TRUE GAP — top-level missing** |
| **/api/ai-governance/conformity-assessments** | 404 | OUT OF SCOPE (ai-governance module) |
| **/api/dashboard/control-drift** | 404 | OUT OF SCOPE (dashboard-widgets) |
| **/api/dashboard/exceptions-aging** | 404 | OUT OF SCOPE (dashboard-widgets) |
| **/api/exception/\*, /api/exceptions** | 404 | OUT OF SCOPE (exception, gated) |
| **/api/external-services/\*** | 404 | OUT OF SCOPE (integrations) |
| **/api/playbooks, /api/playbooks/dashboard** | 404 | OUT OF SCOPE (playbooks) |
| **/api/policy-coverage/\*, /api/policy-exceptions** | 404 | OUT OF SCOPE (policy) |
| **/api/risk-compliance/mappings** | 404 | OUT OF SCOPE (risk) |

## 4. True compliance-module gaps to close in this vertical

| # | Caller path | Action | Resolution lane |
|---|---|---|---|
| C-01 | /api/compliance-ext/obligations | retarget caller → /api/compliance/obligations OR alias mount on service | Step 2 contract |
| C-02 | /api/knowledge-hub/gap-analysis | mount handler in compliance-controls-service (route-module-index already maps to compliance) | Step 2 contract |
| C-03 | /api/ksa-regulatory/dashboard | add dashboard handler under existing /api/ksa-regulatory mount | Step 2 contract |
| C-04 | /api/ksa-sector-maturity/assess | add POST /assess to ksaSectorMaturityRouter | Step 2 contract |
| C-05 | /api/lifecycle/controls | add /controls listing to controlLifecycleRouter | Step 2 contract |
| C-06 | /api/rcsa/responses/:id | add /responses sub-route to rcsaRouter | Step 2 contract |
| C-07 | /api/assessment-templates(/categories) | confirm whether owned by compliance — if yes, add gateway prefix + service mount; else move out of compliance lane | Step 2 contract (decision first) |

## 5. Module manifest cross-check

`modules/compliance/module.manifest.json` declares:
- `routeBases: ["/api/compliance"]` — narrower than reality (the service
  serves 22 prefixes for this module's surface). Manifest needs widening
  in Step 2 to reflect the real published surface.
- ownedTables: 9 (frameworks, controls, compliance_mappings, …)
- 13 publishes / 6 subscribes — consumer + publisher files exist:
  `services/compliance-controls-service/src/events/publisher.ts`,
  `…/events/consumer.ts`. Real, not stubbed.
- `currentSources` still points at legacy `/home/Dr-Dogan-AGRC-OS/`
  paths — informational only; the runtime lives at `modules/compliance`.

## 6. Service substance check

| Aspect | Result |
|---|---|
| TS files in service | substantive (routes/, domain/, adapters/, events/, schemas/, server.ts) |
| Real DB calls | YES — `complianceService.list/getStats/...` use @dos/db |
| Auth enforced | YES — `authenticate + requireTenantId` on every router |
| UUID guard pattern | YES — explicit collision guard on /:id (compliance.routes.ts:56–73, control.routes.ts:56–82) |
| Dashboard handler ordered before /:id | YES — comments document the trap |
| Event publishing | YES — `publishComplianceAssessed`, `publishControlTested`, `publishControlEffectivenessChanged`, `publishDomainEvent` |
| Recent edits | compliance.routes.ts modified 2026-04-19, control.routes.ts modified 2026-04-19 |
| Tests present | aggregator-load.test.ts, compliance.routes.test.ts, control.routes.test.ts, *.service.test.ts, consumer.test.ts, publisher.test.ts |
| TS errors (service) | 0 |

## 7. Placeholder / stub scan (compliance scope, this pass)

To be performed in Step 8 against:
- `services/compliance-controls-service/src/`
- `modules/compliance/src/`
- `frontend/products/shahin/src/app/features/compliance/`

Already noticed in Step 1:
- moduleComplianceRouter is mounted twice (inline doc explains fall-through pattern). Not a stub — intentional fall-through ordering.
- routes/index.ts mounts `/compliance/continuous-attestation` twice (lines 134, 149) and other duplicate mounts; documented as legacy `misc/` aliasing. Verify in Step 8 whether shadow conflicts exist.

## 8. Step 1 verdict

Inspection complete. 7 true compliance-module FE↔BE gaps identified
(C-01 … C-07). The other 23 raw-orphan paths belong to other modules
and are NOT this module's responsibility (each named with its real
owner). Service substance is real (auth, DB, events, tests, types).
Manifest needs a `routeBases` widening.

Move to Step 2: reconcile each of C-01 … C-07.

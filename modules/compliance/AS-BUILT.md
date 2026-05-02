# Compliance Module — AS-BUILT

## Module Identity
| Field | Value |
|-------|-------|
| Module Code | `compliance` |
| Version | `1.0.0` |
| Tier | `business` |
| Criticality | P0 — regulatory compliance evidence + control posture |
| Owner | `product-shahin-ai` |
| Target Path | `modules/compliance` |
| Host Service | `governance-policy-service` (co-hosts compliance route bases via `@dos/module-compliance.registerCompliance()`) |
| Lifecycle Stage | `ga` (target: `production` after Wave 9) |
| Status | `wired-not-promoted` |

## Extraction Provenance
Sources consolidated into this module:
- Phase-4A canonical promotion: `DOS Platform/Compliance Module/` → `modules/compliance/` (commit `b80135a1`, 2026-04-29).
- Wave merger 2026-04-30 (commit `fba26dab`): six sibling-root + thin-package trees `git mv`'d into `modules/compliance/_inbound/<slug>/` (435 files, all R100 pure renames; history preserved):
  - `Controls Module/` → `_inbound/controls/`
  - `Attestation Module/` → `_inbound/attestation/`
  - `ksa-regulatory Module/` → `_inbound/ksa-regulatory/`
  - `packages/modules/controls/` → `_inbound/controls-package/`
  - `packages/modules/ksa-regulatory/` → `_inbound/ksa-regulatory-package/`
  - `packages/modules/packs/` → `_inbound/packs-package/`
- Re-folding `_inbound/<slug>/` into permanent slices is scheduled in **Wave 3** of the production-grade delivery plan.

## Production-Grade Completion Matrix
| Wave | Description | Status |
|------|-------------|--------|
| 0 | Hygiene — fix failing tests, fill AS-BUILT, snapshot baseline | IN PROGRESS |
| 1 | Tenant-isolation gate (100% `withTenantClient`/`tquery`/`pquery`, CI-enforced) | PENDING |
| 2 | Schema-validation sweep (Zod on all routes; rate-limit + ownership middleware) | PENDING |
| 3 | `_inbound/` re-fold into permanent slices; remove staging tree | PENDING |
| 4 | Test hardening (vitest 90/85, Stryker high=85, contract test) | PENDING |
| 5 | PRR documentation package (RUNBOOK.md, openapi.yaml, SLO.md) | PENDING |
| 6 | Operational telemetry (`/health`, `/ready`, `/metrics`) + k6 load baseline | PENDING |
| 7 | Event-handler completeness (3 stub handlers → real) | PENDING |
| 8 | Frontend consolidation (i18n EN+AR, dynamic-UI seed parity, Playwright e2e) | PENDING |
| 9 | Promotion (lifecycle `ga` → `production`; tenant rollout) | PENDING |

## Backend Route Bases (declared)
| # | Route Base | Description | Wired |
|---|------------|-------------|-------|
| 1 | `/api/compliance` | Aggregator + composite | YES |
| 2 | `/api/compliance-ws` | Workspace endpoints | YES |
| 3 | `/api/compliance-controls` | Controls under compliance namespace | YES |
| 4 | `/api/compliance-assertions` | Assertions / posture | YES |
| 5 | `/api/compliance-attestation` | Attestation campaigns | YES |
| 6 | `/api/controls` | Control library | YES |
| 7 | `/api/control` | Singular alias / detail endpoints | YES |
| 8 | `/api/ucf` | Unified Compliance Framework cross-mapping | YES |
| 9 | `/api/frameworks` | Framework registry | YES |
| 10 | `/api/framework-mapping` | Framework ↔ control mapping | YES |
| 11 | `/api/mappings` | Cross-mapping registry | YES |
| 12 | `/api/objects` | Compliance object registry | YES |
| 13 | `/api/scoring-policies` | Scoring + weighting | YES |
| 14 | `/api/lifecycle` | Control lifecycle state machines | YES |
| 15 | `/api/nca-assessment` | Saudi NCA assessment | YES |
| 16 | `/api/nca-export` | NCA submission export | YES |
| 17 | `/api/rcsa` | Risk Control Self-Assessment | YES |
| 18 | `/api/sama-assessment` | Saudi SAMA assessment | YES |
| 19 | `/api/ksa-sector-maturity` | KSA sector maturity tracking | YES |
| 20 | `/api/ksa-regulatory-changes` | Regulatory bulletin monitoring | YES |
| 21 | `/api/ksa-regulatory-reports` | Regulatory report exports | YES |
| 22 | `/api/ksa-cross-framework` | KSA cross-framework applicability | YES |
| 23 | `/api/assessment-templates` | Assessment template library | YES |

Headline counts (from `boot:harness`): **9 owned tables, 13 published events, 8 subscribed events, 23 route bases.** Underlying implementation: 75 `.routes.ts` files, ~406 endpoints, 180 TS files in `interface/http/`.

## Frontend Pages (component-key registry)
26 component keys mirror the dynamic-UI seed manifest 1:1 (Wave 0.1 reconciliation, 2026-04-30):

`ComplianceHome`, `ComplianceCatchAll`, `ComplianceOverviewPage`, `CompliancePosturePage`, `ComplianceWorkQueuePage`, `ComplianceCalendarPage`, `ComplianceHeatmapPage`, `ComplianceRoadmapPage`, `ComplianceTemplatesPage`, `ComplianceFrameworksPage`, `ComplianceObligationsPage`, `ObligationDetailPage`, `ObligationWorkspacePage`, `ComplianceRegulatoryChangesPage`, `ComplianceAssessmentsPage`, `ComplianceAttestationsPage`, `ComplianceFindingsPage`, `ComplianceGapsPage`, `ComplianceExceptionsPage`, `ComplianceEvidenceOpsPage`, `ComplianceReportsPage`, `GenericModuleLifecycle`, `ComplianceAdminPage`, `AssertionDashboardPage`, `RcsaCampaignsPage`, `RegulatoryReasoningStudioPage`.

All readiness markers currently `STUB` — Wave 8 flips per-page to `READY` after frontend consolidation + Playwright e2e proof.

## Owned DB Tables (per-tenant schema)
`frameworks`, `controls`, `compliance_mappings`, `compliance_assessments`, `compliance_gaps`, `compliance_requirements`, `control_objectives`, `control_testing`, `control_evidence_links`

## Migrations
| File | Purpose |
|------|---------|
| `db/tenant/migrations/000_extracted_from_000_inline_baseline.sql` | Baseline tenant tables |
| `db/tenant/migrations/001_compliance_tables.sql` | Core compliance domain (frameworks, controls, mappings) |
| `db/tenant/migrations/002_enterprise_expansion.sql` | Enterprise compliance expansion (mappings, assessments) |
| `db/tenant/migrations/003_advanced_controls_tables.sql` | UCF controls + advanced control structures |
| `db/tenant/migrations/027_extracted_from_027_tenant_schema_tables.sql` | Compliance controls table consolidation |
| `db/tenant/migrations/132_sod_rules_waivers.sql` | SoD conflict matrix + waivers |
| `db/seeds/dynamic-ui/001..005_seed_compliance_*.sql` | Dynamic UI seed pack (module, nav routes, route permissions, readiness, page experience) |

## Events
- **Publishes (13)**: `compliance.gap_detected`, `compliance.gap_closed`, `compliance.posture_changed`, `compliance.assessment_completed`, `compliance.framework_mapping_updated`, `compliance.framework_gap_identified`, `compliance.attestation_campaign_started`, `compliance.attestation_recorded`, `controls.created`, `controls.status_changed`, `controls.effectiveness_tested`, `controls.effectiveness_failed`, `controls.deficiency_detected`
- **Subscribes (8)** — handlers in `domain/events/compliance.subscribers.ts` — all 8 WIRED with real implementations (verified 2026-04-30, contract test enforces no regression):
  - `risk.assessment_completed` — WIRED (Phase 2)
  - `evidence.collected` — WIRED
  - `policy.approved` — WIRED
  - `audit.finding_created` — WIRED
  - `vendor.compliance_gap_propagated` — WIRED
  - `foundation.scope_changed` — WIRED (Phase 3 — applicability recompute task)
  - `foundation.org_created` — WIRED (Phase 5 / F-041 — applicability for new org)
  - `evidence.coverage_low` — WIRED (process task → flag missing evidence)
- Plus 4 additional internal events: `risk.score_changed`, `evidence.expired`, `control.effectiveness_low`, `framework.gap_identified`, `workflow.status_changed`, `ksa_regulatory.assessment_completed_processed`, `records.disposal.approve` (12 total bound handlers)

## Wire-Load Path
`services/governance-policy-service/` imports `@dos/module-compliance` and calls `registerCompliance({ app })` to mount the 23 route bases. See `services/gateway/src/server.ts:1120-1122` for the gateway-side mount declaration.

## Workspace Package
- Name: `@dos/module-compliance` (private)
- Build: `pnpm --filter @dos/module-compliance build` → tsc 0 errors, dist emitted
- Tests: `pnpm --filter @dos/module-compliance test` (smoke + integration; 733 assertions total post-Wave-0.1)

## Health & Metrics
- `GET /api/compliance/health` — present (`interface/http/health.routes.ts`); liveness + DB connectivity check
- `GET /api/compliance/ready` — Wave 6 (extend health.routes.ts)
- `GET /api/compliance/metrics` — Wave 6 (Prometheus text format via `prom-client`)
- Per-route metrics counters via `application/observability/metrics` — wired in 30+ route handlers; coverage audit in Wave 6

## Contract Test
- Smoke: `tests/smoke/compliance.smoke.test.mjs` — asserts `registerCompliance`, lifecycle hooks, manifest core fields, port bindings (7 assertions, all green)
- Integration: 82 `.test.mjs` files covering aggregator mounts, route-base wiring, ports binding, db lifecycle, seed shape, ui-discovery, permission gates (**726/726 pass post-Wave-0.1**, was 724/726)
- Wave 4 will add: contract test asserting manifest-vs-runtime parity, vitest coverage thresholds (90/85)

## Migration Bundle
`db/manifest.yml` declares ordered migrations for the platform migration runner. Per memory ("SQL Reorg Complete 2026-04-22"), the runner supports `checksum-remap + supersedes` for the renumbering needed when Wave 3 folds `_inbound/<slug>/db/` into the canonical migration sequence.

## Build Verification
- `npm run typecheck` → **0 errors** (post-Wave-0.1)
- `npm run build` → **dist emitted, 0 errors**
- `npm run test:smoke` → **7/7 pass**
- `npm run test:integration` → **726/726 pass**
- `npm run verify:permissions` → **OK** (catalog=59, referenced=21)
- `npm run boot:harness` → **OK** (9 owned tables, 13 events, 23 route bases)
- `npm run ci` → **ALL OK**
- `node scripts/validate-manifests.mjs` → 0 NEW failures vs baseline

## Known Gaps (production-promotion blockers)
| Gap | Wave | Severity |
|-----|------|----------|
| 74/75 DB-touching files use raw `client.query` (regex-validated schema, but not `withTenantClient`-wrapped) | 1 | P0 |
| Zod schema coverage ~6.7% (6 schema files / 180 route files) | 2 | P1 |
| 435 files in `_inbound/` not yet folded into permanent slices | 3 | P1 |
| No vitest coverage thresholds, no Stryker config | 4 | P1 |
| No PRR.md, RUNBOOK.md, openapi.yaml, SLO.md | 5 | P0 |
| `/ready`, `/metrics` endpoints not standardized; no k6 load baseline | 6 | P1 |
| ~~3/8 event handlers stubbed~~ — **CLOSED 2026-04-30**: all 8 declared events + 4 internal events have real handlers in `domain/events/compliance.subscribers.ts`; contract test enforces no regression | 7 | DONE |
| AR i18n missing at canonical location; EN has 29 keys (under-spec'd) | 8 | P1 |
| Frontend pages live at `products/shahin-ai/app/src/app/blueprint/features/{controls,attestation,evidence,exception}` not consolidated under `modules/compliance/ui/pages/` | 8 | P2 |

## Verdict
- Code / Build / Tests / Manifest / Host Wire: **GREEN** post-Wave-0
- Production-Promotion-Ready: **NO** — pending Waves 1-9
- Module is correctly extracted, wired, and reachable; remaining work is hardening + documentation, not net-new functionality.

**Signoff status: WIRED-NOT-PROMOTED** — promote to `production` lifecycle after Wave 9 sign-offs (code owner, DBA, security, product-shahin-ai team).

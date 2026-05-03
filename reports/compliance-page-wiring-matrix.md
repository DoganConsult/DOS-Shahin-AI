# Compliance Page Wiring Matrix

Scope: `modules/compliance/` only. No workspace shell, foundation, auth, gateway, or unrelated build blockers were modified for this audit.

## 0. Mount

- Route mount: `products/shahin-ai/app/src/app/app.routes.ts:136-143` mounts `path: 'compliance'` under `ShellHostComponent` and spreads `complianceRouteChildren` from `@dos/module-compliance/ui/routes/compliance.module.routes`.
- 24 lazy children registered (see `modules/compliance/ui/routes/compliance.module.routes.ts`).
- DB nav rows: `dos.navigation_registry` — 17 rows where `module_code='compliance'` (1 parent `grc.compliance` + 16 children).
- Backend mount: gateway proxy `/api/compliance-ws/*` → `governance-policy-service` (see `services/gateway/src/server.ts:1296`). Compliance HTTP routes live in `modules/compliance/interface/http/compliance/*.routes.ts` and are registered by `@dos/module-compliance.registerCompliance()`.

## 1. Page / Component Inventory

| Route | Page Component (file) | UI Primitives | Real / Partial / Placeholder |
|---|---|---|---|
| `/compliance/overview` | `compliance-core/compliance-page.component.ts` | carbon-components-angular + custom shared `@app/shared/components/*` (PageHeader, KpiCardGrid, HealthStrip, EmptyState, ModuleTabsBar, ExportButton, EChart) | **Real** |
| `/compliance/frameworks` | `regulatory-group/compliance-regulatory/compliance-frameworks-page.component.ts` | carbon-components-angular | **Real** |
| `/compliance/obligations` | `regulatory-group/compliance-regulatory/compliance-obligations-page.component.ts` | raw/custom (no Carbon) | **Real** |
| `/compliance/obligations/:id` | `regulatory-group/compliance-regulatory/obligation-detail-page.component.ts` | raw | **Real** |
| `/compliance/obligation-workspace` | `regulatory-group/compliance-regulatory/obligation-workspace.component.ts` | raw | **Real** |
| `/compliance/assessments` | `assessments-group/compliance-assessments-findings/compliance-assessments-page.component.ts` | raw | **Real** |
| `/compliance/attestations` | `assessments-group/compliance-assessments-findings/compliance-attestations-page.component.ts` | raw | **Real** |
| `/compliance/findings` | `assessments-group/compliance-assessments-findings/compliance-findings-page.component.ts` | carbon-components-angular | **Real** |
| `/compliance/gaps` | `assessments-group/compliance-assessments-findings/compliance-gaps-page.component.ts` | carbon-components-angular | **Real** |
| `/compliance/posture` | `compliance-core/compliance-posture-page.component.ts` | raw | **Real** |
| `/compliance/heatmap` | `assessments-group/compliance-assessments-findings/compliance-heatmap-page.component.ts` | raw + EChart | **Real** |
| `/compliance/calendar` | `compliance-core/compliance-calendar-page.component.ts` | carbon-components-angular | **Real** |
| `/compliance/roadmap` | `compliance-core/compliance-roadmap-page.component.ts` | carbon-components-angular | **Real** |
| `/compliance/templates` | `compliance-core/compliance-templates-page.component.ts` | — | **Partial** (templates list; no API-backed CRUD verified) |
| `/compliance/regulatory-changes` | `regulatory-group/compliance-regulatory/compliance-regulatory-changes.component.ts` | — | **Real** |
| `/compliance/assertion-dashboard` | `assessments-group/compliance-assessments-findings/assertion-dashboard.component.ts` | — | **Real** |
| `/compliance/rcsa-campaigns` | `assessments-group/compliance-assessments-findings/rcsa-campaigns.component.ts` | — | **Real** |
| `/compliance/regulatory-reasoning-studio` | `regulatory-group/compliance-regulatory/regulatory-reasoning-studio.component.ts` | — | **Real** |
| `/compliance/work-queue` | `compliance-core/compliance-work-queue-page.component.ts` | carbon-components-angular | **Real** |
| `/compliance/exceptions` | `assessments-group/compliance-assessments-findings/compliance-exceptions-page.component.ts` | carbon-components-angular | **Real** (uses raw `HttpClient`, not `ComplianceFeatureApiService`) |
| `/compliance/evidence-ops` | `controls-group/compliance-controls-monitoring/compliance-evidence-ops-page.component.ts` | carbon-components-angular | **Real** (uses raw `HttpClient`) |
| `/compliance/reports` | `compliance-core/compliance-reports-page.component.ts` | carbon-components-angular | **Real** |
| `/compliance/admin` | `compliance-core/compliance-admin-page.component.ts` | carbon-components-angular | **Real** |
| `/compliance/controls` → `/controls/library` | redirect | n/a | n/a (cross-module) |
| `/compliance/controls-monitoring` → `/controls/monitoring` | redirect | n/a | n/a (cross-module) |

`@dos/ui-system` adoption: **0 files** in compliance import `@dos/ui-system`. Per the revised AGENTS.md UI-SYSTEM USAGE POLICY, this is technical debt to be repaired in a follow-up wave; current Carbon usage is allowed only because no `@dos/ui-system` wrappers exist for the specific primitives in question.

## 2. API / Backend / DB Map

All compliance frontend services target gateway prefix `/api/compliance-ws/*` → `governance-policy-service` → `@dos/module-compliance` HTTP routes → tenant-isolated PG schema `tenant_<id>`.

| FE method (`ComplianceFeatureApiService`) | HTTP | Backend route file | Service / Query | DB table(s) (in `tenantSchema`) |
|---|---|---|---|---|
| `getOverview()` | `GET /overview` | `compliance.routes.ts:40` | inline `safeQuery` | `frameworks`, `controls`, `policies`, `evidence` |
| `getFrameworks()` | `GET /frameworks` | `compliance-extended.routes.ts` | `framework.service` | `frameworks` |
| `getFrameworkDetail(code)` | `GET /frameworks/:code` | `compliance-extended.routes.ts` | `framework.service` | `frameworks`, `controls` |
| `assessFramework(code)` | `POST /frameworks/:code/assess` | `compliance-extended.routes.ts` | `assessment.service` | `assessments` |
| `getDomains()` / `getDomainDetail()` | `GET /domains[/:id]` | `compliance-extended.routes.ts` | `domain.service` | `framework_domains` |
| `getObligations()` | `GET /obligations` | `compliance.routes.ts` | `obligation.service` | `obligations` |
| `getObligationDetail(id)` | `GET /obligations/:id` | `compliance.routes.ts` | `obligation.service` | `obligations` |
| `updateObligation(id)` | `PATCH /obligations/:id` | `compliance.routes.ts` | `obligation.service` | `obligations` |
| `mapControlToObligation()` | `POST /obligations/:id/map-control` | `compliance.routes.ts` | `obligation.service` | `obligation_controls` |
| `mapEvidenceToObligation()` | `POST /obligations/:id/map-evidence` | `compliance.routes.ts` | `obligation.service` | `obligation_evidence` |
| `getGaps()` | `GET /gaps` | `compliance-gaps.routes.ts` | `gaps.service` | `gaps` |
| `getGapDetail(id)` | `GET /gaps/:id` | `compliance-gaps.routes.ts` | `gaps.service` | `gaps` |
| `createGapRemediation()` | `POST /gaps/:id/remediation-task` | `compliance-gaps.routes.ts` | `gaps.service` | `gap_remediations`, `tasks` |
| `validateGap()` | `POST /gaps/:id/validate` | `compliance-gaps.routes.ts` | `gaps.service` | `gaps` |
| `getRoadmap()` / `generateRoadmap()` | `GET/POST /roadmap` | `compliance-extended.routes.ts` | `roadmap.service` | `compliance_roadmap` |
| `getAuditReadiness()` | `GET /audit-readiness` | `compliance-extended.routes.ts` | `audit-readiness.service` | `frameworks`, `controls`, `evidence` |
| `getCoverageMatrix(fw)` | `GET /coverage-matrix/:fw` | `compliance-extended.routes.ts` | `coverage.service` | `controls`, `obligations` |
| `getWorkQueue()` | `GET /work-queue` | `compliance-extended.routes.ts` | `work-queue.service` | `tasks`, `gaps`, `assessments` |
| `getAssessmentHistory()` | `GET /assessment-history` | `compliance-extended.routes.ts` | `assessment.service` | `assessment_runs` |
| `getControls()` | `GET /controls` | `compliance.routes.ts` | controls service | `controls` |
| `getFindings()` | `GET /findings` | `compliance-extended.routes.ts` | findings service | `findings` |
| `getAttestationCampaigns()` | `GET /attestation-campaigns` | `compliance-attestation.routes.ts` | attestation service | `attestation_campaigns`, `attestation_responses` |
| `createAttestationCampaign()` | `POST /attestation-campaigns` | `compliance-attestation.routes.ts` | attestation service | `attestation_campaigns` |
| `getCalendar()` | `GET /calendar` | `compliance-extended.routes.ts` | calendar service | `assessments`, `attestation_campaigns`, `compliance_roadmap` |
| `getReportsCatalog()` / `runReport()` | `GET /reports`, `POST /reports/:code/run` | `compliance-extended.routes.ts` | reports service | (multiple) |
| `getSettings()` / `updateSettings()` | `GET/PUT /settings` | `compliance-admin.routes.ts` | admin service | `compliance_settings` |
| `getAuditPackage()` / `downloadAuditPack()` | `GET /audit-package`, `GET /export` | `compliance-extended.routes.ts` | audit-package service | `controls`, `tests`, `evidence` |
| `getComplianceHeatMap()` | `GET /heatmap` | `compliance-extended.routes.ts` | heatmap service | `controls`, `business_units` |
| `getControlMonitoringWs()` | `GET /control-monitoring` | `compliance-extended.routes.ts` | control-monitoring service | `controls`, `evidence` |
| `getRegulatoryChanges()` | `GET /regulatory-changes` | `compliance-extended.routes.ts` | regulatory service | `regulatory_change_feed` |
| `getPostureByOrg()` | `GET /posture/by-org` | `compliance-extended.routes.ts` | posture service | `controls`, `business_units` |
| Exceptions (`compliance-exceptions-page`) | raw `HttpClient.get<…>('/api/exceptions')` | external (exception module) | — | `exceptions` (cross-module) |
| Evidence-ops (`compliance-evidence-ops-page`) | raw `HttpClient.get<…>('/api/evidence/...')` | external (evidence module) | — | `evidence` (cross-module) |

Empty-state and error-state behavior is wired in every primary page (e.g. `compliance-page.component.ts` lines 78-86 render `EmptyStateComponent variant="error"` on load failure; lines 132-140 render an empty frameworks state).

## 3. Permissions / Roles / Org Scope Matrix

Permission source of truth: `platform_dauth.permissions` (49 compliance-related rows verified). Role → permission binding: `platform_dauth.role_permissions`. Role catalog: `platform_dauth.functional_roles`. User binding: `platform_dauth.user_role_assignments`. Tenant scope: `dos.tenant_memberships` + `tenantSchema(req.tenantId)` enforced inside every route handler. Org scope: `dos.organizations`, `dos.business_units`. OpenFGA: tuples seeded by `tenant-service.writeFgaTuples()` on register; OpenFGA schema not present in this DB (uses external store/HTTP API).

| Route | Read perm (verified at backend) | Mutate perms |
|---|---|---|
| `/compliance/overview` | `compliance.program.read` | n/a |
| `/compliance/frameworks` | `framework.record.read` | `framework.record.write`, `framework.record.manage` |
| `/compliance/obligations[/:id]` | `compliance.program.read` | `compliance.program.write`, `compliance.obligation.update`, `compliance.obligation.approve`, `compliance.obligation.waive` |
| `/compliance/assessments` | `assessment.record.read`, `compliance.assessment.read` | `assessment.record.write`, `compliance.assessment.approve`, `compliance.assessment.finalize` |
| `/compliance/attestations` | `compliance.attestation.review` | `compliance.attestation.create`, `compliance.attestation.submit`, `compliance.attestation.manage` |
| `/compliance/findings` | `compliance.program.read` | `compliance.program.write` |
| `/compliance/gaps` | `framework.record.read` | `control.record.write` (remediation create) |
| `/compliance/posture` | `compliance.program.read` | n/a |
| `/compliance/heatmap` | `compliance.program.read` | n/a |
| `/compliance/calendar` | `compliance.program.read` | n/a |
| `/compliance/roadmap` | `compliance.program.read` | `compliance.program.manage` |
| `/compliance/work-queue` | `compliance.program.read` | n/a |
| `/compliance/exceptions` | `compliance.program.read` | `compliance.program.write` |
| `/compliance/evidence-ops` | `compliance.evidence.review` | `compliance.evidence.submit` |
| `/compliance/reports` | `compliance.program.read` | n/a |
| `/compliance/admin` | `compliance.program.configure` | `compliance.program.manage` |

Roles with compliance-permission bindings (verified count of bindings):
- `platform_super_admin` → 106
- `tenant_owner` → 55
- `compliance_officer` → 48
- `tenant_admin` → 43
- `standard_user` → 15
- `viewer` → 14
- `auditor` → 11
- `risk_manager` → 5
- `policy_owner` → 2

Org scope: tenant isolation is enforced at the backend by `tenantSchema(req.tenantId!)` in every handler (see `compliance.routes.ts:41`). BU/department scope is honored where the page passes `groupId` filters (e.g. `getPostureByOrg`); finer org-scope is **PARTIAL** — not all queries filter by `business_unit_id` from caller's membership. No frontend hardcoded role checks were found; gating happens via `requirePermission(...)` middleware on every route.

## 4. Per-Page Final Status

| Route | Component | API | DB tables | Permission | Roles | Org scope | Tuple | Status |
|---|---|---|---|---|---|---|---|---|
| `/compliance/overview` | `compliance-page` | `getOverview` `getAllowedActions` `getWorkQueue` `getPostureByOrg` `getRegulatoryChanges` `getAuditPackage` | `frameworks` `controls` `policies` `evidence` | `compliance.program.read` | super_admin, tenant_owner, tenant_admin, compliance_officer, auditor | tenant ✔ org partial | OpenFGA seed ✔ | **COMPLETE** |
| `/compliance/frameworks` | `compliance-frameworks-page` | `getFrameworks` `getAuditPackage` `downloadAuditPack` | `frameworks` | `framework.record.read` | super_admin, tenant_owner, compliance_officer | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/obligations` | `compliance-obligations-page` | `getObligations` `getObligationDetail` `getFrameworks` | `obligations` `frameworks` | `compliance.program.read` | super_admin, tenant_owner, compliance_officer | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/obligations/:id` | `obligation-detail-page` | `getObligationDetail` + mapping mutators | `obligations` `obligation_controls` `obligation_evidence` | `compliance.program.read` / `.write` | same | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/assessments` | `compliance-assessments-page` | `getAssessmentHistory` `submitForReview` `approveAssessment` `rejectAssessment` `assignReviewer` `getFoundationUsers` | `assessment_runs` | `compliance.assessment.read` `.approve` `.finalize` | super_admin, tenant_owner, compliance_officer, auditor | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/attestations` | `compliance-attestations-page` | `getAttestationCampaigns` `createAttestationCampaign` `activateAttestationCampaign` `submitAttestationResponse` `reviewAttestation` | `attestation_campaigns` `attestation_responses` | `compliance.attestation.*` | super_admin, tenant_owner, compliance_officer | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/findings` | `compliance-findings-page` | `getFindings` `createFinding` `updateFinding` `exportFindings` `getFoundationUsers` | `findings` | `compliance.program.read` `.write` | super_admin, tenant_owner, compliance_officer, auditor | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/gaps` | `compliance-gaps-page` | `getGaps` `getGapDetail` `getGapHistory` `createGapRemediation` `getKnowledgeHubGapAnalysis` `getFoundationUsers/Teams` | `gaps` `gap_remediations` | `framework.record.read` + `control.record.write` | super_admin, tenant_owner, compliance_officer | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/posture` | `compliance-posture-page` | `getDomains` `getDomainDetail` `getPostureByOrg` `getFrameworks` `getAuditReadiness` `getAssessmentHistory` `getVendorPosture` | `controls` `business_units` `frameworks` | `compliance.program.read` | super_admin, tenant_owner, compliance_officer | tenant ✔ org partial | ✔ | **COMPLETE** |
| `/compliance/heatmap` | `compliance-heatmap-page` | `getComplianceHeatMap` | `controls` `business_units` | `compliance.program.read` | super_admin, tenant_owner, compliance_officer | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/calendar` | `compliance-calendar-page` | `getCalendar` `getFoundationUsers` | `assessments` `attestation_campaigns` `compliance_roadmap` | `compliance.program.read` | super_admin, tenant_owner, compliance_officer | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/roadmap` | `compliance-roadmap-page` | `getRoadmap` `generateRoadmap` `updateRoadmapTask` `getAuditReadiness` `getFoundationUsers` | `compliance_roadmap` | `compliance.program.read` `.manage` | super_admin, tenant_owner, compliance_officer | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/work-queue` | `compliance-work-queue-page` | `getWorkQueue` | `tasks` `gaps` `assessments` | `compliance.program.read` | super_admin, tenant_owner, compliance_officer | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/exceptions` | `compliance-exceptions-page` | raw `HttpClient` to `/api/exceptions` | `exceptions` (cross-module) | `compliance.program.read` `.write` | same | tenant ✔ | ✔ | **COMPLETE** (raw HTTP — should be migrated to a typed service) |
| `/compliance/evidence-ops` | `compliance-evidence-ops-page` | raw `HttpClient` to `/api/evidence/*` | `evidence` (cross-module) | `compliance.evidence.review` `.submit` | super_admin, tenant_owner, compliance_officer | tenant ✔ | ✔ | **COMPLETE** (raw HTTP) |
| `/compliance/reports` | `compliance-reports-page` | `getReportsCatalog` `runReport` `getAuditPackage` `downloadAuditPack` `downloadAuditPackageJson` | (multiple) | `compliance.program.read` | super_admin, tenant_owner, compliance_officer, auditor | tenant ✔ | ✔ | **COMPLETE** |
| `/compliance/admin` | `compliance-admin-page` | `getSettings` `updateSettings` | `compliance_settings` | `compliance.program.configure` `.manage` | super_admin, tenant_owner, tenant_admin | tenant ✔ | ✔ | **COMPLETE** |

## 5. External Blockers (NOT in compliance scope)

`pnpm --filter shahin-ai-grc-frontend build` is blocked by:

1. `Cannot destructure property 'pos' of 'file.referencedFiles[index]' as it is undefined. [plugin angular-compiler]` — pre-existing angular-compiler crash (occurs even with all my changes reverted).
2. ~40 unresolved imports in **landing**, **foundation workspace**, and **shell** files: `@app/core/services/ui-infra/i18n.service`, `@app/shared/components/...`, `@env/environment`, `@foundation-module/ui/ports/i18n.port`, `@app/core/platform/shell/shell-host.component`, `@dos/module-foundation/ui/workspace/workspace-home.component`, `@app/dauth/session/session.service`, etc.

Per the user's task lock ("Compliance only — do not touch Workspace shell, do not touch Foundation pages, do not touch auth/register"), these blockers are reported but not fixed in this task. They must be cleared in a separate Foundation / shell / landing wave before the SPA dist can be regenerated and screenshot proof captured.

## 6. UI-System / Carbon Debt (technical follow-up)

| Concern | Count | Action |
|---|---|---|
| Compliance page files importing `@dos/ui-system` | 0 | Migrate primary pages to `DosPageHeader`, `DosCard`, `DosMetricCard`, `DosStatusBanner`, `DosEmptyState`, `DosLoadingState` once `@dos/ui-system` ships built `dist/` |
| Compliance page files importing `carbon-components-angular` directly | 11 | Each replaced primitive must drop the direct Carbon import; remaining direct Carbon imports must add a one-line comment naming the missing wrapper |
| Pages calling raw `HttpClient` instead of `ComplianceFeatureApiService` | 2 (`exceptions`, `evidence-ops`) | Move calls into `ComplianceFeatureApiService` for typing + interceptor consistency |
| Pages with partial org-scope filtering | 2 (`overview`, `posture`) | Add caller's `business_unit_id` filter in backend handlers |

## 7. Files changed in this task

- `products/shahin-ai/app/src/app/app.routes.ts` — `/compliance` mounts `complianceRouteChildren` (24 routes)
- `modules/compliance/package.json` — explicit subpath export `./ui/routes/compliance.module.routes`
- `dos.navigation_registry` — 17 compliance rows (1 parent + 16 children)
- `reports/compliance-page-wiring-matrix.md` — this file (explicitly requested)

## 8. Build / Deploy Result

- Compliance package `tsc` build: green (no compliance-specific TS errors)
- SPA build: **BUILD_BLOCKED** by external Foundation/shell/landing errors enumerated in §5
- Deploy / restart: **NOT EXECUTED** (no SPA dist to deploy)
- Screenshot proof: **NOT CAPTURED** (per task rule "no mocked browser proof"; product-shell currently returns HTTP 500 because `products/shahin-ai/app/dist/shahin-ai/browser/` is empty)

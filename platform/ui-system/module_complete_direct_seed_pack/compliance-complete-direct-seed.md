# Compliance Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `compliance` |
| product_key | `shahin-ai` |
| route_base | `/compliance` |
| owner_service | `governance-policy-service / compliance module` |
| module_status | `active_after_validation` |
| module_name_en | `Compliance` |
| module_name_ar | `الأطر` |
| category | `business-grc` |
| icon | `compliance` |
| description_en | Frameworks, obligations, assessments, gaps, findings, evidence, reports and compliance work queue. |
| description_ar | الأطر، الالتزامات، التقييمات، الفجوات، الملاحظات، الأدلة، التقارير وقائمة عمل الامتثال. |

## 2. Initialization group

### 2.1 `dos.module_registry`

| module_code | product_key | title_en | title_ar | category | status | owner_service |
|---|---|---|---|---|---|---|
| `compliance` | `shahin-ai` | `Compliance` | `الأطر` | `business-grc` | `active` | `governance-policy-service / compliance module` |

### 2.2 `dos.navigation_registry`

#### Parent row

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `compliance` | `compliance` | `/compliance` | `Compliance` | `الأطر` | `compliance.read` | 10 |

#### Child rows

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `compliance.overview` | `compliance` | `/compliance/overview` | Overview | نظرة عامة | `compliance.read` | 10 |
| `compliance.frameworks` | `compliance` | `/compliance/frameworks` | Frameworks | الأطر | `compliance.read` | 20 |
| `compliance.obligations` | `compliance` | `/compliance/obligations` | Obligations | الالتزامات | `compliance.read` | 30 |
| `compliance.assessments` | `compliance` | `/compliance/assessments` | Assessments | التقييمات | `compliance.assessment.read` | 40 |
| `compliance.gaps` | `compliance` | `/compliance/gaps` | Gaps | الفجوات | `compliance.read` | 50 |
| `compliance.findings` | `compliance` | `/compliance/findings` | Findings | الملاحظات | `compliance.read` | 60 |
| `compliance.attestations` | `compliance` | `/compliance/attestations` | Attestations | الإقرارات | `compliance.read` | 70 |
| `compliance.posture` | `compliance` | `/compliance/posture` | Posture | الوضع العام | `compliance.read` | 80 |
| `compliance.heatmap` | `compliance` | `/compliance/heatmap` | Heatmap | الخريطة الحرارية | `compliance.read` | 90 |
| `compliance.calendar` | `compliance` | `/compliance/calendar` | Calendar | التقويم | `compliance.read` | 100 |
| `compliance.roadmap` | `compliance` | `/compliance/roadmap` | Roadmap | خارطة الطريق | `compliance.read` | 110 |
| `compliance.reports` | `compliance` | `/compliance/reports` | Reports | التقارير | `compliance.report.read` | 120 |
| `compliance.work-queue` | `compliance` | `/compliance/work-queue` | Work Queue | قائمة العمل | `compliance.read` | 130 |
| `compliance.exceptions` | `compliance` | `/compliance/exceptions` | Exceptions | الاستثناءات | `compliance.write` | 140 |
| `compliance.evidence-ops` | `compliance` | `/compliance/evidence-ops` | Evidence Operations | عمليات الأدلة | `compliance.evidence.read` | 150 |
| `compliance.admin` | `compliance` | `/compliance/admin` | Admin | الإدارة | `compliance.admin` | 160 |

### 2.3 Dynamic UI route/component rows

Use only if this module is enrolled in Dynamic UI runtime.

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `compliance.overview.page` | `/compliance/overview` | `compliance` | `compliance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.frameworks.page` | `/compliance/frameworks` | `compliance` | `compliance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.obligations.page` | `/compliance/obligations` | `compliance` | `compliance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.assessments.page` | `/compliance/assessments` | `compliance` | `compliance.assessment.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.gaps.page` | `/compliance/gaps` | `compliance` | `compliance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.findings.page` | `/compliance/findings` | `compliance` | `compliance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.attestations.page` | `/compliance/attestations` | `compliance` | `compliance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.posture.page` | `/compliance/posture` | `compliance` | `compliance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.heatmap.page` | `/compliance/heatmap` | `compliance` | `compliance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.calendar.page` | `/compliance/calendar` | `compliance` | `compliance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.roadmap.page` | `/compliance/roadmap` | `compliance` | `compliance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.reports.page` | `/compliance/reports` | `compliance` | `compliance.report.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.work-queue.page` | `/compliance/work-queue` | `compliance` | `compliance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.exceptions.page` | `/compliance/exceptions` | `compliance` | `compliance.write` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.evidence-ops.page` | `/compliance/evidence-ops` | `compliance` | `compliance.evidence.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `compliance.admin.page` | `/compliance/admin` | `compliance` | `compliance.admin` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### 2.4 Permissions

| permission_code | description |
|---|---|
| `compliance.read` | Read compliance |
| `compliance.write` | Write compliance |
| `compliance.admin` | Administer compliance |
| `compliance.assessment.read` | Read assessments |
| `compliance.assessment.write` | Write assessments |
| `compliance.report.read` | Read reports |
| `compliance.report.export` | Export reports |
| `compliance.evidence.read` | Read evidence |
| `compliance.evidence.write` | Write evidence |

### 2.5 Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all compliance.* |
| `compliance_manager` | compliance.read, compliance.write, compliance.assessment.write, compliance.report.export |
| `compliance_analyst` | compliance.read, compliance.assessment.read, compliance.evidence.read |
| `compliance_auditor` | compliance.read, compliance.report.read, compliance.evidence.read |
| `standard_user` | compliance.read if enabled |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + compliance + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if tenant is trial |
| `dos.tenant_subscriptions` | active subscription or trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource access tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.compliance_frameworks` | business data / API backing | tenant/org scoped where applicable |
| `dos.compliance_obligations` | business data / API backing | tenant/org scoped where applicable |
| `dos.compliance_assessments` | business data / API backing | tenant/org scoped where applicable |
| `dos.compliance_gaps` | business data / API backing | tenant/org scoped where applicable |
| `dos.compliance_findings` | business data / API backing | tenant/org scoped where applicable |
| `dos.compliance_attestations` | business data / API backing | tenant/org scoped where applicable |
| `dos.compliance_reports` | business data / API backing | tenant/org scoped where applicable |
| `dos.compliance_evidence` | business data / API backing | tenant/org scoped where applicable |
| `dos.compliance_tasks` | business data / API backing | tenant/org scoped where applicable |
| `dos.compliance_exceptions` | business data / API backing | tenant/org scoped where applicable |
| `dos.compliance_settings` | business data / API backing | tenant/org scoped where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | component file | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `compliance.overview` | `/compliance/overview` | Overview | نظرة عامة | `CompliancePageComponent` | `modules/compliance/ui/pages/compliance-page.component.ts` | `GET /api/compliance-ws/overview` | `dos.compliance_kpis, dos.compliance_frameworks` | `compliance.read` | `VERIFY` |
| 2 | `compliance.frameworks` | `/compliance/frameworks` | Frameworks | الأطر | `ComplianceFrameworksPageComponent` | `modules/compliance/ui/pages/compliance-frameworks-page.component.ts` | `GET /api/compliance-ws/frameworks` | `dos.compliance_frameworks` | `compliance.read` | `VERIFY` |
| 3 | `compliance.obligations` | `/compliance/obligations` | Obligations | الالتزامات | `ComplianceObligationsPageComponent` | `modules/compliance/ui/pages/compliance-obligations-page.component.ts` | `GET /api/compliance-ws/obligations` | `dos.compliance_obligations` | `compliance.read` | `VERIFY` |
| 4 | `compliance.assessments` | `/compliance/assessments` | Assessments | التقييمات | `ComplianceAssessmentsPageComponent` | `modules/compliance/ui/pages/compliance-assessments-page.component.ts` | `GET /api/compliance-ws/assessments` | `dos.compliance_assessments` | `compliance.assessment.read` | `VERIFY` |
| 5 | `compliance.gaps` | `/compliance/gaps` | Gaps | الفجوات | `ComplianceGapsPageComponent` | `modules/compliance/ui/pages/compliance-gaps-page.component.ts` | `GET /api/compliance-ws/gaps` | `dos.compliance_gaps` | `compliance.read` | `VERIFY` |
| 6 | `compliance.findings` | `/compliance/findings` | Findings | الملاحظات | `ComplianceFindingsPageComponent` | `modules/compliance/ui/pages/compliance-findings-page.component.ts` | `GET /api/compliance-ws/findings` | `dos.compliance_findings` | `compliance.read` | `VERIFY` |
| 7 | `compliance.attestations` | `/compliance/attestations` | Attestations | الإقرارات | `ComplianceAttestationsPageComponent` | `modules/compliance/ui/pages/compliance-attestations-page.component.ts` | `GET /api/compliance-ws/attestations` | `dos.compliance_attestations` | `compliance.read` | `VERIFY` |
| 8 | `compliance.posture` | `/compliance/posture` | Posture | الوضع العام | `CompliancePosturePageComponent` | `modules/compliance/ui/pages/compliance-posture-page.component.ts` | `GET /api/compliance-ws/posture` | `dos.compliance_posture_snapshots` | `compliance.read` | `VERIFY` |
| 9 | `compliance.heatmap` | `/compliance/heatmap` | Heatmap | الخريطة الحرارية | `ComplianceHeatmapPageComponent` | `modules/compliance/ui/pages/compliance-heatmap-page.component.ts` | `GET /api/compliance-ws/heatmap` | `dos.compliance_gaps, dos.compliance_assessments` | `compliance.read` | `VERIFY` |
| 10 | `compliance.calendar` | `/compliance/calendar` | Calendar | التقويم | `ComplianceCalendarPageComponent` | `modules/compliance/ui/pages/compliance-calendar-page.component.ts` | `GET /api/compliance-ws/calendar` | `dos.compliance_obligations, dos.compliance_tasks` | `compliance.read` | `VERIFY` |
| 11 | `compliance.roadmap` | `/compliance/roadmap` | Roadmap | خارطة الطريق | `ComplianceRoadmapPageComponent` | `modules/compliance/ui/pages/compliance-roadmap-page.component.ts` | `GET /api/compliance-ws/roadmap` | `dos.compliance_roadmap_items` | `compliance.read` | `VERIFY` |
| 12 | `compliance.reports` | `/compliance/reports` | Reports | التقارير | `ComplianceReportsPageComponent` | `modules/compliance/ui/pages/compliance-reports-page.component.ts` | `GET /api/compliance-ws/reports` | `dos.compliance_reports` | `compliance.report.read` | `VERIFY` |
| 13 | `compliance.work-queue` | `/compliance/work-queue` | Work Queue | قائمة العمل | `ComplianceWorkQueuePageComponent` | `modules/compliance/ui/pages/compliance-work-queue-page.component.ts` | `GET /api/compliance-ws/work-queue` | `dos.compliance_tasks` | `compliance.read` | `VERIFY` |
| 14 | `compliance.exceptions` | `/compliance/exceptions` | Exceptions | الاستثناءات | `ComplianceExceptionsPageComponent` | `modules/compliance/ui/pages/compliance-exceptions-page.component.ts` | `GET /api/compliance-ws/exceptions` | `dos.compliance_exceptions` | `compliance.write` | `VERIFY` |
| 15 | `compliance.evidence-ops` | `/compliance/evidence-ops` | Evidence Operations | عمليات الأدلة | `ComplianceEvidenceOpsPageComponent` | `modules/compliance/ui/pages/compliance-evidence-ops-page.component.ts` | `GET /api/compliance-ws/evidence` | `dos.compliance_evidence` | `compliance.evidence.read` | `VERIFY` |
| 16 | `compliance.admin` | `/compliance/admin` | Admin | الإدارة | `ComplianceAdminPageComponent` | `modules/compliance/ui/pages/compliance-admin-page.component.ts` | `GET /api/compliance-ws/admin` | `dos.compliance_settings` | `compliance.admin` | `VERIFY` |

## 6. Direct SQL seed skeleton

> Verify column names before running. This is a direct seed plan, not blind SQL execution.

```sql
BEGIN;

-- 1) module_registry
-- UPSERT compliance into dos.module_registry

-- 2) navigation_registry
-- UPSERT parent and child rows above into dos.navigation_registry

-- 3) dynamic_ui_routes / dynamic_ui_component_registry
-- UPSERT only if Dynamic UI runtime is used and carbon_key is verified

-- 4) permissions
-- UPSERT permissions above into platform_dauth.permissions

-- 5) role bindings
-- UPSERT role → permission bindings above

-- 6) tenant provisioning
-- UPSERT tenant_product_activation and tenant_module_entitlements for selected tenant

COMMIT;
```

## 7. Validation checklist

- [ ] module_registry row exists
- [ ] navigation parent row exists
- [ ] all navigation child rows exist
- [ ] Angular routes exist
- [ ] component files exist
- [ ] APIs exist
- [ ] backend routes exist
- [ ] DB tables/queries exist
- [ ] permissions exist
- [ ] role bindings exist
- [ ] tenant entitlement exists
- [ ] org/tenant scope enforced
- [ ] OpenFGA/DAuth tuples exist if required
- [ ] no mock/static data
- [ ] build passes

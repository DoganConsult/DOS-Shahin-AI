# Complete Module Direct Seed Pack

# Foundation Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `foundation` |
| product_key | `shahin-ai` |
| route_base | `/foundation` |
| owner_service | `user-service / foundation module` |
| module_status | `active_after_validation` |
| module_name_en | `Foundation` |
| module_name_ar | `نموذج تشغيل المستأجر` |
| category | `platform-foundation` |
| icon | `organization` |
| description_en | Tenant operating model, users, roles, org structure, governance support data. |
| description_ar | نموذج تشغيل المستأجر، المستخدمون، الأدوار، الهيكل التنظيمي وبيانات الحوكمة. |

## 2. Initialization group

### 2.1 `dos.module_registry`

| module_code | product_key | title_en | title_ar | category | status | owner_service |
|---|---|---|---|---|---|---|
| `foundation` | `shahin-ai` | `Foundation` | `نموذج تشغيل المستأجر` | `platform-foundation` | `active` | `user-service / foundation module` |

### 2.2 `dos.navigation_registry`

#### Parent row

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `foundation` | `foundation` | `/foundation` | `Foundation` | `نموذج تشغيل المستأجر` | `foundation.read` | 10 |

#### Child rows

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `foundation.overview` | `foundation` | `/foundation/overview` | Overview | نظرة عامة | `foundation.read` | 10 |
| `foundation.organization` | `foundation` | `/foundation/organization` | Organization | المنظمة | `foundation.read` | 20 |
| `foundation.business-units` | `foundation` | `/foundation/business-units` | Business Units | وحدات الأعمال | `foundation.read` | 30 |
| `foundation.departments` | `foundation` | `/foundation/departments` | Departments | الإدارات | `foundation.read` | 40 |
| `foundation.users` | `foundation` | `/foundation/users` | Users | المستخدمون | `foundation.users.read` | 50 |
| `foundation.roles` | `foundation` | `/foundation/roles` | Roles | الأدوار | `foundation.roles.read` | 60 |
| `foundation.teams` | `foundation` | `/foundation/teams` | Teams | الفرق | `foundation.read` | 70 |
| `foundation.locations` | `foundation` | `/foundation/locations` | Locations | المواقع | `foundation.read` | 80 |
| `foundation.positions` | `foundation` | `/foundation/positions` | Positions | المناصب | `foundation.read` | 90 |
| `foundation.committees` | `foundation` | `/foundation/committees` | Committees | اللجان | `foundation.read` | 100 |
| `foundation.delegations` | `foundation` | `/foundation/delegations` | Delegations | التفويضات | `foundation.read` | 110 |
| `foundation.ownership-mapping` | `foundation` | `/foundation/ownership-mapping` | Ownership Mapping | تعيين الملكيات | `foundation.read` | 120 |
| `foundation.access-review` | `foundation` | `/foundation/access-review` | Access Review | مراجعة الوصول | `foundation.access_review.read` | 130 |
| `foundation.policies` | `foundation` | `/foundation/policies` | Policies | السياسات | `foundation.policies.read` | 140 |
| `foundation.reference-data` | `foundation` | `/foundation/reference-data` | Reference Data | البيانات المرجعية | `foundation.read` | 150 |
| `foundation.audit` | `foundation` | `/foundation/audit` | Audit | التدقيق | `foundation.audit.read` | 160 |
| `foundation.settings` | `foundation` | `/foundation/settings` | Settings | الإعدادات | `foundation.admin` | 170 |

### 2.3 Dynamic UI route/component rows

Use only if this module is enrolled in Dynamic UI runtime.

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `foundation.overview.page` | `/foundation/overview` | `foundation` | `foundation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.organization.page` | `/foundation/organization` | `foundation` | `foundation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.business-units.page` | `/foundation/business-units` | `foundation` | `foundation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.departments.page` | `/foundation/departments` | `foundation` | `foundation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.users.page` | `/foundation/users` | `foundation` | `foundation.users.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.roles.page` | `/foundation/roles` | `foundation` | `foundation.roles.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.teams.page` | `/foundation/teams` | `foundation` | `foundation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.locations.page` | `/foundation/locations` | `foundation` | `foundation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.positions.page` | `/foundation/positions` | `foundation` | `foundation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.committees.page` | `/foundation/committees` | `foundation` | `foundation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.delegations.page` | `/foundation/delegations` | `foundation` | `foundation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.ownership-mapping.page` | `/foundation/ownership-mapping` | `foundation` | `foundation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.access-review.page` | `/foundation/access-review` | `foundation` | `foundation.access_review.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.policies.page` | `/foundation/policies` | `foundation` | `foundation.policies.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.reference-data.page` | `/foundation/reference-data` | `foundation` | `foundation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.audit.page` | `/foundation/audit` | `foundation` | `foundation.audit.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `foundation.settings.page` | `/foundation/settings` | `foundation` | `foundation.admin` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### 2.4 Permissions

| permission_code | description |
|---|---|
| `foundation.read` | Read Foundation module |
| `foundation.write` | Write Foundation data |
| `foundation.admin` | Administer Foundation |
| `foundation.users.read` | Read users |
| `foundation.users.manage` | Manage users |
| `foundation.roles.read` | Read roles |
| `foundation.roles.manage` | Manage roles |
| `foundation.audit.read` | Read Foundation audit |
| `foundation.access_review.read` | Read access reviews |
| `foundation.policies.read` | Read policies |

### 2.5 Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all foundation.* |
| `foundation_admin` | foundation.read, foundation.write, foundation.admin, foundation.users.manage, foundation.roles.manage |
| `foundation_operator` | foundation.read, foundation.write, foundation.users.read |
| `foundation_auditor` | foundation.read, foundation.audit.read, foundation.access_review.read |
| `standard_user` | foundation.read |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + foundation + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if tenant is trial |
| `dos.tenant_subscriptions` | active subscription or trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource access tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.organizations` | business data / API backing | tenant/org scoped where applicable |
| `dos.business_units` | business data / API backing | tenant/org scoped where applicable |
| `dos.departments` | business data / API backing | tenant/org scoped where applicable |
| `dos.users` | business data / API backing | tenant/org scoped where applicable |
| `dos.tenant_memberships` | business data / API backing | tenant/org scoped where applicable |
| `platform_dauth.functional_roles` | business data / API backing | tenant/org scoped where applicable |
| `platform_dauth.role_permissions` | business data / API backing | tenant/org scoped where applicable |
| `dos.teams` | business data / API backing | tenant/org scoped where applicable |
| `dos.locations` | business data / API backing | tenant/org scoped where applicable |
| `dos.positions` | business data / API backing | tenant/org scoped where applicable |
| `dos.committees` | business data / API backing | tenant/org scoped where applicable |
| `dos.delegations` | business data / API backing | tenant/org scoped where applicable |
| `dos.ownership_mappings` | business data / API backing | tenant/org scoped where applicable |
| `dos.access_reviews` | business data / API backing | tenant/org scoped where applicable |
| `dos.policies` | business data / API backing | tenant/org scoped where applicable |
| `dos.audit_trail` | business data / API backing | tenant/org scoped where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | component file | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `foundation.overview` | `/foundation/overview` | Overview | نظرة عامة | `FoundationOverviewPageComponent` | `platform/foundation/ui/pages/foundation-overview-page.component.ts` | `GET /api/foundation/overview` | `dos.organizations, dos.business_units, dos.departments, dos.users` | `foundation.read` | `VERIFY` |
| 2 | `foundation.organization` | `/foundation/organization` | Organization | المنظمة | `FoundationOrganizationComponent` | `platform/foundation/ui/pages/foundation-organization.component.ts` | `GET /api/foundation/organizations` | `dos.organizations` | `foundation.read` | `VERIFY` |
| 3 | `foundation.business-units` | `/foundation/business-units` | Business Units | وحدات الأعمال | `FoundationBusinessUnitsComponent` | `platform/foundation/ui/pages/foundation-business-units.component.ts` | `GET /api/foundation/business-units` | `dos.business_units` | `foundation.read` | `VERIFY` |
| 4 | `foundation.departments` | `/foundation/departments` | Departments | الإدارات | `FoundationDepartmentsComponent` | `platform/foundation/ui/pages/foundation-departments.component.ts` | `GET /api/foundation/departments` | `dos.departments` | `foundation.read` | `VERIFY` |
| 5 | `foundation.users` | `/foundation/users` | Users | المستخدمون | `FoundationUsersComponent` | `platform/foundation/ui/pages/foundation-users.component.ts` | `GET /api/users` | `dos.users, dos.tenant_memberships, platform_dauth.user_role_assignments` | `foundation.users.read` | `VERIFY` |
| 6 | `foundation.roles` | `/foundation/roles` | Roles | الأدوار | `FoundationRolesComponent` | `platform/foundation/ui/pages/foundation-roles.component.ts` | `GET /api/profiles/roles` | `platform_dauth.functional_roles, platform_dauth.role_permissions` | `foundation.roles.read` | `VERIFY` |
| 7 | `foundation.teams` | `/foundation/teams` | Teams | الفرق | `FoundationTeamsComponent` | `platform/foundation/ui/pages/foundation-teams.component.ts` | `GET /api/foundation/teams` | `dos.teams, dos.team_members` | `foundation.read` | `VERIFY` |
| 8 | `foundation.locations` | `/foundation/locations` | Locations | المواقع | `FoundationLocationsComponent` | `platform/foundation/ui/pages/foundation-locations.component.ts` | `GET /api/foundation/locations` | `dos.locations` | `foundation.read` | `VERIFY` |
| 9 | `foundation.positions` | `/foundation/positions` | Positions | المناصب | `FoundationPositionsComponent` | `platform/foundation/ui/pages/foundation-positions.component.ts` | `GET /api/foundation/positions` | `dos.positions, dos.position_assignments` | `foundation.read` | `VERIFY` |
| 10 | `foundation.committees` | `/foundation/committees` | Committees | اللجان | `FoundationCommitteesComponent` | `platform/foundation/ui/pages/foundation-committees.component.ts` | `GET /api/foundation/committees` | `dos.committees, dos.committee_members` | `foundation.read` | `VERIFY` |
| 11 | `foundation.delegations` | `/foundation/delegations` | Delegations | التفويضات | `FoundationDelegationsComponent` | `platform/foundation/ui/pages/foundation-delegations.component.ts` | `GET /api/foundation/delegations` | `dos.delegations` | `foundation.read` | `VERIFY` |
| 12 | `foundation.ownership-mapping` | `/foundation/ownership-mapping` | Ownership Mapping | تعيين الملكيات | `FoundationOwnershipMappingComponent` | `platform/foundation/ui/pages/foundation-ownership-mapping.component.ts` | `GET /api/foundation/ownership-mapping` | `dos.ownership_mappings` | `foundation.read` | `VERIFY` |
| 13 | `foundation.access-review` | `/foundation/access-review` | Access Review | مراجعة الوصول | `FoundationAccessReviewComponent` | `platform/foundation/ui/pages/foundation-access-review.component.ts` | `GET /api/foundation/access-reviews` | `dos.access_reviews` | `foundation.access_review.read` | `VERIFY` |
| 14 | `foundation.policies` | `/foundation/policies` | Policies | السياسات | `FoundationPoliciesComponent` | `platform/foundation/ui/pages/foundation-policies.component.ts` | `GET /api/foundation/policies` | `dos.policies` | `foundation.policies.read` | `VERIFY` |
| 15 | `foundation.reference-data` | `/foundation/reference-data` | Reference Data | البيانات المرجعية | `FoundationReferenceDataComponent` | `platform/foundation/ui/pages/foundation-reference-data.component.ts` | `GET /api/foundation/reference-data` | `dos.reference_data` | `foundation.read` | `VERIFY` |
| 16 | `foundation.audit` | `/foundation/audit` | Audit | التدقيق | `FoundationAuditComponent` | `platform/foundation/ui/pages/foundation-audit.component.ts` | `GET /api/audit-trail` | `dos.audit_trail` | `foundation.audit.read` | `VERIFY` |
| 17 | `foundation.settings` | `/foundation/settings` | Settings | الإعدادات | `FoundationSettingsComponent` | `platform/foundation/ui/pages/foundation-settings.component.ts` | `GET /api/foundation/settings` | `dos.tenant_config, dos.feature_flags` | `foundation.admin` | `VERIFY` |

## 6. Direct SQL seed skeleton

> Verify column names before running. This is a direct seed plan, not blind SQL execution.

```sql
BEGIN;

-- 1) module_registry
-- UPSERT foundation into dos.module_registry

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


---

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


---

# Config Center Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `config-center` |
| product_key | `shahin-ai` |
| route_base | `/admin/config-center` |
| owner_service | `tenant-service / config-center` |
| module_status | `active_after_validation` |
| module_name_en | `Config Center` |
| module_name_ar | `إعدادات التشغيل` |
| category | `platform-config` |
| icon | `settings` |
| description_en | Runtime configuration, workspace settings, gateway config, resolution, compare, health and audit. |
| description_ar | إعدادات التشغيل، مساحة العمل، البوابة، حل الإعدادات، المقارنة، الصحة والتدقيق. |

## 2. Initialization group

### 2.1 `dos.module_registry`

| module_code | product_key | title_en | title_ar | category | status | owner_service |
|---|---|---|---|---|---|---|
| `config-center` | `shahin-ai` | `Config Center` | `إعدادات التشغيل` | `platform-config` | `active` | `tenant-service / config-center` |

### 2.2 `dos.navigation_registry`

#### Parent row

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `config-center` | `config-center` | `/admin/config-center` | `Config Center` | `إعدادات التشغيل` | `platform.config.read` | 10 |

#### Child rows

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `config-center.resolve` | `config-center` | `/admin/config-center/resolve` | Resolution | حل الإعدادات | `platform.config.read` | 10 |
| `config-center.settings` | `config-center` | `/admin/config-center/settings` | Settings | الإعدادات | `platform.config.read` | 20 |
| `config-center.workspace` | `config-center` | `/admin/config-center/workspace` | Workspace | مساحة العمل | `platform.config.read` | 30 |
| `config-center.gateway` | `config-center` | `/admin/config-center/gateway` | Gateway | البوابة | `platform.config.read` | 40 |
| `config-center.audit` | `config-center` | `/admin/config-center/audit` | Audit | التدقيق | `platform.config.read` | 50 |
| `config-center.health` | `config-center` | `/admin/config-center/health` | Health | الصحة | `platform.config.read` | 60 |
| `config-center.compare` | `config-center` | `/admin/config-center/compare` | Compare | المقارنة | `platform.config.read` | 70 |

### 2.3 Dynamic UI route/component rows

Use only if this module is enrolled in Dynamic UI runtime.

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `config-center.resolve.page` | `/admin/config-center/resolve` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.settings.page` | `/admin/config-center/settings` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.workspace.page` | `/admin/config-center/workspace` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.gateway.page` | `/admin/config-center/gateway` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.audit.page` | `/admin/config-center/audit` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.health.page` | `/admin/config-center/health` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.compare.page` | `/admin/config-center/compare` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### 2.4 Permissions

| permission_code | description |
|---|---|
| `platform.config.read` | Read platform configuration |
| `platform.config.write` | Write platform configuration |
| `platform.config.admin` | Administer platform configuration |
| `config.read` | Read config |
| `config.write` | Write config |
| `config.admin` | Administer config |

### 2.5 Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all platform.config.* and config.* |
| `platform_admin` | all platform.config.* and config.* |
| `config_admin` | platform.config.read, platform.config.write, platform.config.admin |
| `config_operator` | platform.config.read, platform.config.write |
| `config_auditor` | platform.config.read |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + config-center + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if tenant is trial |
| `dos.tenant_subscriptions` | active subscription or trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource access tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.config_profiles` | business data / API backing | tenant/org scoped where applicable |
| `dos.config_values` | business data / API backing | tenant/org scoped where applicable |
| `dos.runtime_settings` | business data / API backing | tenant/org scoped where applicable |
| `dos.workspace_config` | business data / API backing | tenant/org scoped where applicable |
| `dos.gateway_config` | business data / API backing | tenant/org scoped where applicable |
| `dos.config_audit_log` | business data / API backing | tenant/org scoped where applicable |
| `dos.config_health_checks` | business data / API backing | tenant/org scoped where applicable |
| `dos.feature_flags` | business data / API backing | tenant/org scoped where applicable |
| `dos.tenant_config` | business data / API backing | tenant/org scoped where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | component file | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `config-center.resolve` | `/admin/config-center/resolve` | Resolution | حل الإعدادات | `ConfigResolutionComponent` | `platform/config-center/config-resolution.component.ts` | `GET /api/config-center/resolve` | `dos.config_values, dos.config_profiles` | `platform.config.read` | `VERIFY` |
| 2 | `config-center.settings` | `/admin/config-center/settings` | Settings | الإعدادات | `ConfigSettingsComponent` | `platform/config-center/config-settings.component.ts` | `GET /api/config-center/settings` | `dos.runtime_settings` | `platform.config.read` | `VERIFY` |
| 3 | `config-center.workspace` | `/admin/config-center/workspace` | Workspace | مساحة العمل | `ConfigWorkspaceComponent` | `platform/config-center/config-workspace.component.ts` | `GET /api/config-center/gateway/workspace-config` | `dos.workspace_config, dos.tenant_config` | `platform.config.read` | `VERIFY` |
| 4 | `config-center.gateway` | `/admin/config-center/gateway` | Gateway | البوابة | `ConfigGatewayComponent` | `platform/config-center/config-gateway.component.ts` | `GET /api/config-center/gateway` | `dos.gateway_config` | `platform.config.read` | `VERIFY` |
| 5 | `config-center.audit` | `/admin/config-center/audit` | Audit | التدقيق | `ConfigAuditComponent` | `platform/config-center/config-audit.component.ts` | `GET /api/config-center/audit` | `dos.config_audit_log` | `platform.config.read` | `VERIFY` |
| 6 | `config-center.health` | `/admin/config-center/health` | Health | الصحة | `ConfigHealthComponent` | `platform/config-center/config-health.component.ts` | `GET /api/config-center/health` | `dos.config_health_checks` | `platform.config.read` | `VERIFY` |
| 7 | `config-center.compare` | `/admin/config-center/compare` | Compare | المقارنة | `ConfigCompareComponent` | `platform/config-center/config-compare.component.ts` | `GET /api/config-center/compare` | `dos.config_values` | `platform.config.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

> Verify column names before running. This is a direct seed plan, not blind SQL execution.

```sql
BEGIN;

-- 1) module_registry
-- UPSERT config-center into dos.module_registry

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


---

# AI Platform Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `ai-platform` |
| product_key | `shahin-ai` |
| route_base | `/ai` |
| owner_service | `ai-gateway-service / ai-engine-service` |
| module_status | `active_after_validation` |
| module_name_en | `AI Platform` |
| module_name_ar | `الرئيسية الذكية` |
| category | `platform-dna` |
| icon | `ai` |
| description_en | AI platform home, agents, agent runs, governance and evidence ledger. |
| description_ar | الرئيسية الذكية، الوكلاء، التشغيلات، الحوكمة وسجل الأدلة. |

## 2. Initialization group

### 2.1 `dos.module_registry`

| module_code | product_key | title_en | title_ar | category | status | owner_service |
|---|---|---|---|---|---|---|
| `ai-platform` | `shahin-ai` | `AI Platform` | `الرئيسية الذكية` | `platform-dna` | `active` | `ai-gateway-service / ai-engine-service` |

### 2.2 `dos.navigation_registry`

#### Parent row

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `ai-platform` | `ai-platform` | `/ai` | `AI Platform` | `الرئيسية الذكية` | `ai.read` | 10 |

#### Child rows

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `ai-platform.home` | `ai-platform` | `/ai/home` | AI Home | الرئيسية الذكية | `ai.read` | 10 |
| `ai-platform.agents` | `ai-platform` | `/ai/agents` | Agents | الوكلاء | `ai.agents.read` | 20 |
| `ai-platform.runs` | `ai-platform` | `/ai/runs` | Runs | التشغيلات | `ai.runs.read` | 30 |
| `ai-platform.governance` | `ai-platform` | `/ai/governance` | AI Governance | حوكمة الذكاء الاصطناعي | `ai.governance.read` | 40 |

### 2.3 Dynamic UI route/component rows

Use only if this module is enrolled in Dynamic UI runtime.

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `ai-platform.home.page` | `/ai/home` | `ai-platform` | `ai.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ai-platform.agents.page` | `/ai/agents` | `ai-platform` | `ai.agents.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ai-platform.runs.page` | `/ai/runs` | `ai-platform` | `ai.runs.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ai-platform.governance.page` | `/ai/governance` | `ai-platform` | `ai.governance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### 2.4 Permissions

| permission_code | description |
|---|---|
| `ai.read` | View AI Platform |
| `ai.admin` | Administer AI Platform |
| `ai.agents.read` | View agents |
| `ai.agents.manage` | Manage agents |
| `ai.runs.read` | View AI runs |
| `ai.runs.cancel` | Cancel AI runs |
| `ai.governance.read` | View AI governance |
| `ai.governance.approve` | Approve governed AI actions |
| `ai.evidence.read` | View AI evidence |
| `ai.audit.read` | View AI audit trail |

### 2.5 Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all ai.* |
| `platform_admin` | all ai.* |
| `ai_admin` | ai.read, ai.admin, ai.agents.manage, ai.runs.read, ai.governance.approve |
| `ai_operator` | ai.read, ai.agents.read, ai.runs.read, ai.runs.cancel |
| `ai_auditor` | ai.read, ai.governance.read, ai.evidence.read, ai.audit.read |
| `standard_user` | ai.read if enabled |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + ai-platform + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if tenant is trial |
| `dos.tenant_subscriptions` | active subscription or trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource access tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.dynamic_ui_agents` | business data / API backing | tenant/org scoped where applicable |
| `dos.dynamic_ui_agent_actions` | business data / API backing | tenant/org scoped where applicable |
| `dos.dynamic_ui_page_agents` | business data / API backing | tenant/org scoped where applicable |
| `dos.dynamic_ui_workflow_agents` | business data / API backing | tenant/org scoped where applicable |
| `dos.dynamic_ui_agent_squads` | business data / API backing | tenant/org scoped where applicable |
| `dos.dynamic_ui_agent_squad_members` | business data / API backing | tenant/org scoped where applicable |
| `dos.agent_runs` | business data / API backing | tenant/org scoped where applicable |
| `dos.agent_run_steps` | business data / API backing | tenant/org scoped where applicable |
| `dos.agent_action_receipts` | business data / API backing | tenant/org scoped where applicable |
| `dos.agent_recommendations` | business data / API backing | tenant/org scoped where applicable |
| `dos.agent_evidence_links` | business data / API backing | tenant/org scoped where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | component file | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `ai-platform.home` | `/ai/home` | AI Home | الرئيسية الذكية | `AiHomeComponent` | `products/shahin-ai/app/src/app/modules/ai/ai-home.component.ts` | `GET /api/ai/overview` | `dos.agent_runs, dos.agent_recommendations` | `ai.read` | `VERIFY` |
| 2 | `ai-platform.agents` | `/ai/agents` | Agents | الوكلاء | `AiAgentsComponent` | `products/shahin-ai/app/src/app/modules/ai/ai-agents.component.ts` | `GET /api/ai/agents` | `dos.dynamic_ui_agents, dos.dynamic_ui_agent_actions` | `ai.agents.read` | `VERIFY` |
| 3 | `ai-platform.runs` | `/ai/runs` | Runs | التشغيلات | `AiRunsComponent` | `products/shahin-ai/app/src/app/modules/ai/ai-runs.component.ts` | `GET /api/ai/runs` | `dos.agent_runs, dos.agent_run_steps, dos.agent_action_receipts` | `ai.runs.read` | `VERIFY` |
| 4 | `ai-platform.governance` | `/ai/governance` | AI Governance | حوكمة الذكاء الاصطناعي | `AiGovernanceComponent` | `products/shahin-ai/app/src/app/modules/ai/ai-governance.component.ts` | `GET /api/ai/governance` | `dos.agent_evidence_links, dos.agent_action_receipts, dos.authz_decision_log` | `ai.governance.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

> Verify column names before running. This is a direct seed plan, not blind SQL execution.

```sql
BEGIN;

-- 1) module_registry
-- UPSERT ai-platform into dos.module_registry

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


---


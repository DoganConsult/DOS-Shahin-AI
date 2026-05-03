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

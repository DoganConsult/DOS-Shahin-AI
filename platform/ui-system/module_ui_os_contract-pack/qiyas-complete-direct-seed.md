# Qiyas Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `qiyas` |
| product_key | `shahin-ai` |
| route_base | `/qiyas` |
| owner_service | `regulatory-service / qiyas-service` |
| module_status | `active_after_validation` |
| module_name_en | `Qiyas` |
| module_name_ar | `Qiyas` |
| category | `regulatory` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `qiyas` | `shahin-ai` | `Qiyas` | `regulatory` | `active` | `regulatory-service / qiyas-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `qiyas` | `qiyas` | `/qiyas` | `Qiyas` | `Qiyas` | `qiyas.read` | 10 |
| `qiyas.overview` | `qiyas` | `/qiyas/overview` | Overview | نظرة عامة | `qiyas.read` | 10 |
| `qiyas.requirements` | `qiyas` | `/qiyas/requirements` | Requirements | المتطلبات | `qiyas.requirements.read` | 20 |
| `qiyas.assessments` | `qiyas` | `/qiyas/assessments` | Assessments | التقييمات | `qiyas.assessments.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `qiyas.overview.page` | `/qiyas/overview` | `qiyas` | `qiyas.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `qiyas.requirements.page` | `/qiyas/requirements` | `qiyas` | `qiyas.requirements.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `qiyas.assessments.page` | `/qiyas/assessments` | `qiyas` | `qiyas.assessments.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `qiyas.admin` | qiyas admin |
| `qiyas.assessments.read` | qiyas assessments read |
| `qiyas.read` | qiyas read |
| `qiyas.requirements.read` | qiyas requirements read |
| `qiyas.write` | qiyas write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `qiyas.*` |
| `qiyas_admin` | `qiyas.read`, `qiyas.write`, `qiyas.admin` |
| `qiyas_operator` | read/write operational permissions |
| `qiyas_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + qiyas + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.qiyas_assessments` | page data / API backing | `tenant_id` required where applicable |
| `dos.qiyas_requirements` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `qiyas.overview` | `/qiyas/overview` | Overview | نظرة عامة | `QiyasOverviewComponent` | `GET /api/qiyas/overview` | `dos.qiyas_requirements` | `qiyas.read` | `VERIFY` |
| 2 | `qiyas.requirements` | `/qiyas/requirements` | Requirements | المتطلبات | `QiyasRequirementsComponent` | `GET /api/qiyas/requirements` | `dos.qiyas_requirements` | `qiyas.requirements.read` | `VERIFY` |
| 3 | `qiyas.assessments` | `/qiyas/assessments` | Assessments | التقييمات | `QiyasAssessmentsComponent` | `GET /api/qiyas/assessments` | `dos.qiyas_assessments` | `qiyas.assessments.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT qiyas into dos.module_registry
-- UPSERT parent and child rows into dos.navigation_registry
-- UPSERT Dynamic UI rows only after carbon_key verification
-- UPSERT permissions into platform_dauth.permissions
-- UPSERT role bindings into platform_dauth.role_permissions
-- UPSERT tenant entitlements only for selected tenant

COMMIT;
```

## 7. Validation checklist

- [ ] module_registry row exists
- [ ] nav rows exist
- [ ] route exists
- [ ] component exists
- [ ] API exists
- [ ] backend route exists
- [ ] DB table/query exists
- [ ] permission exists
- [ ] role binding exists
- [ ] tenant entitlement exists
- [ ] org/tenant scope enforced
- [ ] no mock/static data
- [ ] build passes

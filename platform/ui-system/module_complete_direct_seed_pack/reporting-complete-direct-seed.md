# Reporting Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `reporting` |
| product_key | `shahin-ai` |
| route_base | `/reporting` |
| owner_service | `analytics-reporting-service` |
| module_status | `active_after_validation` |
| module_name_en | `Reporting` |
| module_name_ar | `Reporting` |
| category | `reporting` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `reporting` | `shahin-ai` | `Reporting` | `reporting` | `active` | `analytics-reporting-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `reporting` | `reporting` | `/reporting` | `Reporting` | `Reporting` | `reporting.read` | 10 |
| `reporting.overview` | `reporting` | `/reporting/overview` | Overview | نظرة عامة | `reporting.read` | 10 |
| `reporting.reports` | `reporting` | `/reporting/reports` | Reports | التقارير | `reporting.read` | 20 |
| `reporting.exports` | `reporting` | `/reporting/exports` | Exports | الصادرات | `reporting.export` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `reporting.overview.page` | `/reporting/overview` | `reporting` | `reporting.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `reporting.reports.page` | `/reporting/reports` | `reporting` | `reporting.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `reporting.exports.page` | `/reporting/exports` | `reporting` | `reporting.export` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `reporting.admin` | reporting admin |
| `reporting.export` | reporting export |
| `reporting.read` | reporting read |
| `reporting.write` | reporting write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `reporting.*` |
| `reporting_admin` | `reporting.read`, `reporting.write`, `reporting.admin` |
| `reporting_operator` | read/write operational permissions |
| `reporting_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + reporting + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.report_exports` | page data / API backing | `tenant_id` required where applicable |
| `dos.reports` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `reporting.overview` | `/reporting/overview` | Overview | نظرة عامة | `ReportingOverviewComponent` | `GET /api/reporting/overview` | `dos.reports` | `reporting.read` | `VERIFY` |
| 2 | `reporting.reports` | `/reporting/reports` | Reports | التقارير | `ReportingReportsComponent` | `GET /api/reporting/reports` | `dos.reports` | `reporting.read` | `VERIFY` |
| 3 | `reporting.exports` | `/reporting/exports` | Exports | الصادرات | `ReportingExportsComponent` | `GET /api/reporting/exports` | `dos.report_exports` | `reporting.export` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT reporting into dos.module_registry
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

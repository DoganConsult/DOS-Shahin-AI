# Analytics Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `analytics` |
| product_key | `shahin-ai` |
| route_base | `/analytics` |
| owner_service | `analytics-service` |
| module_status | `active_after_validation` |
| module_name_en | `Analytics` |
| module_name_ar | `Analytics` |
| category | `insights` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `analytics` | `shahin-ai` | `Analytics` | `insights` | `active` | `analytics-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `analytics` | `analytics` | `/analytics` | `Analytics` | `Analytics` | `analytics.read` | 10 |
| `analytics.overview` | `analytics` | `/analytics/overview` | Overview | نظرة عامة | `analytics.read` | 10 |
| `analytics.dashboards` | `analytics` | `/analytics/dashboards` | Dashboards | لوحات المعلومات | `analytics.read` | 20 |
| `analytics.reports` | `analytics` | `/analytics/reports` | Reports | التقارير | `analytics.report.read` | 30 |
| `analytics.exports` | `analytics` | `/analytics/exports` | Exports | الصادرات | `analytics.export` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `analytics.overview.page` | `/analytics/overview` | `analytics` | `analytics.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `analytics.dashboards.page` | `/analytics/dashboards` | `analytics` | `analytics.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `analytics.reports.page` | `/analytics/reports` | `analytics` | `analytics.report.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `analytics.exports.page` | `/analytics/exports` | `analytics` | `analytics.export` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `analytics.admin` | analytics admin |
| `analytics.export` | analytics export |
| `analytics.read` | analytics read |
| `analytics.report.read` | analytics report read |
| `analytics.write` | analytics write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `analytics.*` |
| `analytics_admin` | `analytics.read`, `analytics.write`, `analytics.admin` |
| `analytics_operator` | read/write operational permissions |
| `analytics_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + analytics + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.analytics_dashboards` | page data / API backing | `tenant_id` required where applicable |
| `dos.analytics_exports` | page data / API backing | `tenant_id` required where applicable |
| `dos.analytics_reports` | page data / API backing | `tenant_id` required where applicable |
| `dos.analytics_snapshots` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `analytics.overview` | `/analytics/overview` | Overview | نظرة عامة | `AnalyticsOverviewComponent` | `GET /api/analytics/overview` | `dos.analytics_snapshots` | `analytics.read` | `VERIFY` |
| 2 | `analytics.dashboards` | `/analytics/dashboards` | Dashboards | لوحات المعلومات | `AnalyticsDashboardsComponent` | `GET /api/analytics/dashboards` | `dos.analytics_dashboards` | `analytics.read` | `VERIFY` |
| 3 | `analytics.reports` | `/analytics/reports` | Reports | التقارير | `AnalyticsReportsComponent` | `GET /api/analytics/reports` | `dos.analytics_reports` | `analytics.report.read` | `VERIFY` |
| 4 | `analytics.exports` | `/analytics/exports` | Exports | الصادرات | `AnalyticsExportsComponent` | `GET /api/analytics/exports` | `dos.analytics_exports` | `analytics.export` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT analytics into dos.module_registry
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

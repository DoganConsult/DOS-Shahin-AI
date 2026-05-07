# Audit Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `audit` |
| product_key | `shahin-ai` |
| route_base | `/audit` |
| owner_service | `audit-service / evidence-audit-reporting-service` |
| module_status | `active_after_validation` |
| module_name_en | `Audit` |
| module_name_ar | `Audit` |
| category | `audit` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `audit` | `shahin-ai` | `Audit` | `audit` | `active` | `audit-service / evidence-audit-reporting-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `audit` | `audit` | `/audit` | `Audit` | `Audit` | `audit.read` | 10 |
| `audit.overview` | `audit` | `/audit/overview` | Overview | نظرة عامة | `audit.read` | 10 |
| `audit.trail` | `audit` | `/audit/trail` | Audit Trail | سجل التدقيق | `audit.read` | 20 |
| `audit.events` | `audit` | `/audit/events` | Events | الأحداث | `audit.events.read` | 30 |
| `audit.reports` | `audit` | `/audit/reports` | Reports | التقارير | `audit.report.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `audit.overview.page` | `/audit/overview` | `audit` | `audit.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `audit.trail.page` | `/audit/trail` | `audit` | `audit.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `audit.events.page` | `/audit/events` | `audit` | `audit.events.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `audit.reports.page` | `/audit/reports` | `audit` | `audit.report.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `audit.admin` | audit admin |
| `audit.events.read` | audit events read |
| `audit.read` | audit read |
| `audit.report.read` | audit report read |
| `audit.write` | audit write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `audit.*` |
| `audit_admin` | `audit.read`, `audit.write`, `audit.admin` |
| `audit_operator` | read/write operational permissions |
| `audit_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + audit + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.audit_reports` | page data / API backing | `tenant_id` required where applicable |
| `dos.audit_trail` | page data / API backing | `tenant_id` required where applicable |
| `dos.security_events` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `audit.overview` | `/audit/overview` | Overview | نظرة عامة | `AuditOverviewComponent` | `GET /api/audit/overview` | `dos.audit_trail` | `audit.read` | `VERIFY` |
| 2 | `audit.trail` | `/audit/trail` | Audit Trail | سجل التدقيق | `AuditTrailComponent` | `GET /api/audit/trail` | `dos.audit_trail` | `audit.read` | `VERIFY` |
| 3 | `audit.events` | `/audit/events` | Events | الأحداث | `AuditEventsComponent` | `GET /api/audit/events` | `dos.security_events` | `audit.events.read` | `VERIFY` |
| 4 | `audit.reports` | `/audit/reports` | Reports | التقارير | `AuditReportsComponent` | `GET /api/audit/reports` | `dos.audit_reports` | `audit.report.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT audit into dos.module_registry
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

# DORA Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `dora` |
| product_key | `shahin-ai` |
| route_base | `/dora` |
| owner_service | `dora-service` |
| module_status | `active_after_validation` |
| module_name_en | `DORA` |
| module_name_ar | `DORA` |
| category | `regulatory` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `dora` | `shahin-ai` | `DORA` | `regulatory` | `active` | `dora-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `dora` | `dora` | `/dora` | `DORA` | `DORA` | `dora.read` | 10 |
| `dora.overview` | `dora` | `/dora/overview` | Overview | نظرة عامة | `dora.read` | 10 |
| `dora.ict-risk` | `dora` | `/dora/ict-risk` | ICT Risk | مخاطر تقنية المعلومات | `dora.risk.read` | 20 |
| `dora.incidents` | `dora` | `/dora/incidents` | Incidents | الحوادث | `dora.incident.read` | 30 |
| `dora.reports` | `dora` | `/dora/reports` | Reports | التقارير | `dora.report.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `dora.overview.page` | `/dora/overview` | `dora` | `dora.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dora.ict-risk.page` | `/dora/ict-risk` | `dora` | `dora.risk.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dora.incidents.page` | `/dora/incidents` | `dora` | `dora.incident.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dora.reports.page` | `/dora/reports` | `dora` | `dora.report.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `dora.admin` | dora admin |
| `dora.incident.read` | dora incident read |
| `dora.read` | dora read |
| `dora.report.read` | dora report read |
| `dora.risk.read` | dora risk read |
| `dora.write` | dora write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `dora.*` |
| `dora_admin` | `dora.read`, `dora.write`, `dora.admin` |
| `dora_operator` | read/write operational permissions |
| `dora_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + dora + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.dora_ict_risks` | page data / API backing | `tenant_id` required where applicable |
| `dos.dora_incidents` | page data / API backing | `tenant_id` required where applicable |
| `dos.dora_register` | page data / API backing | `tenant_id` required where applicable |
| `dos.dora_reports` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `dora.overview` | `/dora/overview` | Overview | نظرة عامة | `DoraOverviewComponent` | `GET /api/dora/overview` | `dos.dora_register` | `dora.read` | `VERIFY` |
| 2 | `dora.ict-risk` | `/dora/ict-risk` | ICT Risk | مخاطر تقنية المعلومات | `DoraIctRiskComponent` | `GET /api/dora/ict-risk` | `dos.dora_ict_risks` | `dora.risk.read` | `VERIFY` |
| 3 | `dora.incidents` | `/dora/incidents` | Incidents | الحوادث | `DoraIncidentsComponent` | `GET /api/dora/incidents` | `dos.dora_incidents` | `dora.incident.read` | `VERIFY` |
| 4 | `dora.reports` | `/dora/reports` | Reports | التقارير | `DoraReportsComponent` | `GET /api/dora/reports` | `dos.dora_reports` | `dora.report.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT dora into dos.module_registry
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

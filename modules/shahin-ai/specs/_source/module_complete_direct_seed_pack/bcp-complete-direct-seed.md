# BCP Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `bcp` |
| product_key | `shahin-ai` |
| route_base | `/bcp` |
| owner_service | `bcp-service` |
| module_status | `active_after_validation` |
| module_name_en | `BCP` |
| module_name_ar | `BCP` |
| category | `resilience` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `bcp` | `shahin-ai` | `BCP` | `resilience` | `active` | `bcp-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `bcp` | `bcp` | `/bcp` | `BCP` | `BCP` | `bcp.read` | 10 |
| `bcp.overview` | `bcp` | `/bcp/overview` | Overview | نظرة عامة | `bcp.read` | 10 |
| `bcp.plans` | `bcp` | `/bcp/plans` | Plans | الخطط | `bcp.read` | 20 |
| `bcp.tests` | `bcp` | `/bcp/tests` | Tests | الاختبارات | `bcp.test.read` | 30 |
| `bcp.incidents` | `bcp` | `/bcp/incidents` | Incidents | الحوادث | `bcp.incident.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `bcp.overview.page` | `/bcp/overview` | `bcp` | `bcp.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `bcp.plans.page` | `/bcp/plans` | `bcp` | `bcp.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `bcp.tests.page` | `/bcp/tests` | `bcp` | `bcp.test.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `bcp.incidents.page` | `/bcp/incidents` | `bcp` | `bcp.incident.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `bcp.admin` | bcp admin |
| `bcp.incident.read` | bcp incident read |
| `bcp.read` | bcp read |
| `bcp.test.read` | bcp test read |
| `bcp.write` | bcp write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `bcp.*` |
| `bcp_admin` | `bcp.read`, `bcp.write`, `bcp.admin` |
| `bcp_operator` | read/write operational permissions |
| `bcp_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + bcp + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.bcp_incidents` | page data / API backing | `tenant_id` required where applicable |
| `dos.bcp_plans` | page data / API backing | `tenant_id` required where applicable |
| `dos.bcp_tests` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `bcp.overview` | `/bcp/overview` | Overview | نظرة عامة | `BcpOverviewComponent` | `GET /api/bcp/overview` | `dos.bcp_plans` | `bcp.read` | `VERIFY` |
| 2 | `bcp.plans` | `/bcp/plans` | Plans | الخطط | `BcpPlansComponent` | `GET /api/bcp/plans` | `dos.bcp_plans` | `bcp.read` | `VERIFY` |
| 3 | `bcp.tests` | `/bcp/tests` | Tests | الاختبارات | `BcpTestsComponent` | `GET /api/bcp/tests` | `dos.bcp_tests` | `bcp.test.read` | `VERIFY` |
| 4 | `bcp.incidents` | `/bcp/incidents` | Incidents | الحوادث | `BcpIncidentsComponent` | `GET /api/bcp/incidents` | `dos.bcp_incidents` | `bcp.incident.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT bcp into dos.module_registry
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

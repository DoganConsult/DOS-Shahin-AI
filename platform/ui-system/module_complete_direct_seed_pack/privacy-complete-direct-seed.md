# Privacy Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `privacy` |
| product_key | `shahin-ai` |
| route_base | `/privacy` |
| owner_service | `privacy-service` |
| module_status | `active_after_validation` |
| module_name_en | `Privacy` |
| module_name_ar | `Privacy` |
| category | `privacy` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `privacy` | `shahin-ai` | `Privacy` | `privacy` | `active` | `privacy-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `privacy` | `privacy` | `/privacy` | `Privacy` | `Privacy` | `privacy.read` | 10 |
| `privacy.overview` | `privacy` | `/privacy/overview` | Overview | نظرة عامة | `privacy.read` | 10 |
| `privacy.ropa` | `privacy` | `/privacy/ropa` | RoPA | سجل أنشطة المعالجة | `privacy.ropa.read` | 20 |
| `privacy.dpia` | `privacy` | `/privacy/dpia` | DPIA | تقييم أثر الخصوصية | `privacy.dpia.read` | 30 |
| `privacy.requests` | `privacy` | `/privacy/requests` | Requests | الطلبات | `privacy.requests.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `privacy.overview.page` | `/privacy/overview` | `privacy` | `privacy.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `privacy.ropa.page` | `/privacy/ropa` | `privacy` | `privacy.ropa.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `privacy.dpia.page` | `/privacy/dpia` | `privacy` | `privacy.dpia.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `privacy.requests.page` | `/privacy/requests` | `privacy` | `privacy.requests.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `privacy.admin` | privacy admin |
| `privacy.dpia.read` | privacy dpia read |
| `privacy.read` | privacy read |
| `privacy.requests.read` | privacy requests read |
| `privacy.ropa.read` | privacy ropa read |
| `privacy.write` | privacy write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `privacy.*` |
| `privacy_admin` | `privacy.read`, `privacy.write`, `privacy.admin` |
| `privacy_operator` | read/write operational permissions |
| `privacy_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + privacy + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.privacy_assessments` | page data / API backing | `tenant_id` required where applicable |
| `dos.privacy_requests` | page data / API backing | `tenant_id` required where applicable |
| `dos.privacy_ropa` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `privacy.overview` | `/privacy/overview` | Overview | نظرة عامة | `PrivacyOverviewComponent` | `GET /api/privacy/overview` | `dos.privacy_assessments` | `privacy.read` | `VERIFY` |
| 2 | `privacy.ropa` | `/privacy/ropa` | RoPA | سجل أنشطة المعالجة | `PrivacyRopaComponent` | `GET /api/privacy/ropa` | `dos.privacy_ropa` | `privacy.ropa.read` | `VERIFY` |
| 3 | `privacy.dpia` | `/privacy/dpia` | DPIA | تقييم أثر الخصوصية | `PrivacyDpiaComponent` | `GET /api/privacy/dpia` | `dos.privacy_assessments` | `privacy.dpia.read` | `VERIFY` |
| 4 | `privacy.requests` | `/privacy/requests` | Requests | الطلبات | `PrivacyRequestsComponent` | `GET /api/privacy/requests` | `dos.privacy_requests` | `privacy.requests.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT privacy into dos.module_registry
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

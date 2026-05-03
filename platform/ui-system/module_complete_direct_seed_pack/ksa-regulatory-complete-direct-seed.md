# KSA Regulatory Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `ksa-regulatory` |
| product_key | `shahin-ai` |
| route_base | `/ksa-regulatory` |
| owner_service | `regulatory-service` |
| module_status | `active_after_validation` |
| module_name_en | `KSA Regulatory` |
| module_name_ar | `KSA Regulatory` |
| category | `regulatory` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `ksa-regulatory` | `shahin-ai` | `KSA Regulatory` | `regulatory` | `active` | `regulatory-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `ksa-regulatory` | `ksa-regulatory` | `/ksa-regulatory` | `KSA Regulatory` | `KSA Regulatory` | `ksa-regulatory.read` | 10 |
| `ksa-regulatory.overview` | `ksa-regulatory` | `/ksa-regulatory/overview` | Overview | نظرة عامة | `ksa.read` | 10 |
| `ksa-regulatory.frameworks` | `ksa-regulatory` | `/ksa-regulatory/frameworks` | Frameworks | الأطر | `ksa.frameworks.read` | 20 |
| `ksa-regulatory.obligations` | `ksa-regulatory` | `/ksa-regulatory/obligations` | Obligations | الالتزامات | `ksa.obligations.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `ksa-regulatory.overview.page` | `/ksa-regulatory/overview` | `ksa-regulatory` | `ksa.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ksa-regulatory.frameworks.page` | `/ksa-regulatory/frameworks` | `ksa-regulatory` | `ksa.frameworks.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ksa-regulatory.obligations.page` | `/ksa-regulatory/obligations` | `ksa-regulatory` | `ksa.obligations.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `ksa-regulatory.admin` | ksa-regulatory admin |
| `ksa-regulatory.read` | ksa-regulatory read |
| `ksa-regulatory.write` | ksa-regulatory write |
| `ksa.frameworks.read` | ksa frameworks read |
| `ksa.obligations.read` | ksa obligations read |
| `ksa.read` | ksa read |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `ksa-regulatory.*` |
| `ksa_regulatory_admin` | `ksa-regulatory.read`, `ksa-regulatory.write`, `ksa-regulatory.admin` |
| `ksa_regulatory_operator` | read/write operational permissions |
| `ksa_regulatory_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + ksa-regulatory + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.ksa_frameworks` | page data / API backing | `tenant_id` required where applicable |
| `dos.ksa_obligations` | page data / API backing | `tenant_id` required where applicable |
| `dos.ksa_regulatory_requirements` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `ksa-regulatory.overview` | `/ksa-regulatory/overview` | Overview | نظرة عامة | `KsaRegulatoryOverviewComponent` | `GET /api/ksa-regulatory/overview` | `dos.ksa_regulatory_requirements` | `ksa.read` | `VERIFY` |
| 2 | `ksa-regulatory.frameworks` | `/ksa-regulatory/frameworks` | Frameworks | الأطر | `KsaRegulatoryFrameworksComponent` | `GET /api/ksa-regulatory/frameworks` | `dos.ksa_frameworks` | `ksa.frameworks.read` | `VERIFY` |
| 3 | `ksa-regulatory.obligations` | `/ksa-regulatory/obligations` | Obligations | الالتزامات | `KsaRegulatoryObligationsComponent` | `GET /api/ksa-regulatory/obligations` | `dos.ksa_obligations` | `ksa.obligations.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT ksa-regulatory into dos.module_registry
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

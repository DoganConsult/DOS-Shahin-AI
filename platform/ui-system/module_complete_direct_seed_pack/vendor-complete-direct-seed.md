# Vendor Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `vendor` |
| product_key | `shahin-ai` |
| route_base | `/vendor` |
| owner_service | `vendor-risk-service` |
| module_status | `active_after_validation` |
| module_name_en | `Vendor` |
| module_name_ar | `Vendor` |
| category | `third-party` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `vendor` | `shahin-ai` | `Vendor` | `third-party` | `active` | `vendor-risk-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `vendor` | `vendor` | `/vendor` | `Vendor` | `Vendor` | `vendor.read` | 10 |
| `vendor.overview` | `vendor` | `/vendor/overview` | Overview | نظرة عامة | `vendor.read` | 10 |
| `vendor.registry` | `vendor` | `/vendor/registry` | Registry | السجل | `vendor.read` | 20 |
| `vendor.assessments` | `vendor` | `/vendor/assessments` | Assessments | التقييمات | `vendor.assessment.read` | 30 |
| `vendor.contracts` | `vendor` | `/vendor/contracts` | Contracts | العقود | `vendor.contract.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `vendor.overview.page` | `/vendor/overview` | `vendor` | `vendor.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `vendor.registry.page` | `/vendor/registry` | `vendor` | `vendor.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `vendor.assessments.page` | `/vendor/assessments` | `vendor` | `vendor.assessment.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `vendor.contracts.page` | `/vendor/contracts` | `vendor` | `vendor.contract.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `vendor.admin` | vendor admin |
| `vendor.assessment.read` | vendor assessment read |
| `vendor.contract.read` | vendor contract read |
| `vendor.read` | vendor read |
| `vendor.write` | vendor write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `vendor.*` |
| `vendor_admin` | `vendor.read`, `vendor.write`, `vendor.admin` |
| `vendor_operator` | read/write operational permissions |
| `vendor_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + vendor + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.vendor_assessments` | page data / API backing | `tenant_id` required where applicable |
| `dos.vendor_contracts` | page data / API backing | `tenant_id` required where applicable |
| `dos.vendors` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `vendor.overview` | `/vendor/overview` | Overview | نظرة عامة | `VendorOverviewComponent` | `GET /api/vendors/overview` | `dos.vendors` | `vendor.read` | `VERIFY` |
| 2 | `vendor.registry` | `/vendor/registry` | Registry | السجل | `VendorRegistryComponent` | `GET /api/vendors` | `dos.vendors` | `vendor.read` | `VERIFY` |
| 3 | `vendor.assessments` | `/vendor/assessments` | Assessments | التقييمات | `VendorAssessmentsComponent` | `GET /api/vendors/assessments` | `dos.vendor_assessments` | `vendor.assessment.read` | `VERIFY` |
| 4 | `vendor.contracts` | `/vendor/contracts` | Contracts | العقود | `VendorContractsComponent` | `GET /api/vendors/contracts` | `dos.vendor_contracts` | `vendor.contract.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT vendor into dos.module_registry
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

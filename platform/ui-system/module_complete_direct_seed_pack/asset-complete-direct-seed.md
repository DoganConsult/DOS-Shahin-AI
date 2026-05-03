# Asset Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `asset` |
| product_key | `shahin-ai` |
| route_base | `/asset` |
| owner_service | `asset-service` |
| module_status | `active_after_validation` |
| module_name_en | `Asset` |
| module_name_ar | `Asset` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `asset` | `shahin-ai` | `Asset` | `grc-core` | `active` | `asset-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `asset` | `asset` | `/asset` | `Asset` | `Asset` | `asset.read` | 10 |
| `asset.overview` | `asset` | `/asset/overview` | Overview | نظرة عامة | `asset.read` | 10 |
| `asset.inventory` | `asset` | `/asset/inventory` | Inventory | المخزون | `asset.read` | 20 |
| `asset.owners` | `asset` | `/asset/owners` | Owners | الملاك | `asset.read` | 30 |
| `asset.risk` | `asset` | `/asset/risk` | Asset Risk | مخاطر الأصول | `asset.risk.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `asset.overview.page` | `/asset/overview` | `asset` | `asset.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `asset.inventory.page` | `/asset/inventory` | `asset` | `asset.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `asset.owners.page` | `/asset/owners` | `asset` | `asset.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `asset.risk.page` | `/asset/risk` | `asset` | `asset.risk.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `asset.admin` | asset admin |
| `asset.read` | asset read |
| `asset.risk.read` | asset risk read |
| `asset.write` | asset write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `asset.*` |
| `asset_admin` | `asset.read`, `asset.write`, `asset.admin` |
| `asset_operator` | read/write operational permissions |
| `asset_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + asset + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.asset_owners` | page data / API backing | `tenant_id` required where applicable |
| `dos.asset_risk_scores` | page data / API backing | `tenant_id` required where applicable |
| `dos.assets` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `asset.overview` | `/asset/overview` | Overview | نظرة عامة | `AssetOverviewComponent` | `GET /api/assets/overview` | `dos.assets` | `asset.read` | `VERIFY` |
| 2 | `asset.inventory` | `/asset/inventory` | Inventory | المخزون | `AssetInventoryComponent` | `GET /api/assets` | `dos.assets` | `asset.read` | `VERIFY` |
| 3 | `asset.owners` | `/asset/owners` | Owners | الملاك | `AssetOwnersComponent` | `GET /api/assets/owners` | `dos.asset_owners` | `asset.read` | `VERIFY` |
| 4 | `asset.risk` | `/asset/risk` | Asset Risk | مخاطر الأصول | `AssetRiskComponent` | `GET /api/assets/risk` | `dos.asset_risk_scores` | `asset.risk.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT asset into dos.module_registry
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

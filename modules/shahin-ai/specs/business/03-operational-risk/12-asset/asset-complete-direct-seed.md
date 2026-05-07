# Asset Module — Complete Direct Seed Content

> **Layout:** This file is the golden reference for the consolidated direct-seed shape ([`00-CONSOLIDATED-DIRECT-SEED-SHAPE.md`](./00-CONSOLIDATED-DIRECT-SEED-SHAPE.md)).

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

## 1a. Operational inventory (counts by component / type / key / role / route)

| Category | Count | Details |
| --- | ---: | --- |
| Module code | 1 | `asset` |
| Product key | 1 | `shahin-ai` |
| Route base | 1 | `/asset` |
| Navigation keys | 5 | `asset`, `asset.overview`, `asset.inventory`, `asset.owners`, `asset.risk` |
| Route paths | 5 | `/asset`, `/asset/overview`, `/asset/inventory`, `/asset/owners`, `/asset/risk` |
| Dynamic UI component keys | 4 | `asset.overview.page`, `asset.inventory.page`, `asset.owners.page`, `asset.risk.page` |
| Angular components | 4 | `AssetOverviewComponent`, `AssetInventoryComponent`, `AssetOwnersComponent`, `AssetRiskComponent` |
| Page keys | 4 | `asset.overview`, `asset.inventory`, `asset.owners`, `asset.risk` |
| API endpoints | 4 | `GET /api/assets/overview`, `GET /api/assets`, `GET /api/assets/owners`, `GET /api/assets/risk` |
| DB tables | 3 | `dos.assets`, `dos.asset_owners`, `dos.asset_risk_scores` |
| Permission keys | 4 | `asset.admin`, `asset.read`, `asset.risk.read`, `asset.write` |
| Role codes | 5 | `tenant_owner`, `asset_admin`, `asset_operator`, `asset_auditor`, `standard_user` |
| Carbon keys | 4 | `grid` (overview), `table` (inventory), `structured-list` (owners), `grid` (risk) — verified `runtime_status=active` in `dos.ui_carbon_components` |
| Vendor type | 1 | `ibm-carbon` |
| Approval status | 1 | `approved` |

**Route note:** `/asset` is the parent nav route (`nav_key` `asset`); the four `component_key` rows below bind only the four leaf routes. Implement `/asset` as redirect to `/asset/overview` or a shared `module.entry.page` pattern per universal standard — do not mark COMPLETE until behavior matches product routing.

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
| `asset.overview.page` | `/asset/overview` | `asset` | `asset.read` | `ibm-carbon` | `grid` | `approved` |
| `asset.inventory.page` | `/asset/inventory` | `asset` | `asset.read` | `ibm-carbon` | `table` | `approved` |
| `asset.owners.page` | `/asset/owners` | `asset` | `asset.read` | `ibm-carbon` | `structured-list` | `approved` |
| `asset.risk.page` | `/asset/risk` | `asset` | `asset.risk.read` | `ibm-carbon` | `grid` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `asset.admin` | asset admin |
| `asset.read` | asset read |
| `asset.risk.read` | asset risk read |
| `asset.write` | asset write |

### Roles — catalog (functional role IDs)

Use existing platform role IDs where seeded (`tenant_admin`, `platform_super_admin`, etc.) **or** module-scoped codes below — align with `platform_dauth.functional_roles` / product RBAC naming in your environment. The **binding matrix** that follows is the source of truth for which permission each role receives.

### Role → permission bindings (`platform_dauth.role_permissions` / `role_permission_map`)

Concrete rows (no ambiguity). Duplicate `(role_code, permission_code)` must not appear.

| role_code | permission_code |
|---|---|
| `tenant_owner` | `asset.admin` |
| `tenant_owner` | `asset.read` |
| `tenant_owner` | `asset.risk.read` |
| `tenant_owner` | `asset.write` |
| `asset_admin` | `asset.admin` |
| `asset_admin` | `asset.read` |
| `asset_admin` | `asset.write` |
| `asset_operator` | `asset.read` |
| `asset_operator` | `asset.write` |
| `asset_auditor` | `asset.read` |
| `asset_auditor` | `asset.risk.read` |
| `standard_user` | `asset.read` |

**`standard_user`:** seed the row above only when the tenant is entitled to the Asset module; omit or revoke when module is off for that tenant (provisioning gate — not a vague binding).

**Summary by role**

| Role | Permissions granted |
|---|---|
| `tenant_owner` | `asset.admin`, `asset.read`, `asset.risk.read`, `asset.write` |
| `asset_admin` | `asset.admin`, `asset.read`, `asset.write` |
| `asset_operator` | `asset.read`, `asset.write` |
| `asset_auditor` | `asset.read`, `asset.risk.read` |
| `standard_user` | `asset.read` |

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
| `dos.assets` | page data / API backing | `tenant_id` required where applicable |
| `dos.asset_owners` | page data / API backing | `tenant_id` required where applicable |
| `dos.asset_risk_scores` | page data / API backing | `tenant_id` required where applicable |

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
-- UPSERT Dynamic UI rows (carbon_key: grid / table / structured-list — verified active in catalog)
-- UPSERT permissions into platform_dauth.permissions
-- UPSERT role bindings: 12 rows per §2 matrix (standard_user gated by entitlement)

COMMIT;
```

## 7. Final count reconciliation

| Bucket | Count | Notes |
|---|---:|---|
| Distinct **permission codes** | 4 | `asset.admin`, `asset.read`, `asset.risk.read`, `asset.write` |
| Distinct **role codes** | 5 | See binding matrix |
| **Role → permission rows** | 12 | Explicit UPSERT targets; `standard_user` gated by tenant entitlement |
| **Dynamic UI route rows** (pages) | 4 | Carbon keys mapped to active catalog rows (`grid`, `table`, `structured-list`) |
| **Approx. unique operational identifiers** | ~38 | Module/product/base + 5 nav + 5 paths + 4 components + 4 Angular + 4 pages + 4 APIs + 3 tables + 4 perms + 5 roles + vendor/approval singletons (layers overlap; §1a + matrices are SOT) |
| **Concrete catalog keys** | **38** | Carbon mappings verified against DB; `/asset` parent shell still verify routing |
| **Blocking VERIFY** | **routing** | Confirm `/asset` redirect or entry page matches product (§5 status rows remain `VERIFY` until Angular/API parity proven) |

After `/asset` parent behavior is confirmed in the SPA, treat **~38** surface identifiers plus **12** role-permission rows as fully concrete for ops (Carbon catalog alignment done; bindings explicit in §2).

## 8. Validation checklist

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
- [ ] role → permission rows match §2 matrix (12 rows + entitlement gate for `standard_user`)
- [ ] each page `carbon_key` matches `dos.ui_carbon_components` (`grid` / `table` / `structured-list` as seeded)


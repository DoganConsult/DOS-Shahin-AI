# Dynamic UI Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `dynamic-ui` |
| product_key | `shahin-ai` |
| route_base | `/dynamic-ui` |
| owner_service | `ui-os-service` |
| module_status | `active_after_validation` |
| module_name_en | `Dynamic UI` |
| module_name_ar | `Dynamic UI` |
| category | `platform-ui` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `dynamic-ui` | `shahin-ai` | `Dynamic UI` | `platform-ui` | `active` | `ui-os-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `dynamic-ui` | `dynamic-ui` | `/dynamic-ui` | `Dynamic UI` | `Dynamic UI` | `dynamic-ui.read` | 10 |
| `dynamic-ui.overview` | `dynamic-ui` | `/dynamic-ui/overview` | Overview | نظرة عامة | `dynamic_ui.read` | 10 |
| `dynamic-ui.routes` | `dynamic-ui` | `/dynamic-ui/routes` | Routes | المسارات | `dynamic_ui.routes.read` | 20 |
| `dynamic-ui.components` | `dynamic-ui` | `/dynamic-ui/components` | Components | المكونات | `dynamic_ui.components.read` | 30 |
| `dynamic-ui.contracts` | `dynamic-ui` | `/dynamic-ui/contracts` | Contracts | العقود | `dynamic_ui.contracts.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `dynamic-ui.overview.page` | `/dynamic-ui/overview` | `dynamic-ui` | `dynamic_ui.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dynamic-ui.routes.page` | `/dynamic-ui/routes` | `dynamic-ui` | `dynamic_ui.routes.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dynamic-ui.components.page` | `/dynamic-ui/components` | `dynamic-ui` | `dynamic_ui.components.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dynamic-ui.contracts.page` | `/dynamic-ui/contracts` | `dynamic-ui` | `dynamic_ui.contracts.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `dynamic-ui.admin` | dynamic-ui admin |
| `dynamic-ui.read` | dynamic-ui read |
| `dynamic-ui.write` | dynamic-ui write |
| `dynamic_ui.components.read` | dynamic_ui components read |
| `dynamic_ui.contracts.read` | dynamic_ui contracts read |
| `dynamic_ui.read` | dynamic_ui read |
| `dynamic_ui.routes.read` | dynamic_ui routes read |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `dynamic-ui.*` |
| `dynamic_ui_admin` | `dynamic-ui.read`, `dynamic-ui.write`, `dynamic-ui.admin` |
| `dynamic_ui_operator` | read/write operational permissions |
| `dynamic_ui_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + dynamic-ui + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.dynamic_ui_component_registry` | page data / API backing | `tenant_id` required where applicable |
| `dos.dynamic_ui_contracts` | page data / API backing | `tenant_id` required where applicable |
| `dos.dynamic_ui_routes` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `dynamic-ui.overview` | `/dynamic-ui/overview` | Overview | نظرة عامة | `DynamicUiOverviewComponent` | `GET /api/ui-os/overview` | `dos.dynamic_ui_routes` | `dynamic_ui.read` | `VERIFY` |
| 2 | `dynamic-ui.routes` | `/dynamic-ui/routes` | Routes | المسارات | `DynamicUiRoutesComponent` | `GET /api/ui-os/routes` | `dos.dynamic_ui_routes` | `dynamic_ui.routes.read` | `VERIFY` |
| 3 | `dynamic-ui.components` | `/dynamic-ui/components` | Components | المكونات | `DynamicUiComponentsComponent` | `GET /api/ui-os/components` | `dos.dynamic_ui_component_registry` | `dynamic_ui.components.read` | `VERIFY` |
| 4 | `dynamic-ui.contracts` | `/dynamic-ui/contracts` | Contracts | العقود | `DynamicUiContractsComponent` | `GET /api/ui-os/contracts` | `dos.dynamic_ui_contracts` | `dynamic_ui.contracts.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT dynamic-ui into dos.module_registry
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

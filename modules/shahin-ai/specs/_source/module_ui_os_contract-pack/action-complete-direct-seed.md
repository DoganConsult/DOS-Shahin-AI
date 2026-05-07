# Action Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `action` |
| product_key | `shahin-ai` |
| route_base | `/action` |
| owner_service | `workflow-service / action-service` |
| module_status | `active_after_validation` |
| module_name_en | `Action` |
| module_name_ar | `Action` |
| category | `workflow` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `action` | `shahin-ai` | `Action` | `workflow` | `active` | `workflow-service / action-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `action` | `action` | `/action` | `Action` | `Action` | `action.read` | 10 |
| `action.home` | `action` | `/action/home` | Home | الرئيسية | `action.read` | 10 |
| `action.tasks` | `action` | `/action/tasks` | Tasks | المهام | `action.read` | 20 |
| `action.approvals` | `action` | `/action/approvals` | Approvals | الموافقات | `action.approve` | 30 |
| `action.audit` | `action` | `/action/audit` | Audit | التدقيق | `action.audit.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `action.home.page` | `/action/home` | `action` | `action.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `action.tasks.page` | `/action/tasks` | `action` | `action.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `action.approvals.page` | `/action/approvals` | `action` | `action.approve` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `action.audit.page` | `/action/audit` | `action` | `action.audit.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `action.admin` | action admin |
| `action.approve` | action approve |
| `action.audit.read` | action audit read |
| `action.read` | action read |
| `action.write` | action write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `action.*` |
| `action_admin` | `action.read`, `action.write`, `action.admin` |
| `action_operator` | read/write operational permissions |
| `action_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + action + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.action_items` | page data / API backing | `tenant_id` required where applicable |
| `dos.approval_requests` | page data / API backing | `tenant_id` required where applicable |
| `dos.audit_trail` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `action.home` | `/action/home` | Home | الرئيسية | `ActionHomeComponent` | `GET /api/actions/overview` | `dos.action_items` | `action.read` | `VERIFY` |
| 2 | `action.tasks` | `/action/tasks` | Tasks | المهام | `ActionTasksComponent` | `GET /api/actions/tasks` | `dos.action_items` | `action.read` | `VERIFY` |
| 3 | `action.approvals` | `/action/approvals` | Approvals | الموافقات | `ActionApprovalsComponent` | `GET /api/actions/approvals` | `dos.approval_requests` | `action.approve` | `VERIFY` |
| 4 | `action.audit` | `/action/audit` | Audit | التدقيق | `ActionAuditComponent` | `GET /api/actions/audit` | `dos.audit_trail` | `action.audit.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT action into dos.module_registry
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

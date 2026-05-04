# Inbox Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `inbox` |
| product_key | `shahin-ai` |
| route_base | `/inbox` |
| owner_service | `notification-service / inbox-service` |
| module_status | `active_after_validation` |
| module_name_en | `Inbox` |
| module_name_ar | `Inbox` |
| category | `work` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `inbox` | `shahin-ai` | `Inbox` | `work` | `active` | `notification-service / inbox-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `inbox` | `inbox` | `/inbox` | `Inbox` | `Inbox` | `inbox.read` | 10 |
| `inbox.overview` | `inbox` | `/inbox/overview` | Overview | نظرة عامة | `inbox.read` | 10 |
| `inbox.items` | `inbox` | `/inbox/items` | Items | العناصر | `inbox.read` | 20 |
| `inbox.approvals` | `inbox` | `/inbox/approvals` | Approvals | الموافقات | `inbox.approvals.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `inbox.overview.page` | `/inbox/overview` | `inbox` | `inbox.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `inbox.items.page` | `/inbox/items` | `inbox` | `inbox.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `inbox.approvals.page` | `/inbox/approvals` | `inbox` | `inbox.approvals.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `inbox.admin` | inbox admin |
| `inbox.approvals.read` | inbox approvals read |
| `inbox.read` | inbox read |
| `inbox.write` | inbox write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `inbox.*` |
| `inbox_admin` | `inbox.read`, `inbox.write`, `inbox.admin` |
| `inbox_operator` | read/write operational permissions |
| `inbox_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + inbox + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.approval_requests` | page data / API backing | `tenant_id` required where applicable |
| `dos.inbox_items` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `inbox.overview` | `/inbox/overview` | Overview | نظرة عامة | `InboxOverviewComponent` | `GET /api/inbox/overview` | `dos.inbox_items` | `inbox.read` | `VERIFY` |
| 2 | `inbox.items` | `/inbox/items` | Items | العناصر | `InboxItemsComponent` | `GET /api/inbox/items` | `dos.inbox_items` | `inbox.read` | `VERIFY` |
| 3 | `inbox.approvals` | `/inbox/approvals` | Approvals | الموافقات | `InboxApprovalsComponent` | `GET /api/inbox/approvals` | `dos.approval_requests` | `inbox.approvals.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT inbox into dos.module_registry
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

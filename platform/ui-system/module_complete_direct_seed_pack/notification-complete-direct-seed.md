# Notification Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `notification` |
| product_key | `shahin-ai` |
| route_base | `/notification` |
| owner_service | `notification-service` |
| module_status | `active_after_validation` |
| module_name_en | `Notification` |
| module_name_ar | `Notification` |
| category | `work` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `notification` | `shahin-ai` | `Notification` | `work` | `active` | `notification-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `notification` | `notification` | `/notification` | `Notification` | `Notification` | `notification.read` | 10 |
| `notification.overview` | `notification` | `/notification/overview` | Overview | نظرة عامة | `notification.read` | 10 |
| `notification.messages` | `notification` | `/notification/messages` | Messages | الرسائل | `notification.read` | 20 |
| `notification.preferences` | `notification` | `/notification/preferences` | Preferences | التفضيلات | `notification.preferences.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `notification.overview.page` | `/notification/overview` | `notification` | `notification.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `notification.messages.page` | `/notification/messages` | `notification` | `notification.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `notification.preferences.page` | `/notification/preferences` | `notification` | `notification.preferences.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `notification.admin` | notification admin |
| `notification.preferences.read` | notification preferences read |
| `notification.read` | notification read |
| `notification.write` | notification write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `notification.*` |
| `notification_admin` | `notification.read`, `notification.write`, `notification.admin` |
| `notification_operator` | read/write operational permissions |
| `notification_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + notification + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.notification_preferences` | page data / API backing | `tenant_id` required where applicable |
| `dos.notifications` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `notification.overview` | `/notification/overview` | Overview | نظرة عامة | `NotificationOverviewComponent` | `GET /api/notifications/overview` | `dos.notifications` | `notification.read` | `VERIFY` |
| 2 | `notification.messages` | `/notification/messages` | Messages | الرسائل | `NotificationMessagesComponent` | `GET /api/notifications` | `dos.notifications` | `notification.read` | `VERIFY` |
| 3 | `notification.preferences` | `/notification/preferences` | Preferences | التفضيلات | `NotificationPreferencesComponent` | `GET /api/notifications/preferences` | `dos.notification_preferences` | `notification.preferences.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT notification into dos.module_registry
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

# Issues Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `issues` |
| product_key | `shahin-ai` |
| route_base | `/issues` |
| owner_service | `issue-service / remediation-service` |
| module_status | `active_after_validation` |
| module_name_en | `Issues` |
| module_name_ar | `Issues` |
| category | `work` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `issues` | `shahin-ai` | `Issues` | `work` | `active` | `issue-service / remediation-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `issues` | `issues` | `/issues` | `Issues` | `Issues` | `issues.read` | 10 |
| `issues.overview` | `issues` | `/issues/overview` | Overview | نظرة عامة | `issues.read` | 10 |
| `issues.register` | `issues` | `/issues/register` | Register | السجل | `issues.read` | 20 |
| `issues.actions` | `issues` | `/issues/actions` | Actions | الإجراءات | `issues.action.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `issues.overview.page` | `/issues/overview` | `issues` | `issues.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `issues.register.page` | `/issues/register` | `issues` | `issues.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `issues.actions.page` | `/issues/actions` | `issues` | `issues.action.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `issues.action.read` | issues action read |
| `issues.admin` | issues admin |
| `issues.read` | issues read |
| `issues.write` | issues write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `issues.*` |
| `issues_admin` | `issues.read`, `issues.write`, `issues.admin` |
| `issues_operator` | read/write operational permissions |
| `issues_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + issues + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.issue_actions` | page data / API backing | `tenant_id` required where applicable |
| `dos.issues` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `issues.overview` | `/issues/overview` | Overview | نظرة عامة | `IssuesOverviewComponent` | `GET /api/issues/overview` | `dos.issues` | `issues.read` | `VERIFY` |
| 2 | `issues.register` | `/issues/register` | Register | السجل | `IssuesRegisterComponent` | `GET /api/issues` | `dos.issues` | `issues.read` | `VERIFY` |
| 3 | `issues.actions` | `/issues/actions` | Actions | الإجراءات | `IssuesActionsComponent` | `GET /api/issues/actions` | `dos.issue_actions` | `issues.action.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT issues into dos.module_registry
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

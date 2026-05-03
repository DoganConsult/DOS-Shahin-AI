# Workflow Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `workflow` |
| product_key | `shahin-ai` |
| route_base | `/workflow` |
| owner_service | `workflow-service` |
| module_status | `active_after_validation` |
| module_name_en | `Workflow` |
| module_name_ar | `Workflow` |
| category | `workflow` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `workflow` | `shahin-ai` | `Workflow` | `workflow` | `active` | `workflow-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `workflow` | `workflow` | `/workflow` | `Workflow` | `Workflow` | `workflow.read` | 10 |
| `workflow.overview` | `workflow` | `/workflow/overview` | Overview | نظرة عامة | `workflow.read` | 10 |
| `workflow.templates` | `workflow` | `/workflow/templates` | Templates | القوالب | `workflow.templates.read` | 20 |
| `workflow.instances` | `workflow` | `/workflow/instances` | Instances | المثيلات | `workflow.instances.read` | 30 |
| `workflow.approvals` | `workflow` | `/workflow/approvals` | Approvals | الموافقات | `workflow.approvals.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `workflow.overview.page` | `/workflow/overview` | `workflow` | `workflow.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `workflow.templates.page` | `/workflow/templates` | `workflow` | `workflow.templates.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `workflow.instances.page` | `/workflow/instances` | `workflow` | `workflow.instances.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `workflow.approvals.page` | `/workflow/approvals` | `workflow` | `workflow.approvals.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `workflow.admin` | workflow admin |
| `workflow.approvals.read` | workflow approvals read |
| `workflow.instances.read` | workflow instances read |
| `workflow.read` | workflow read |
| `workflow.templates.read` | workflow templates read |
| `workflow.write` | workflow write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `workflow.*` |
| `workflow_admin` | `workflow.read`, `workflow.write`, `workflow.admin` |
| `workflow_operator` | read/write operational permissions |
| `workflow_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + workflow + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.workflow_approvals` | page data / API backing | `tenant_id` required where applicable |
| `dos.workflow_instances` | page data / API backing | `tenant_id` required where applicable |
| `dos.workflow_templates` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `workflow.overview` | `/workflow/overview` | Overview | نظرة عامة | `WorkflowOverviewComponent` | `GET /api/workflow/overview` | `dos.workflow_instances` | `workflow.read` | `VERIFY` |
| 2 | `workflow.templates` | `/workflow/templates` | Templates | القوالب | `WorkflowTemplatesComponent` | `GET /api/workflow/templates` | `dos.workflow_templates` | `workflow.templates.read` | `VERIFY` |
| 3 | `workflow.instances` | `/workflow/instances` | Instances | المثيلات | `WorkflowInstancesComponent` | `GET /api/workflow/instances` | `dos.workflow_instances` | `workflow.instances.read` | `VERIFY` |
| 4 | `workflow.approvals` | `/workflow/approvals` | Approvals | الموافقات | `WorkflowApprovalsComponent` | `GET /api/workflow/approvals` | `dos.workflow_approvals` | `workflow.approvals.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT workflow into dos.module_registry
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

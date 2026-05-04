# Training Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `training` |
| product_key | `shahin-ai` |
| route_base | `/training` |
| owner_service | `training-service` |
| module_status | `active_after_validation` |
| module_name_en | `Training` |
| module_name_ar | `Training` |
| category | `awareness` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `training` | `shahin-ai` | `Training` | `awareness` | `active` | `training-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `training` | `training` | `/training` | `Training` | `Training` | `training.read` | 10 |
| `training.overview` | `training` | `/training/overview` | Overview | نظرة عامة | `training.read` | 10 |
| `training.courses` | `training` | `/training/courses` | Courses | الدورات | `training.read` | 20 |
| `training.assignments` | `training` | `/training/assignments` | Assignments | التكليفات | `training.assignments.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `training.overview.page` | `/training/overview` | `training` | `training.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `training.courses.page` | `/training/courses` | `training` | `training.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `training.assignments.page` | `/training/assignments` | `training` | `training.assignments.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `training.admin` | training admin |
| `training.assignments.read` | training assignments read |
| `training.read` | training read |
| `training.write` | training write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `training.*` |
| `training_admin` | `training.read`, `training.write`, `training.admin` |
| `training_operator` | read/write operational permissions |
| `training_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + training + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.training_assignments` | page data / API backing | `tenant_id` required where applicable |
| `dos.training_courses` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `training.overview` | `/training/overview` | Overview | نظرة عامة | `TrainingOverviewComponent` | `GET /api/training/overview` | `dos.training_courses` | `training.read` | `VERIFY` |
| 2 | `training.courses` | `/training/courses` | Courses | الدورات | `TrainingCoursesComponent` | `GET /api/training/courses` | `dos.training_courses` | `training.read` | `VERIFY` |
| 3 | `training.assignments` | `/training/assignments` | Assignments | التكليفات | `TrainingAssignmentsComponent` | `GET /api/training/assignments` | `dos.training_assignments` | `training.assignments.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT training into dos.module_registry
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

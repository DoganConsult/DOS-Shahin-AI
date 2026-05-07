# Controls Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `controls` |
| product_key | `shahin-ai` |
| route_base | `/controls` |
| owner_service | `compliance-controls-service` |
| module_status | `active_after_validation` |
| module_name_en | `Controls` |
| module_name_ar | `Controls` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `controls` | `shahin-ai` | `Controls` | `grc-core` | `active` | `compliance-controls-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `controls` | `controls` | `/controls` | `Controls` | `Controls` | `controls.read` | 10 |
| `controls.overview` | `controls` | `/controls/overview` | Overview | نظرة عامة | `controls.read` | 10 |
| `controls.library` | `controls` | `/controls/library` | Control Library | مكتبة الضوابط | `controls.read` | 20 |
| `controls.testing` | `controls` | `/controls/testing` | Testing | الاختبار | `controls.test.read` | 30 |
| `controls.evidence` | `controls` | `/controls/evidence` | Evidence | الأدلة | `controls.evidence.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `controls.overview.page` | `/controls/overview` | `controls` | `controls.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `controls.library.page` | `/controls/library` | `controls` | `controls.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `controls.testing.page` | `/controls/testing` | `controls` | `controls.test.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `controls.evidence.page` | `/controls/evidence` | `controls` | `controls.evidence.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `controls.admin` | controls admin |
| `controls.evidence.read` | controls evidence read |
| `controls.read` | controls read |
| `controls.test.read` | controls test read |
| `controls.write` | controls write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `controls.*` |
| `controls_admin` | `controls.read`, `controls.write`, `controls.admin` |
| `controls_operator` | read/write operational permissions |
| `controls_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + controls + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.control_evidence` | page data / API backing | `tenant_id` required where applicable |
| `dos.control_tests` | page data / API backing | `tenant_id` required where applicable |
| `dos.controls` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `controls.overview` | `/controls/overview` | Overview | نظرة عامة | `ControlsOverviewComponent` | `GET /api/controls/overview` | `dos.controls` | `controls.read` | `VERIFY` |
| 2 | `controls.library` | `/controls/library` | Control Library | مكتبة الضوابط | `ControlsLibraryComponent` | `GET /api/controls` | `dos.controls` | `controls.read` | `VERIFY` |
| 3 | `controls.testing` | `/controls/testing` | Testing | الاختبار | `ControlsTestingComponent` | `GET /api/controls/testing` | `dos.control_tests` | `controls.test.read` | `VERIFY` |
| 4 | `controls.evidence` | `/controls/evidence` | Evidence | الأدلة | `ControlsEvidenceComponent` | `GET /api/controls/evidence` | `dos.control_evidence` | `controls.evidence.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT controls into dos.module_registry
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

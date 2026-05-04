# Onboarding Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `onboarding` |
| product_key | `shahin-ai` |
| route_base | `/onboarding` |
| owner_service | `onboarding-service` |
| module_status | `active_after_validation` |
| module_name_en | `Onboarding` |
| module_name_ar | `Onboarding` |
| category | `tenant-lifecycle` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `onboarding` | `shahin-ai` | `Onboarding` | `tenant-lifecycle` | `active` | `onboarding-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `onboarding` | `onboarding` | `/onboarding` | `Onboarding` | `Onboarding` | `onboarding.read` | 10 |
| `onboarding.overview` | `onboarding` | `/onboarding/overview` | Overview | نظرة عامة | `onboarding.read` | 10 |
| `onboarding.sessions` | `onboarding` | `/onboarding/sessions` | Sessions | الجلسات | `onboarding.sessions.read` | 20 |
| `onboarding.intake` | `onboarding` | `/onboarding/intake` | Foundation Intake | إدخال التأسيس | `onboarding.intake.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `onboarding.overview.page` | `/onboarding/overview` | `onboarding` | `onboarding.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `onboarding.sessions.page` | `/onboarding/sessions` | `onboarding` | `onboarding.sessions.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `onboarding.intake.page` | `/onboarding/intake` | `onboarding` | `onboarding.intake.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `onboarding.admin` | onboarding admin |
| `onboarding.intake.read` | onboarding intake read |
| `onboarding.read` | onboarding read |
| `onboarding.sessions.read` | onboarding sessions read |
| `onboarding.write` | onboarding write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `onboarding.*` |
| `onboarding_admin` | `onboarding.read`, `onboarding.write`, `onboarding.admin` |
| `onboarding_operator` | read/write operational permissions |
| `onboarding_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + onboarding + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.onboarding_answer_sets` | page data / API backing | `tenant_id` required where applicable |
| `dos.onboarding_sessions` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `onboarding.overview` | `/onboarding/overview` | Overview | نظرة عامة | `OnboardingOverviewComponent` | `GET /api/onboarding/overview` | `dos.onboarding_sessions` | `onboarding.read` | `VERIFY` |
| 2 | `onboarding.sessions` | `/onboarding/sessions` | Sessions | الجلسات | `OnboardingSessionsComponent` | `GET /api/onboarding/sessions` | `dos.onboarding_sessions` | `onboarding.sessions.read` | `VERIFY` |
| 3 | `onboarding.intake` | `/onboarding/intake` | Foundation Intake | إدخال التأسيس | `OnboardingIntakeComponent` | `GET /api/onboarding/intake` | `dos.onboarding_answer_sets` | `onboarding.intake.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT onboarding into dos.module_registry
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

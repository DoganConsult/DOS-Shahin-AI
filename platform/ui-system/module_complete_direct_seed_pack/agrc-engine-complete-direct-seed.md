# AGRC Engine Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `agrc-engine` |
| product_key | `shahin-ai` |
| route_base | `/agrc-engine` |
| owner_service | `ai-engine-service / agrc-engine` |
| module_status | `active_after_validation` |
| module_name_en | `AGRC Engine` |
| module_name_ar | `AGRC Engine` |
| category | `ai-grc` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `agrc-engine` | `shahin-ai` | `AGRC Engine` | `ai-grc` | `active` | `ai-engine-service / agrc-engine` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `agrc-engine` | `agrc-engine` | `/agrc-engine` | `AGRC Engine` | `AGRC Engine` | `agrc-engine.read` | 10 |
| `agrc-engine.home` | `agrc-engine` | `/agrc-engine/home` | Engine Home | الرئيسية | `agrc.read` | 10 |
| `agrc-engine.runs` | `agrc-engine` | `/agrc-engine/runs` | Runs | التشغيلات | `agrc.runs.read` | 20 |
| `agrc-engine.decisions` | `agrc-engine` | `/agrc-engine/decisions` | Decisions | القرارات | `agrc.decisions.read` | 30 |
| `agrc-engine.rules` | `agrc-engine` | `/agrc-engine/rules` | Rules | القواعد | `agrc.rules.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `agrc-engine.home.page` | `/agrc-engine/home` | `agrc-engine` | `agrc.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `agrc-engine.runs.page` | `/agrc-engine/runs` | `agrc-engine` | `agrc.runs.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `agrc-engine.decisions.page` | `/agrc-engine/decisions` | `agrc-engine` | `agrc.decisions.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `agrc-engine.rules.page` | `/agrc-engine/rules` | `agrc-engine` | `agrc.rules.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `agrc-engine.admin` | agrc-engine admin |
| `agrc-engine.read` | agrc-engine read |
| `agrc-engine.write` | agrc-engine write |
| `agrc.decisions.read` | agrc decisions read |
| `agrc.read` | agrc read |
| `agrc.rules.read` | agrc rules read |
| `agrc.runs.read` | agrc runs read |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `agrc-engine.*` |
| `agrc_engine_admin` | `agrc-engine.read`, `agrc-engine.write`, `agrc-engine.admin` |
| `agrc_engine_operator` | read/write operational permissions |
| `agrc_engine_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + agrc-engine + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.agrc_decisions` | page data / API backing | `tenant_id` required where applicable |
| `dos.agrc_rules` | page data / API backing | `tenant_id` required where applicable |
| `dos.agrc_runs` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `agrc-engine.home` | `/agrc-engine/home` | Engine Home | الرئيسية | `AgrcEngineHomeComponent` | `GET /api/agrc-engine/overview` | `dos.agrc_runs` | `agrc.read` | `VERIFY` |
| 2 | `agrc-engine.runs` | `/agrc-engine/runs` | Runs | التشغيلات | `AgrcEngineRunsComponent` | `GET /api/agrc-engine/runs` | `dos.agrc_runs` | `agrc.runs.read` | `VERIFY` |
| 3 | `agrc-engine.decisions` | `/agrc-engine/decisions` | Decisions | القرارات | `AgrcEngineDecisionsComponent` | `GET /api/agrc-engine/decisions` | `dos.agrc_decisions` | `agrc.decisions.read` | `VERIFY` |
| 4 | `agrc-engine.rules` | `/agrc-engine/rules` | Rules | القواعد | `AgrcEngineRulesComponent` | `GET /api/agrc-engine/rules` | `dos.agrc_rules` | `agrc.rules.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT agrc-engine into dos.module_registry
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

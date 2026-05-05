# AI OS Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `ai-os` |
| product_key | `shahin-ai` |
| route_base | `/ai-os` |
| owner_service | `ai-engine-service / ai-os` |
| module_status | `active_after_validation` |
| module_name_en | `AI OS` |
| module_name_ar | `AI OS` |
| category | `platform-dna` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `ai-os` | `shahin-ai` | `AI OS` | `platform-dna` | `active` | `ai-engine-service / ai-os` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `ai-os` | `ai-os` | `/ai-os` | `AI OS` | `AI OS` | `ai-os.read` | 10 |
| `ai-os.home` | `ai-os` | `/ai-os/home` | AI OS Home | الرئيسية | `ai.os.read` | 10 |
| `ai-os.models` | `ai-os` | `/ai-os/models` | Models | النماذج | `ai.os.models.read` | 20 |
| `ai-os.tools` | `ai-os` | `/ai-os/tools` | Tools | الأدوات | `ai.os.tools.read` | 30 |
| `ai-os.policies` | `ai-os` | `/ai-os/policies` | Policies | السياسات | `ai.os.policies.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `ai-os.home.page` | `/ai-os/home` | `ai-os` | `ai.os.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ai-os.models.page` | `/ai-os/models` | `ai-os` | `ai.os.models.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ai-os.tools.page` | `/ai-os/tools` | `ai-os` | `ai.os.tools.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ai-os.policies.page` | `/ai-os/policies` | `ai-os` | `ai.os.policies.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `ai-os.admin` | ai-os admin |
| `ai-os.read` | ai-os read |
| `ai-os.write` | ai-os write |
| `ai.os.models.read` | ai os models read |
| `ai.os.policies.read` | ai os policies read |
| `ai.os.read` | ai os read |
| `ai.os.tools.read` | ai os tools read |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `ai-os.*` |
| `ai_os_admin` | `ai-os.read`, `ai-os.write`, `ai-os.admin` |
| `ai_os_operator` | read/write operational permissions |
| `ai_os_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + ai-os + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.ai_models` | page data / API backing | `tenant_id` required where applicable |
| `dos.ai_os_runtime` | page data / API backing | `tenant_id` required where applicable |
| `dos.ai_policies` | page data / API backing | `tenant_id` required where applicable |
| `dos.ai_tools` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `ai-os.home` | `/ai-os/home` | AI OS Home | الرئيسية | `AiOsHomeComponent` | `GET /api/ai-os/overview` | `dos.ai_os_runtime` | `ai.os.read` | `VERIFY` |
| 2 | `ai-os.models` | `/ai-os/models` | Models | النماذج | `AiOsModelsComponent` | `GET /api/ai-os/models` | `dos.ai_models` | `ai.os.models.read` | `VERIFY` |
| 3 | `ai-os.tools` | `/ai-os/tools` | Tools | الأدوات | `AiOsToolsComponent` | `GET /api/ai-os/tools` | `dos.ai_tools` | `ai.os.tools.read` | `VERIFY` |
| 4 | `ai-os.policies` | `/ai-os/policies` | Policies | السياسات | `AiOsPoliciesComponent` | `GET /api/ai-os/policies` | `dos.ai_policies` | `ai.os.policies.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT ai-os into dos.module_registry
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

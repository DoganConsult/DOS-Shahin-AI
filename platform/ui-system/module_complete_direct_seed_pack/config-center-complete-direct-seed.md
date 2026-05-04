# Config Center Module — Complete Direct Seed Content

**Authoritative contract:** `config-center-complete-direct-seed.json`

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `config-center` |
| product_key | `shahin-ai` |
| route_base | `/admin/config-center` |
| owner_service | `tenant-service / config-center` |
| module_status | `active_after_validation` |
| module_name_en | `Config Center` |
| module_name_ar | `إعدادات التشغيل` |
| category | `platform-config` |
| icon | `settings` |
| description_en | Runtime configuration, workspace settings, gateway config, resolution, compare, health and audit. |
| description_ar | إعدادات التشغيل، مساحة العمل، البوابة، حل الإعدادات، المقارنة، الصحة والتدقيق. |

## 2. Initialization group

### 2.1 `dos.module_registry`

| module_code | product_key | title_en | title_ar | category | status | owner_service |
|---|---|---|---|---|---|---|
| `config-center` | `shahin-ai` | `Config Center` | `إعدادات التشغيل` | `platform-config` | `active` | `tenant-service / config-center` |

### 2.2 `dos.navigation_registry`

#### Parent row

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `config-center` | `config-center` | `/admin/config-center` | `Config Center` | `إعدادات التشغيل` | `platform.config.read` | 10 |

#### Child rows

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `config-center.resolve` | `config-center` | `/admin/config-center/resolve` | Resolution | حل الإعدادات | `platform.config.read` | 10 |
| `config-center.settings` | `config-center` | `/admin/config-center/settings` | Settings | الإعدادات | `platform.config.read` | 20 |
| `config-center.workspace` | `config-center` | `/admin/config-center/workspace` | Workspace | مساحة العمل | `platform.config.read` | 30 |
| `config-center.gateway` | `config-center` | `/admin/config-center/gateway` | Gateway | البوابة | `platform.config.read` | 40 |
| `config-center.audit` | `config-center` | `/admin/config-center/audit` | Audit | التدقيق | `platform.config.read` | 50 |
| `config-center.health` | `config-center` | `/admin/config-center/health` | Health | الصحة | `platform.config.read` | 60 |
| `config-center.compare` | `config-center` | `/admin/config-center/compare` | Compare | المقارنة | `platform.config.read` | 70 |

### 2.3 Dynamic UI route/component rows

Use only if this module is enrolled in Dynamic UI runtime.

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `config-center.resolve.page` | `/admin/config-center/resolve` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.settings.page` | `/admin/config-center/settings` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.workspace.page` | `/admin/config-center/workspace` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.gateway.page` | `/admin/config-center/gateway` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.audit.page` | `/admin/config-center/audit` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.health.page` | `/admin/config-center/health` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `config-center.compare.page` | `/admin/config-center/compare` | `config-center` | `platform.config.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### 2.4 Permissions

| permission_code | description |
|---|---|
| `platform.config.read` | Read platform configuration |
| `platform.config.write` | Write platform configuration |
| `platform.config.admin` | Administer platform configuration |
| `config.read` | Read config |
| `config.write` | Write config |
| `config.admin` | Administer config |

### 2.5 Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all platform.config.* and config.* |
| `platform_admin` | all platform.config.* and config.* |
| `config_admin` | platform.config.read, platform.config.write, platform.config.admin |
| `config_operator` | platform.config.read, platform.config.write |
| `config_auditor` | platform.config.read |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + config-center + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if tenant is trial |
| `dos.tenant_subscriptions` | active subscription or trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource access tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.config_profiles` | business data / API backing | tenant/org scoped where applicable |
| `dos.config_values` | business data / API backing | tenant/org scoped where applicable |
| `dos.runtime_settings` | business data / API backing | tenant/org scoped where applicable |
| `dos.workspace_config` | business data / API backing | tenant/org scoped where applicable |
| `dos.gateway_config` | business data / API backing | tenant/org scoped where applicable |
| `dos.config_audit_log` | business data / API backing | tenant/org scoped where applicable |
| `dos.config_health_checks` | business data / API backing | tenant/org scoped where applicable |
| `dos.feature_flags` | business data / API backing | tenant/org scoped where applicable |
| `dos.tenant_config` | business data / API backing | tenant/org scoped where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | component file | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `config-center.resolve` | `/admin/config-center/resolve` | Resolution | حل الإعدادات | `ConfigResolutionComponent` | `platform/config-center/config-resolution.component.ts` | `GET /api/config-center/resolve` | `dos.config_values, dos.config_profiles` | `platform.config.read` | `VERIFY` |
| 2 | `config-center.settings` | `/admin/config-center/settings` | Settings | الإعدادات | `ConfigSettingsComponent` | `platform/config-center/config-settings.component.ts` | `GET /api/config-center/settings` | `dos.runtime_settings` | `platform.config.read` | `VERIFY` |
| 3 | `config-center.workspace` | `/admin/config-center/workspace` | Workspace | مساحة العمل | `ConfigWorkspaceComponent` | `platform/config-center/config-workspace.component.ts` | `GET /api/config-center/gateway/workspace-config` | `dos.workspace_config, dos.tenant_config` | `platform.config.read` | `VERIFY` |
| 4 | `config-center.gateway` | `/admin/config-center/gateway` | Gateway | البوابة | `ConfigGatewayComponent` | `platform/config-center/config-gateway.component.ts` | `GET /api/config-center/gateway` | `dos.gateway_config` | `platform.config.read` | `VERIFY` |
| 5 | `config-center.audit` | `/admin/config-center/audit` | Audit | التدقيق | `ConfigAuditComponent` | `platform/config-center/config-audit.component.ts` | `GET /api/config-center/audit` | `dos.config_audit_log` | `platform.config.read` | `VERIFY` |
| 6 | `config-center.health` | `/admin/config-center/health` | Health | الصحة | `ConfigHealthComponent` | `platform/config-center/config-health.component.ts` | `GET /api/config-center/health` | `dos.config_health_checks` | `platform.config.read` | `VERIFY` |
| 7 | `config-center.compare` | `/admin/config-center/compare` | Compare | المقارنة | `ConfigCompareComponent` | `platform/config-center/config-compare.component.ts` | `GET /api/config-center/compare` | `dos.config_values` | `platform.config.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

> Verify column names before running. This is a direct seed plan, not blind SQL execution.

```sql
BEGIN;

-- 1) module_registry
-- UPSERT config-center into dos.module_registry

-- 2) navigation_registry
-- UPSERT parent and child rows above into dos.navigation_registry

-- 3) dynamic_ui_routes / dynamic_ui_component_registry
-- UPSERT only if Dynamic UI runtime is used and carbon_key is verified

-- 4) permissions
-- UPSERT permissions above into platform_dauth.permissions

-- 5) role bindings
-- UPSERT role → permission bindings above

-- 6) tenant provisioning
-- UPSERT tenant_product_activation and tenant_module_entitlements for selected tenant

COMMIT;
```

## 7. Validation checklist

- [ ] module_registry row exists
- [ ] navigation parent row exists
- [ ] all navigation child rows exist
- [ ] Angular routes exist
- [ ] component files exist
- [ ] APIs exist
- [ ] backend routes exist
- [ ] DB tables/queries exist
- [ ] permissions exist
- [ ] role bindings exist
- [ ] tenant entitlement exists
- [ ] org/tenant scope enforced
- [ ] OpenFGA/DAuth tuples exist if required
- [ ] no mock/static data
- [ ] build passes

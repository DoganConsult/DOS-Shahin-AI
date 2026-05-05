# Other Modules Complete Direct Seed Pack

# Action Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `action` |
| product_key | `shahin-ai` |
| route_base | `/action` |
| owner_service | `workflow-service / action-service` |
| module_status | `active_after_validation` |
| module_name_en | `Action` |
| module_name_ar | `Action` |
| category | `workflow` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `action` | `shahin-ai` | `Action` | `workflow` | `active` | `workflow-service / action-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `action` | `action` | `/action` | `Action` | `Action` | `action.read` | 10 |
| `action.home` | `action` | `/action/home` | Home | الرئيسية | `action.read` | 10 |
| `action.tasks` | `action` | `/action/tasks` | Tasks | المهام | `action.read` | 20 |
| `action.approvals` | `action` | `/action/approvals` | Approvals | الموافقات | `action.approve` | 30 |
| `action.audit` | `action` | `/action/audit` | Audit | التدقيق | `action.audit.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `action.home.page` | `/action/home` | `action` | `action.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `action.tasks.page` | `/action/tasks` | `action` | `action.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `action.approvals.page` | `/action/approvals` | `action` | `action.approve` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `action.audit.page` | `/action/audit` | `action` | `action.audit.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `action.admin` | action admin |
| `action.approve` | action approve |
| `action.audit.read` | action audit read |
| `action.read` | action read |
| `action.write` | action write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `action.*` |
| `action_admin` | `action.read`, `action.write`, `action.admin` |
| `action_operator` | read/write operational permissions |
| `action_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + action + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.action_items` | page data / API backing | `tenant_id` required where applicable |
| `dos.approval_requests` | page data / API backing | `tenant_id` required where applicable |
| `dos.audit_trail` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `action.home` | `/action/home` | Home | الرئيسية | `ActionHomeComponent` | `GET /api/actions/overview` | `dos.action_items` | `action.read` | `VERIFY` |
| 2 | `action.tasks` | `/action/tasks` | Tasks | المهام | `ActionTasksComponent` | `GET /api/actions/tasks` | `dos.action_items` | `action.read` | `VERIFY` |
| 3 | `action.approvals` | `/action/approvals` | Approvals | الموافقات | `ActionApprovalsComponent` | `GET /api/actions/approvals` | `dos.approval_requests` | `action.approve` | `VERIFY` |
| 4 | `action.audit` | `/action/audit` | Audit | التدقيق | `ActionAuditComponent` | `GET /api/actions/audit` | `dos.audit_trail` | `action.audit.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT action into dos.module_registry
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


---

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


---

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


---

# Analytics Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `analytics` |
| product_key | `shahin-ai` |
| route_base | `/analytics` |
| owner_service | `analytics-service` |
| module_status | `active_after_validation` |
| module_name_en | `Analytics` |
| module_name_ar | `Analytics` |
| category | `insights` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `analytics` | `shahin-ai` | `Analytics` | `insights` | `active` | `analytics-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `analytics` | `analytics` | `/analytics` | `Analytics` | `Analytics` | `analytics.read` | 10 |
| `analytics.overview` | `analytics` | `/analytics/overview` | Overview | نظرة عامة | `analytics.read` | 10 |
| `analytics.dashboards` | `analytics` | `/analytics/dashboards` | Dashboards | لوحات المعلومات | `analytics.read` | 20 |
| `analytics.reports` | `analytics` | `/analytics/reports` | Reports | التقارير | `analytics.report.read` | 30 |
| `analytics.exports` | `analytics` | `/analytics/exports` | Exports | الصادرات | `analytics.export` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `analytics.overview.page` | `/analytics/overview` | `analytics` | `analytics.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `analytics.dashboards.page` | `/analytics/dashboards` | `analytics` | `analytics.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `analytics.reports.page` | `/analytics/reports` | `analytics` | `analytics.report.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `analytics.exports.page` | `/analytics/exports` | `analytics` | `analytics.export` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `analytics.admin` | analytics admin |
| `analytics.export` | analytics export |
| `analytics.read` | analytics read |
| `analytics.report.read` | analytics report read |
| `analytics.write` | analytics write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `analytics.*` |
| `analytics_admin` | `analytics.read`, `analytics.write`, `analytics.admin` |
| `analytics_operator` | read/write operational permissions |
| `analytics_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + analytics + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.analytics_dashboards` | page data / API backing | `tenant_id` required where applicable |
| `dos.analytics_exports` | page data / API backing | `tenant_id` required where applicable |
| `dos.analytics_reports` | page data / API backing | `tenant_id` required where applicable |
| `dos.analytics_snapshots` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `analytics.overview` | `/analytics/overview` | Overview | نظرة عامة | `AnalyticsOverviewComponent` | `GET /api/analytics/overview` | `dos.analytics_snapshots` | `analytics.read` | `VERIFY` |
| 2 | `analytics.dashboards` | `/analytics/dashboards` | Dashboards | لوحات المعلومات | `AnalyticsDashboardsComponent` | `GET /api/analytics/dashboards` | `dos.analytics_dashboards` | `analytics.read` | `VERIFY` |
| 3 | `analytics.reports` | `/analytics/reports` | Reports | التقارير | `AnalyticsReportsComponent` | `GET /api/analytics/reports` | `dos.analytics_reports` | `analytics.report.read` | `VERIFY` |
| 4 | `analytics.exports` | `/analytics/exports` | Exports | الصادرات | `AnalyticsExportsComponent` | `GET /api/analytics/exports` | `dos.analytics_exports` | `analytics.export` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT analytics into dos.module_registry
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


---

# Asset Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `asset` |
| product_key | `shahin-ai` |
| route_base | `/asset` |
| owner_service | `asset-service` |
| module_status | `active_after_validation` |
| module_name_en | `Asset` |
| module_name_ar | `Asset` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `asset` | `shahin-ai` | `Asset` | `grc-core` | `active` | `asset-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `asset` | `asset` | `/asset` | `Asset` | `Asset` | `asset.read` | 10 |
| `asset.overview` | `asset` | `/asset/overview` | Overview | نظرة عامة | `asset.read` | 10 |
| `asset.inventory` | `asset` | `/asset/inventory` | Inventory | المخزون | `asset.read` | 20 |
| `asset.owners` | `asset` | `/asset/owners` | Owners | الملاك | `asset.read` | 30 |
| `asset.risk` | `asset` | `/asset/risk` | Asset Risk | مخاطر الأصول | `asset.risk.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `asset.overview.page` | `/asset/overview` | `asset` | `asset.read` | `ibm-carbon` | `grid` | `approved` |
| `asset.inventory.page` | `/asset/inventory` | `asset` | `asset.read` | `ibm-carbon` | `table` | `approved` |
| `asset.owners.page` | `/asset/owners` | `asset` | `asset.read` | `ibm-carbon` | `structured-list` | `approved` |
| `asset.risk.page` | `/asset/risk` | `asset` | `asset.risk.read` | `ibm-carbon` | `grid` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `asset.admin` | asset admin |
| `asset.read` | asset read |
| `asset.risk.read` | asset risk read |
| `asset.write` | asset write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `asset.*` |
| `asset_admin` | `asset.read`, `asset.write`, `asset.admin` |
| `asset_operator` | read/write operational permissions |
| `asset_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + asset + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.asset_owners` | page data / API backing | `tenant_id` required where applicable |
| `dos.asset_risk_scores` | page data / API backing | `tenant_id` required where applicable |
| `dos.assets` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `asset.overview` | `/asset/overview` | Overview | نظرة عامة | `AssetOverviewComponent` | `GET /api/assets/overview` | `dos.assets` | `asset.read` | `VERIFY` |
| 2 | `asset.inventory` | `/asset/inventory` | Inventory | المخزون | `AssetInventoryComponent` | `GET /api/assets` | `dos.assets` | `asset.read` | `VERIFY` |
| 3 | `asset.owners` | `/asset/owners` | Owners | الملاك | `AssetOwnersComponent` | `GET /api/assets/owners` | `dos.asset_owners` | `asset.read` | `VERIFY` |
| 4 | `asset.risk` | `/asset/risk` | Asset Risk | مخاطر الأصول | `AssetRiskComponent` | `GET /api/assets/risk` | `dos.asset_risk_scores` | `asset.risk.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT asset into dos.module_registry
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


---

# Attestation Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `attestation` |
| product_key | `shahin-ai` |
| route_base | `/attestation` |
| owner_service | `compliance-controls-service` |
| module_status | `active_after_validation` |
| module_name_en | `Attestation` |
| module_name_ar | `Attestation` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `attestation` | `shahin-ai` | `Attestation` | `grc-core` | `active` | `compliance-controls-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `attestation` | `attestation` | `/attestation` | `Attestation` | `Attestation` | `attestation.read` | 10 |
| `attestation.overview` | `attestation` | `/attestation/overview` | Overview | نظرة عامة | `attestation.read` | 10 |
| `attestation.campaigns` | `attestation` | `/attestation/campaigns` | Campaigns | الحملات | `attestation.read` | 20 |
| `attestation.responses` | `attestation` | `/attestation/responses` | Responses | الردود | `attestation.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `attestation.overview.page` | `/attestation/overview` | `attestation` | `attestation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `attestation.campaigns.page` | `/attestation/campaigns` | `attestation` | `attestation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `attestation.responses.page` | `/attestation/responses` | `attestation` | `attestation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `attestation.admin` | attestation admin |
| `attestation.read` | attestation read |
| `attestation.write` | attestation write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `attestation.*` |
| `attestation_admin` | `attestation.read`, `attestation.write`, `attestation.admin` |
| `attestation_operator` | read/write operational permissions |
| `attestation_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + attestation + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.attestation_campaigns` | page data / API backing | `tenant_id` required where applicable |
| `dos.attestation_responses` | page data / API backing | `tenant_id` required where applicable |
| `dos.attestations` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `attestation.overview` | `/attestation/overview` | Overview | نظرة عامة | `AttestationOverviewComponent` | `GET /api/attestations/overview` | `dos.attestations` | `attestation.read` | `VERIFY` |
| 2 | `attestation.campaigns` | `/attestation/campaigns` | Campaigns | الحملات | `AttestationCampaignsComponent` | `GET /api/attestations/campaigns` | `dos.attestation_campaigns` | `attestation.read` | `VERIFY` |
| 3 | `attestation.responses` | `/attestation/responses` | Responses | الردود | `AttestationResponsesComponent` | `GET /api/attestations/responses` | `dos.attestation_responses` | `attestation.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT attestation into dos.module_registry
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


---

# Audit Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `audit` |
| product_key | `shahin-ai` |
| route_base | `/audit` |
| owner_service | `audit-service / evidence-audit-reporting-service` |
| module_status | `active_after_validation` |
| module_name_en | `Audit` |
| module_name_ar | `Audit` |
| category | `audit` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `audit` | `shahin-ai` | `Audit` | `audit` | `active` | `audit-service / evidence-audit-reporting-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `audit` | `audit` | `/audit` | `Audit` | `Audit` | `audit.read` | 10 |
| `audit.overview` | `audit` | `/audit/overview` | Overview | نظرة عامة | `audit.read` | 10 |
| `audit.trail` | `audit` | `/audit/trail` | Audit Trail | سجل التدقيق | `audit.read` | 20 |
| `audit.events` | `audit` | `/audit/events` | Events | الأحداث | `audit.events.read` | 30 |
| `audit.reports` | `audit` | `/audit/reports` | Reports | التقارير | `audit.report.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `audit.overview.page` | `/audit/overview` | `audit` | `audit.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `audit.trail.page` | `/audit/trail` | `audit` | `audit.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `audit.events.page` | `/audit/events` | `audit` | `audit.events.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `audit.reports.page` | `/audit/reports` | `audit` | `audit.report.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `audit.admin` | audit admin |
| `audit.events.read` | audit events read |
| `audit.read` | audit read |
| `audit.report.read` | audit report read |
| `audit.write` | audit write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `audit.*` |
| `audit_admin` | `audit.read`, `audit.write`, `audit.admin` |
| `audit_operator` | read/write operational permissions |
| `audit_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + audit + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.audit_reports` | page data / API backing | `tenant_id` required where applicable |
| `dos.audit_trail` | page data / API backing | `tenant_id` required where applicable |
| `dos.security_events` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `audit.overview` | `/audit/overview` | Overview | نظرة عامة | `AuditOverviewComponent` | `GET /api/audit/overview` | `dos.audit_trail` | `audit.read` | `VERIFY` |
| 2 | `audit.trail` | `/audit/trail` | Audit Trail | سجل التدقيق | `AuditTrailComponent` | `GET /api/audit/trail` | `dos.audit_trail` | `audit.read` | `VERIFY` |
| 3 | `audit.events` | `/audit/events` | Events | الأحداث | `AuditEventsComponent` | `GET /api/audit/events` | `dos.security_events` | `audit.events.read` | `VERIFY` |
| 4 | `audit.reports` | `/audit/reports` | Reports | التقارير | `AuditReportsComponent` | `GET /api/audit/reports` | `dos.audit_reports` | `audit.report.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT audit into dos.module_registry
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


---

# BCP Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `bcp` |
| product_key | `shahin-ai` |
| route_base | `/bcp` |
| owner_service | `bcp-service` |
| module_status | `active_after_validation` |
| module_name_en | `BCP` |
| module_name_ar | `BCP` |
| category | `resilience` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `bcp` | `shahin-ai` | `BCP` | `resilience` | `active` | `bcp-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `bcp` | `bcp` | `/bcp` | `BCP` | `BCP` | `bcp.read` | 10 |
| `bcp.overview` | `bcp` | `/bcp/overview` | Overview | نظرة عامة | `bcp.read` | 10 |
| `bcp.plans` | `bcp` | `/bcp/plans` | Plans | الخطط | `bcp.read` | 20 |
| `bcp.tests` | `bcp` | `/bcp/tests` | Tests | الاختبارات | `bcp.test.read` | 30 |
| `bcp.incidents` | `bcp` | `/bcp/incidents` | Incidents | الحوادث | `bcp.incident.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `bcp.overview.page` | `/bcp/overview` | `bcp` | `bcp.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `bcp.plans.page` | `/bcp/plans` | `bcp` | `bcp.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `bcp.tests.page` | `/bcp/tests` | `bcp` | `bcp.test.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `bcp.incidents.page` | `/bcp/incidents` | `bcp` | `bcp.incident.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `bcp.admin` | bcp admin |
| `bcp.incident.read` | bcp incident read |
| `bcp.read` | bcp read |
| `bcp.test.read` | bcp test read |
| `bcp.write` | bcp write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `bcp.*` |
| `bcp_admin` | `bcp.read`, `bcp.write`, `bcp.admin` |
| `bcp_operator` | read/write operational permissions |
| `bcp_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + bcp + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.bcp_incidents` | page data / API backing | `tenant_id` required where applicable |
| `dos.bcp_plans` | page data / API backing | `tenant_id` required where applicable |
| `dos.bcp_tests` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `bcp.overview` | `/bcp/overview` | Overview | نظرة عامة | `BcpOverviewComponent` | `GET /api/bcp/overview` | `dos.bcp_plans` | `bcp.read` | `VERIFY` |
| 2 | `bcp.plans` | `/bcp/plans` | Plans | الخطط | `BcpPlansComponent` | `GET /api/bcp/plans` | `dos.bcp_plans` | `bcp.read` | `VERIFY` |
| 3 | `bcp.tests` | `/bcp/tests` | Tests | الاختبارات | `BcpTestsComponent` | `GET /api/bcp/tests` | `dos.bcp_tests` | `bcp.test.read` | `VERIFY` |
| 4 | `bcp.incidents` | `/bcp/incidents` | Incidents | الحوادث | `BcpIncidentsComponent` | `GET /api/bcp/incidents` | `dos.bcp_incidents` | `bcp.incident.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT bcp into dos.module_registry
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


---

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


---

# DORA Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `dora` |
| product_key | `shahin-ai` |
| route_base | `/dora` |
| owner_service | `dora-service` |
| module_status | `active_after_validation` |
| module_name_en | `DORA` |
| module_name_ar | `DORA` |
| category | `regulatory` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `dora` | `shahin-ai` | `DORA` | `regulatory` | `active` | `dora-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `dora` | `dora` | `/dora` | `DORA` | `DORA` | `dora.read` | 10 |
| `dora.overview` | `dora` | `/dora/overview` | Overview | نظرة عامة | `dora.read` | 10 |
| `dora.ict-risk` | `dora` | `/dora/ict-risk` | ICT Risk | مخاطر تقنية المعلومات | `dora.risk.read` | 20 |
| `dora.incidents` | `dora` | `/dora/incidents` | Incidents | الحوادث | `dora.incident.read` | 30 |
| `dora.reports` | `dora` | `/dora/reports` | Reports | التقارير | `dora.report.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `dora.overview.page` | `/dora/overview` | `dora` | `dora.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dora.ict-risk.page` | `/dora/ict-risk` | `dora` | `dora.risk.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dora.incidents.page` | `/dora/incidents` | `dora` | `dora.incident.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dora.reports.page` | `/dora/reports` | `dora` | `dora.report.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `dora.admin` | dora admin |
| `dora.incident.read` | dora incident read |
| `dora.read` | dora read |
| `dora.report.read` | dora report read |
| `dora.risk.read` | dora risk read |
| `dora.write` | dora write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `dora.*` |
| `dora_admin` | `dora.read`, `dora.write`, `dora.admin` |
| `dora_operator` | read/write operational permissions |
| `dora_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + dora + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.dora_ict_risks` | page data / API backing | `tenant_id` required where applicable |
| `dos.dora_incidents` | page data / API backing | `tenant_id` required where applicable |
| `dos.dora_register` | page data / API backing | `tenant_id` required where applicable |
| `dos.dora_reports` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `dora.overview` | `/dora/overview` | Overview | نظرة عامة | `DoraOverviewComponent` | `GET /api/dora/overview` | `dos.dora_register` | `dora.read` | `VERIFY` |
| 2 | `dora.ict-risk` | `/dora/ict-risk` | ICT Risk | مخاطر تقنية المعلومات | `DoraIctRiskComponent` | `GET /api/dora/ict-risk` | `dos.dora_ict_risks` | `dora.risk.read` | `VERIFY` |
| 3 | `dora.incidents` | `/dora/incidents` | Incidents | الحوادث | `DoraIncidentsComponent` | `GET /api/dora/incidents` | `dos.dora_incidents` | `dora.incident.read` | `VERIFY` |
| 4 | `dora.reports` | `/dora/reports` | Reports | التقارير | `DoraReportsComponent` | `GET /api/dora/reports` | `dos.dora_reports` | `dora.report.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT dora into dos.module_registry
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


---

# Dynamic UI Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `dynamic-ui` |
| product_key | `shahin-ai` |
| route_base | `/dynamic-ui` |
| owner_service | `ui-os-service` |
| module_status | `active_after_validation` |
| module_name_en | `Dynamic UI` |
| module_name_ar | `Dynamic UI` |
| category | `platform-ui` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `dynamic-ui` | `shahin-ai` | `Dynamic UI` | `platform-ui` | `active` | `ui-os-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `dynamic-ui` | `dynamic-ui` | `/dynamic-ui` | `Dynamic UI` | `Dynamic UI` | `dynamic-ui.read` | 10 |
| `dynamic-ui.overview` | `dynamic-ui` | `/dynamic-ui/overview` | Overview | نظرة عامة | `dynamic_ui.read` | 10 |
| `dynamic-ui.routes` | `dynamic-ui` | `/dynamic-ui/routes` | Routes | المسارات | `dynamic_ui.routes.read` | 20 |
| `dynamic-ui.components` | `dynamic-ui` | `/dynamic-ui/components` | Components | المكونات | `dynamic_ui.components.read` | 30 |
| `dynamic-ui.contracts` | `dynamic-ui` | `/dynamic-ui/contracts` | Contracts | العقود | `dynamic_ui.contracts.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `dynamic-ui.overview.page` | `/dynamic-ui/overview` | `dynamic-ui` | `dynamic_ui.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dynamic-ui.routes.page` | `/dynamic-ui/routes` | `dynamic-ui` | `dynamic_ui.routes.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dynamic-ui.components.page` | `/dynamic-ui/components` | `dynamic-ui` | `dynamic_ui.components.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `dynamic-ui.contracts.page` | `/dynamic-ui/contracts` | `dynamic-ui` | `dynamic_ui.contracts.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `dynamic-ui.admin` | dynamic-ui admin |
| `dynamic-ui.read` | dynamic-ui read |
| `dynamic-ui.write` | dynamic-ui write |
| `dynamic_ui.components.read` | dynamic_ui components read |
| `dynamic_ui.contracts.read` | dynamic_ui contracts read |
| `dynamic_ui.read` | dynamic_ui read |
| `dynamic_ui.routes.read` | dynamic_ui routes read |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `dynamic-ui.*` |
| `dynamic_ui_admin` | `dynamic-ui.read`, `dynamic-ui.write`, `dynamic-ui.admin` |
| `dynamic_ui_operator` | read/write operational permissions |
| `dynamic_ui_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + dynamic-ui + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.dynamic_ui_component_registry` | page data / API backing | `tenant_id` required where applicable |
| `dos.dynamic_ui_contracts` | page data / API backing | `tenant_id` required where applicable |
| `dos.dynamic_ui_routes` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `dynamic-ui.overview` | `/dynamic-ui/overview` | Overview | نظرة عامة | `DynamicUiOverviewComponent` | `GET /api/ui-os/overview` | `dos.dynamic_ui_routes` | `dynamic_ui.read` | `VERIFY` |
| 2 | `dynamic-ui.routes` | `/dynamic-ui/routes` | Routes | المسارات | `DynamicUiRoutesComponent` | `GET /api/ui-os/routes` | `dos.dynamic_ui_routes` | `dynamic_ui.routes.read` | `VERIFY` |
| 3 | `dynamic-ui.components` | `/dynamic-ui/components` | Components | المكونات | `DynamicUiComponentsComponent` | `GET /api/ui-os/components` | `dos.dynamic_ui_component_registry` | `dynamic_ui.components.read` | `VERIFY` |
| 4 | `dynamic-ui.contracts` | `/dynamic-ui/contracts` | Contracts | العقود | `DynamicUiContractsComponent` | `GET /api/ui-os/contracts` | `dos.dynamic_ui_contracts` | `dynamic_ui.contracts.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT dynamic-ui into dos.module_registry
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


---

# Evidence Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `evidence` |
| product_key | `shahin-ai` |
| route_base | `/evidence` |
| owner_service | `evidence-audit-reporting-service` |
| module_status | `active_after_validation` |
| module_name_en | `Evidence` |
| module_name_ar | `Evidence` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `evidence` | `shahin-ai` | `Evidence` | `grc-core` | `active` | `evidence-audit-reporting-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `evidence` | `evidence` | `/evidence` | `Evidence` | `Evidence` | `evidence.read` | 10 |
| `evidence.overview` | `evidence` | `/evidence/overview` | Overview | نظرة عامة | `evidence.read` | 10 |
| `evidence.library` | `evidence` | `/evidence/library` | Library | المكتبة | `evidence.read` | 20 |
| `evidence.requests` | `evidence` | `/evidence/requests` | Requests | الطلبات | `evidence.request.read` | 30 |
| `evidence.reports` | `evidence` | `/evidence/reports` | Reports | التقارير | `evidence.report.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `evidence.overview.page` | `/evidence/overview` | `evidence` | `evidence.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `evidence.library.page` | `/evidence/library` | `evidence` | `evidence.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `evidence.requests.page` | `/evidence/requests` | `evidence` | `evidence.request.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `evidence.reports.page` | `/evidence/reports` | `evidence` | `evidence.report.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `evidence.admin` | evidence admin |
| `evidence.read` | evidence read |
| `evidence.report.read` | evidence report read |
| `evidence.request.read` | evidence request read |
| `evidence.write` | evidence write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `evidence.*` |
| `evidence_admin` | `evidence.read`, `evidence.write`, `evidence.admin` |
| `evidence_operator` | read/write operational permissions |
| `evidence_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + evidence + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.evidence_items` | page data / API backing | `tenant_id` required where applicable |
| `dos.evidence_reports` | page data / API backing | `tenant_id` required where applicable |
| `dos.evidence_requests` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `evidence.overview` | `/evidence/overview` | Overview | نظرة عامة | `EvidenceOverviewComponent` | `GET /api/evidence/overview` | `dos.evidence_items` | `evidence.read` | `VERIFY` |
| 2 | `evidence.library` | `/evidence/library` | Library | المكتبة | `EvidenceLibraryComponent` | `GET /api/evidence` | `dos.evidence_items` | `evidence.read` | `VERIFY` |
| 3 | `evidence.requests` | `/evidence/requests` | Requests | الطلبات | `EvidenceRequestsComponent` | `GET /api/evidence/requests` | `dos.evidence_requests` | `evidence.request.read` | `VERIFY` |
| 4 | `evidence.reports` | `/evidence/reports` | Reports | التقارير | `EvidenceReportsComponent` | `GET /api/evidence/reports` | `dos.evidence_reports` | `evidence.report.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT evidence into dos.module_registry
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


---

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


---

# Incident Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `incident` |
| product_key | `shahin-ai` |
| route_base | `/incident` |
| owner_service | `risk-incident-service` |
| module_status | `active_after_validation` |
| module_name_en | `Incident` |
| module_name_ar | `Incident` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `incident` | `shahin-ai` | `Incident` | `grc-core` | `active` | `risk-incident-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `incident` | `incident` | `/incident` | `Incident` | `Incident` | `incident.read` | 10 |
| `incident.overview` | `incident` | `/incident/overview` | Overview | نظرة عامة | `incident.read` | 10 |
| `incident.register` | `incident` | `/incident/register` | Register | السجل | `incident.read` | 20 |
| `incident.response` | `incident` | `/incident/response` | Response | الاستجابة | `incident.response.read` | 30 |
| `incident.reports` | `incident` | `/incident/reports` | Reports | التقارير | `incident.report.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `incident.overview.page` | `/incident/overview` | `incident` | `incident.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `incident.register.page` | `/incident/register` | `incident` | `incident.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `incident.response.page` | `/incident/response` | `incident` | `incident.response.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `incident.reports.page` | `/incident/reports` | `incident` | `incident.report.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `incident.admin` | incident admin |
| `incident.read` | incident read |
| `incident.report.read` | incident report read |
| `incident.response.read` | incident response read |
| `incident.write` | incident write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `incident.*` |
| `incident_admin` | `incident.read`, `incident.write`, `incident.admin` |
| `incident_operator` | read/write operational permissions |
| `incident_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + incident + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.incident_reports` | page data / API backing | `tenant_id` required where applicable |
| `dos.incident_response_actions` | page data / API backing | `tenant_id` required where applicable |
| `dos.incidents` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `incident.overview` | `/incident/overview` | Overview | نظرة عامة | `IncidentOverviewComponent` | `GET /api/incidents/overview` | `dos.incidents` | `incident.read` | `VERIFY` |
| 2 | `incident.register` | `/incident/register` | Register | السجل | `IncidentRegisterComponent` | `GET /api/incidents` | `dos.incidents` | `incident.read` | `VERIFY` |
| 3 | `incident.response` | `/incident/response` | Response | الاستجابة | `IncidentResponseComponent` | `GET /api/incidents/response` | `dos.incident_response_actions` | `incident.response.read` | `VERIFY` |
| 4 | `incident.reports` | `/incident/reports` | Reports | التقارير | `IncidentReportsComponent` | `GET /api/incidents/reports` | `dos.incident_reports` | `incident.report.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT incident into dos.module_registry
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


---

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


---

# Knowledge Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `knowledge` |
| product_key | `shahin-ai` |
| route_base | `/knowledge` |
| owner_service | `knowledge-service` |
| module_status | `active_after_validation` |
| module_name_en | `Knowledge` |
| module_name_ar | `Knowledge` |
| category | `knowledge` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `knowledge` | `shahin-ai` | `Knowledge` | `knowledge` | `active` | `knowledge-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `knowledge` | `knowledge` | `/knowledge` | `Knowledge` | `Knowledge` | `knowledge.read` | 10 |
| `knowledge.overview` | `knowledge` | `/knowledge/overview` | Overview | نظرة عامة | `knowledge.read` | 10 |
| `knowledge.library` | `knowledge` | `/knowledge/library` | Library | المكتبة | `knowledge.read` | 20 |
| `knowledge.packs` | `knowledge` | `/knowledge/packs` | Content Packs | حزم المحتوى | `knowledge.packs.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `knowledge.overview.page` | `/knowledge/overview` | `knowledge` | `knowledge.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `knowledge.library.page` | `/knowledge/library` | `knowledge` | `knowledge.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `knowledge.packs.page` | `/knowledge/packs` | `knowledge` | `knowledge.packs.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `knowledge.admin` | knowledge admin |
| `knowledge.packs.read` | knowledge packs read |
| `knowledge.read` | knowledge read |
| `knowledge.write` | knowledge write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `knowledge.*` |
| `knowledge_admin` | `knowledge.read`, `knowledge.write`, `knowledge.admin` |
| `knowledge_operator` | read/write operational permissions |
| `knowledge_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + knowledge + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.content_packs` | page data / API backing | `tenant_id` required where applicable |
| `dos.knowledge_articles` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `knowledge.overview` | `/knowledge/overview` | Overview | نظرة عامة | `KnowledgeOverviewComponent` | `GET /api/knowledge/overview` | `dos.knowledge_articles` | `knowledge.read` | `VERIFY` |
| 2 | `knowledge.library` | `/knowledge/library` | Library | المكتبة | `KnowledgeLibraryComponent` | `GET /api/knowledge/articles` | `dos.knowledge_articles` | `knowledge.read` | `VERIFY` |
| 3 | `knowledge.packs` | `/knowledge/packs` | Content Packs | حزم المحتوى | `KnowledgePacksComponent` | `GET /api/knowledge/packs` | `dos.content_packs` | `knowledge.packs.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT knowledge into dos.module_registry
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


---

# KSA Regulatory Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `ksa-regulatory` |
| product_key | `shahin-ai` |
| route_base | `/ksa-regulatory` |
| owner_service | `regulatory-service` |
| module_status | `active_after_validation` |
| module_name_en | `KSA Regulatory` |
| module_name_ar | `KSA Regulatory` |
| category | `regulatory` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `ksa-regulatory` | `shahin-ai` | `KSA Regulatory` | `regulatory` | `active` | `regulatory-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `ksa-regulatory` | `ksa-regulatory` | `/ksa-regulatory` | `KSA Regulatory` | `KSA Regulatory` | `ksa-regulatory.read` | 10 |
| `ksa-regulatory.overview` | `ksa-regulatory` | `/ksa-regulatory/overview` | Overview | نظرة عامة | `ksa.read` | 10 |
| `ksa-regulatory.frameworks` | `ksa-regulatory` | `/ksa-regulatory/frameworks` | Frameworks | الأطر | `ksa.frameworks.read` | 20 |
| `ksa-regulatory.obligations` | `ksa-regulatory` | `/ksa-regulatory/obligations` | Obligations | الالتزامات | `ksa.obligations.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `ksa-regulatory.overview.page` | `/ksa-regulatory/overview` | `ksa-regulatory` | `ksa.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ksa-regulatory.frameworks.page` | `/ksa-regulatory/frameworks` | `ksa-regulatory` | `ksa.frameworks.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ksa-regulatory.obligations.page` | `/ksa-regulatory/obligations` | `ksa-regulatory` | `ksa.obligations.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `ksa-regulatory.admin` | ksa-regulatory admin |
| `ksa-regulatory.read` | ksa-regulatory read |
| `ksa-regulatory.write` | ksa-regulatory write |
| `ksa.frameworks.read` | ksa frameworks read |
| `ksa.obligations.read` | ksa obligations read |
| `ksa.read` | ksa read |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `ksa-regulatory.*` |
| `ksa_regulatory_admin` | `ksa-regulatory.read`, `ksa-regulatory.write`, `ksa-regulatory.admin` |
| `ksa_regulatory_operator` | read/write operational permissions |
| `ksa_regulatory_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + ksa-regulatory + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.ksa_frameworks` | page data / API backing | `tenant_id` required where applicable |
| `dos.ksa_obligations` | page data / API backing | `tenant_id` required where applicable |
| `dos.ksa_regulatory_requirements` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `ksa-regulatory.overview` | `/ksa-regulatory/overview` | Overview | نظرة عامة | `KsaRegulatoryOverviewComponent` | `GET /api/ksa-regulatory/overview` | `dos.ksa_regulatory_requirements` | `ksa.read` | `VERIFY` |
| 2 | `ksa-regulatory.frameworks` | `/ksa-regulatory/frameworks` | Frameworks | الأطر | `KsaRegulatoryFrameworksComponent` | `GET /api/ksa-regulatory/frameworks` | `dos.ksa_frameworks` | `ksa.frameworks.read` | `VERIFY` |
| 3 | `ksa-regulatory.obligations` | `/ksa-regulatory/obligations` | Obligations | الالتزامات | `KsaRegulatoryObligationsComponent` | `GET /api/ksa-regulatory/obligations` | `dos.ksa_obligations` | `ksa.obligations.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT ksa-regulatory into dos.module_registry
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


---

# MCP Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `mcp` |
| product_key | `shahin-ai` |
| route_base | `/mcp` |
| owner_service | `ai-engine-service / mcp-service` |
| module_status | `active_after_validation` |
| module_name_en | `MCP` |
| module_name_ar | `MCP` |
| category | `ai-integration` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `mcp` | `shahin-ai` | `MCP` | `ai-integration` | `active` | `ai-engine-service / mcp-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `mcp` | `mcp` | `/mcp` | `MCP` | `MCP` | `mcp.read` | 10 |
| `mcp.overview` | `mcp` | `/mcp/overview` | Overview | نظرة عامة | `mcp.read` | 10 |
| `mcp.servers` | `mcp` | `/mcp/servers` | Servers | الخوادم | `mcp.servers.read` | 20 |
| `mcp.tools` | `mcp` | `/mcp/tools` | Tools | الأدوات | `mcp.tools.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `mcp.overview.page` | `/mcp/overview` | `mcp` | `mcp.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `mcp.servers.page` | `/mcp/servers` | `mcp` | `mcp.servers.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `mcp.tools.page` | `/mcp/tools` | `mcp` | `mcp.tools.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `mcp.admin` | mcp admin |
| `mcp.read` | mcp read |
| `mcp.servers.read` | mcp servers read |
| `mcp.tools.read` | mcp tools read |
| `mcp.write` | mcp write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `mcp.*` |
| `mcp_admin` | `mcp.read`, `mcp.write`, `mcp.admin` |
| `mcp_operator` | read/write operational permissions |
| `mcp_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + mcp + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.mcp_servers` | page data / API backing | `tenant_id` required where applicable |
| `dos.mcp_tools` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `mcp.overview` | `/mcp/overview` | Overview | نظرة عامة | `McpOverviewComponent` | `GET /api/mcp/overview` | `dos.mcp_servers` | `mcp.read` | `VERIFY` |
| 2 | `mcp.servers` | `/mcp/servers` | Servers | الخوادم | `McpServersComponent` | `GET /api/mcp/servers` | `dos.mcp_servers` | `mcp.servers.read` | `VERIFY` |
| 3 | `mcp.tools` | `/mcp/tools` | Tools | الأدوات | `McpToolsComponent` | `GET /api/mcp/tools` | `dos.mcp_tools` | `mcp.tools.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT mcp into dos.module_registry
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


---

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


---

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


---

# Policy Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `policy` |
| product_key | `shahin-ai` |
| route_base | `/policy` |
| owner_service | `governance-policy-service` |
| module_status | `active_after_validation` |
| module_name_en | `Policy` |
| module_name_ar | `Policy` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `policy` | `shahin-ai` | `Policy` | `grc-core` | `active` | `governance-policy-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `policy` | `policy` | `/policy` | `Policy` | `Policy` | `policy.read` | 10 |
| `policy.overview` | `policy` | `/policy/overview` | Overview | نظرة عامة | `policy.read` | 10 |
| `policy.library` | `policy` | `/policy/library` | Policy Library | مكتبة السياسات | `policy.read` | 20 |
| `policy.approvals` | `policy` | `/policy/approvals` | Approvals | الموافقات | `policy.approve` | 30 |
| `policy.attestations` | `policy` | `/policy/attestations` | Attestations | الإقرارات | `policy.attestation.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `policy.overview.page` | `/policy/overview` | `policy` | `policy.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `policy.library.page` | `/policy/library` | `policy` | `policy.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `policy.approvals.page` | `/policy/approvals` | `policy` | `policy.approve` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `policy.attestations.page` | `/policy/attestations` | `policy` | `policy.attestation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `policy.admin` | policy admin |
| `policy.approve` | policy approve |
| `policy.attestation.read` | policy attestation read |
| `policy.read` | policy read |
| `policy.write` | policy write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `policy.*` |
| `policy_admin` | `policy.read`, `policy.write`, `policy.admin` |
| `policy_operator` | read/write operational permissions |
| `policy_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + policy + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.policies` | page data / API backing | `tenant_id` required where applicable |
| `dos.policy_approvals` | page data / API backing | `tenant_id` required where applicable |
| `dos.policy_attestations` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `policy.overview` | `/policy/overview` | Overview | نظرة عامة | `PolicyOverviewComponent` | `GET /api/policies/overview` | `dos.policies` | `policy.read` | `VERIFY` |
| 2 | `policy.library` | `/policy/library` | Policy Library | مكتبة السياسات | `PolicyLibraryComponent` | `GET /api/policies` | `dos.policies` | `policy.read` | `VERIFY` |
| 3 | `policy.approvals` | `/policy/approvals` | Approvals | الموافقات | `PolicyApprovalsComponent` | `GET /api/policies/approvals` | `dos.policy_approvals` | `policy.approve` | `VERIFY` |
| 4 | `policy.attestations` | `/policy/attestations` | Attestations | الإقرارات | `PolicyAttestationsComponent` | `GET /api/policies/attestations` | `dos.policy_attestations` | `policy.attestation.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT policy into dos.module_registry
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


---

# Privacy Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `privacy` |
| product_key | `shahin-ai` |
| route_base | `/privacy` |
| owner_service | `privacy-service` |
| module_status | `active_after_validation` |
| module_name_en | `Privacy` |
| module_name_ar | `Privacy` |
| category | `privacy` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `privacy` | `shahin-ai` | `Privacy` | `privacy` | `active` | `privacy-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `privacy` | `privacy` | `/privacy` | `Privacy` | `Privacy` | `privacy.read` | 10 |
| `privacy.overview` | `privacy` | `/privacy/overview` | Overview | نظرة عامة | `privacy.read` | 10 |
| `privacy.ropa` | `privacy` | `/privacy/ropa` | RoPA | سجل أنشطة المعالجة | `privacy.ropa.read` | 20 |
| `privacy.dpia` | `privacy` | `/privacy/dpia` | DPIA | تقييم أثر الخصوصية | `privacy.dpia.read` | 30 |
| `privacy.requests` | `privacy` | `/privacy/requests` | Requests | الطلبات | `privacy.requests.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `privacy.overview.page` | `/privacy/overview` | `privacy` | `privacy.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `privacy.ropa.page` | `/privacy/ropa` | `privacy` | `privacy.ropa.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `privacy.dpia.page` | `/privacy/dpia` | `privacy` | `privacy.dpia.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `privacy.requests.page` | `/privacy/requests` | `privacy` | `privacy.requests.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `privacy.admin` | privacy admin |
| `privacy.dpia.read` | privacy dpia read |
| `privacy.read` | privacy read |
| `privacy.requests.read` | privacy requests read |
| `privacy.ropa.read` | privacy ropa read |
| `privacy.write` | privacy write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `privacy.*` |
| `privacy_admin` | `privacy.read`, `privacy.write`, `privacy.admin` |
| `privacy_operator` | read/write operational permissions |
| `privacy_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + privacy + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.privacy_assessments` | page data / API backing | `tenant_id` required where applicable |
| `dos.privacy_requests` | page data / API backing | `tenant_id` required where applicable |
| `dos.privacy_ropa` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `privacy.overview` | `/privacy/overview` | Overview | نظرة عامة | `PrivacyOverviewComponent` | `GET /api/privacy/overview` | `dos.privacy_assessments` | `privacy.read` | `VERIFY` |
| 2 | `privacy.ropa` | `/privacy/ropa` | RoPA | سجل أنشطة المعالجة | `PrivacyRopaComponent` | `GET /api/privacy/ropa` | `dos.privacy_ropa` | `privacy.ropa.read` | `VERIFY` |
| 3 | `privacy.dpia` | `/privacy/dpia` | DPIA | تقييم أثر الخصوصية | `PrivacyDpiaComponent` | `GET /api/privacy/dpia` | `dos.privacy_assessments` | `privacy.dpia.read` | `VERIFY` |
| 4 | `privacy.requests` | `/privacy/requests` | Requests | الطلبات | `PrivacyRequestsComponent` | `GET /api/privacy/requests` | `dos.privacy_requests` | `privacy.requests.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT privacy into dos.module_registry
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


---

# Qiyas Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `qiyas` |
| product_key | `shahin-ai` |
| route_base | `/qiyas` |
| owner_service | `regulatory-service / qiyas-service` |
| module_status | `active_after_validation` |
| module_name_en | `Qiyas` |
| module_name_ar | `Qiyas` |
| category | `regulatory` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `qiyas` | `shahin-ai` | `Qiyas` | `regulatory` | `active` | `regulatory-service / qiyas-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `qiyas` | `qiyas` | `/qiyas` | `Qiyas` | `Qiyas` | `qiyas.read` | 10 |
| `qiyas.overview` | `qiyas` | `/qiyas/overview` | Overview | نظرة عامة | `qiyas.read` | 10 |
| `qiyas.requirements` | `qiyas` | `/qiyas/requirements` | Requirements | المتطلبات | `qiyas.requirements.read` | 20 |
| `qiyas.assessments` | `qiyas` | `/qiyas/assessments` | Assessments | التقييمات | `qiyas.assessments.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `qiyas.overview.page` | `/qiyas/overview` | `qiyas` | `qiyas.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `qiyas.requirements.page` | `/qiyas/requirements` | `qiyas` | `qiyas.requirements.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `qiyas.assessments.page` | `/qiyas/assessments` | `qiyas` | `qiyas.assessments.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `qiyas.admin` | qiyas admin |
| `qiyas.assessments.read` | qiyas assessments read |
| `qiyas.read` | qiyas read |
| `qiyas.requirements.read` | qiyas requirements read |
| `qiyas.write` | qiyas write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `qiyas.*` |
| `qiyas_admin` | `qiyas.read`, `qiyas.write`, `qiyas.admin` |
| `qiyas_operator` | read/write operational permissions |
| `qiyas_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + qiyas + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.qiyas_assessments` | page data / API backing | `tenant_id` required where applicable |
| `dos.qiyas_requirements` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `qiyas.overview` | `/qiyas/overview` | Overview | نظرة عامة | `QiyasOverviewComponent` | `GET /api/qiyas/overview` | `dos.qiyas_requirements` | `qiyas.read` | `VERIFY` |
| 2 | `qiyas.requirements` | `/qiyas/requirements` | Requirements | المتطلبات | `QiyasRequirementsComponent` | `GET /api/qiyas/requirements` | `dos.qiyas_requirements` | `qiyas.requirements.read` | `VERIFY` |
| 3 | `qiyas.assessments` | `/qiyas/assessments` | Assessments | التقييمات | `QiyasAssessmentsComponent` | `GET /api/qiyas/assessments` | `dos.qiyas_assessments` | `qiyas.assessments.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT qiyas into dos.module_registry
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


---

# Remediation Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `remediation` |
| product_key | `shahin-ai` |
| route_base | `/remediation` |
| owner_service | `remediation-service` |
| module_status | `active_after_validation` |
| module_name_en | `Remediation` |
| module_name_ar | `Remediation` |
| category | `work` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `remediation` | `shahin-ai` | `Remediation` | `work` | `active` | `remediation-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `remediation` | `remediation` | `/remediation` | `Remediation` | `Remediation` | `remediation.read` | 10 |
| `remediation.overview` | `remediation` | `/remediation/overview` | Overview | نظرة عامة | `remediation.read` | 10 |
| `remediation.plans` | `remediation` | `/remediation/plans` | Plans | الخطط | `remediation.read` | 20 |
| `remediation.actions` | `remediation` | `/remediation/actions` | Actions | الإجراءات | `remediation.action.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `remediation.overview.page` | `/remediation/overview` | `remediation` | `remediation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `remediation.plans.page` | `/remediation/plans` | `remediation` | `remediation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `remediation.actions.page` | `/remediation/actions` | `remediation` | `remediation.action.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `remediation.action.read` | remediation action read |
| `remediation.admin` | remediation admin |
| `remediation.read` | remediation read |
| `remediation.write` | remediation write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `remediation.*` |
| `remediation_admin` | `remediation.read`, `remediation.write`, `remediation.admin` |
| `remediation_operator` | read/write operational permissions |
| `remediation_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + remediation + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.remediation_actions` | page data / API backing | `tenant_id` required where applicable |
| `dos.remediation_plans` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `remediation.overview` | `/remediation/overview` | Overview | نظرة عامة | `RemediationOverviewComponent` | `GET /api/remediation/overview` | `dos.remediation_plans` | `remediation.read` | `VERIFY` |
| 2 | `remediation.plans` | `/remediation/plans` | Plans | الخطط | `RemediationPlansComponent` | `GET /api/remediation/plans` | `dos.remediation_plans` | `remediation.read` | `VERIFY` |
| 3 | `remediation.actions` | `/remediation/actions` | Actions | الإجراءات | `RemediationActionsComponent` | `GET /api/remediation/actions` | `dos.remediation_actions` | `remediation.action.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT remediation into dos.module_registry
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


---

# Reporting Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `reporting` |
| product_key | `shahin-ai` |
| route_base | `/reporting` |
| owner_service | `analytics-reporting-service` |
| module_status | `active_after_validation` |
| module_name_en | `Reporting` |
| module_name_ar | `Reporting` |
| category | `reporting` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `reporting` | `shahin-ai` | `Reporting` | `reporting` | `active` | `analytics-reporting-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `reporting` | `reporting` | `/reporting` | `Reporting` | `Reporting` | `reporting.read` | 10 |
| `reporting.overview` | `reporting` | `/reporting/overview` | Overview | نظرة عامة | `reporting.read` | 10 |
| `reporting.reports` | `reporting` | `/reporting/reports` | Reports | التقارير | `reporting.read` | 20 |
| `reporting.exports` | `reporting` | `/reporting/exports` | Exports | الصادرات | `reporting.export` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `reporting.overview.page` | `/reporting/overview` | `reporting` | `reporting.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `reporting.reports.page` | `/reporting/reports` | `reporting` | `reporting.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `reporting.exports.page` | `/reporting/exports` | `reporting` | `reporting.export` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `reporting.admin` | reporting admin |
| `reporting.export` | reporting export |
| `reporting.read` | reporting read |
| `reporting.write` | reporting write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `reporting.*` |
| `reporting_admin` | `reporting.read`, `reporting.write`, `reporting.admin` |
| `reporting_operator` | read/write operational permissions |
| `reporting_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + reporting + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.report_exports` | page data / API backing | `tenant_id` required where applicable |
| `dos.reports` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `reporting.overview` | `/reporting/overview` | Overview | نظرة عامة | `ReportingOverviewComponent` | `GET /api/reporting/overview` | `dos.reports` | `reporting.read` | `VERIFY` |
| 2 | `reporting.reports` | `/reporting/reports` | Reports | التقارير | `ReportingReportsComponent` | `GET /api/reporting/reports` | `dos.reports` | `reporting.read` | `VERIFY` |
| 3 | `reporting.exports` | `/reporting/exports` | Exports | الصادرات | `ReportingExportsComponent` | `GET /api/reporting/exports` | `dos.report_exports` | `reporting.export` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT reporting into dos.module_registry
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


---

# Risk Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `risk` |
| product_key | `shahin-ai` |
| route_base | `/risk` |
| owner_service | `risk-incident-service` |
| module_status | `active_after_validation` |
| module_name_en | `Risk` |
| module_name_ar | `Risk` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `risk` | `shahin-ai` | `Risk` | `grc-core` | `active` | `risk-incident-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `risk` | `risk` | `/risk` | `Risk` | `Risk` | `risk.read` | 10 |
| `risk.overview` | `risk` | `/risk/overview` | Overview | نظرة عامة | `risk.read` | 10 |
| `risk.register` | `risk` | `/risk/register` | Risk Register | سجل المخاطر | `risk.read` | 20 |
| `risk.assessments` | `risk` | `/risk/assessments` | Assessments | التقييمات | `risk.assessment.read` | 30 |
| `risk.treatments` | `risk` | `/risk/treatments` | Treatments | المعالجات | `risk.treatment.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `risk.overview.page` | `/risk/overview` | `risk` | `risk.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `risk.register.page` | `/risk/register` | `risk` | `risk.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `risk.assessments.page` | `/risk/assessments` | `risk` | `risk.assessment.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `risk.treatments.page` | `/risk/treatments` | `risk` | `risk.treatment.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `risk.admin` | risk admin |
| `risk.assessment.read` | risk assessment read |
| `risk.read` | risk read |
| `risk.treatment.read` | risk treatment read |
| `risk.write` | risk write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `risk.*` |
| `risk_admin` | `risk.read`, `risk.write`, `risk.admin` |
| `risk_operator` | read/write operational permissions |
| `risk_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + risk + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.risk_assessments` | page data / API backing | `tenant_id` required where applicable |
| `dos.risk_treatments` | page data / API backing | `tenant_id` required where applicable |
| `dos.risks` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `risk.overview` | `/risk/overview` | Overview | نظرة عامة | `RiskOverviewComponent` | `GET /api/risk/overview` | `dos.risks` | `risk.read` | `VERIFY` |
| 2 | `risk.register` | `/risk/register` | Risk Register | سجل المخاطر | `RiskRegisterComponent` | `GET /api/risk/register` | `dos.risks` | `risk.read` | `VERIFY` |
| 3 | `risk.assessments` | `/risk/assessments` | Assessments | التقييمات | `RiskAssessmentsComponent` | `GET /api/risk/assessments` | `dos.risk_assessments` | `risk.assessment.read` | `VERIFY` |
| 4 | `risk.treatments` | `/risk/treatments` | Treatments | المعالجات | `RiskTreatmentsComponent` | `GET /api/risk/treatments` | `dos.risk_treatments` | `risk.treatment.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT risk into dos.module_registry
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


---

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


---

# Vendor Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `vendor` |
| product_key | `shahin-ai` |
| route_base | `/vendor` |
| owner_service | `vendor-risk-service` |
| module_status | `active_after_validation` |
| module_name_en | `Vendor` |
| module_name_ar | `Vendor` |
| category | `third-party` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `vendor` | `shahin-ai` | `Vendor` | `third-party` | `active` | `vendor-risk-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `vendor` | `vendor` | `/vendor` | `Vendor` | `Vendor` | `vendor.read` | 10 |
| `vendor.overview` | `vendor` | `/vendor/overview` | Overview | نظرة عامة | `vendor.read` | 10 |
| `vendor.registry` | `vendor` | `/vendor/registry` | Registry | السجل | `vendor.read` | 20 |
| `vendor.assessments` | `vendor` | `/vendor/assessments` | Assessments | التقييمات | `vendor.assessment.read` | 30 |
| `vendor.contracts` | `vendor` | `/vendor/contracts` | Contracts | العقود | `vendor.contract.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `vendor.overview.page` | `/vendor/overview` | `vendor` | `vendor.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `vendor.registry.page` | `/vendor/registry` | `vendor` | `vendor.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `vendor.assessments.page` | `/vendor/assessments` | `vendor` | `vendor.assessment.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `vendor.contracts.page` | `/vendor/contracts` | `vendor` | `vendor.contract.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `vendor.admin` | vendor admin |
| `vendor.assessment.read` | vendor assessment read |
| `vendor.contract.read` | vendor contract read |
| `vendor.read` | vendor read |
| `vendor.write` | vendor write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `vendor.*` |
| `vendor_admin` | `vendor.read`, `vendor.write`, `vendor.admin` |
| `vendor_operator` | read/write operational permissions |
| `vendor_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + vendor + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.vendor_assessments` | page data / API backing | `tenant_id` required where applicable |
| `dos.vendor_contracts` | page data / API backing | `tenant_id` required where applicable |
| `dos.vendors` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `vendor.overview` | `/vendor/overview` | Overview | نظرة عامة | `VendorOverviewComponent` | `GET /api/vendors/overview` | `dos.vendors` | `vendor.read` | `VERIFY` |
| 2 | `vendor.registry` | `/vendor/registry` | Registry | السجل | `VendorRegistryComponent` | `GET /api/vendors` | `dos.vendors` | `vendor.read` | `VERIFY` |
| 3 | `vendor.assessments` | `/vendor/assessments` | Assessments | التقييمات | `VendorAssessmentsComponent` | `GET /api/vendors/assessments` | `dos.vendor_assessments` | `vendor.assessment.read` | `VERIFY` |
| 4 | `vendor.contracts` | `/vendor/contracts` | Contracts | العقود | `VendorContractsComponent` | `GET /api/vendors/contracts` | `dos.vendor_contracts` | `vendor.contract.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT vendor into dos.module_registry
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


---

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


---


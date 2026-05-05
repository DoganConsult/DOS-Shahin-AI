# AI Platform Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `ai-platform` |
| product_key | `shahin-ai` |
| route_base | `/ai` |
| owner_service | `ai-gateway-service / ai-engine-service` |
| module_status | `active_after_validation` |
| module_name_en | `AI Platform` |
| module_name_ar | `الرئيسية الذكية` |
| category | `platform-dna` |
| icon | `ai` |
| description_en | AI platform home, agents, agent runs, governance and evidence ledger. |
| description_ar | الرئيسية الذكية، الوكلاء، التشغيلات، الحوكمة وسجل الأدلة. |

## 2. Initialization group

### 2.1 `dos.module_registry`

| module_code | product_key | title_en | title_ar | category | status | owner_service |
|---|---|---|---|---|---|---|
| `ai-platform` | `shahin-ai` | `AI Platform` | `الرئيسية الذكية` | `platform-dna` | `active` | `ai-gateway-service / ai-engine-service` |

### 2.2 `dos.navigation_registry`

#### Parent row

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `ai-platform` | `ai-platform` | `/ai` | `AI Platform` | `الرئيسية الذكية` | `ai.read` | 10 |

#### Child rows

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `ai-platform.home` | `ai-platform` | `/ai/home` | AI Home | الرئيسية الذكية | `ai.read` | 10 |
| `ai-platform.agents` | `ai-platform` | `/ai/agents` | Agents | الوكلاء | `ai.agents.read` | 20 |
| `ai-platform.runs` | `ai-platform` | `/ai/runs` | Runs | التشغيلات | `ai.runs.read` | 30 |
| `ai-platform.governance` | `ai-platform` | `/ai/governance` | AI Governance | حوكمة الذكاء الاصطناعي | `ai.governance.read` | 40 |

### 2.3 Dynamic UI route/component rows

Use only if this module is enrolled in Dynamic UI runtime.

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `ai-platform.home.page` | `/ai/home` | `ai-platform` | `ai.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ai-platform.agents.page` | `/ai/agents` | `ai-platform` | `ai.agents.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ai-platform.runs.page` | `/ai/runs` | `ai-platform` | `ai.runs.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `ai-platform.governance.page` | `/ai/governance` | `ai-platform` | `ai.governance.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### 2.4 Permissions

| permission_code | description |
|---|---|
| `ai.read` | View AI Platform |
| `ai.admin` | Administer AI Platform |
| `ai.agents.read` | View agents |
| `ai.agents.manage` | Manage agents |
| `ai.runs.read` | View AI runs |
| `ai.runs.cancel` | Cancel AI runs |
| `ai.governance.read` | View AI governance |
| `ai.governance.approve` | Approve governed AI actions |
| `ai.evidence.read` | View AI evidence |
| `ai.audit.read` | View AI audit trail |

### 2.5 Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all ai.* |
| `platform_admin` | all ai.* |
| `ai_admin` | ai.read, ai.admin, ai.agents.manage, ai.runs.read, ai.governance.approve |
| `ai_operator` | ai.read, ai.agents.read, ai.runs.read, ai.runs.cancel |
| `ai_auditor` | ai.read, ai.governance.read, ai.evidence.read, ai.audit.read |
| `standard_user` | ai.read if enabled |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + ai-platform + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if tenant is trial |
| `dos.tenant_subscriptions` | active subscription or trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource access tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.dynamic_ui_agents` | business data / API backing | tenant/org scoped where applicable |
| `dos.dynamic_ui_agent_actions` | business data / API backing | tenant/org scoped where applicable |
| `dos.dynamic_ui_page_agents` | business data / API backing | tenant/org scoped where applicable |
| `dos.dynamic_ui_workflow_agents` | business data / API backing | tenant/org scoped where applicable |
| `dos.dynamic_ui_agent_squads` | business data / API backing | tenant/org scoped where applicable |
| `dos.dynamic_ui_agent_squad_members` | business data / API backing | tenant/org scoped where applicable |
| `dos.agent_runs` | business data / API backing | tenant/org scoped where applicable |
| `dos.agent_run_steps` | business data / API backing | tenant/org scoped where applicable |
| `dos.agent_action_receipts` | business data / API backing | tenant/org scoped where applicable |
| `dos.agent_recommendations` | business data / API backing | tenant/org scoped where applicable |
| `dos.agent_evidence_links` | business data / API backing | tenant/org scoped where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | component file | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `ai-platform.home` | `/ai/home` | AI Home | الرئيسية الذكية | `AiHomeComponent` | `products/shahin-ai/app/src/app/modules/ai/ai-home.component.ts` | `GET /api/ai/overview` | `dos.agent_runs, dos.agent_recommendations` | `ai.read` | `VERIFY` |
| 2 | `ai-platform.agents` | `/ai/agents` | Agents | الوكلاء | `AiAgentsComponent` | `products/shahin-ai/app/src/app/modules/ai/ai-agents.component.ts` | `GET /api/ai/agents` | `dos.dynamic_ui_agents, dos.dynamic_ui_agent_actions` | `ai.agents.read` | `VERIFY` |
| 3 | `ai-platform.runs` | `/ai/runs` | Runs | التشغيلات | `AiRunsComponent` | `products/shahin-ai/app/src/app/modules/ai/ai-runs.component.ts` | `GET /api/ai/runs` | `dos.agent_runs, dos.agent_run_steps, dos.agent_action_receipts` | `ai.runs.read` | `VERIFY` |
| 4 | `ai-platform.governance` | `/ai/governance` | AI Governance | حوكمة الذكاء الاصطناعي | `AiGovernanceComponent` | `products/shahin-ai/app/src/app/modules/ai/ai-governance.component.ts` | `GET /api/ai/governance` | `dos.agent_evidence_links, dos.agent_action_receipts, dos.authz_decision_log` | `ai.governance.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

> Verify column names before running. This is a direct seed plan, not blind SQL execution.

```sql
BEGIN;

-- 1) module_registry
-- UPSERT ai-platform into dos.module_registry

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

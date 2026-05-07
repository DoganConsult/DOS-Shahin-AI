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

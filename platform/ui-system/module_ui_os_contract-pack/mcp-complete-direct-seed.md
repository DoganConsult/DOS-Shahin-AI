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

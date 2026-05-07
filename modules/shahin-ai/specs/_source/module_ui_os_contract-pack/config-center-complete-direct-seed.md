# Config Center Module — Complete Direct Seed Content

**Authoritative contract:** `config-center-complete-direct-seed.json`  
**SPA:** `products/shahin-ai/app/src/app/app.routes.ts` (`path: 'admin/config-center'`)  
**Guard:** `configCenterGuard` → requires **`platform.config_center.read`** (same file)  
**FE client:** `platform/config-center/config-center.service.ts` → base **`/api/config-center`**

---

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `config-center` |
| product_key | `shahin-ai` |
| route_base | `/admin/config-center` |
| owner_service (manifest) | `ui-os-service` (template binding resolver); config HTTP served via **gateway → tenant-service** (`/api/config-center`) |

---

## 2. Permissions (manifest / JSON — fix DAuth to match SPA)

The Shahin SPA only checks **`platform.config_center.read`** for the whole subtree.

| permission_code | Use |
|---|---|
| `platform.config_center.read` | **Required by `configCenterGuard`** — navigation + pages |
| `platform.config_center.admin` | Writes (settings PUT, gateway overrides, import) |
| `platform.audit.read` | Richer audit / forensic views if enforced server-side |

> Legacy names like `platform.config.read` in old docs are **wrong** for this codebase.

---

## 3. Navigation (JSON manifest — 10 children)

Include **hub**, **flags**, **tokens**, **gateway** as in `config-center-complete-direct-seed.json`.

| nav_item_code | route | permission |
|---|---|---|
| `config-center` | (group) | `platform.config_center.read` |
| `config-center.hub` | `/admin/config-center` | `platform.config_center.read` |
| … | `/admin/config-center/settings` | … |
| `config-center.flags` | `/admin/config-center/flags` | … |
| `config-center.tokens` | `/admin/config-center/tokens` | … |
| `config-center.audit` | `/admin/config-center/audit` | … |
| `config-center.compare` | `/admin/config-center/compare` | … |
| `config-center.resolve` | `/admin/config-center/resolve` | … |
| `config-center.workspace` | `/admin/config-center/workspace` | … |
| `config-center.gateway` | `/admin/config-center/gateway` | … |
| `config-center.health` | `/admin/config-center/health` | … |

---

## 4. SPA routing — code truth

| Route path | Loader | Rendering |
|---|---|---|
| `''` (index) | — | **`redirectTo: 'resolve'`** — landing is **`/admin/config-center/resolve`**, not hub |
| `resolve` | `ConfigResolutionComponent` | Concrete Angular |
| `compare` | `ConfigCompareComponent` | Concrete |
| `workspace` | `ConfigWorkspaceComponent` | Concrete |
| `health` | `ConfigHealthComponent` | Concrete |
| `settings` | `DynamicTemplatePageComponent` | `contractRoute: '/admin/config-center/settings'` |
| `audit` | `DynamicTemplatePageComponent` | `contractRoute: '/admin/config-center/audit'` |
| `gateway` | `DynamicTemplatePageComponent` | `contractRoute: '/admin/config-center/gateway'` |
| `flags` | `DynamicTemplatePageComponent` | `contractRoute: '/admin/config-center/flags'` |
| `tokens` | `DynamicTemplatePageComponent` | `contractRoute: '/admin/config-center/tokens'` |

**Gap:** Manifest page `platform.config-center.hub` maps to **`/admin/config-center`**, but the router redirects empty path to **`resolve`**. Treat **hub row as informational** unless you change `redirectTo` or add an explicit **`hub`** segment.

---

## 5. API surface — `ConfigCenterService` (actual client)

All under **`${base}` = `/api/config-center`**:

| Area | Methods (representative paths) |
|---|---|
| Resolve | `GET /resolve/:key`, `POST /resolve/batch`, `GET /explain/:key` |
| Settings | `GET /settings`, `GET /settings/:key`, `PUT /settings/:key?scope=` |
| Compare / export | `GET /compare/tenants`, `GET /compare/defaults`, `GET /export`, `POST /import` |
| Audit | `GET /audit`, `GET /audit/:key` |
| Health | `GET /health/env`, `/health/secrets`, `/health/drift`, `/health/diagnostics` |
| Gateway | `GET /gateway/inventory`, `/gateway/overrides`, `PUT /gateway/override/:key`, `DELETE …`, `POST /gateway/invalidate`, `GET /gateway/workspace-config`, `GET /gateway/shell-override`, `PUT /gateway/workspace-batch` |

**Not used by SPAs listing above:**

- Older JSON blobs mentioning **`/api/cfg/*`** or bare **`GET /api/audit`** are **obsolete** vs this client.

---

## 6. Page seed matrix — manifest vs SPA

| page_code | route | template_export | SPA implementation | Primary APIs |
|---|---|---|---|---|
| `platform.config-center.hub` | `/admin/config-center` | `DecisionDashboardTemplateComponent` | ⚠ Redirect → **`resolve`** | N/A unless redirect fixed |
| `platform.config-center.resolve` | `.../resolve` | `ModuleSettingsTemplateComponent` | ✅ `ConfigResolutionComponent` | `GET ${base}/resolve/*`, `/explain/*`, `/settings` |
| `platform.config-center.compare` | `.../compare` | `ModuleSettingsTemplateComponent` | ✅ `ConfigCompareComponent` | `GET ${base}/compare/*` |
| `platform.config-center.workspace` | `.../workspace` | `ModuleSettingsTemplateComponent` | ✅ `ConfigWorkspaceComponent` | `GET ${base}/gateway/workspace-config`, `/gateway/shell-override`, `PUT workspace-batch` |
| `platform.config-center.health` | `.../health` | `TrendIntelligenceTemplateComponent` | ✅ `ConfigHealthComponent` | `GET ${base}/health/*` |
| `platform.config-center.gateway` | `.../gateway` | `TrendIntelligenceTemplateComponent` | ✅ DynamicTemplate + binding | Gateway inventory/overrides mutations |
| `platform.config-center.settings` | `.../settings` | `ModuleRecordsTemplateComponent` | ✅ DynamicTemplate + binding | `GET/PUT ${base}/settings*` |
| `platform.config-center.flags` | `.../flags` | `ModuleRecordsTemplateComponent` | ✅ DynamicTemplate + binding | *(confirm tenant-service keys / feature-flag slice)* |
| `platform.config-center.tokens` | `.../tokens` | `ModuleRecordsTemplateComponent` | ✅ DynamicTemplate + binding | *(confirm secrets/tokens slice)* |
| `platform.config-center.audit` | `.../audit` | `AuditTrailLedgerTemplateComponent` | ✅ DynamicTemplate + binding | `GET ${base}/audit*` |

Shared template resolver: **`GET /api/ui-os/template-binding?route=<contractRoute>`**

---

## 7. Missing / clarify next

| Item | Action |
|---|---|
| Hub vs redirect | Product choice: **`redirectTo`** `hub`-equivalent vs dedicated path |
| Feature flags / tokens data plane | Confirm which **`/api/config-center`** subpaths (or sibling services) power DB-bound pages |
| JSON `apis[]` block | ✅ Should list **`/api/config-center/**`** patterns — update JSON next to this MD |

---

## 8. Validation checklist

- [ ] Browser: `platform.config_center.read` user can reach `/admin/config-center/resolve`
- [ ] `GET /api/config-center/settings` succeeds through gateway with tenant headers
- [ ] Dynamic routes return 200 from `template-binding` for each `contractRoute` above


# Dynamic UI Module — Complete Direct Seed Content

**Authoritative contract:** `dynamic-ui-complete-direct-seed.json`  
**Code truth (Shahin SPA):** `products/shahin-ai/app/src/app/app.routes.ts`  
**Runtime API (ui-os-service):** `services/ui-os-service/src/routes/dynamic-ui-contract.routes.ts`, `template-binding.routes.ts`

---

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `dynamic-ui` |
| product_key | `shahin-ai` |
| route_base (manifest) | `/dynamic-ui` |
| owner_service | `ui-os-service` |
| tier / category | `platform` |

---

## 2. SPA gap (critical)

The manifest assumes a first-class `/dynamic-ui/*` shell tree.

**Actual Shahin routing:** There is **no** `path: 'dynamic-ui'` branch in `app.routes.ts`.

| Intended (JSON) | Actual |
|---|---|
| `/dynamic-ui/overview`, `/routes`, … | **Not wired** unless product adds lazy routes **or** you surface these under `/_dyn/*` / `admin/**` via `dos.ui_route_template_binding` |

**Next step:** Either (a) add a `dynamic-ui` child route group that loads `DynamicTemplatePageComponent` with `contractRoute`, or (b) drop/move manifest routes to URLs that exist today.

---

## 3. ui-os-service — implemented HTTP surface

Mounted as documented in router index (dual prefix **`/api/ui-os`** and **`/api/dynamic-ui`** unless gateway strips one).

| Method | Path (suffix) | Purpose |
|---|---|---|
| GET | `/workspace/nav` | Workspace navigation payload |
| GET | `/route-catalog` | Route / binding listing (use for **Routes** UX) |
| GET | `/contract/:moduleCode` | Module Dynamic UI contract |
| GET | `/page-experience?route=` | Page experience / binding helper |

**Template binding (separate router):**

| Method | Path (suffix) | Purpose |
|---|---|---|
| GET | `/template-binding?route=...` | Archetype + `template_export` + props for one route |
| GET | `/template-binding/all` | Bulk binding list (SPA warm cache) |

**Missing vs seed “pages":**

| Seed page concept | Dedicated API |
|---|---|
| Overview | No `GET /overview` — build from **`route-catalog`** + **`contract/:moduleCode`** or a small BFF |
| Routes | ✅ **`route-catalog`** |
| Components | ❌ No `GET /components` — use **`route-catalog`** / **`template-binding`** (component_key embedded) or add a registry read endpoint |
| Contracts | ✅ **`contract/:moduleCode`** |

---

## 4. Initialization group (aligned to JSON)

### `dos.module_registry`

| module_code | product_key | owner_service |
|---|---|---|
| `dynamic-ui` | `shahin-ai` | `ui-os-service` |

### Permissions (JSON — authoritative for pack)

| permission_code |
|---|
| `dynamic_ui.module.read` |
| `dynamic_ui.routes.read` |
| `dynamic_ui.components.read` |
| `dynamic_ui.contracts.read` |
| `dynamic_ui.module.write` |
| `dynamic_ui.module.admin` |

### Navigation (JSON)

| nav_item_code | route | permission |
|---|---|---|
| `dynamic-ui` | (group) | `dynamic_ui.module.read` |
| `dynamic-ui.overview` | `/dynamic-ui/overview` | `dynamic_ui.module.read` |
| `dynamic-ui.routes` | `/dynamic-ui/routes` | `dynamic_ui.routes.read` |
| `dynamic-ui.components` | `/dynamic-ui/components` | `dynamic_ui.components.read` |
| `dynamic-ui.contracts` | `/dynamic-ui/contracts` | `dynamic_ui.contracts.read` |

---

## 5. Page seed matrix — render model + gaps

| # | page_code | manifest route | Archetype (JSON) | template_export | How it would render once routed | Backend data |
|---|---|---|---|---|---|---|
| 1 | `dynamic-ui.overview` | `/dynamic-ui/overview` | `command-home` | `ModuleOverviewTemplateComponent` | `DynamicTemplatePageComponent` + DB binding **`or`** dedicated page | ⚠ Compose from `route-catalog` / contracts — **no `/overview`** |
| 2 | `dynamic-ui.routes` | `/dynamic-ui/routes` | `intelligent-register` | `ModuleRecordsTemplateComponent` | Same | ✅ `GET .../route-catalog` |
| 3 | `dynamic-ui.components` | `/dynamic-ui/components` | `intelligent-register` | `ModuleRecordsTemplateComponent` | Same | ⚠ No dedicated **`/components`** — needs endpoint or reuse `route-catalog` |
| 4 | `dynamic-ui.contracts` | `/dynamic-ui/contracts` | `intelligent-register` | `ModuleRecordsTemplateComponent` | Same | ✅ `GET .../contract/:moduleCode` (per module) |

---

## 6. Provisioning group per tenant

| Table | Notes |
|---|---|
| `dos.tenant_product_activation` | product `shahin-ai` active |
| `dos.tenant_module_entitlements` | module `dynamic-ui` if ever entitled |
| DAuth tuples | Align with `dynamic_ui.*` codes from JSON |

---

## 7. Validation checklist

- [ ] SPA: decide `/dynamic-ui` wiring or update manifest routes
- [ ] Gateway: `/api/ui-os/*` reachable from browser
- [ ] Optional: dedicated **component registry GET** if UI cannot rely on `route-catalog`
- [ ] Permissions `dynamic_ui.*` issued to operator roles where needed

---

## 8. Move to next module

✅ Dynamic UI docs are intentionally **narrow**: fix SPA routing and any **components** read API, then revisit `dynamic-ui-complete-direct-seed.json` `apis[]` if you add endpoints.


# Dynamic UI OS — Layer-order doctrine

Every UI surface served by `services/ui-os-service` is the **deep merge** of
six layers, broader → narrower. Each later layer's non-NULL values win;
NULL values inherit. **Object keys merge recursively. Arrays REPLACE in full.**

```
                         + ─── ① Workspace shell ──── dos.workspace_shell_binding
                         |          (header, sidebar, mobile-nav, command-search,
                         |          status-bar, action-queue, agent-strip,
                         |          inbox-center, context-panel, quick-create,
                         |          tile variants — 30 component_keys × 40 tenants)
                         |
                         + ─── ② Product ──────────── dos.ui_override_product
                         |          (product_code = 'shahin-ai' | 'doganhub' | …)
                         |
                         + ─── ③ Module default ───── dos.ui_module_nav_group
                         |                            dos.ui_module_nav_item
                         |          (DB-driven order — 4 groups, 35 items today,
                         |          replacing the codegen TS registry)
                         |
                         + ─── ④ Route ────────────── dos.ui_route_template_binding
                         |          (per-route props + masthead i18n + status_tags
                         |          + primary_action)
                         |
                         + ─── ⑤ Tenant ───────────── dos.ui_override_tenant
                         |                            dos.ui_module_nav_override_tenant
                         |          (sparse: NULL inherits)
                         |
                         + ─── ⑥ User ─────────────── dos.ui_override_user
                                                      dos.ui_module_nav_override_user
                                  (sparse + `pinned` flag)
```

## Resolver endpoints

| URL | Layers it merges |
|---|---|
| `GET /api/ui-os/template-binding?route=…` | ② → ③ → ④ → ⑤ → ⑥ |
| `GET /api/ui-os/module-nav?module=…` | ③ → ⑤ → ⑥ |
| `GET /api/ui-os/workspace-shell` | ① → ⑤ |
| `GET /api/ui-os/export?scope=tenant[&tenant_id=…]` | full bundle (every route) |

Every endpoint returns a `_layers` diagnostic object naming which layers
contributed and at which version. Versions are bumped automatically by the
`bump_ui_*_version` triggers on UPDATE.

## Caller context

| Field | Source |
|---|---|
| `product_code` | `x-product-code` header (default `shahin-ai`) |
| `module_code` | derived from URL prefix (`/foundation/* → foundation`, `/compliance/* → compliance`, etc.) |
| `tenant_id` | `req.principal.tenantId` (gateway-origin middleware → JWE) |
| `user_id` | `req.principal.sub` (gateway-origin middleware → JWE) |

## How operators add an override

Per-tenant tag the masthead sandbox-style:
```sql
INSERT INTO dos.ui_override_tenant (tenant_id, route, patch) VALUES
('14f273cf260a4736', '*',
 '{"masthead":{"statusTags":[{"label":"Sandbox","severity":"warning"}]}}'::jsonb)
ON CONFLICT (tenant_id, route) DO UPDATE
   SET patch = EXCLUDED.patch, updated_at = now();
```

Per-user pin a nav item:
```sql
INSERT INTO dos.ui_module_nav_override_user (user_id, module_code, item_id, pinned)
VALUES ('<user-sub>', 'foundation', 'foundation.audit', true)
ON CONFLICT (user_id, module_code, item_id) DO UPDATE
   SET pinned = true, updated_at = now();
```

Hide a nav item for one tenant:
```sql
INSERT INTO dos.ui_module_nav_override_tenant (tenant_id, module_code, item_id, enabled)
VALUES ('14f273cf260a4736', 'foundation', 'foundation.diagnostics', false)
ON CONFLICT DO NOTHING;
```

## Seeding from contract pack

The `*-complete-direct-seed.json` files in this folder are the canonical
authoring input. Re-run the seeder any time after editing them:

```bash
node scripts/seed-module-contract-pack.mjs
```

Idempotent (UPSERT). Hand-curated rich props (e.g. `/workspace-home`) are
preserved — the seeder only fills `props` when the existing row is empty.

Currently seeded JSON contracts:

| Module | Components | Pages | Nav items |
|---|---|---|---|
| `config-center` | 5 | 10 | 10 |
| `dynamic-ui` | 2 | 4 | 4 |
| `foundation` | 10 | 21 | 21 |
| `workspace-shell` | 26 | — | — |

Markdown-only modules (compliance, risk, audit, …) need a JSON contract
authored before they enter the pipeline.

## Verification

```bash
# Live route binding for /workspace-home with all 6 layers merged
curl -H 'x-user-sub: u1' -H 'x-tenant-id: 14f273cf260a4736' \
     'http://localhost:4015/api/ui-os/template-binding?route=/workspace-home' \
  | jq '._layers, .props.masthead'

# Foundation module nav with explicit ordering
curl -H 'x-user-sub: u1' -H 'x-tenant-id: 14f273cf260a4736' \
     'http://localhost:4015/api/ui-os/module-nav?module=foundation' \
  | jq '.groups[] | { id, item_count: (.items | length) }'

# Tenant snapshot — every route's effective binding
curl -H 'x-tenant-id: 14f273cf260a4736' \
     'http://localhost:4015/api/ui-os/export?scope=tenant' \
  | jq '.binding_count, .bindings[0]'
```

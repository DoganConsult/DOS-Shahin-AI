# Universal Module Direct Seed Standard

## Purpose

This folder defines what must exist before a module can be shown as a real active module in the workspace UI.

## Three required groups

### A. Initialization group — global one-time seed

| Area | Tables | Real columns (verified 2026-05-03) |
|---|---|---|
| Module identity | `dos.module_registry` | `module_code`, `product_key`, `display_name`, `status` |
| Navigation | `dos.navigation_registry` | `nav_item_code`, `module_code`, `parent_code`, `route`, `label_en`, `label_ar`, `sort_order` |
| Dynamic UI routes | `dos.dynamic_ui_routes` | `route`, `component_key`, `permission_key` (3+ segment regex enforced), `module_code` |
| Dynamic UI components | `dos.dynamic_ui_component_registry` | `component_key`, `vendor` (must = `ibm-carbon`), `carbon_key` (FK → `dos.ui_carbon_components`), `approval_status` |
| Permissions | `platform_dauth.permissions` | `permission_code` MUST be `<module>.<entity>.<verb>` 3-segment form |
| Roles | `platform_dauth.functional_roles` | reuse existing IDs (`platform_super_admin`, `tenant_admin`, `<module>_manager`, `standard_user`, plus `role_*` aliases) — do NOT invent new IDs |
| Role bindings | `platform_dauth.role_permissions` / `role_permission_map` | bind only to existing role IDs above |

**Hard constraints:**
- `dos.dynamic_ui_routes.permission_key` is regex-checked by `chk_perm_dot_form_dynamic_ui_routes`; 2-segment keys fail INSERT.
- `dos.dynamic_ui_component_registry` has trigger `trg_carbon_only_runtime` rejecting any `vendor != 'ibm-carbon'`.
- `dos.module_registry` has NO `owner_service` / `category` / `title_en` columns. The owner service is resolved at runtime via gateway prefix mapping, not in this row.
- Nav rows do NOT carry `permission` directly; permission is resolved through `dynamic_ui_routes.permission_key` for the matching `route`.
- Re-use the shared approved `module.*` component_keys (`module.entry.page`, `module.overview.page`, `module.records.page`, `module.workflows.page`, `module.reports.page`, `module.settings.page`) before introducing per-module page keys.

### B. Provisioning group — per tenant

| Area | Tables |
|---|---|
| Product activation | `dos.tenant_product_activation` |
| Module entitlement | `dos.tenant_module_entitlements` |
| User membership | `dos.tenant_memberships` |
| Trial/subscription | `dos.tenant_trials`, `dos.tenant_subscriptions` |
| Authorization tuples | OpenFGA / DAuth tuple store |

### C. Business / operations group — per module

| Area | Tables |
|---|---|
| Real page data | module-owned business tables |
| Audit | audit/decision/event tables |
| Workflow | workflow/approval tables if applicable |
| Evidence | evidence/document tables if applicable |

## Required chain per page

```text
DB nav row
→ route_path
→ Angular route
→ Angular page component
→ frontend API service
→ backend endpoint
→ DB table/query
→ permission
→ role binding
→ tenant/org scope
```


## Status rules

A row/page is not seed-ready until:

- Angular route exists
- Angular component file exists
- API endpoint exists
- Backend route exists
- DB table/query exists
- Permission exists
- Role binding exists
- Tenant/org scope is enforced
- No mock/static data
- Build passes

Allowed status values:

- `COMPLETE`
- `VERIFY`
- `NAV_MISSING`
- `ROUTE_MISSING`
- `COMPONENT_MISSING`
- `API_MISSING`
- `DB_MISSING`
- `PERMISSION_MISSING`
- `ROLE_BINDING_MISSING`
- `ORG_SCOPE_MISSING`
- `TUPLE_MISSING`
- `BUILD_BLOCKED`


# Workspace Shell — Complete Direct Seed Content

> Module #0 of the DOS Module Contract Publisher. This is the platform-DNA
> shell host (**60 components across 6 bands**) on which every page archetype
> renders. Authored to the Universal Module Seed Standard
> (`00-universal-module-seed-standard.md`) and validated against
> `00-universal-module-contract.schema.json`.
>
> **Rule:** This `.md` and its sibling `.json` MUST stay in parity. Edits to
> either are forbidden outside the publisher pipeline (`pnpm module:publish
> workspace-shell`). Closed sections are append-only; reopened items get an
> explicit `## Appendix … REOPENED YYYY-MM-DD — reason: …` block.

## 1. Module identity

| Field | Value |
|---|---|
| `module_code` | `workspace-shell` |
| `product_key` | `platform-dna` |
| `tier` | `platform` |
| `category` | `platform` |
| `owner_service` | `ui-os-service` |
| `name_en` | `Workspace Shell` |
| `name_ar` | `هيكل مساحة العمل` |
| `version` | `3.0.0` |
| `is_platform_dna` | `true` |
| `route_base` | `null` (shell hosts pages, owns no route) |

## 2. Initialization group — global one-time seed

### 2.1 Carbon component registry — 60 components across 6 bands

**Minimum-bar doctrine (non-negotiable):** Every row in §2.1 is normative for the
workspace-shell contract. New surfaces are added **here first** (MD ↔ JSON parity),
then reflected in `workspace-shell.contracts.ts`, registry migrations, and CI.
Gaps are closed by **implementation + additive appendix**, never by deleting or
"quietly neglecting" seed rows to match incomplete host code.

**Migration strategy: REPLACE.** The new 60-key taxonomy (bands A-F) supersedes
the previous 30-key layout (groups 1-7). Migration SQL must DELETE stale bindings
keyed on old `shell.*`, `workspace.*`, `page.*` keys before seeding the new
`workspace.{frame,nav,data,input,action,polish}.*` keys.

**Carbon catalog validation:** All 60 `carbon_key` values verified against
`dos.ui_carbon_components` as `runtime_status='active'` (2026-05-05). Underscore
format used for compound names (e.g. `data_table`, `combo_box`, `text_input`).

#### Band A: Workspace Shell Frame (14)

| # | `component_key` | `carbon_key` | Component | Use |
|---|---|---|---|---|
| 1 | `workspace.frame.ui-shell` | `ui-shell` | UIShell | الإطار العام للـ workspace |
| 2 | `workspace.frame.header` | `header` | Header | Top application header |
| 3 | `workspace.frame.header-name` | `header-name` | HeaderName | اسم المنتج / Shahin / DOS |
| 4 | `workspace.frame.header-navigation` | `header-navigation` | HeaderNavigation | Top navigation links |
| 5 | `workspace.frame.header-menu` | `header-menu` | HeaderMenu | Menu groups in header |
| 6 | `workspace.frame.header-menu-item` | `header-menu-item` | HeaderMenuItem | Item inside header menu |
| 7 | `workspace.frame.header-global-bar` | `header-global-bar` | HeaderGlobalBar | Right/left header action area |
| 8 | `workspace.frame.header-global-action` | `header-global-action` | HeaderGlobalAction | Profile/search/notifications/settings |
| 9 | `workspace.frame.side-nav` | `side-nav` | SideNav | Primary sidebar |
| 10 | `workspace.frame.side-nav-items` | `side-nav-items` | SideNavItems | Container for sidebar items |
| 11 | `workspace.frame.side-nav-menu` | `side-nav-menu` | SideNavMenu | Expandable sidebar group |
| 12 | `workspace.frame.side-nav-menu-item` | `side-nav-menu-item` | SideNavMenuItem | Item inside sidebar group |
| 13 | `workspace.frame.side-nav-link` | `side-nav-link` | SideNavLink | Direct route link in sidebar |
| 14 | `workspace.frame.content` | `content` | Content | مساحة عرض الصفحات |

#### Band B: Workspace Navigation / Layout (10)

| # | `component_key` | `carbon_key` | Component | Use |
|---|---|---|---|---|
| 15 | `workspace.nav.grid` | `grid` | Grid | Layout grid |
| 16 | `workspace.nav.column` | `column` | Column | Responsive columns |
| 17 | `workspace.nav.layer` | `layer` | Layer | Nested surfaces |
| 18 | `workspace.nav.breadcrumb` | `breadcrumb` | Breadcrumb | Page path navigation |
| 19 | `workspace.nav.tabs` | `tabs` | Tabs | Workspace/page tabs |
| 20 | `workspace.nav.tab` | `tab` | Tab | Single tab item |
| 21 | `workspace.nav.tile` | `tile` | Tile | Cards / basic panels |
| 22 | `workspace.nav.clickable-tile` | `clickable-tile` | ClickableTile | Module cards / shortcuts |
| 23 | `workspace.nav.expandable-tile` | `expandable-tile` | ExpandableTile | Expandable panels |
| 24 | `workspace.nav.tag` | `tag` | Tag | Status/role/risk labels |

#### Band C: Workspace Tables / Lists / Data (7)

| # | `component_key` | `carbon_key` | Component | Use |
|---|---|---|---|---|
| 25 | `workspace.data.data-table` | `data_table` | DataTable | Records grid |
| 26 | `workspace.data.table-toolbar` | `table_toolbar` | TableToolbar | Table actions area |
| 27 | `workspace.data.table-toolbar-search` | `table_toolbar_search` | TableToolbarSearch | Table search |
| 28 | `workspace.data.table-toolbar-actions` | `table_toolbar_actions` | TableToolbarActions | Table action buttons |
| 29 | `workspace.data.table-batch-actions` | `table_batch_actions` | TableBatchActions | Bulk actions |
| 30 | `workspace.data.pagination` | `pagination` | Pagination | Paging controls |
| 31 | `workspace.data.structured-list` | `structured-list` | StructuredList | Summary/detail list |

#### Band D: Workspace Search / Filters / Inputs (12)

| # | `component_key` | `carbon_key` | Component | Use |
|---|---|---|---|---|
| 32 | `workspace.input.search` | `search` | Search | Global/page search |
| 33 | `workspace.input.dropdown` | `dropdown` | Dropdown | Single select dropdown |
| 34 | `workspace.input.combo-box` | `combo_box` | ComboBox | Searchable select |
| 35 | `workspace.input.multi-select` | `multi_select` | MultiSelect | Multi-value filters |
| 36 | `workspace.input.date-picker` | `date_picker` | DatePicker | Date selection |
| 37 | `workspace.input.text-input` | `text_input` | TextInput | Text fields |
| 38 | `workspace.input.text-area` | `text_area` | TextArea | Long text fields |
| 39 | `workspace.input.number-input` | `number-input` | NumberInput | Numeric fields |
| 40 | `workspace.input.select` | `select` | Select | Native/simple select |
| 41 | `workspace.input.checkbox` | `checkbox` | Checkbox | Boolean/multi check |
| 42 | `workspace.input.radio` | `radio` | Radio | Single option radio |
| 43 | `workspace.input.toggle` | `toggle` | Toggle | On/off settings toggle |

#### Band E: Workspace Actions / Feedback / Overlays (7)

| # | `component_key` | `carbon_key` | Component | Use |
|---|---|---|---|---|
| 44 | `workspace.action.button` | `button` | Button | Primary/secondary actions |
| 45 | `workspace.action.icon-button` | `icon_button` | IconButton | Compact icon actions |
| 46 | `workspace.action.overflow-menu` | `overflow-menu` | OverflowMenu | More actions menu |
| 47 | `workspace.action.overflow-menu-option` | `overflow-menu-option` | OverflowMenuOption | Action item in overflow |
| 48 | `workspace.action.modal` | `modal` | Modal | Confirmation/create dialogs |
| 49 | `workspace.action.inline-notification` | `inline-notification` | InlineNotification | Inline errors/warnings |
| 50 | `workspace.action.toast-notification` | `toast-notification` | ToastNotification | Global success/error toasts |

#### Band F: Enterprise Polish (10)

| # | `component_key` | `carbon_key` | Component | Use |
|---|---|---|---|---|
| 51 | `workspace.polish.tooltip` | `tooltip` | Tooltip | Hover tooltips |
| 52 | `workspace.polish.toggletip` | `toggletip` | Toggletip | Click-toggle tips |
| 53 | `workspace.polish.popover` | `popover` | Popover | Contextual popovers |
| 54 | `workspace.polish.progress-bar` | `progress-bar` | ProgressBar | Progress indicators |
| 55 | `workspace.polish.inline-loading` | `inline-loading` | InlineLoading | Inline loading spinners |
| 56 | `workspace.polish.skeleton-text` | `skeleton-text` | SkeletonText | Loading skeleton text |
| 57 | `workspace.polish.skeleton-placeholder` | `skeleton-placeholder` | SkeletonPlaceholder | Loading skeleton placeholder |
| 58 | `workspace.polish.context-menu` | `context-menu` | ContextMenu | Right-click context menus |
| 59 | `workspace.polish.file-uploader` | `file-uploader` | FileUploader | File upload control |
| 60 | `workspace.polish.accordion` | `accordion` | Accordion | Expandable accordion panels |

All vendor-locked to `ibm-carbon` (`trg_carbon_only_runtime`). Carbon catalog
verified 2026-05-05 — all 60 keys `runtime_status='active'`.

### 2.2 Permissions (2)

| `permission_code` | Sensitive |
|---|---|
| `workspace.shell.read` | no |
| `workspace.shell.manage` | yes |

### 2.3 Roles (2)

- `workspace_shell_viewer` — `workspace.shell.read`.
- `workspace_shell_admin` — adds `workspace.shell.manage`.

## 3. Provisioning group — per tenant

The publisher seeds `dos.workspace_shell_binding` (**60 rows × N tenants**) with
non-empty `props` payloads. Existing rows get UPDATE; new tenants pick up via
tenant-provisioning.

| Table | Required seed |
|---|---|
| `dos.workspace_shell_binding` | 60 enabled rows per tenant |
| `dos.dynamic_ui_component_registry` | 60 approved registry rows |

## 4. Business / operations group

Shell host has no business tables. All business data is read from sibling
services through their published APIs and resolved by UI-OS.

## 5. Page seed matrix

N/A — workspace-shell owns no pages (it is the shell that hosts every page).
Per-surface props payloads are in `workspace-shell-complete-direct-seed.json#/components[]`.

## 6. Direct SQL seed skeleton

Not hand-edited. The publisher `sql-emitter.mjs` reads the `.json` and emits an
idempotent SQL bundle:

```text
BEGIN;
-- 0. DELETE stale legacy keys (shell.*, page.*, workspace.{header,sidebar,...})
-- 1. UPSERT 60 components into dos.dynamic_ui_component_registry
-- 2. UPSERT 2 permissions into platform_dauth.permissions
-- 3. UPSERT 2 roles + role_permissions
-- 4. UPSERT 60 per-tenant binding rows into dos.workspace_shell_binding
-- 5. INSERT publish-log row into dos.module_contract_publish_log
COMMIT;
```

## 7. Required chain per surface

```text
.json contract row
-> dos.dynamic_ui_component_registry (vendor + carbon_key)
-> dos.workspace_shell_binding (tenant + props)
-> GET /api/ui-os/workspace-shell/:tenantId
-> Shell resolver (FE)
-> Carbon design tokens (CSS custom properties)
-> rendered surface
```

## 8. Status rules

A row is not seed-ready until:

- `component_key` exists in all three sources: `.json`, `.contracts.ts`, `routes.ts`.
- `carbon_key` exists in `dos.ui_carbon_components` with `runtime_status='active'`.
- `dos.workspace_shell_binding.props` is seeded for every tenant.
- CI guard `workspace-shell-coverage.mjs` passes (three-way parity = 60).
- CI guard `workspace-shell-binding-renderer-parity.mjs` passes.

Current status: **PUBLISHED** (v3.0.0 — **60** registry rows across **6** bands).

## 9. Publisher commands

```bash
pnpm module:validate workspace-shell      # AJV + cross-ref against repo
pnpm module:dry-run  workspace-shell      # SQL plan to /tmp + DB diff
pnpm module:publish  workspace-shell      # idempotent apply
pnpm module:verify   workspace-shell      # post-apply checks
pnpm module:list                           # show all modules + state
```

## 10. Spec-discipline rules (apply to this file forever)

1. **Append-only `.md`.** CI guard `seed-pack-md-json-parity.mjs` fails if any
   `-` line appears outside an explicit REOPENED block.
2. **`.md` and `.json` parity.** Every section here has a corresponding key in
   the `.json`; the publisher refuses to run on drift.
3. **Closed sections are sealed.** Use `## Appendix N — REOPENED YYYY-MM-DD — reason: …`
   to supersede.
4. **Reality ⊆ Spec (read one way).** Everything shipped as product truth must be
   represented in this contract.
5. **No manual writes** to `dos.workspace_shell_binding` or
   `dos.dynamic_ui_component_registry` (workspace.* rows).
6. **Binding ↔ renderer parity (CI-enforced).** Every `component_key` in
   §2.1 MUST have a runtime consumer discoverable by the parity guard.

## Appendix A — REOPENED 2026-05-05 — reason: 60-key taxonomy expansion

Previous 30-key layout (groups 1-7) superseded by 60-key taxonomy (bands A-F).
All legacy keys (`shell.*`, `page.*`, old `workspace.*`) are deprecated.
Migration strategy: REPLACE (delete stale + seed new).

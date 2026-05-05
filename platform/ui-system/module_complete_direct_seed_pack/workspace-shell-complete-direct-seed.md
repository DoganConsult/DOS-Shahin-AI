# Workspace Shell — Complete Direct Seed Content

> Module #0 of the DOS Module Contract Publisher. This is the platform-DNA
> shell host (**30 components across 7 groups**) on which every page archetype
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
| `version` | `2.1.0` |
| `is_platform_dna` | `true` |
| `route_base` | `null` (shell hosts pages, owns no route) |

## 2. Initialization group — global one-time seed

### 2.1 Carbon component registry — 30 components across 7 groups

**Minimum-bar doctrine (non-negotiable):** Every row in §2.1 is normative for the
workspace-shell contract. New surfaces are added **here first** (MD ↔ JSON parity),
then reflected in `workspace-shell.contracts.ts`, registry migrations, and CI.
Gaps are closed by **implementation + additive appendix**, never by deleting or
“quietly neglecting” seed rows to match incomplete host code. Status `PARTIAL` /
`BLOCKED` applies until selectors, bindings, and barrel exports satisfy §8.

#### Group 1: Shell Layout Framework (4)

| `component_key` | `carbon_key` | Selector | Position |
|---|---|---|---|
| `shell.app` | `ui-shell` | `dos-app-shell` | root |
| `shell.desktop` | `ui-shell` | `dos-desktop-shell` | root/desktop |
| `shell.mobile` | `ui-shell` | `dos-mobile-shell` | root/mobile |
| `shell.desktop-sidebar` | `ui-shell` | `dos-desktop-sidebar` | left |

#### Group 2: Header & Navigation (7)

| `component_key` | `carbon_key` | Selector | Position |
|---|---|---|---|
| `workspace.header` | `ui-shell` | `dos-workspace-header` | top |
| `workspace.sidebar` | `ui-shell` | `dos-workspace-sidebar` | left |
| `workspace.mobile-nav` | `tiles` | `dos-mobile-bottom-nav` | bottom |
| `shell.mobile-drawer` | `ui-shell` | `dos-mobile-drawer` | left-overlay |
| `shell.workspace-nav` | `ui-shell` | `dos-workspace-nav` | sidebar-content |
| `shell.nav-section` | `ui-shell` | `dos-nav-section` | sidebar-group |
| `shell.nav-item` | `ui-shell` | `dos-nav-item` | sidebar-leaf |

#### Group 3: Global Action Surfaces (5)

| `component_key` | `carbon_key` | Selector | Trigger |
|---|---|---|---|
| `workspace.command-search` | `search` | `dos-command-search` | cmd-k |
| `workspace.inbox-center` | `modal` | `dos-inbox-center` | bell icon |
| `workspace.quick-create` | `button` | `dos-quick-create` | FAB |
| `workspace.context-panel` | `accordion` | `dos-context-panel` | right rail |
| `shell.account-menu` | `overflow-menu` | `dos-account-menu` | avatar |

#### Group 4: Work Activity & Status (3)

| `component_key` | `carbon_key` | Selector | Purpose |
|---|---|---|---|
| `workspace.status-bar` | `tag` | `dos-workspace-status-bar` | system signals |
| `workspace.action-queue` | `tiles` | `dos-action-queue` | pending work |
| `workspace.agent-strip` | `tiles` | `dos-agent-activity-strip` | agent activity |

#### Group 5: Alerts & Singletons (2)

| `component_key` | `carbon_key` | Selector | Purpose |
|---|---|---|---|
| `shell.banner-strip` | `notification` | `dos-shell-banner-strip` | trial/offline/error banners |
| `shell.toast-outlet` | `notification` | `dos-toast-outlet` | transient toasts |

#### Group 6: Page Content Infrastructure (5)

| `component_key` | `carbon_key` | Selector | Purpose |
|---|---|---|---|
| `page.layout` | `grid` | `dos-page-layout` | canonical page frame (masthead+KPI+tabs+main+rail) |
| `page.masthead` | `tiles` | `dos-page-masthead` | hero with eyebrow/title/subtitle/gradient |
| `page.header` | `breadcrumb` | `dos-page-header` | breadcrumb + title + actions |
| `page.tabs` | `tabs` | `dos-tabs` | tab navigation within pages |
| `page.widget-frame` | `tiles` | `dos-widget-frame` | dynamic widget chrome (5 variants, 4 states) |

#### Group 7: Tile primitives — Carbon-backed variants (4)

Canonical registry keys for tile shells reused across strips, dashboards, and
composed surfaces. Implementation primitive: `DosCarbonTileComponent`
(`selector: 'dos-carbon-tile'`) under `src/carbon/`; variant semantics live in
binding `props.variant` and Carbon tile classes (`cds--tile`, `cds--tile--clickable`, …).

| `component_key` | `carbon_key` | Selector | Purpose |
|---|---|---|---|
| `workspace.selectable-tile` | `tiles` | `dos-carbon-tile` | read-only / selectable tile chrome |
| `workspace.clickable-tile` | `tiles` | `dos-carbon-tile` | actionable tile (click / navigation affordance) |
| `workspace.expandable-tile` | `tiles` | `dos-carbon-tile` | expandable tile grouping pattern |
| `workspace.ai-tile` | `tiles` | `dos-carbon-tile` | AI-forward tile styling slot (tokens + layout contract) |

All vendor-locked to `ibm-carbon` (`trg_carbon_only_runtime`). Pre-existing rows in
`dos.dynamic_ui_component_registry` (Phase WS-1 migration) — the publisher idempotently
re-asserts.

### 2.2 Permissions (7)

| `permission_code` | Sensitive |
|---|---|
| `workspace.shell.read` | no |
| `workspace.shell.manage` | yes |
| `workspace.search.use` | no |
| `workspace.workqueue.read` | no |
| `workspace.agents.observe` | no |
| `workspace.inbox.read` | no |
| `workspace.records.create` | no |

### 2.3 Roles (2)

- `workspace_shell_viewer` — all read perms.
- `workspace_shell_admin` — adds `workspace.shell.manage`.

### 2.4 i18n keys (156 keys x 2 locales = 312 rows)

Namespace coverage:

| Namespace | Key count | Coverage |
|---|---|---|
| `shell.*` | 82 | Header chrome, account menu, command search, ARIA labels, sidenav, drawer, mobile nav, banners, breadcrumb, skeleton, error states, group icons, brand/tenant prefixes, disabled nav reasons |
| `nav.group.*` | 10 | Sidebar group labels (workspace, core, tenant, foundation, modules, primary, secondary, platform, config-center, misc) |
| `nav.item.*` | 30 | Sidebar item labels (all 36 modules + workspace pages) |
| `status.*` | 11 | Tenant status (4), health status (3), sync status (3), plus 1 placeholder |
| `role.*` | 4 | Owner, tenant owner, admin, member |
| `common.*` | 2 | Retry, dismiss |
| `page.*` | 4 | Loading, error title, empty title, empty description |

Authoritative source: `workspace-shell-complete-direct-seed.json#/i18n`.

### 2.5 Backing tables created by publisher

- `dos.workspace_shell_i18n(ns, key, locale, value, version, updated_at)` — DB-driven label store consumed by `GET /api/ui-os/workspace-shell-i18n/:tenantId?locale=`.
- `dos.workspace_shell_status_label(catalog, code, label_key, tone, icon)` — replaces in-FE `STATUS_LABELS` map.
- `dos.module_contract_errors(module_code, contract_version, error_type, error_path, message, severity, created_at)` — publisher write target.
- `dos.module_contract_publish_log(module_code, contract_version, sql_hash, applied_at, applied_by, summary)` — publisher provenance.

## 3. Provisioning group — per tenant

The publisher seeds `dos.workspace_shell_binding` (**30 rows × N tenants**) with
non-empty `props` payloads (per §5 below). Existing rows get UPDATE; new
tenants pick up via tenant-provisioning.

| Table | Required seed |
|---|---|
| `dos.workspace_shell_binding` | 30 enabled rows per tenant, `props` non-empty |
| `dos.workspace_shell_i18n` | full `shell.*`, `nav.*`, `status.*`, `role.*`, `common.*`, `page.*` catalog x en + ar |
| `dos.workspace_shell_status_label` | tenant / health / sync catalogs |

## 4. Business / operations group

Shell host has no business tables. All business data is read from sibling
services through their published APIs:

| Surface | Source service | Endpoint |
|---|---|---|
| `workspace.action-queue` | `workflow-service` | `/api/workflow/tasks/recent` |
| `workspace.agent-strip` | `ai-engine-service` | `/api/agents/runs/active` |
| `workspace.inbox-center` | `notification-service` | `/api/notifications/inbox` |
| `workspace.status-bar`   | `dnoc-service` + `tenant-service` + `ui-os-service` | aggregated by ui-os |
| `workspace.command-search` | `ui-os-service` | `/api/ui-os/search` |
| `page.tabs` | `ui-os-service` | `dos.ui_route_tab` via template-binding |
| `page.widget-frame` | `ui-os-service` | `dos.dynamic_ui_widgets` via widget resolver |

## 5. Page seed matrix

N/A — workspace-shell owns no pages (it is the shell that hosts every page).
Per-surface props payloads (the equivalent unit) are in
`workspace-shell-complete-direct-seed.json#/seeds[0].rows[]`.

### 5.1 Binding row props summary (30 rows)

| Component | Key props |
|---|---|
| `shell.app` | `responsive_breakpoint`, desktop/mobile component refs |
| `shell.desktop` | sidebar/header component refs |
| `shell.mobile` | drawer/header/bottom-nav component refs |
| `shell.desktop-sidebar` | `collapsible`, rail/expanded widths, nav component ref |
| `workspace.header` | brand/title i18n keys, home route, trailing actions, account menu ref |
| `workspace.sidebar` | aria key, nav source, search placeholder key |
| `workspace.mobile-nav` | max items, nav source, aria key |
| `shell.mobile-drawer` | title/close i18n keys, nav component ref |
| `shell.workspace-nav` | nav source, section/item component refs |
| `shell.nav-section` | `collapsible`, icon source |
| `shell.nav-item` | badge, disabled reason i18n keys (7 reasons) |
| `workspace.command-search` | placeholder/aria/empty keys, categories, mobile fullscreen |
| `workspace.status-bar` | 3 signal definitions (health, tenant, sync) |
| `workspace.action-queue` | title/aria/empty keys, source service, page size |
| `workspace.agent-strip` | title/empty keys, source service, live updates |
| `workspace.inbox-center` | title/aria/empty/toggle keys, source service, mobile mode |
| `workspace.context-panel` | title key, 4 tab definitions |
| `workspace.quick-create` | title/aria/fab-glyph keys, variant, mobile mode, actions source |
| `shell.account-menu` | aria/fallback keys, 4 menu entries, language/theme toggles |
| `shell.banner-strip` | 2 banner definitions (trial-expired, offline) |
| `shell.toast-outlet` | position, max visible, auto-dismiss timing |
| `page.layout` | 5 zone names, masthead/tabs component refs |
| `page.masthead` | gradient/mesh/hairline tokens |
| `page.header` | breadcrumb/skip-to-main i18n keys |
| `page.tabs` | source table, permission gating |
| `page.widget-frame` | default variant, loading/error/empty i18n keys |
| `workspace.selectable-tile` | `variant: selectable`, `clickable: false`, optional theme tokens |
| `workspace.clickable-tile` | `variant: clickable`, `clickable: true`, route vs button mode |
| `workspace.expandable-tile` | `variant: expandable`, expanded/collapsed i18n keys |
| `workspace.ai-tile` | `variant: ai`, accent token refs for AI mesh surfaces |

## 6. Direct SQL seed skeleton

Not hand-edited. The publisher `sql-emitter.mjs` reads the `.json` and emits an
idempotent SQL bundle:

```text
BEGIN;
-- 1. UPSERT 30 components into dos.dynamic_ui_component_registry
-- 2. UPSERT 7 permissions into platform_dauth.permissions
-- 3. UPSERT 2 roles + role_permissions
-- 4. UPSERT 312 i18n rows into dos.workspace_shell_i18n
-- 5. UPSERT status labels into dos.workspace_shell_status_label
-- 6. UPSERT 30 per-tenant binding rows into dos.workspace_shell_binding
-- 7. INSERT publish-log row into dos.module_contract_publish_log
COMMIT;
```

## 7. Required chain per surface

```text
.json contract row
-> dos.dynamic_ui_component_registry (vendor + carbon_key)
-> dos.workspace_shell_binding (tenant + props)
-> GET /api/ui-os/workspace-shell/:tenantId
-> WorkspaceShellBindingService (FE)
-> ShellHostComponent <dos-workspace-*> / <dos-shell-*> / <dos-page-*>
-> Carbon design tokens (CSS custom properties)
-> rendered surface
```

## 8. Status rules

A row is not seed-ready until:

- Component file exists under `platform/ui-system/dos-ui-system/src/shell/` or `src/components/`.
- Selector matches `.json#/components[].selector`.
- Barrel re-exports the file.
- `dos.workspace_shell_binding.props` is non-empty for every enabled tenant.
- `dos.workspace_shell_i18n` covers every i18n key referenced by props.
- `pnpm module:verify workspace-shell` exits 0.

Allowed status values: `COMPLETE`, `PARTIAL`, `BLOCKED`.

Current status: **PUBLISHED** (v2.1.0 — **30** registry rows across **7** groups, aligned with `WORKSPACE_SHELL_KEYS` including Group 7 tile primitives).

## 9. Publisher commands

```bash
pnpm module:validate workspace-shell      # AJV + cross-ref against repo
pnpm module:dry-run  workspace-shell      # SQL plan to /tmp + DB diff
pnpm module:publish  workspace-shell      # idempotent apply
pnpm module:activate workspace-shell --tenant=<id>   # no-op (platform-DNA)
pnpm module:verify   workspace-shell      # post-apply checks
pnpm module:list                           # show all modules + state
```

## 10. Spec-discipline rules (apply to this file forever)

1. **Append-only `.md`.** CI guard `seed-pack-md-json-parity.mjs` fails if any
   `-` line appears outside an explicit REOPENED block.
2. **`.md` and `.json` parity.** Every section here has a corresponding key in
   the `.json`; the publisher refuses to run on drift.
3. **Closed sections are sealed.** Use `## Appendix N — REOPENED YYYY-MM-DD — reason: …`
   to supersede. Original closed line is annotated `> superseded by REOPENED block below`,
   never removed.
4. **Reality ⊆ Spec (read one way).** Everything shipped as product truth must be
   represented in this contract (direct row or appendix). **Never** shrink §2.1 to
   match partial hosts: missing wiring stays `PARTIAL`/`BLOCKED` until fixed.
   When the publisher discovers code/DB facts not yet mirrored here, it
   auto-appends to `## Appendix Z — Codebase extras (auto-discovered)` and writes
   WARNING rows to `dos.module_contract_errors`.
5. **No manual writes** to `dos.workspace_shell_binding`, `dos.workspace_shell_i18n`,
   `dos.workspace_shell_status_label`, `dos.dynamic_ui_component_registry`
   (workspace.* / shell.* / page.* rows). DB trigger `trg_published_by_only` on those
   tables rejects rows missing `metadata.published_by='contract-publisher@v1'`.

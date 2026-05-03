# Workspace Shell — Complete Direct Seed Content

> Module #0 of the DOS Module Contract Publisher. This is the platform-DNA
> shell host (12 surfaces) on which every page archetype renders. Authored to
> the Universal Module Seed Standard (`00-universal-module-seed-standard.md`)
> and validated against `00-universal-module-contract.schema.json`.
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
| `version` | `1.0.0` |
| `is_platform_dna` | `true` |
| `route_base` | `null` (shell hosts pages, owns no route) |

## 2. Initialization group — global one-time seed

### 2.1 Carbon component registry — 10 `workspace.*` keys

| `component_key` | `carbon_key` | Selector |
|---|---|---|
| `workspace.header`         | `ui-shell`  | `dos-workspace-header` |
| `workspace.sidebar`        | `ui-shell`  | `dos-workspace-sidebar` |
| `workspace.mobile-nav`     | `tiles`     | `dos-mobile-bottom-nav` |
| `workspace.command-search` | `search`    | `dos-command-search` |
| `workspace.status-bar`     | `tag`       | `dos-workspace-status-bar` |
| `workspace.action-queue`   | `tiles`     | `dos-action-queue` |
| `workspace.agent-strip`    | `tiles`     | `dos-agent-activity-strip` |
| `workspace.inbox-center`   | `modal`     | `dos-inbox-center` |
| `workspace.context-panel`  | `accordion` | `dos-context-panel` |
| `workspace.quick-create`   | `button`    | `dos-quick-create` |

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

### 2.4 i18n keys (44 keys × 2 locales = 88 rows)

Namespace `shell` covering: header chrome, account menu, command search,
notifications/help/theme/language ARIA, side-nav ARIA, inbox / quick-create /
action-queue / agent-strip / context-panel / status-bar titles & emptys,
4 context-panel tabs, 3 status-bar signal labels, 11 status pill values
(`status.tenant.*`, `status.health.*`, `status.sync.*`).

Authoritative source: `workspace-shell-complete-direct-seed.json#/i18n`.

### 2.5 Backing tables created by publisher

- `dos.workspace_shell_i18n(ns, key, locale, value, version, updated_at)` — DB-driven label store consumed by `GET /api/ui-os/workspace-shell-i18n/:tenantId?locale=`.
- `dos.workspace_shell_status_label(catalog, code, label_key, tone, icon)` — replaces in-FE `STATUS_LABELS` map.
- `dos.module_contract_errors(module_code, contract_version, error_type, error_path, message, severity, created_at)` — publisher write target.
- `dos.module_contract_publish_log(module_code, contract_version, sql_hash, applied_at, applied_by, summary)` — publisher provenance.

## 3. Provisioning group — per tenant

The publisher seeds `dos.workspace_shell_binding` (10 rows × N tenants) with
non-empty `props` payloads (per §5 below). Existing 400 rows get UPDATE; new
tenants pick up via tenant-provisioning.

| Table | Required seed |
|---|---|
| `dos.workspace_shell_binding` | 10 enabled rows per tenant, `props` non-empty |
| `dos.workspace_shell_i18n` | full `shell.*` and `status.*` catalog × en + ar |
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

## 5. Page seed matrix

N/A — workspace-shell owns no pages (it is the shell that hosts every page).
Per-surface props payloads (the equivalent unit) are in
`workspace-shell-complete-direct-seed.json#/seeds[0].rows[]`.

## 6. Direct SQL seed skeleton

Not hand-edited. The publisher `sql-emitter.mjs` reads the `.json` and emits an
idempotent SQL bundle:

```text
BEGIN;
-- 1. UPSERT components into dos.dynamic_ui_component_registry
-- 2. UPSERT permissions into platform_dauth.permissions
-- 3. UPSERT roles + role_permissions
-- 4. UPSERT i18n into dos.workspace_shell_i18n
-- 5. UPSERT status labels into dos.workspace_shell_status_label
-- 6. UPSERT per-tenant binding rows into dos.workspace_shell_binding
-- 7. INSERT publish-log row into dos.module_contract_publish_log
COMMIT;
```

## 7. Required chain per surface

```text
.json contract row
→ dos.dynamic_ui_component_registry (vendor + carbon_key)
→ dos.workspace_shell_binding (tenant + props)
→ GET /api/ui-os/workspace-shell/:tenantId
→ WorkspaceShellBindingService (FE)
→ ShellHostComponent <dos-workspace-*>
→ Carbon primitive
→ rendered surface
```

## 8. Status rules

A row is not seed-ready until:

- Component file exists under `platform/ui-system/dos-ui-system/src/shell/`.
- Selector matches `.json#/components[].selector`.
- Barrel re-exports the file.
- `dos.workspace_shell_binding.props` is non-empty for every enabled tenant.
- `dos.workspace_shell_i18n` covers every i18n key referenced by props.
- `pnpm module:verify workspace-shell` exits 0.

Allowed status values: `COMPLETE`, `PARTIAL`, `BLOCKED`.

Current status: **PUBLISHED** (this contract is the first one to publish under the new pipeline).

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
4. **Reality ⊆ Spec.** When the publisher discovers code/DB facts not in this
   contract, it auto-appends them to `## Appendix Z — Codebase extras
   (auto-discovered)` and writes WARNING rows to `dos.module_contract_errors`.
5. **No manual writes** to `dos.workspace_shell_binding`, `dos.workspace_shell_i18n`,
   `dos.workspace_shell_status_label`, `dos.dynamic_ui_component_registry`
   (workspace.* rows). DB trigger `trg_published_by_only` on those tables
   rejects rows missing `metadata.published_by='contract-publisher@v1'`.

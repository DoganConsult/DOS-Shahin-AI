# Phase 1 — Foundation route/nav contract inventory & runtime publication proof

Generated: 2026-05-07
Probe user: foundation-probe-001@dos.local · tenant 65f10f855eab8b30
Runtime: GET /api/ui-os/workspace-runtime?product_code=foundation → HTTP 200 (31,802 bytes)

## 0. Per-route inventory (canonical 4 user-mandated routes + Foundation home/users)

| field | /foundation/overview | /foundation/access-review | /foundation/delegations | /foundation/users |
|---|---|---|---|---|
| route_key (item_id) | foundation.overview | foundation.access-review | foundation.delegations | foundation.users |
| route_path | /foundation/overview | /foundation/access-review | /foundation/delegations | /foundation/users |
| label_key | modules.foundation.nav.overview | modules.foundation.nav.accessReview | modules.foundation.nav.delegations | modules.foundation.nav.users |
| label_en | Overview | Access review | Delegations | Users |
| label_ar | نظرة عامة | مراجعة الصلاحيات | التفويضات | المستخدمون |
| sort_order (item) | 10 | 40 | 20 | 10 |
| group_id | foundation.group.organization | foundation.group.governance | foundation.group.governance | foundation.group.identity |
| group_sort | 10 | 30 | 30 | 20 |
| permission | foundation.read | access_review.write | foundation.read | foundation.user.read |
| component_key | module.entry.page | module.workflows.page | module.delegation_center.page | module.records.page |
| renderer_key (component) | (registry: vendor=ibm-carbon, carbon=grid) | (registry: vendor=ibm-carbon, carbon=tabs) | (registry: vendor=ibm-carbon, carbon=table) | (registry: vendor=ibm-carbon, carbon=table) |
| carbon_key | grid | tabs | table | table |
| COMPONENT_MAP hit (sidebar nav) | yes (shell.sidebar-nav) | yes | yes | yes |
| DB source — nav | dos.ui_module_nav_item / dos.ui_module_nav_group | same | same | same |
| DB source — route | dos.dynamic_ui_routes (sort 10) | dos.dynamic_ui_routes (sort 130) | dos.dynamic_ui_routes (sort 120) | dos.dynamic_ui_routes (sort 70) |
| DB source — template | dos.ui_route_template_binding (command-home → ModuleOverviewTemplateComponent) | (workflow-control → ModuleAssessmentsTemplateComponent) | (delegation-center → DelegationCenterTemplateComponent) | (intelligent-register → ModuleRecordsTemplateComponent) |
| DB source — route_metadata | dos.dynamic_ui_route_metadata (template, is_public=f) | same | same | same |
| Emitted in /workspace-runtime | YES (sidebar item + main page-cards) | **NO — perm filtered** | YES | YES |
| Browser DOM proof target | `[data-nav-id='foundation.overview']` + `<router-outlet>` host = `<dos-template-page>` | `[data-nav-id='foundation.access-review']` (gated) | `[data-nav-id='foundation.delegations']` | `[data-nav-id='foundation.users']` |

## 1. Acceptance gap report

### 1.1 DB nav order vs runtime nav order — DRIFT

- DB enabled rows for `module_code='foundation'`: **24** (verified in `02-db-nav-rows.tsv`)
- Runtime emitted nav items: **18** (verified in `01-runtime-payload.full.json`)
- Dropped (perm-filtered) — **6 rows**:

| item_id | route | required perm | drop reason |
|---|---|---|---|
| foundation.access-review | /foundation/access-review | access_review.write | probe user lacks `access_review.write` |
| foundation.permissions | /foundation/permissions | foundation.rbac.read | probe user lacks `foundation.rbac.read` |
| foundation.ownership | /foundation/ownership | foundation.data.read | probe user lacks `foundation.data.read` |
| foundation.sod | /foundation/sod | foundation.sod.write | probe user lacks `foundation.sod.write` |
| foundation.hierarchy-viz | /foundation/hierarchy-viz | foundation.hierarchy.read | probe user lacks `foundation.hierarchy.read` |
| foundation.diagnostics | /foundation/diagnostics | foundation.module.read | probe user lacks `foundation.module.read` |

**Reason: doctrinally correct perm filtering, NOT silent drop.** All drops are governed by DB rows. Empty-DB-perm → empty-runtime-nav rule honored. The fix path (Phase 6/7 of HARD RULES) is to grant probe user the missing perms (DB seed) so the user-mandated `/foundation/access-review` deep-check route is emitted into runtime.

Within the emitted 18 items, the order matches DB: groups [organization=10, identity=20, governance=30, main=40] in `sortOrder` ascending; items within each group in DB `sort_order` ascending.

### 1.2 Routes table (`dos.dynamic_ui_routes`) coverage

DB has 21 routes; nav has 24 enabled items (some main-group items lack route rows). The 4 deep-check routes all have route rows + template_binding rows. ✓

### 1.3 Template binding payload completeness — Phase 5 gap

For all 21 foundation rows in `dos.ui_route_template_binding`:
- `title_en` — populated ✓
- `subtitle_en` — **EMPTY** for all 21 rows ✗
- `eyebrow_en` — **EMPTY** for all 21 rows ✗
- `primary_action` — **NULL** for all 21 rows ✗
- `status_tags` — verify in next phase

### 1.4 Component registry / Carbon mapping

All `module.*.page` rows in `dos.dynamic_ui_component_registry` have `vendor='ibm-carbon'` ✓ and a non-null `carbon_key` ✓.
However: `renderer_key` is **EMPTY** for all `module.*.page` rows. This means there is no per-component-key entry in `COMPONENT_MAP` to mount these on the `main` zone. The page rendering flow today routes through Angular Router → `<router-outlet>` → `DynamicTemplatePageComponent`, which loads the `template_export` from `ui_route_template_binding`. Phase 6 must verify this path is the canonical Carbon mount and not a `DynamicPageHostComponent` silent fallback.

## 2. Shell zones inventory (workspace-runtime)

- `header` (12 surfaces): 7 structural shell-frame primitives + 5 visual (brand, workspace-title, global-quick-actions, settings-action, user-menu).
  - **Phase 5 gap**: `workspace.shell.brand.props` has no `text`/`logoUri` keys; `workspace.shell.workspace-title.props` has no `text`/`eyebrow`. Render-only components default to `''` → empty visual brand and title strip in DOM. Fix is DB seed, not component code.
- `sidebar` (6 surfaces): 5 structural shell-frame primitives + 1 visual (`workspace.shell.sidebar-nav` with `props.items` containing 18 nav items).
- `main` (3 surfaces): 2 structural shell-frame primitives + 1 visual (`workspace.shell.module-cards`). Per-route page content is delivered via `<router-outlet>` from `template-binding.routes.ts`.

## 3. Active-route mechanism — Phase 3 finding

- Canonical live path: `DosShellSidebarNavComponent` (`shell.sidebar-nav`) — `isActive(item)` matches `router.url` against `action.path`.
- **Bug**: component is `OnPush` and does not subscribe to `Router.events`/`NavigationEnd`. After SPA navigation, change detection does not run, so `isActive()` is never re-evaluated → highlight stays on the originally-loaded route.
- **Duplicate path detected**: `DosWorkspaceSidebarComponent` (`shell.workspace-sidebar`) is mapped in `COMPONENT_MAP` but **runtime never emits this rendererKey**. It is a dead path with its own `routerLinkActive` implementation. Phase 3 acceptance "one active-state mechanism only" requires removing it from `COMPONENT_MAP` (and ideally deleting the file).

## 4. Files audited (canonical paths only)

- `platform/foundation/contracts/` (canonical; `modules/foundation/contracts/` does NOT exist)
- `platform/core/platform/shell/shell-host.component.ts` (render-only, DB-driven, OK)
- `platform/core/platform/shell/workspace-shell-binding.service.ts` (consumer)
- `platform/ui-system/dos-ui-system/src/shell/visual-shell-surfaces.component.ts` (renderers; `DosShellSidebarNavComponent` lives here)
- `platform/ui-system/dos-ui-system/src/shell/workspace-sidebar.component.ts` (DEAD duplicate)
- `services/ui-os-service/src/routes/workspace-shell.routes.ts` (UI-OS resolver; emits camelCase, action.kind/action.path)
- `services/ui-os-service/src/routes/template-binding.routes.ts` (route content resolver)

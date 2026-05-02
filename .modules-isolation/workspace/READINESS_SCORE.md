# Module Enrolment Readiness Scorecard

Scoring each of the 6 enrolment layers against the workspace state in
`.modules-isolation/workspace/`. Score = (artifacts present in workspace) /
(artifacts required by the live-tree contract described in the spec).

| # | Layer | What live-tree wants | What workspace ships | Score |
|---|---|---|---|---:|
| 0 | Module bundle on disk | `module.manifest.json` + `contracts/{navigation,permissions,routing,dynamic-ui}.json` per module | 19 `<code>.profile.json` (lifecycle + perms + roles + workflows + RACI + KPIs); navigation + dynamic-ui carried as DB seeds; **no `routes.json`**; no per-module `module.manifest.json` (consolidated into profile manifests) | **8/10** |
| 1 | Tenant entitlement | `dos.tenant_product_activation` + `dos.tenant_module_entitlements` + trial-bundle writer | `dos.profile_registry` + `dos.tenant_profile` + `dos.resolve_profile_code()`; **no module-entitlement table seed**, no trial-bundle generator | **5/10** |
| 2 | Permission catalogue + role grants | `<schema>.permissions` + `<schema>.role_permissions` from manifest `roleDefaults`; platform-catalogue seeder; per-tenant RBAC seeder | `permissions.registry.json` (180), `roles.registry.json` (90), `scopes.registry.json` (6); `apply-permission-rewrites.sh` rewrite preview; **no `<schema>.permissions` SQL seed, no role-defaults SQL projection** | **6/10** |
| 3 | Navigation source (WorkspaceNavigationAdapter L1–L6) | Seed rows in `dos.dynamic_ui_navigation` (L1) + product `navigationComposition.primary[]` (L4) + DNA static list (L2) | `08_ui_navigation.sql` (72 nodes seeded into `dos.ui_navigation`, profile-scoped); `workspace-cards.json` mirrors L4 product composition; **L1 table named `dos.ui_navigation` not `dos.dynamic_ui_navigation`** (rename/alias needed for live-tree port); no DNA static list emitter | **7/10** |
| 4 | Filter pipeline (visibility) | `requiredPermission`, `tier`, trial state, disabled-reason precedence | Every `ui_route`/`ui_view`/`ui_column`/`ui_action`/`ui_navigation`/`ui_form`/`ui_widget` carries `required_permission`; `canAccess()` helper in TS contracts; **no `tier` column on `ui_module`, no trial-state hooks, no disabled-reason enum** | **6/10** |
| 5 | Render (`<dos-workspace-nav>` via `@dos/ui-system`) | Adapter consumes `navConfig()` → ShellHostComponent | TS contracts (`DynamicUiClient.resolveCards/resolveNavigation`), `workspace-shell.config.json`; **no Angular `ShellHostComponent` binding code** (out-of-scope of isolation workspace) | **5/10** |
| 6 | Dynamic-UI page views inside module (Phase D) | `dos.dynamic_ui_pages` + `dos.ui_views_*` keyed by `contractRoute` | `dos.ui_view` (72 rows) + `dos.ui_column` (144) + `dos.ui_filter` (72) + `dos.ui_action` (144) + `dos.ui_form` (18) + `dos.ui_widget` (54), all profile-scoped; **table name is `dos.ui_view` not `dos.dynamic_ui_pages`** (live-tree alias/migration needed) | **8/10** |

## Per-step process readiness (8 enrolment steps)

| Step | Spec wants | Workspace status | Score |
|---|---|---|---:|
| 1. Author bundle on disk | `modules/<code>/{module.manifest.json, contracts/*}` | `profiles/grc/manifests/<code>.profile.json` (consolidated equivalent) | **9/10** |
| 2. Register in `dos.module_registry` | DAuth seed-time row insertion | Profile registry (`dos.profile_registry`) seeded; **no `module_registry` insert per profile module** | **5/10** |
| 3. Activate per tenant | `DEFAULT_TENANT_PRODUCTS` env + `createTrialBundle` allowed-modules list | `dos.tenant_profile` row + `dos.resolve_profile_code()` fallback to `'grc'`; **no allowed-modules list / trial-bundle codegen** | **6/10** |
| 4. Seed permissions + role bindings | platform catalogue + tenant RBAC seeders | `permissions.registry.json` + `roles.registry.json` declarative; **no SQL emitter that turns them into `<schema>.permissions` + `<schema>.role_permissions`** | **6/10** |
| 5. Expose in shell sidebar | product `navigationComposition.primary[]` OR `dos.dynamic_ui_navigation` row | `workspace-cards.json` (19 cards) + `08_ui_navigation.sql` (72 nodes) | **9/10** |
| 6. Wire routes | `loadChildren` in `app.routes.ts` | **deliberately out of scope of isolation workspace** | **3/10** |
| 7. (Optional) DB-driven page contracts | `dos.dynamic_ui_pages` rows keyed by `contractRoute` | `dos.ui_view` rows (72) — same intent, different name | **8/10** |
| 8. Validate end-to-end | runtime smoke + `pnpm verify:imports` | `validate-profile.sh grc` PASS; `dependency-cruiser` boundary rules in place; **no live runtime smoke (no internet, no DB)** | **6/10** |

## Aggregate

| Bucket | Avg score |
|---|---:|
| Layers 0–6 | **6.4 / 10** |
| Steps 1–8  | **6.5 / 10** |
| **Overall enrolment readiness** | **6.5 / 10** |

## Top gaps to reach 9+/10

1. **Add `dos.module_registry` seed per profile module** (one row per `(profile_code, module_code)`).
2. **Emit `<schema>.permissions` + `<schema>.role_permissions` SQL** from `permissions.registry.json` + `roles.registry.json`.
3. **Add `tier` enum** (`dna|module|product`) to `dos.ui_module` so the visibility filter pipeline (L4) can run.
4. **Rename / alias** the workspace tables to live-tree names: `dos.ui_navigation → dos.dynamic_ui_navigation`, `dos.ui_view → dos.dynamic_ui_pages` (or add `CREATE VIEW` aliases on port).
5. **Trial-bundle generator** — emit allowed-modules list per profile so `createTrialBundle` can pick it up.
6. **Routes seed** — add `routes.json` per module under `profiles/<p>/manifests/<code>/routes.json` for L4 + Angular lazy-load codegen.
7. **DNA static nav-list emitter** to fill the L2 source for `tier='dna'` modules (Foundation).

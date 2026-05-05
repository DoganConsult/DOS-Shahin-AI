# DOS / Shahin Module Direct Seed Pack — Full Review

**Review date:** 2026-05-05  
**Scope:** all uploaded `*-complete-direct-seed.md`, JSON twins, aggregate seed files, workspace shell, and supporting seed-pack standards/plans in `/mnt/data`.  
**Mode:** document and contract review only. No live DB, gateway, SPA, PM2, or Playwright runtime validation was executed in this review.

## 1. Executive verdict

**Overall verdict: PARTIAL / NOT READY FOR DIRECT PUBLISH.**

The pack is useful as a baseline inventory, but it is not yet a safe direct-seed/publisher input for all modules. The main blocker is not one file; it is systematic: most MD files still use generic narrative shape, unresolved Carbon placeholders, vague RBAC prose, two-segment permission keys that violate the direct-seed standard for Dynamic UI route permissions, and `VERIFY` page rows without proof of Angular routes, APIs, backend routes, DB queries, tenant scope, and build status.

### Immediate judgement

| Area | Verdict | Reason |
|---|---|---|
| Seed-pack as documentation baseline | **PASS with gaps** | 34 module MD files are present and broadly follow a common narrative. |
| Seed-pack as executable direct seed | **FAIL / BLOCKED** | Most rows are comment skeletons, not runnable SQL/publisher payloads. |
| Asset consolidated pattern adoption | **FAIL except Asset** | Only `asset-complete-direct-seed.md` has §1a inventory, explicit role binding matrix, §7 reconciliation, and parity language. |
| Carbon readiness | **FAIL for MD-only modules** | 116 MD Dynamic UI rows still contain `VERIFY_CARBON_KEY`. |
| RBAC readiness | **FAIL for most modules** | Only Asset MD has explicit `(role_code, permission_code)` rows. Most modules still say `all module.*`, `read/write operational permissions`, or `read/audit permissions`. |
| Dynamic UI permission insert readiness | **FAIL for many rows** | The universal standard requires 3-segment `permission_key`; 64 MD Dynamic UI rows use 2-segment permissions such as `asset.read`. |
| Runtime proof | **NOT PROVEN** | All generic module page matrices are still `VERIFY`, and no live route/API/DB/build output is attached. |

## 2. Source-pack totals

| Metric from MD seeds | Count |
|---|---:|
| Module MD files | 34 |
| Navigation rows | 155 |
| Dynamic UI page rows | 116 |
| Permission rows | 191 |
| Role rows / role catalog entries | 171 |
| Explicit role→permission binding rows | 12 |
| Business tables listed | 106 |
| Page rows | 150 |
| Carbon placeholders `VERIFY_CARBON_KEY` | 116 |
| Dynamic route permission rows with 2-segment keys | 64 |

### JSON twins

| JSON file | Module | Permissions | Roles | Nav | Pages | Components | APIs | Tables owned | Carbon keys |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `config-center-complete-direct-seed.json` | `config-center` | 3 | 3 | 11 | 10 | 5 | 25 | 3 | grid, table, tabs, tiles |
| `dynamic-ui-complete-direct-seed.json` | `dynamic-ui` | 6 | 2 | 5 | 4 | 2 | 6 | 3 | grid, table |
| `foundation-complete-direct-seed.json` | `foundation` | 11 | 3 | 22 | 21 | 10 | 8 | 2 | grid, progress-indicator, structured-list, table, tabs |
| `workspace-shell-complete-direct-seed.json` | `workspace-shell` | 7 | 2 | 0 | 0 | 26 | 2 | 5 | accordion, breadcrumb, button, grid, modal, notification, overflow-menu, search, tabs, tag, tiles, ui-shell |

**Interpretation:** JSON twins are stronger than MD-only module files because they contain actual arrays, explicit role permission lists, and real Carbon keys. However, JSON existence alone is not enough: Dynamic UI and Foundation still document route/permission alignment gaps, and Config Center has a hub/redirect mismatch.

## 3. Standard conformance check

The uploaded `00-universal-module-seed-standard.md` and `00-CONSOLIDATED-DIRECT-SEED-SHAPE.md` establish these hard rules:

- Every touched module seed should move toward the Asset consolidated layout: `§1a` operational inventory, explicit role→permission binding matrix, `§7` reconciliation, and `§8` matrix parity checklist.
- `platform_dauth.permissions.permission_code` should be 3-segment form: `<module>.<entity>.<verb>`.
- `dos.dynamic_ui_routes.permission_key` must be 3+ segments; 2-segment values fail the route permission constraint.
- `dos.dynamic_ui_component_registry.vendor` must be `ibm-carbon`; `carbon_key` must be a valid FK to `dos.ui_carbon_components`.
- `dos.module_registry` does not contain `owner_service`, `category`, or `title_en`; those fields are narrative/manifest context, not direct column insert targets.
- `dos.navigation_registry` rows do not directly own permission enforcement; permission comes through the route/component binding for the matching route.
- Shared approved `module.*` component keys should be preferred before inventing per-module page component keys.

### Conformance result

| Rule | Result | Detail |
|---|---|---|
| Asset-style §1a inventory | **1 / 34** | Only `asset-complete-direct-seed.md`. |
| Final count reconciliation §7 | **1 / 34 effectively** | Asset has true reconciliation; workspace-shell has its own published shell format but not the same module shape. |
| Explicit RBAC matrix in MD | **1 / 34** | Asset has 12 explicit role→permission rows. |
| Carbon keys resolved in MD-only modules | **0 / 116 MD route rows** | Every MD dynamic page row using the generic pattern still says `VERIFY_CARBON_KEY`. |
| 3-segment permission compliance for dynamic routes | **Partial** | 64 Dynamic UI route rows use 2-segment permission values. |
| Page row status | **Not complete** | Generic module page matrices are still `VERIFY`. |

## 4. Cross-pack blockers

### P0 blockers — must fix before any direct SQL/publisher apply

1. **Do not publish the generic MD-only files as direct seeds.** The `Direct SQL seed skeleton` sections are comment plans, not executable or validated SQL. They do not specify real columns, conflict targets, tenant scoping, or verification queries.
2. **Replace every `VERIFY_CARBON_KEY`.** A page/component row cannot enter `dos.dynamic_ui_component_registry` with a placeholder key. Use approved Carbon keys from `dos.ui_carbon_components`, or map to shared `module.*` component keys already present in JSON twins.
3. **Normalize permission keys.** Dynamic route permission keys must be 3-segment form. Examples needing rewrite: `asset.read` → `asset.record.read` or `asset.module.read`; `policy.approve` → `policy.workflow.approve`; `analytics.export` → `analytics.report.export`.
4. **Replace vague RBAC prose with exact binding rows.** Every role must expand into one row per permission. `all module.*` and `read/write operational permissions` are not publisher-grade.
5. **Stop treating `dos.module_registry` narrative fields as DB columns.** The standard states `dos.module_registry` has `module_code`, `product_key`, `display_name`, `status`; `owner_service`, `category`, and `title_en` must not be blindly inserted into that table.
6. **Resolve aggregate-file conflict.** `ALL_MODULES_COMPLETE_DIRECT_SEED.md` and `ALL_OTHER_MODULES_COMPLETE_DIRECT_SEED.md` include older generic module content. They should become historical/legacy, not the canonical source, because individual files like Asset have moved forward.

### P1 blockers — required before acceptance sign-off

1. Add §1a operational inventory to every MD seed.
2. Add §7 final count reconciliation to every MD seed.
3. Add §8 validation checklist with matrix parity and Carbon verification checks to every MD seed.
4. For every page row, prove: route → Angular/DynamicTemplate renderer → API → backend route → DB query/table → permission → role binding → tenant/org scope.
5. Add JSON twins for the remaining 30 MD-only modules, or explicitly mark them `MD-only / not publisher-ready`.
6. Replace multiple-owner strings such as `service-a / service-b` with one owning service plus optional upstream/adapter dependency.

## 5. Module-by-module inventory and verdict

| Module | Status | Nav | Dynamic rows | Pages | Perms | Roles | Explicit bindings | DB tables | Carbon VERIFY | Distinct bad route permission codes | Main blockers |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `action` | GENERIC MD / blocked | 5 | 4 | 4 | 5 | 5 | 0 | 3 | 4 | 2 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 2 invalid 2-seg route perms |
| `agrc-engine` | GENERIC MD / blocked | 5 | 4 | 4 | 7 | 5 | 0 | 3 | 4 | 1 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 1 invalid 2-seg route perms |
| `ai-os` | GENERIC MD / blocked | 5 | 4 | 4 | 7 | 5 | 0 | 4 | 4 | 0 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; all pages VERIFY |
| `ai-platform` | RICH MD / blocked | 5 | 4 | 4 | 10 | 6 | 0 | 11 | 4 | 1 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 1 invalid 2-seg route perms |
| `analytics` | GENERIC MD / blocked | 5 | 4 | 4 | 5 | 5 | 0 | 4 | 4 | 2 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 2 invalid 2-seg route perms |
| `asset` | BEST MD / still blocked | 5 | 4 | 4 | 4 | 17 | 12 | 3 | 4 | 1 | 4 carbon VERIFY; 1 invalid 2-seg route perms; all pages VERIFY |
| `attestation` | GENERIC MD / blocked | 4 | 3 | 3 | 3 | 5 | 0 | 3 | 3 | 1 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 1 invalid 2-seg route perms |
| `audit` | GENERIC MD / blocked | 5 | 4 | 4 | 5 | 5 | 0 | 3 | 4 | 1 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 1 invalid 2-seg route perms |
| `bcp` | GENERIC MD / blocked | 5 | 4 | 4 | 5 | 5 | 0 | 3 | 4 | 1 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 1 invalid 2-seg route perms |
| `compliance` | RICH MD / blocked | 17 | 16 | 16 | 9 | 5 | 0 | 11 | 16 | 3 | missing §1a; missing §7; vague RBAC; 16 carbon VERIFY; 3 invalid 2-seg route perms |
| `config-center` | PARTIAL / code-truth gaps | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | missing §1a; missing §7 |
| `controls` | GENERIC MD / blocked | 5 | 4 | 4 | 5 | 5 | 0 | 3 | 4 | 1 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 1 invalid 2-seg route perms |
| `dora` | GENERIC MD / blocked | 5 | 4 | 4 | 6 | 5 | 0 | 4 | 4 | 1 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 1 invalid 2-seg route perms |
| `dynamic-ui` | PARTIAL / code-truth gaps | 0 | 0 | 4 | 21 | 0 | 0 | 0 | 0 | 0 | missing §1a; missing §7 |
| `evidence` | GENERIC MD / blocked | 5 | 4 | 4 | 5 | 5 | 0 | 3 | 4 | 1 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 1 invalid 2-seg route perms |
| `foundation` | PARTIAL / code-truth gaps | 0 | 0 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | missing §1a; missing §7 |
| `inbox` | GENERIC MD / blocked | 4 | 3 | 3 | 4 | 5 | 0 | 2 | 3 | 1 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 1 invalid 2-seg route perms |
| `incident` | GENERIC MD / blocked | 5 | 4 | 4 | 5 | 5 | 0 | 3 | 4 | 1 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 1 invalid 2-seg route perms |
| `issues` | GENERIC MD / blocked | 4 | 3 | 3 | 4 | 5 | 0 | 2 | 3 | 1 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 1 invalid 2-seg route perms |
| `knowledge` | GENERIC MD / blocked | 4 | 3 | 3 | 4 | 5 | 0 | 2 | 3 | 1 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 1 invalid 2-seg route perms |
| `ksa-regulatory` | GENERIC MD / blocked | 4 | 3 | 3 | 6 | 5 | 0 | 3 | 3 | 1 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 1 invalid 2-seg route perms |
| `mcp` | GENERIC MD / blocked | 4 | 3 | 3 | 5 | 5 | 0 | 2 | 3 | 1 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 1 invalid 2-seg route perms |
| `notification` | GENERIC MD / blocked | 4 | 3 | 3 | 4 | 5 | 0 | 2 | 3 | 1 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 1 invalid 2-seg route perms |
| `onboarding` | GENERIC MD / blocked | 4 | 3 | 3 | 5 | 5 | 0 | 2 | 3 | 1 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 1 invalid 2-seg route perms |
| `policy` | GENERIC MD / blocked | 5 | 4 | 4 | 5 | 5 | 0 | 3 | 4 | 2 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 2 invalid 2-seg route perms |
| `privacy` | GENERIC MD / blocked | 5 | 4 | 4 | 6 | 5 | 0 | 3 | 4 | 1 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 1 invalid 2-seg route perms |
| `qiyas` | GENERIC MD / blocked | 4 | 3 | 3 | 5 | 5 | 0 | 2 | 3 | 1 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 1 invalid 2-seg route perms |
| `remediation` | GENERIC MD / blocked | 4 | 3 | 3 | 4 | 5 | 0 | 2 | 3 | 1 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 1 invalid 2-seg route perms |
| `reporting` | GENERIC MD / blocked | 4 | 3 | 3 | 4 | 5 | 0 | 2 | 3 | 2 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 2 invalid 2-seg route perms |
| `risk` | GENERIC MD / blocked | 10 | 0 | 9 | 11 | 5 | 0 | 3 | 0 | 0 | missing §1a; missing §7; vague RBAC |
| `training` | GENERIC MD / blocked | 4 | 3 | 3 | 4 | 5 | 0 | 2 | 3 | 1 | missing §1a; missing §7; vague RBAC; 3 carbon VERIFY; 1 invalid 2-seg route perms |
| `vendor` | GENERIC MD / blocked | 5 | 4 | 4 | 5 | 5 | 0 | 3 | 4 | 1 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 1 invalid 2-seg route perms |
| `workflow` | GENERIC MD / blocked | 5 | 4 | 4 | 6 | 5 | 0 | 3 | 4 | 1 | missing §1a; missing §7; vague RBAC; 4 carbon VERIFY; 1 invalid 2-seg route perms |
| `workspace-shell` | STRONG / verify runtime | 0 | 0 | 0 | 7 | 8 | 0 | 7 | 0 | 0 | missing §1a |

## 6. Key special-case findings

### 6.1 Asset

Asset is the best MD file and should remain the golden pattern. It has §1a operational inventory, explicit 12-row role→permission matrix, and §7 count reconciliation. It is still not publish-ready because all four page rows still use `VERIFY_CARBON_KEY`, and its dynamic route permission examples are still two-segment values such as `asset.read`.

**Action:** Use Asset as the shape template, but update its permissions to 3-segment codes and replace Carbon placeholders before copying it to other modules.

### 6.2 Workspace Shell

Workspace Shell is not a normal business module; it is the shell host. It is strong structurally: 26 components across six groups, seven permissions, two roles, 312 i18n rows, and 26 per-tenant binding rows. It should be validated through the publisher pipeline and runtime shell probes, not by the normal page seed matrix.

**Action:** Keep it separate from the 34 business/module seed count. Verify `workspace-shell` by `module:validate`, `module:dry-run`, `module:publish`, `module:verify`, plus visual shell smoke.

### 6.3 Foundation

Foundation is materially stronger than generic modules because it has a JSON twin and a Single Source of Truth MD. But it has explicit alignment gaps: JSON uses `foundation.module.read`, `foundation.data.read`, etc.; Shahin guard currently uses module entitlement plus `foundation.read`; backend routes use a mixture including `foundation.read`, `foundation.record.write`, `foundation.user.read`, `organization.read`, `access_review.read`, and `audit_trail.read`.

**Action:** Decide the canonical permission namespace and map/seed every JSON permission code into DAuth. Then enforce per-page permissions at route/resolver/API level. Do not rely on one coarse `foundation.read` guard for pages requiring `foundation.sod.write` or `foundation.user.write`.

### 6.4 Dynamic UI

The JSON twin is clean and uses valid Carbon keys, but the MD documents a critical route gap: the manifest assumes `/dynamic-ui/*`, while actual Shahin routing does not have a `path: dynamic-ui` branch. The MD also states that Components has no dedicated registry read endpoint unless implemented or reused from route-catalog/template-binding.

**Action:** Either add a `/dynamic-ui` route group that loads `DynamicTemplatePageComponent`, or move the manifest routes to existing URLs. Add or intentionally omit a components registry API with a documented renderer plan.

### 6.5 Config Center

Config Center is strong because it has a JSON twin and code-truth MD, but it still has a route semantic mismatch: manifest page `platform.config-center.hub` maps `/admin/config-center`, while the router redirects the empty path to `resolve`.

**Action:** Make a product choice: either preserve redirect and mark hub informational, or add a real hub route. Update JSON `apis[]` to reflect actual `/api/config-center/**` service paths.

### 6.6 Compliance and AI Platform

These are richer than most MD-only modules because they include more pages, stronger domain scope, and some component-file references. They are still blocked by unresolved Carbon keys, missing explicit role-binding rows, and `VERIFY` page statuses.

### 6.7 Remaining MD-only modules

Most remaining modules are generic scaffolds. They are acceptable as **inventory placeholders**, not as executable seed contracts. They need the Asset migration pass: §1a, exact RBAC matrix, §7, §8, Carbon keys, 3-segment permissions, and page evidence.

## 7. Permission normalization plan

Use this convention unless a module has an existing code-truth namespace:

| Old pattern | New route permission pattern | Notes |
|---|---|---|
| `<module>.read` | `<module>.module.read` or `<module>.record.read` | Use `module.read` for module landing/overview; `record.read` for registers. |
| `<module>.write` | `<module>.record.write` | Standard write permission for business records. |
| `<module>.admin` | `<module>.module.admin` | Admin/config action. |
| `<module>.approve` | `<module>.workflow.approve` | Approval transition. |
| `<module>.export` | `<module>.report.export` | Export/reporting. |
| `<module>.risk.read` | `<module>.risk.read` | Already 3 segments; acceptable. |
| `ai.read` | `ai.platform.read` or keep JSON code-truth if DAuth already uses `ai.read` outside dynamic route rows | Dynamic UI route rows need 3 segments. |

Do not mass-rename live backend permissions blindly. Create a mapping table first: `old_permission_code`, `new_permission_code`, `used_by_frontend`, `used_by_backend`, `used_by_dauth`, `migration_status`.

## 8. Carbon mapping plan

Most MD-only modules should not invent page-specific Carbon keys. Map page intent to shared archetype component keys:

| Page type | Preferred component_key | Candidate carbon_key |
|---|---|---|
| Module entry / overview / command home | `module.entry.page` or `module.overview.page` | `grid` / `tiles` |
| Register / records / library / tables | `module.records.page` | `table` |
| Workflow / approvals / actions | `module.workflows.page` | `tabs` / `progress-indicator` |
| Reports / audit / evidence ledger | `module.reports.page` or `module.audit_trail_ledger.page` | `table` |
| Settings / admin | `module.settings.page` | `tabs` |
| Org chart / hierarchy | `module.org_chart.page` | `structured-list` |
| Heatmap / posture | `module.posture.page` | `grid` |

The actual value must be checked against `dos.ui_carbon_components`. The report intentionally does not declare a final carbon_key for each generic row because that would be fake certainty without the live catalog query.

## 9. Required acceptance gates

### Gate A — static contract gate

- All 34 MD files have §1a, explicit RBAC matrix, §7, and §8.
- All JSON twins validate against `00-universal-module-contract.schema.json`.
- Every MD-only module has a JSON twin or is explicitly excluded from publisher scope.
- Zero `VERIFY_CARBON_KEY` remains in publishable rows.
- Zero 2-segment permission keys remain in `dos.dynamic_ui_routes` rows.
- Zero vague RBAC phrases remain in publishable sections.

### Gate B — database dry-run gate

- `dos.module_registry` insert targets only real columns.
- `dos.navigation_registry` insert targets only real columns and parent/child shape is correct.
- `dos.dynamic_ui_component_registry` rows satisfy `vendor = ibm-carbon` and valid `carbon_key` FK.
- `dos.dynamic_ui_routes.permission_key` satisfies route permission regex.
- `platform_dauth.permissions`, `functional_roles`, and `role_permissions` rows exist or are inserted idempotently.
- Tenant entitlement rows are applied only to selected tenant(s), not globally.

### Gate C — runtime route/API gate

- Browser can load workspace with only entitled modules in navigation.
- Every route in the seed returns a rendered page or an intentional redirect.
- Every page calls the correct API, not a sibling module endpoint.
- Every API returns 200/403 as expected, not 404.
- Negative RBAC test: user without permission cannot see/use restricted route/action.
- No mock/static data is used for production route rendering.

## 10. One-pass remediation sequence for the agent

Use this order. Do not expand scope.

```text
1. Freeze aggregates: mark ALL_MODULES_COMPLETE_DIRECT_SEED.md and ALL_OTHER_MODULES_COMPLETE_DIRECT_SEED.md as legacy reference only. Do not use them as publisher input.
2. Use asset-complete-direct-seed.md as the single MD shape template.
3. For each MD-only module, add §1a operational inventory and §7 final reconciliation.
4. Replace all vague Roles and bindings sections with exact role_code -> permission_code rows.
5. Normalize permissions used by dynamic route rows to 3-segment codes.
6. Replace VERIFY_CARBON_KEY with approved carbon_key from dos.ui_carbon_components, preferring shared module.* page component keys.
7. For each page row, verify or correct route -> renderer -> API -> backend route -> DB table/query -> permission -> binding -> tenant scope.
8. Create JSON twins for the 30 MD-only modules only after MD rows are clean.
9. Run schema validation, dry-run SQL generation, and DB constraint dry-run before any publish.
10. Runtime test one module per archetype first: asset, compliance, foundation, dynamic-ui, config-center, workspace-shell.
```

## 11. Module-specific notes

### `action`

- **File:** `action-complete-direct-seed.md`
- **Owner service text:** `workflow-service / action-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=5, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 2 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `action.approve`, `action.read`.

### `agrc-engine`

- **File:** `agrc-engine-complete-direct-seed.md`
- **Owner service text:** `ai-engine-service / agrc-engine`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=7, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `agrc.read`.

### `ai-os`

- **File:** `ai-os-complete-direct-seed.md`
- **Owner service text:** `ai-engine-service / ai-os`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=7, roles=5, explicitBindings=0, businessTables=4.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, all pages VERIFY.

### `ai-platform`

- **File:** `ai-platform-complete-direct-seed.md`
- **Owner service text:** `ai-gateway-service / ai-engine-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=10, roles=6, explicitBindings=0, businessTables=11.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `ai.read`.

### `analytics`

- **File:** `analytics-complete-direct-seed.md`
- **Owner service text:** `analytics-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=5, roles=5, explicitBindings=0, businessTables=4.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 2 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `analytics.export`, `analytics.read`.

### `asset`

- **File:** `asset-complete-direct-seed.md`
- **Owner service text:** `asset-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=4, roles=17, explicitBindings=12, businessTables=3.
- **Blocking findings:** 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `asset.read`.
- **Specific note:** best current MD shape; use as reference, but do not publish until Carbon and permission normalization are resolved.

### `attestation`

- **File:** `attestation-complete-direct-seed.md`
- **Owner service text:** `compliance-controls-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=3, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `attestation.read`.

### `audit`

- **File:** `audit-complete-direct-seed.md`
- **Owner service text:** `audit-service / evidence-audit-reporting-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=5, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `audit.read`.

### `bcp`

- **File:** `bcp-complete-direct-seed.md`
- **Owner service text:** `bcp-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=5, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `bcp.read`.

### `compliance`

- **File:** `compliance-complete-direct-seed.md`
- **Owner service text:** `governance-policy-service / compliance module`
- **Counts:** nav=17, dynamicRows=16, pages=16, permissions=9, roles=5, explicitBindings=0, businessTables=11.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 16 carbon VERIFY, 3 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `compliance.admin`, `compliance.read`, `compliance.write`.

### `config-center`

- **File:** `config-center-complete-direct-seed.md`
- **Owner service text:** `ui-os-service (template binding resolver); config HTTP served via gateway → tenant-service (/api/config-center)`
- **Counts:** nav=0, dynamicRows=0, pages=0, permissions=0, roles=0, explicitBindings=0, businessTables=0.
- **Blocking findings:** missing §1a, missing §7.
- **Specific note:** decide hub vs redirect behavior; ensure JSON APIs match actual `/api/config-center/**` client surface.

### `controls`

- **File:** `controls-complete-direct-seed.md`
- **Owner service text:** `compliance-controls-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=5, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `controls.read`.

### `dora`

- **File:** `dora-complete-direct-seed.md`
- **Owner service text:** `dora-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=6, roles=5, explicitBindings=0, businessTables=4.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `dora.read`.

### `dynamic-ui`

- **File:** `dynamic-ui-complete-direct-seed.md`
- **Owner service text:** `ui-os-service`
- **Counts:** nav=0, dynamicRows=0, pages=4, permissions=21, roles=0, explicitBindings=0, businessTables=0.
- **Blocking findings:** missing §1a, missing §7.
- **Specific note:** add or move `/dynamic-ui/*` routes before treating JSON navigation/pages as reachable.

### `evidence`

- **File:** `evidence-complete-direct-seed.md`
- **Owner service text:** `evidence-audit-reporting-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=5, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `evidence.read`.

### `foundation`

- **File:** `foundation-complete-direct-seed.md`
- **Owner service text:** `user-service (lazy-loads canonical platform/foundation/dist)`
- **Counts:** nav=0, dynamicRows=0, pages=21, permissions=0, roles=0, explicitBindings=0, businessTables=0.
- **Blocking findings:** missing §1a, missing §7.
- **Specific note:** use `foundation-complete-direct-seed.json` + code truth; reconcile JSON permission namespace with Shahin guard and backend `requirePermission` calls.

### `inbox`

- **File:** `inbox-complete-direct-seed.md`
- **Owner service text:** `notification-service / inbox-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=4, roles=5, explicitBindings=0, businessTables=2.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `inbox.read`.

### `incident`

- **File:** `incident-complete-direct-seed.md`
- **Owner service text:** `risk-incident-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=5, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `incident.read`.

### `issues`

- **File:** `issues-complete-direct-seed.md`
- **Owner service text:** `issue-service / remediation-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=4, roles=5, explicitBindings=0, businessTables=2.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `issues.read`.

### `knowledge`

- **File:** `knowledge-complete-direct-seed.md`
- **Owner service text:** `knowledge-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=4, roles=5, explicitBindings=0, businessTables=2.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `knowledge.read`.

### `ksa-regulatory`

- **File:** `ksa-regulatory-complete-direct-seed.md`
- **Owner service text:** `regulatory-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=6, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `ksa.read`.

### `mcp`

- **File:** `mcp-complete-direct-seed.md`
- **Owner service text:** `ai-engine-service / mcp-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=5, roles=5, explicitBindings=0, businessTables=2.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `mcp.read`.

### `notification`

- **File:** `notification-complete-direct-seed.md`
- **Owner service text:** `notification-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=4, roles=5, explicitBindings=0, businessTables=2.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `notification.read`.

### `onboarding`

- **File:** `onboarding-complete-direct-seed.md`
- **Owner service text:** `onboarding-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=5, roles=5, explicitBindings=0, businessTables=2.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `onboarding.read`.

### `policy`

- **File:** `policy-complete-direct-seed.md`
- **Owner service text:** `governance-policy-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=5, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 2 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `policy.approve`, `policy.read`.

### `privacy`

- **File:** `privacy-complete-direct-seed.md`
- **Owner service text:** `privacy-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=6, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `privacy.read`.

### `qiyas`

- **File:** `qiyas-complete-direct-seed.md`
- **Owner service text:** `regulatory-service / qiyas-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=5, roles=5, explicitBindings=0, businessTables=2.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `qiyas.read`.

### `remediation`

- **File:** `remediation-complete-direct-seed.md`
- **Owner service text:** `remediation-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=4, roles=5, explicitBindings=0, businessTables=2.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `remediation.read`.

### `reporting`

- **File:** `reporting-complete-direct-seed.md`
- **Owner service text:** `analytics-reporting-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=4, roles=5, explicitBindings=0, businessTables=2.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 2 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `reporting.export`, `reporting.read`.

### `risk`

- **File:** `risk-complete-direct-seed.md`
- **Owner service text:** `risk-incident-service (resolved via gateway prefix; not a column)`
- **Counts:** nav=10, dynamicRows=0, pages=9, permissions=11, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC.

### `training`

- **File:** `training-complete-direct-seed.md`
- **Owner service text:** `training-service`
- **Counts:** nav=4, dynamicRows=3, pages=3, permissions=4, roles=5, explicitBindings=0, businessTables=2.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 3 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `training.read`.

### `vendor`

- **File:** `vendor-complete-direct-seed.md`
- **Owner service text:** `vendor-risk-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=5, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `vendor.read`.

### `workflow`

- **File:** `workflow-complete-direct-seed.md`
- **Owner service text:** `workflow-service`
- **Counts:** nav=5, dynamicRows=4, pages=4, permissions=6, roles=5, explicitBindings=0, businessTables=3.
- **Blocking findings:** missing §1a, missing §7, vague RBAC, 4 carbon VERIFY, 1 invalid 2-seg route perms, all pages VERIFY.
- **Permission examples needing 3-segment normalization:** `workflow.read`.

### `workspace-shell`

- **File:** `workspace-shell-complete-direct-seed.md`
- **Owner service text:** `ui-os-service`
- **Counts:** nav=0, dynamicRows=0, pages=0, permissions=7, roles=8, explicitBindings=0, businessTables=7.
- **Blocking findings:** missing §1a.
- **Specific note:** validate as platform shell host, not as normal module page seed.

## 12. Final sign-off statement

Do not sign this pack as `GREEN_WORKING` yet. The correct status is:

```text
SEED_PACK_STATUS = PARTIAL_BASELINE
PUBLISH_READY = NO
RUNTIME_READY = NO
DOC_BASELINE_READY = PARTIAL
NEXT_REQUIRED_ACTION = Asset-shape migration + RBAC matrix + Carbon key resolution + route/API/DB proof
```

The pack becomes acceptance-ready only after every publishable module has exact counts, exact role bindings, valid Carbon keys, valid dynamic route permissions, and proof for the complete page chain.
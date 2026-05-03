# Unified Mount Policy — Single Source of Truth

This document is the **canonical mount policy** for every visible surface of the
DOS Platform (pages, modules, marketing, components, workspace shell). It
supersedes all earlier scenario rulebooks. The verify-command style of the
original audit report is incorporated into §3 below — there is now **one**
policy, not two.

Audience: every developer, every AI/automation agent, every reviewer, every
operator. No exception applies until it is recorded in §6.

---

## 0. Policy order — classify before you implement

When adding or changing **any** UI surface, classify the work into exactly one
scenario before you write code:

1. New page inside an existing module → **Scenario 1**
2. New archetype (33rd, 34th, …) → **Scenario 1B**
3. New module → **Scenario 2**
4. Landing / marketing page → **Scenario 3**
5. New component inside a page (Carbon primitive or wrapper) → **Scenario 4**
6. New workspace-shell surface (11th, 12th, …) → **Scenario 5A**
7. Tenant binding for an existing workspace surface → **Scenario 5B**

**No patch may mix scenarios** unless explicitly approved before
implementation. Mixing requires the §6 exception form on the PR.

---

## 1. One rendering policy

Every visible surface must be **registry-driven**. The chain is:

```
dos.dynamic_ui_component_registry  (Carbon-only, vendor='ibm-carbon', approved)
        ↓
platform/dos/registry/component-map.ts  (lazy-import, real export)
        ↓
@dos/ui-system primitive  (preferred over raw carbon-components-angular)
        ↓
Dynamic UI route / binding / props tables  (where applicable)
```

Hard rules:
- **No FE-only mount.** A page that exists only in `app.routes.ts` is illegal.
- **No DB-only mount.** A registry row without a `component-map.ts` lazy-import
  is illegal.
- **No product-shell hardcoded fallback.** Visibility is resolved through
  Dynamic UI + AccessStore + workspace-shell resolver, never through a static
  list in `products/<x>/`.
- **No raw `carbon-components-angular` import** when a `@dos/ui-system` wrapper
  exists. If no wrapper exists, the import line must carry a one-line comment
  naming the missing wrapper, and the §6 exception applies.

Frontend visibility is **never** the isolation boundary. Real isolation lives
in: gateway → services → DAuth/AccessStore → DB schema/search_path → RLS →
OpenFGA/Cerbos → Config OS resolver → Dynamic UI resolver → AI OS tool/memory
layer.

---

## 2. Marketing exception, clarified

Marketing pages are **public and tenantless**, but they are still
**registry-seeded** and rendered through the Dynamic UI component map.

Marketing pages **must NOT**:
- appear in workspace navigation;
- depend on tenant AccessStore;
- use workspace-shell surfaces;
- require tenant entitlement;
- gate any section on `permissionKey`.

Marketing pages **MUST**:
- live under `platform/ui-system/dos-ui-system/src/marketing/`;
- register their `component_key` in `dos.dynamic_ui_component_registry`
  (`vendor='ibm-carbon'`, `approval_status='approved'`);
- lazy-import through `platform/dos/registry/component-map.ts`;
- pass the marketing coverage gates
  (`marketing-home-coverage.mjs`, `marketing-download-kit-coverage.mjs`);
- ship EN/AR translations from the canonical i18n source;
- consume colors/spacing/radii/shadows from `@dos/design-tokens` only;
- ship root-level static assets (`splash-init.js`, `cf-fix.js`, hero PNGs,
  `logoiconapphero.png`, `manifest.json`, `sw.js`) via the Angular `assets`
  glob in `products/<product>/app/src/app/angular.json`. A `public/` folder
  that is not listed in `assets` is **not** copied to dist and will 404 in
  production.

---

## 3. Verification commands are mandatory

Every PR must include a concrete verify block. A merge is **blocked** if the
report only says "implemented" without commands and outputs.

The block must contain:

### 3.1 SQL proof (live DB)

```bash
PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -c "
  SELECT component_key, vendor, approval_status, carbon_key
  FROM dos.dynamic_ui_component_registry
  WHERE component_key = '<your_key>';
  SELECT carbon_key, runtime_status
  FROM dos.ui_carbon_components
  WHERE carbon_key = '<your_carbon_key>';
"
```

Expected: row exists, `vendor='ibm-carbon'`, `approval_status='approved'`,
`carbon_key` is in the catalog with `runtime_status` = `active` or
`wrapper-required`. The DB trigger `trg_carbon_only_runtime` rejects any
non-IBM-Carbon insert.

### 3.2 Component-map / loader proof

```bash
grep -n "'<your_key>'" platform/dos/registry/component-map.ts
node scripts/ci-guards/dynamic-ui-loader-resolvability.mjs
```

Expected: one match in `REGISTRY_COMPONENT_MAP`, gate prints
`PASS — every registry entry resolves to a real export.`

### 3.3 Route render proof (live PM2)

```bash
curl -sI http://localhost:3000/<your_route>
curl -s  http://localhost:4015/api/ui-os/template-binding | jq '.[] | select(.route=="<your_route>")'
```

Expected: HTTP 200/302 from product-shell; resolver returns the route with
the correct `archetype`, `template_export`, and `component_key`.

### 3.4 Gate proof

```bash
pnpm dynamic-ui:gates
PROPS_COVERAGE_ENFORCE=1     node scripts/ci-guards/props-coverage.mjs
TEMPLATE_COVERAGE_ENFORCE=1  node scripts/ci-guards/template-coverage.mjs
WORKSPACE_SHELL_COVERAGE_ENFORCE=1 node scripts/ci-guards/workspace-shell-coverage.mjs
pnpm platform:customer-gate
```

Expected: every line GREEN. Paste the final summary lines into the PR.

### 3.5 PM2 reload proof (when resolver cache is involved)

See §4.

---

## 4. Resolver reload policy

After **any** DB-driven UI change, reload the resolver-side services so caches
re-read from the live registry:

```bash
pm2 reload ui-os-service
pm2 reload gateway
pm2 reload product-shell
pm2 list
```

If `product-shell` was not reloaded, the PR must state explicitly **why** it
was skipped (e.g. "marketing page only; product-shell does not consume
marketing registry rows"). Otherwise reload all three.

---

## 5. DB consistency checks (run before declaring DONE)

Every merge must prove the relevant registry pairs agree.

### 5.1 Routes ↔ template binding

```sql
SELECT r.path_pattern, r.component_key, b.template_export
FROM dos.dynamic_ui_routes r
LEFT JOIN dos.ui_route_template_binding b
  ON b.route = r.path_pattern
WHERE r.status = 'active'
  AND b.route IS NULL;
```

Expected: **zero rows** unless the route is explicitly marked static/public
(record the marker in the PR).

### 5.2 Routes ↔ navigation

```sql
SELECT r.path_pattern
FROM dos.dynamic_ui_routes r
LEFT JOIN dos.dynamic_ui_navigation n
  ON n.route = r.path_pattern
WHERE r.status = 'active'
  AND r.permission_key IS NOT NULL
  AND n.route IS NULL;
```

Expected: **zero customer-bound nav-orphan routes**.

### 5.3 Modules ↔ Dynamic UI modules

```sql
SELECT m.module_code
FROM dos.module_registry m
FULL OUTER JOIN dos.dynamic_ui_modules d
  ON d.module_code = m.module_code
WHERE m.module_code IS NULL OR d.module_code IS NULL;
```

Expected: **zero rows** (every registered module has a Dynamic UI counterpart
and vice versa).

If your live schema does not yet expose `status` on `dynamic_ui_routes`,
substitute the equivalent active-row predicate and record the substitution in
the PR — do **not** silently drop the check.

---

## 6. Exception process

Only the **platform owner** may approve any of the following. Each exception
must be recorded in the PR description with **reason**, **scope**, and
**rollback**:

- a 33rd archetype (or any change to `ARCHETYPE_COUNT`);
- an 11th workspace-shell surface (or any change to `WORKSPACE_SHELL_KEYS`);
- a direct `carbon-components-angular` import without a `@dos/ui-system`
  wrapper;
- a public route with `permission_key IS NULL`;
- any gateway / auth-service / tenant-service change during UI work;
- any DB or RBAC mutation inside a UI compile-repair PR;
- mixing two scenarios from §0 in the same patch;
- removing or skipping a CI gate listed in §7.

No exception is valid retroactively. The PR must show the approval line
before the exception code lands.

---

## 7. Cross-cutting rules (apply to all 7 scenarios)

These are non-negotiable; a failure in any one blocks merge.

| # | Rule | Enforcement |
|---|---|---|
| 1 | Carbon-only runtime — `vendor='ibm-carbon'`. | `trg_carbon_only_runtime` + `carbon-dynamic-ui-coherence.mjs` |
| 2 | Carbon key must exist in `dos.ui_carbon_components` (no inventing `data-table` etc.). | `carbon-dynamic-ui-coherence.mjs` |
| 3 | Every `component_key` must lazy-import to a real export. | `dynamic-ui-loader-resolvability.mjs` |
| 4 | Every active route's `component_key` must be in `REGISTRY_COMPONENT_MAP`. | `component-map-coverage.mjs` (`COMPONENT_MAP_ENFORCE=1`) |
| 5 | Every active route must resolve to one of the canonical archetype exports. | `template-coverage.mjs` (`TEMPLATE_COVERAGE_ENFORCE=1`) |
| 6 | Every customer-bound route must have ≥1 props row in its archetype-props table. | `props-coverage.mjs` (`PROPS_COVERAGE_ENFORCE=1`) |
| 7 | No hardcoded sidebar/module/widget visibility. | `lint-no-static-nav-fallback.mjs`, `lint-no-shell-module-name.mjs` |
| 8 | No raw i18n keys, no role-conditional templates, no tenant placeholders. | `lint-no-raw-i18n-key.mjs`, `lint-no-role-conditional-in-template.mjs`, `lint-no-tenant-placeholder.mjs` |
| 9 | No TS suppressions (`@ts-ignore`, `@ts-expect-error`, `$any()`, blanket `as any`). | `no-ts-suppression-comments.mjs`, `ts-suppression-allowlist.json` |
| 10 | Permissions must be canonical (`module.action`). | `permission-format.mjs` |
| 11 | Migrations are additive and ship a paired `_down.sql`. No DB-only fixes. | `migrations-no-draft-in-runtime.mjs` |
| 12 | Vertical-slice DoD: nav gates by role, render OK, every API exists, gateway prefix mapped, AuthZ works without `platform-admin` bypass, audit row written, ≥1 negative test passes. | review checklist |
| 13 | No `it.skip` / no removed assertions. | `no-test-mutation.mjs` |
| 14 | Pre-merge gate sequence: `pnpm lint && pnpm typecheck && pnpm test && pnpm dynamic-ui:gates && pnpm platform:customer-gate`. | CI |
| 15 | UI work must not touch gateway / auth-service / tenant-service / DB RBAC unless the wave explicitly authorizes it. | preflight checklist |
| 16 | Responsive matrix: 390 / 430 / 768 / 1440, RTL-safe, no overflow, no FAB collisions, no untranslated keys. | review |
| 17 | Brand assets and tokens come from `@dos/design-tokens` only. | `brand-coverage.mjs`, `ui-os-theme-token-guard.mjs` |
| 18 | Workspace shell vendor isolation — no vendor mixing in shell or module shell. | `workspace-platform-dna-vendor-guard.mjs`, `ui-os-carbon-boundary-guard.mjs` |

---

## 8. Scenario quick reference

For the per-scenario step-by-step (artifact list, ordered actions, gate
matrix, rollback boundary), see the seven scenarios indexed in §0. Each
scenario's checklist is owned by this document; any divergence in another doc
is superseded.

### Per-scenario artifact matrix

| Scenario | DB migration | `component-map.ts` | `ARCHETYPE_REGISTRY` | `archetype-map.mjs` | Templates barrel | `WORKSPACE_SHELL_KEYS` | Module manifest | Product manifest | Marketing source | Props table | Workspace binding |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 — New page in module | ✅ | ✅ | ✅ if new arch | ✅ | – | – | ✅ if nav | – | – | ✅ | – |
| 1B — New archetype | ✅ | – | ✅ | ✅ | ✅ | – | – | – | – | ✅ new table | – |
| 2 — New module | ✅ | ✅ per page | – | ✅ | – | – | ✅ | ✅ | – | ✅ per page | – |
| 3 — Marketing/landing | ✅ | ✅ | – | ✅ | – | – | – | – | ✅ | – | – |
| 4 — New component / primitive | ✅ catalog row | ✅ CARBON_PRIMITIVE_* | – | – | – | – | – | – | – | – | – |
| 5A — New workspace surface | ✅ | ✅ | – | – | – | ✅ | – | – | – | – | ✅ backfill |
| 5B — Tenant binding existing surface | ✅ binding row only | – | – | – | – | – | – | – | – | – | ✅ |

---

## 9. Status & ownership

- Owner: Platform DNA team.
- Source of truth: this file.
- Companion docs that must stay in lockstep (do not fork):
  [`./AGENTS.md`](../../AGENTS.md),
  [`./platform/docs/PLATFORM_OPERATING_MANIFEST.md`](./PLATFORM_OPERATING_MANIFEST.md),
  [`./docs/architecture.md`](../../docs/architecture.md).
- Review cadence: every wave-close; on every change to `ARCHETYPE_COUNT`,
  `WORKSPACE_SHELL_KEYS`, `dos.ui_carbon_components` schema, or any CI gate
  in §7.
- Drift response: if a live verify command in §3 disagrees with this policy,
  open a NO-GO ticket and fix the drift before any further mount work.

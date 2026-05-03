# Risk Module — Complete Direct Seed Content

> **CANONICAL VALUES** — verified 2026-05-03 against live `shahin_grc` DB and
> shipped Angular build. Sections 1–7 below are the authoritative spec; older
> aspirational column names are retained in §8 only as a migration note.

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `risk` |
| catalog product_key | `agrc` (in `dos.module_registry.product_key`) |
| tenant entitlement product_code | `shahin-ai` (in `dos.tenant_module_entitlements.product_code`) |
| route_base | `/risk` |
| owner_service | `risk-incident-service` (resolved via gateway prefix; not a column) |
| module_status | `active` |
| display_name | `Risk Management` |
| nav parent code | `grc.risk` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry` (real columns)

| module_code | product_key | display_name | status |
|---|---|---|---|
| `risk` | `agrc` | `Risk Management` | `active` |

### `dos.navigation_registry` (real columns: `nav_item_code`, `route`, `label_en`, `label_ar`, `parent_code`, `sort_order`)

| nav_item_code | module_code | parent_code | route | label_en | label_ar | sort_order |
|---|---|---|---|---|---|---|
| `grc.risk` | `risk` | `grc` | `/risk` | `Risk Management` | `إدارة المخاطر` | 30 |
| `risk.overview` | `risk` | `grc.risk` | `/risk/overview` | Overview | نظرة عامة | 10 |
| `risk.register` | `risk` | `grc.risk` | `/risk/register` | Risk Register | سجل المخاطر | 20 |
| `risk.assessments` | `risk` | `grc.risk` | `/risk/assessments` | Assessments | التقييمات | 30 |
| `risk.heatmap` | `risk` | `grc.risk` | `/risk/heatmap` | Heatmap | الخريطة الحرارية | 40 |
| `risk.treatments` | `risk` | `grc.risk` | `/risk/treatments` | Treatments | المعالجات | 50 |
| `risk.records` | `risk` | `grc.risk` | `/risk/records` | Records | السجلات | 60 |
| `risk.workflows` | `risk` | `grc.risk` | `/risk/workflows` | Workflows | سير العمل | 70 |
| `risk.reports` | `risk` | `grc.risk` | `/risk/reports` | Reports | التقارير | 80 |
| `risk.settings` | `risk` | `grc.risk` | `/risk/settings` | Settings | الإعدادات | 90 |

Permission keys are NOT stored on nav rows; they are resolved via
`dos.dynamic_ui_routes.permission_key` for the matching `route`.

### `dos.dynamic_ui_routes` (canonical, 10 rows live)

| route | component_key | permission_key | module_code |
|---|---|---|---|
| `/risk` | `module.entry.page` | `risk.record.read` | `risk` |
| `/risk/overview` | `module.overview.page` | `risk.record.read` | `risk` |
| `/risk/register` | `RiskRegisterPage` | `risk.record.read` | `risk` |
| `/risk/assessments` | `RiskAssessmentsPage` | `risk.assessment.create` | `risk` |
| `/risk/heatmap` | `RiskHeatmapPage` | `risk.record.read` | `risk` |
| `/risk/treatments` | `RiskTreatmentsPage` | `risk.treatment.assign` | `risk` |
| `/risk/records` | `module.records.page` | `risk.record.read` | `risk` |
| `/risk/workflows` | `module.workflows.page` | `risk.manage` | `risk` |
| `/risk/reports` | `module.reports.page` | `risk.record.read` | `risk` |
| `/risk/settings` | `module.settings.page` | `risk.manage` | `risk` |

### `dos.dynamic_ui_component_registry` (Carbon-only trigger enforced)

| component_key | vendor | carbon_key | approval_status |
|---|---|---|---|
| `module.entry.page` | `ibm-carbon` | `tiles` | `approved` |
| `module.overview.page` | `ibm-carbon` | `tiles` | `approved` |
| `module.records.page` | `ibm-carbon` | `table` | `approved` |
| `module.workflows.page` | `ibm-carbon` | `tabs` | `approved` |
| `module.reports.page` | `ibm-carbon` | `tiles` | `approved` |
| `module.settings.page` | `ibm-carbon` | `tabs` | `approved` |
| `RiskRegisterPage` | `ibm-carbon` | `tiles` | `approved` |
| `RiskAssessmentsPage` | `ibm-carbon` | `tiles` | `approved` |
| `RiskHeatmapPage` | `ibm-carbon` | `tiles` | `approved` |
| `RiskTreatmentsPage` | `ibm-carbon` | `tiles` | `approved` |

### Permissions (catalog `<module>.<entity>.<verb>` form, FK to `platform_dauth.permissions`)

| permission_code | notes |
|---|---|
| `risk.record.read` | base read for records/overview/register/heatmap |
| `risk.record.write` | record edit |
| `risk.record.update` | record updates |
| `risk.record.submit` | standard_user contribution |
| `risk.record.configure` | admin-only configuration |
| `risk.assessment.create` | assessments page |
| `risk.assessment.approve` | assessment workflow |
| `risk.treatment.assign` | treatments page |
| `risk.register.read` | register list |
| `risk.manage` | workflows/settings |
| `risk.approve` | approval workflow |

The 2-segment shorthands (`risk.read`/`risk.write`/`risk.admin`) are NOT in the
catalog and would fail `chk_perm_dot_form_dynamic_ui_routes`.

### Roles and bindings (existing role IDs only — do NOT INSERT new ids)

| role_id | risk permissions bound |
|---|---|
| `platform_super_admin` / `role_platform_super_admin` | all `risk.*` |
| `tenant_admin` / `role_tenant_owner` | all `risk.*` for the tenant |
| `risk_manager` / `role_risk_manager` | read/write/manage/approve/treatment.assign/assessment.* |
| `standard_user` | `risk.record.submit`, `risk.record.update` |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + risk + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.risk_assessments` | page data / API backing | `tenant_id` required where applicable |
| `dos.risk_treatments` | page data / API backing | `tenant_id` required where applicable |
| `dos.risks` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix (verified vs shipped Angular bundle 2026-05-03)

| # | page_key | route | label_en | Angular component | gateway prefix → service | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|
| 1 | `risk.overview` | `/risk/overview` | Overview | `RiskOverviewComponent` | `/api/risk/*` → `risk-incident-service` | `dos.risks` | `risk.record.read` | `COMPLETE` |
| 2 | `risk.register` | `/risk/register` | Risk Register | `RiskRegisterPageComponent` | `/api/risk/*` | `dos.risks` | `risk.record.read` | `COMPLETE` |
| 3 | `risk.assessments` | `/risk/assessments` | Assessments | `RiskAssessmentsPageComponent` | `/api/risk/*` | `dos.risk_assessments` | `risk.assessment.create` | `COMPLETE` |
| 4 | `risk.heatmap` | `/risk/heatmap` | Heatmap | `RiskHeatmapPageComponent` | `/api/risk/*` | `dos.risks` | `risk.record.read` | `COMPLETE` |
| 5 | `risk.treatments` | `/risk/treatments` | Treatments | `RiskTreatmentsPageComponent` | `/api/risk/*` | `dos.risk_treatments` | `risk.treatment.assign` | `COMPLETE` |
| 6 | `risk.records` | `/risk/records` | Records | (generic `module.records.page` host) | `/api/risk/*` | `dos.risks` | `risk.record.read` | `COMPONENT_MISSING` |
| 7 | `risk.workflows` | `/risk/workflows` | Workflows | (generic `module.workflows.page` host) | `/api/risk/*` | workflow tables | `risk.manage` | `COMPONENT_MISSING` |
| 8 | `risk.reports` | `/risk/reports` | Reports | (generic `module.reports.page` host) | `/api/risk/*` | `dos.risks` | `risk.record.read` | `COMPONENT_MISSING` |
| 9 | `risk.settings` | `/risk/settings` | Settings | (generic `module.settings.page` host) | `/api/risk/*` | settings tables | `risk.manage` | `COMPONENT_MISSING` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT risk into dos.module_registry
-- UPSERT parent and child rows into dos.navigation_registry
-- UPSERT Dynamic UI rows only after carbon_key verification
-- UPSERT permissions into platform_dauth.permissions
-- UPSERT role bindings into platform_dauth.role_permissions
-- UPSERT tenant entitlements only for selected tenant

COMMIT;
```

## 7. Validation checklist (status as of 2026-05-03)

- [x] `dos.module_registry` row exists (`risk` / `agrc` / active)
- [x] `dos.navigation_registry` parent + 9 children exist under `grc.risk`
- [x] `dos.dynamic_ui_routes` 10 rows resolve `permission_key` against `platform_dauth.permissions`
- [x] `dos.dynamic_ui_component_registry` 10 rows, all `vendor='ibm-carbon'`, `approval_status='approved'`
- [x] Angular routes wired in `products/shahin-ai/app/src/app/app.routes.ts` (`/risk` block, 5 child loadComponents)
- [x] Angular components compile (`pnpm --filter shahin-ai-frontend build` green; risk-register / risk-overview / risk-assessments / risk-heatmap / risk-treatments lazy chunks emitted)
- [x] product-shell PM2 restarted with new bundle (`main-FPYUSA2P.js`); `/risk` and `/risk/overview` return HTTP 200
- [x] Gateway `/api/risk/*` proxies to `risk-incident-service` (PM2 online)
- [x] Permission keys exist in `platform_dauth.permissions` (3-segment form)
- [x] Role bindings present on existing role IDs (no new roles invented)
- [x] Tenant entitlement rows present (5 tenants on `shahin-ai`)
- [ ] Real Angular components for `records` / `workflows` / `reports` / `settings` (currently generic Carbon hosts)
- [ ] Negative-path test: unauthorized role blocked at `/risk/treatments`
- [ ] No mock/static data in shipped pages (audit pending)

## 8. Drift reconciliation (verified 2026-05-03 against live `shahin_grc` DB)

The original spec sections 1–7 above are **aspirational**. The live database
disagrees in several places. When applying this seed, use the values in the
**Actual** column — they match what the runtime resolver, gateway, and FE
already accept.

### 8.1 Schema column drift

| Spec column                  | Actual column in `dos.navigation_registry` |
|------------------------------|---------------------------------------------|
| `nav_key`                    | `nav_item_code`                             |
| `route_path`                 | `route`                                     |
| `title_en` / `title_ar`      | `label_en` / `label_ar`                     |
| `permission`                 | (not stored on nav row — resolved via `dynamic_ui_routes.permission_key`) |
| `order`                      | `sort_order`                                |

`dos.module_registry` has **no `owner_service` column**; only
`module_code`, `product_key`, `display_name`, `status`, `created_at`.

### 8.2 Identity drift

| Field           | Spec value     | Actual DB value | Action                |
|-----------------|----------------|-----------------|-----------------------|
| `product_key`   | `shahin-ai`    | `agrc`          | Use `agrc` (catalog), entitlements use `shahin-ai` per tenant |
| Parent nav key  | `risk`         | `grc.risk`      | Use `grc.risk`        |
| `display_name`  | `Risk`         | `Risk Management` | Use `Risk Management` |

### 8.3 Permission key drift (BLOCKING for `chk_perm_dot_form_dynamic_ui_routes`)

The catalog convention is `<module>.<entity>.<verb>` (3+ segments). The spec
keys are 2-segment (`risk.read`) and **violate the regex check** on
`dynamic_ui_routes.permission_key`. Use the catalog keys instead.

| Spec key             | Actual catalog key(s)                                    |
|----------------------|----------------------------------------------------------|
| `risk.read`          | `risk.record.read`, `risk.register.read`                 |
| `risk.write`         | `risk.record.write`, `risk.record.update`                |
| `risk.admin`         | `risk.manage`, `risk.record.configure`, `risk.approve`   |
| `risk.assessment.read` | `risk.assessment.create`, `risk.assessment.approve`    |
| `risk.treatment.read`  | `risk.treatment.assign`                                |

`risk.audit.read`, `risk.assessment.read`, `risk.treatment.read`,
`risk.access_review.read`, `risk.policies.read` **do not exist** in
`platform_dauth.permissions` and would fail the FK
`fk_perm_catalog_dynamic_ui_routes`.

### 8.4 Role drift (and duplicate IDs in the wild)

Catalog has both legacy and `role_*`-prefixed copies. Treat them as aliases
until consolidation; do not `INSERT` new role IDs.

| Spec role          | Actual role IDs in DB                              |
|--------------------|----------------------------------------------------|
| `tenant_owner`     | `role_tenant_owner`, `tenant_admin`                |
| `risk_admin`       | `risk_manager`, `role_risk_manager`                |
| `risk_operator`    | (not present — fold into `risk_manager`)           |
| `risk_auditor`     | (not present — fold into `role_risk_manager`)      |
| `standard_user`    | `standard_user` (only `risk.record.submit/update`) |
| Platform super     | `platform_super_admin`, `role_platform_super_admin`|

### 8.5 Component-registry rule (Carbon-only trigger)

`dos.dynamic_ui_component_registry` has trigger `trg_carbon_only_runtime`
which **rejects any `vendor != 'ibm-carbon'`** on INSERT/UPDATE, and `carbon_key`
is FK-checked against `dos.ui_carbon_components`.

Only ~5 layout-style carbon keys are usable as page-level wrappers today:
`grid`, `tiles`, `layout`, `asset.grid`, `asset.layout`. Page-level
component_keys map to `tiles` (or `grid` for entry/overview shells, `table`
for record lists, `tabs` for workflow/settings).

The shared `module.*` keys are already approved and reusable:
`module.entry.page`, `module.overview.page`, `module.records.page`,
`module.workflows.page`, `module.reports.page`, `module.settings.page`,
plus 20 layout primitives (`module.kpi_grid`, `module.work_queue`,
`module.empty_state`, `module.copilot_panel`, etc.).

### 8.6 Route surface drift (THREE inconsistent specs)

| Source                                                     | Routes declared |
|------------------------------------------------------------|------------------|
| Seed spec (this file §5)                                   | overview, register, assessments, treatments (4) |
| `dos.dynamic_ui_routes` (DB)                               | + heatmap, records, workflows, reports, settings, /risk entry (10) |
| `risk-module-integrity.test.ts` (`platform-manifests/risk.module.routes.ts`) | home, work-queue, register, register/:id, assessments, indicators, treatment, issues, scenarios, reports, admin (11) |

**Resolution rule**: the runtime contract is whatever lives in
`dos.dynamic_ui_routes`. Both this spec and the FE manifest must converge on
that table. The FE Angular routes file
(`modules/risk/source/frontend/risk/risk.routes.ts`) is now wired against
the DB (overview/register/assessments/heatmap/treatments) as of 2026-05-03;
records/workflows/reports/settings still need real Angular components.

### 8.7 What's still missing per "fully active" definition

After this DB seed + Angular route wiring, `risk` is at **YELLOW**:

- ✅ nav children rows present (9 children under `grc.risk`)
- ✅ all 10 route component_keys resolve to approved Carbon-vendor rows
- ✅ all permission_keys resolve in `platform_dauth.permissions`
- ✅ tenant entitlements present (5 tenants on `shahin-ai`)
- ✅ backend `risk-incident-service` online, gateway proxies 13 prefixes
- ✅ Angular `RISK_ROUTES` wires 6 of 10 paths to existing components
- ⚠ shahin SPA `app.routes.ts` does **not** `loadChildren` `RISK_ROUTES`;
  risk is not in `SHAHIN_DNA_MODULE_PACKS` either → `/risk` path is **not
  reachable from the SPA** even though all backend pieces are aligned.
- ⚠ records / workflows / reports / settings paths have no Angular page
  component yet (only the carbon shell wrapper).

### 8.8 Generic "apply to all 34 modules" template (use these column names)

```sql
BEGIN;

-- 1. module_registry (column set: module_code, product_key, display_name, status)
INSERT INTO dos.module_registry (module_code, product_key, display_name, status)
VALUES ('<MODULE>', '<PRODUCT_KEY>', '<Display Name>', 'active')
ON CONFLICT (module_code) DO UPDATE SET status='active';

-- 2. navigation_registry parent (real columns)
INSERT INTO dos.navigation_registry (module_code, nav_item_code, label_en, label_ar, route, parent_code, sort_order)
VALUES ('<MODULE>', '<group>.<MODULE>', '<Label EN>', '<Label AR>', '/<MODULE>', NULL, <ORDER>);

-- 3. navigation_registry children
-- one row per child page, parent_code = '<group>.<MODULE>'

-- 4. dynamic_ui_routes — permission_key MUST be 3+ dotted segments and exist in catalog
-- prefer reusing module.entry.page / module.overview.page / module.records.page / module.workflows.page / module.reports.page / module.settings.page

-- 5. dynamic_ui_component_registry — INSERT only with vendor='ibm-carbon' and a real carbon_key
-- (else trg_carbon_only_runtime + FK will reject)

-- 6. permissions — only insert if missing; respect <module>.<entity>.<verb> 3-segment convention

-- 7. role_permissions — bind to existing roles
-- (platform_super_admin / role_platform_super_admin / tenant_admin / role_tenant_owner / standard_user / role_<module>_manager)

-- 8. tenant_module_entitlements — per tenant, product_code='shahin-ai' (or product owning the entitlement)

COMMIT;
```

### 8.9 Apply-to-all preflight (run BEFORE every per-module seed PR)

1. `\d` the target table — never trust the spec column name without verifying.
2. Check the permission catalog for the keys the spec asks for; rewrite to 3-segment form if missing.
3. Check `dos.ui_carbon_components` for an `active` `carbon_key` matching each component's intent.
4. Reuse `module.*` shared component_keys where the page is a generic shell.
5. Run `BEGIN; … ROLLBACK;` first; only commit after the verification SELECTs return the expected joins.
6. Wire the Angular route file in the same PR — DB seed without FE wiring stays YELLOW (not GREEN).
7. SPA composition (`shahin-ai/app/src/app/app.routes.ts` or DNA pack) must `loadChildren` the module routes — this is the missing piece for every `risk`-class module today.

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

### `dos.dynamic_ui_routes` (publisher-controlled, 10 rows live)

| route | component_key | permission_key | module_code |
|---|---|---|---|
| `/risk` | `module.entry.page` | `risk.record.read` | `risk` |
| `/risk/overview` | `module.entry.page` | `risk.record.read` | `risk` |
| `/risk/register` | `module.records.page` | `risk.register.read` | `risk` |
| `/risk/assessments` | `module.workflows.page` | `risk.assessment.create` | `risk` |
| `/risk/heatmap` | `module.heatmap.page` | `risk.record.read` | `risk` |
| `/risk/treatments` | `module.workflows.page` | `risk.treatment.assign` | `risk` |
| `/risk/records` | `module.records.page` | `risk.record.read` | `risk` |
| `/risk/workflows` | `module.workflow_timeline.page` | `risk.workflow.manage` | `risk` |
| `/risk/reports` | `module.reports.page` | `risk.record.read` | `risk` |
| `/risk/settings` | `module.settings.page` | `risk.workflow.manage` | `risk` |

### `dos.dynamic_ui_component_registry` (Carbon-only trigger enforced)

| component_key | vendor | carbon_key | approval_status |
|---|---|---|---|
| `module.entry.page` | `ibm-carbon` | `grid` | `approved` |
| `module.records.page` | `ibm-carbon` | `table` | `approved` |
| `module.workflows.page` | `ibm-carbon` | `tabs` | `approved` |
| `module.heatmap.page` | `ibm-carbon` | `grid` | `approved` |
| `module.workflow_timeline.page` | `ibm-carbon` | `progress-indicator` | `approved` |
| `module.reports.page` | `ibm-carbon` | `tiles` | `approved` |
| `module.settings.page` | `ibm-carbon` | `tabs` | `approved` |

### Permissions (catalog `<module>.<entity>.<verb>` form, FK to `platform_dauth.permissions`)

| permission_code | notes |
|---|---|
| `risk.record.read` | base read for module entry, overview, records, and heatmap |
| `risk.record.write` | record edit |
| `risk.record.update` | record updates |
| `risk.record.submit` | record submission |
| `risk.record.configure` | admin-only record configuration |
| `risk.record.approve` | record approval workflow |
| `risk.assessment.create` | assessments page and assessment creation |
| `risk.assessment.approve` | assessment approval workflow |
| `risk.treatment.assign` | treatments page and treatment assignment |
| `risk.register.read` | register list |
| `risk.workflow.manage` | workflows/settings management |
| `risk.workflow.approve` | workflow approval decisions |

The 2-segment shorthands (`risk.read`/`risk.write`/`risk.admin`/`risk.manage`/`risk.approve`) are NOT in the
catalog and would fail `chk_perm_dot_form_dynamic_ui_routes`.

### Roles and bindings (publisher-created functional roles)

| role_code | archetype | risk permissions bound |
|---|---|---|
| `risk_viewer` | `viewer` | `risk.record.read`, `risk.register.read` |
| `risk_operator` | `operator` | `risk.record.read`, `risk.record.write`, `risk.record.update`, `risk.record.submit`, `risk.register.read` |
| `risk_admin` | `module_lead` | all 12 `risk.*` permissions |

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

## 5. Page seed matrix (UI-OS publisher source of truth)

| # | page_key | route | label_en | archetype | template_export | gateway prefix → service | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `risk.home` | `/risk` | Risk Management | `command-home` | `module.entry.page` | `/api/ui-os/template-binding` → `ui-os-service` | `dos.risks` | `risk.record.read` | `ACTIVE` |
| 2 | `risk.overview` | `/risk/overview` | Overview | `command-home` | `module.entry.page` | `/api/risk/*` → `risk-incident-service` | `dos.risks` | `risk.record.read` | `ACTIVE` |
| 3 | `risk.register` | `/risk/register` | Risk Register | `intelligent-register` | `module.records.page` | `/api/risk/*` | `dos.risks` | `risk.register.read` | `ACTIVE` |
| 4 | `risk.assessments` | `/risk/assessments` | Assessments | `workflow-control` | `module.workflows.page` | `/api/risk/*` | `dos.risk_assessments` | `risk.assessment.create` | `ACTIVE` |
| 5 | `risk.heatmap` | `/risk/heatmap` | Heatmap | `risk-landscape` | `module.heatmap.page` | `/api/risk/*` | `dos.risks` | `risk.record.read` | `ACTIVE` |
| 6 | `risk.treatments` | `/risk/treatments` | Treatments | `workflow-control` | `module.workflows.page` | `/api/risk/*` | `dos.risk_treatments` | `risk.treatment.assign` | `ACTIVE` |
| 7 | `risk.records` | `/risk/records` | Records | `intelligent-register` | `module.records.page` | `/api/risk/*` | `dos.risks` | `risk.record.read` | `ACTIVE` |
| 8 | `risk.workflows` | `/risk/workflows` | Workflows | `workflow-timeline` | `module.workflow_timeline.page` | `/api/risk/*` | workflow tables | `risk.workflow.manage` | `ACTIVE` |
| 9 | `risk.reports` | `/risk/reports` | Reports | `evidence-reports` | `module.reports.page` | `/api/risk/*` | `dos.risks` | `risk.record.read` | `ACTIVE` |
| 10 | `risk.settings` | `/risk/settings` | Settings | `module-settings` | `module.settings.page` | `/api/risk/*` | settings tables | `risk.workflow.manage` | `ACTIVE` |

## 6. Publisher activation path

The executable contract is `platform/ui-system/module_complete_direct_seed_pack/risk-complete-direct-seed.json`. Direct DB mutation is forbidden for this module slice. Activation must run only through:

1. `pnpm module:validate risk`
2. `pnpm module:dry-run risk`
3. `pnpm module:publish risk`
4. `pnpm module:verify risk`

The publisher must create or confirm the module registry row, entitlement path, navigation order, route template bindings, approved permissions, approved Carbon component keys, and approved page archetype/template mapping.

## 7. Validation checklist (status as of 2026-05-05)

- [x] `dos.module_registry` row exists (`risk` / `agrc` / active)
- [x] `dos.navigation_registry` parent + 9 children exist under `grc.risk`
- [x] `dos.dynamic_ui_routes` 10 rows resolve `permission_key` against `platform_dauth.permissions`
- [x] `dos.ui_route_template_binding` 10 rows resolve approved archetype/template exports
- [x] `dos.dynamic_ui_component_registry` 7 approved shared `module.*.page` keys, all `vendor='ibm-carbon'`
- [x] product `app.routes.ts` does not define risk pages directly; workspace wildcard hosts `DynamicTemplatePageComponent`
- [x] Gateway `/api/risk/*` proxies to `risk-incident-service` through the service registry path
- [x] Permission keys are 3-segment `risk.<entity>.<verb>` values
- [x] Functional roles are publisher-managed as `risk_viewer`, `risk_operator`, and `risk_admin`
- [x] Tenant visibility remains entitlement-driven; product shell does not hardcode module visibility
- [x] `template-only-routing` reports zero non-archetype, missing-binding, unknown-export, or SPA-bypass findings for risk
- [ ] Negative-path test: unauthorized role blocked at `/risk/treatments`
- [ ] Runtime visual smoke: authenticated entitled tenant resolves `/risk` and `/risk/register` from UI-OS DTOs

## 8. Drift prevention rule (locked 2026-05-05)

Risk now follows the professional UI-OS hierarchy:

```text
module_ui_os_contract-pack / review spec
  → module contract
    → publisher validate/dry-run/publish/verify
      → DB runtime rows
        → UI-OS workspace-runtime
          → product shell render
```

### 8.1 Source-of-truth rule

Module names, module order, page names, page order, and page status come only from this source spec and `dos_module_seed_pack_full_review_2026-05-05.md`. The executable JSON contract must be regenerated or edited to match this spec. If the executable contract disagrees with this spec, fix the contract. If this spec is wrong, change this spec first, then publish through the module publisher.

### 8.2 Product routing rule

`products/shahin-ai/app/src/app/app.routes.ts` must stay limited to public marketing routes, auth routes, `platform-admin`, and one workspace wildcard. It must not define risk pages, risk child routes, risk-specific lazy components, or risk-specific module ordering.

### 8.3 Activation rule

Risk becomes visible/renderable only when the contract is published and activated. Activation must create or confirm:

- `dos.module_registry` row for `risk`
- entitlement path through tenant product/module entitlement rows
- nav groups/items/order under `grc.risk`
- route template bindings for all 10 risk pages
- approved 3-segment permissions
- approved IBM Carbon component keys
- approved page archetype/template mapping

### 8.4 Conflict rule

Do not invent parallel product-level order or route composition. Tenant, role, and product variation must be expressed as overlays resolved by UI-OS, not by product shell hardcoding.

### 8.5 CI enforcement

Risk is not publish-ready unless these gates stay green:

1. `pnpm module:validate risk`
2. `pnpm module:dry-run risk`
3. `pnpm module:publish risk`
4. `pnpm module:verify risk`
5. `TEMPLATE_ONLY_ROUTING_ENFORCE=1 node scripts/ci-guards/template-only-routing.mjs`
6. `pnpm dynamic-ui:gates`
7. `pnpm --filter shahin-ai-grc-frontend build`

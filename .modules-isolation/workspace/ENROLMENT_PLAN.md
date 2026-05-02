# Module Enrolment Plan — one wave = one module = one commit

Foundation is platform DNA (lives in `platform/foundation/`) and is **out of
enrolment scope**. This plan covers the 18 Shahin-AI GRC business modules.

A module is `ENROLLED` only when the 8-step Definition of Done passes
`validate-enrolment.sh <code>` with PASS.

## Definition of Done per module (8 enrolment artefacts)

| # | Artefact | File / row | Owner table |
|---|---|---|---|
| 1 | Module manifest | `profiles/grc/manifests/<code>.profile.json` | (file) |
| 2 | Module-registry row | `profiles/grc/enrolment/<code>/01_module_registry.sql` | `dos.module_registry` |
| 3 | Tenant-entitlement default | `profiles/grc/enrolment/<code>/02_tenant_entitlement.sql` | `dos.tenant_module_entitlements` (+ `dos.tenant_product_activation`) |
| 4 | Permission catalogue projection | `profiles/grc/enrolment/<code>/03_permissions.sql` | `<schema>.permissions` |
| 5 | Role-defaults projection | `profiles/grc/enrolment/<code>/04_role_permissions.sql` | `<schema>.role_permissions` |
| 6 | Routes / lazy-load contract | `profiles/grc/enrolment/<code>/routes.json` | (file → Angular codegen) |
| 7 | Dynamic-UI bundle (already in W6) | rows in `dos.ui_module/route/view/column/filter/action/form/navigation/widget` filtered by `(profile_code='grc', module_code='<code>')` | 9 tables |
| 8 | Workflow bundle (already in W4) | `profiles/grc/workflows/<code>/*.workflow.json` | `dos.workflow_definition` |

## Wave schedule (dependency-ordered)

| Wave | Module        | Card # | Depends-on |
|---:|---------------|------:|---|
|  1 | governance    |  1 | (none — root) |
|  2 | qiyas         |  2 | governance |
|  3 | regulatory    |  3 | governance |
|  4 | compliance    |  4 | regulatory |
|  5 | controls      |  6 | compliance |
|  6 | risk          |  5 | governance, controls |
|  7 | policy        |  7 | compliance |
|  8 | asset         |  8 | (none) |
|  9 | vendor        |  9 | risk |
| 10 | incident      | 10 | risk, asset |
| 11 | exceptions    | 11 | risk, controls |
| 12 | evidence      | 13 | (none) |
| 13 | audit         | 14 | controls, evidence |
| 14 | issues        | 12 | risk, audit |
| 15 | bcp           | 15 | asset, incident |
| 16 | training      | 16 | policy |
| 17 | reporting     | 17 | all data modules |
| 18 | ai_governance | 18 | all data modules |

## Per-wave commit shape

```
W<n> enrol <module> — full enterprise enrolment

profiles/grc/enrolment/<module>/
  01_module_registry.sql
  02_tenant_entitlement.sql
  03_permissions.sql
  04_role_permissions.sql
  routes.json
profile-tools/validate-enrolment.sh grc <module>   # PASS
```

## Validation gate (`validate-enrolment.sh grc <code>`)

1. Manifest exists and parses.
2. All 5 enrolment SQL files exist and are non-empty.
3. `01_module_registry.sql` references `(profile_code,module_code)`.
4. `03_permissions.sql` count == permission count in `permissions.registry.json` for that module.
5. `04_role_permissions.sql` references all 5 role templates.
6. `routes.json` has `loadChildren` + at least one route.
7. Dynamic UI rows: at least 1 module + 1 route + 1 view + 1 navigation node seeded.
8. Workflow files match the 5 standard hooks.

## Tier rules

All 18 modules are `tier='module'` (tenant-entitled). DNA tier is reserved for
platform-foundation and is not produced by this plan.

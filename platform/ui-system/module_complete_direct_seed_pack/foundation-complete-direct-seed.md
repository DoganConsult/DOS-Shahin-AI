# Foundation — Single Source of Truth (Direct Seed Pack)

**Authoritative contract:** `foundation-complete-direct-seed.json`

> **Status:** Reflects actual code, Shahin SPA routing, direct-seed JSON, user-service mounts, and DB migrations as of **2026-05-05**. If this file diverges from code or `foundation-complete-direct-seed.json`, **code + JSON win** — update this MD to match.

## 0. Provenance map (where each fact lives)

| Concern | Authoritative file |
|---|---|
| **Wave-1 direct-seed contract (nav, pages, archetypes, APIs snapshot)** | `platform/ui-system/module_complete_direct_seed_pack/foundation-complete-direct-seed.json` |
| Module identity (legacy TypeScript manifest) | `platform/foundation/interface/foundation.module.ts` (`FOUNDATION_MANIFEST`) |
| Module manifest | `platform/foundation/module.manifest.json` |
| **Legacy** page+nav contract (not URL truth in Shahin) | `platform/foundation/contracts/foundation.module-contract.ts` (`FOUNDATION_CONTRACT`) |
| Module permissions (aggregator) | `platform/foundation/interface/security/foundation.permissions.ts` (`FOUNDATION_MODULE_PERMISSIONS`) |
| Cross-module permission codes | `platform/foundation/contracts/foundation.permissions.ts` (`FOUNDATION_PERMISSION_CODES`) |
| Module roles | `platform/foundation/interface/security/foundation.roles.ts` (`FOUNDATION_MODULE_ROLES`) |
| Aggregator router | `platform/foundation/interface/http/foundation-aggregator.routes.ts` |
| OpenAPI surface | `platform/foundation/openapi.yaml` |
| Backend wiring | `services/user-service/src/server.ts`, `services/user-service/src/domain/foundation/index.ts` |
| **Shahin `/foundation` URL host** | `products/shahin-ai/app/src/app/app.routes.ts` → wildcard child → `DynamicTemplatePageComponent` |
| **Entitlement + coarse guard** | `products/shahin-ai/app/src/app/shell/foundation.guard.ts` (`foundation` module + `foundation.read`) |
| Deprecated page components (not route targets) | `platform/foundation/ui/pages/*.component.ts` |
| Owned tables (DDL) | `platform/foundation/db/migrations/*.sql` |
| Tenant-schema tables | `db/canonical/tenant/*.sql` |
| Dynamic-UI / template binding + registry (live) | `dos.ui_route_template_binding`, `dos.dynamic_ui_component_registry`; migrations e.g. `20260504_0130_foundation_masthead_seed.sql`, `20260505_0100_wave1_complete_direct_seed_registry.sql` |

## 1. Module identity

| Field | Value |
|---|---|
| `module_code` | `foundation` |
| `version` | `2.0.0` |
| `nameEn` | `Foundation — Organization Hierarchy` |
| `nameAr` | `الأساس — الهيكل التنظيمي` |
| `tier` | `platform` |
| `category` | `platform` |
| `routeBase` | `/api/foundation` |
| `eventNamespace` | `foundation` |
| `tablePrefix` | `foundation_` |
| `provisioningOrder` | `2` |
| `licensingTier` | `starter` |
| `installable` | `false` |
| `visibility` | `internal` |
| `entitlementKey` | `module.foundation` |
| `featureFlag` | `module.foundation.enabled` |
| `owner_service` | `user-service` (lazy-loads canonical `platform/foundation/dist`) |
| `entrypoint` | `dist/bootstrap.js#registerFoundation` |

## 2. Permissions (authoritative)

### 2.1 `FOUNDATION_MODULE_PERMISSIONS` (5 codes — declared in code)

| permissionCode | resourceType | actionType | sensitive | description |
|---|---|---|---|---|
| `foundation.read` | `record` | `read` | false | Read foundation records |
| `foundation.record.write` | `record` | `write` | false | Write foundation records |
| `foundation.record.delete` | `record` | `delete` | true | Delete foundation records |
| `foundation.record.approve` | `record` | `approve` | true | Approve foundation changes |
| `foundation.manage` | `system` | `manage` | true | Manage foundation configuration |

### 2.2 `FOUNDATION_PERMISSION_CODES` (cross-module contract aliases)

The peer-facing contract in `contracts/foundation.permissions.ts` exposes
public aliases peer modules MUST import (not hardcode):

| Symbol | Code |
|---|---|
| `READ` | `foundation.read` |
| `WRITE` | `foundation.record.write` |
| `DELETE` | `foundation.record.delete` |
| `APPROVE` | `foundation.record.approve` |
| `MANAGE` | `foundation.manage` |
| `ORG_READ` | `foundation.org.read` |
| `ORG_WRITE` | `foundation.org.write` |
| `RECORD_READ` | `foundation.record.read` |
| `ADMIN_MANAGE` | `foundation.manage` |
| `DOT_READ` | `foundation.read` |
| `SYSTEM_MANAGE` | `foundation.system.manage` |

> Permission codes referenced by router `requirePermission(...)` calls
> include `foundation.read`, `foundation.record.write`,
> `foundation.record.approve`, `foundation.manage`, `foundation.user.read`,
> `foundation.user.write`, `foundation.admin.read`, `organization.read`,
> `access_review.read`, `audit_trail.read`. All of these are valid and seeded
> via DAuth from `module.manifest.json#goldenReady.rbac`.

### 2.3 Direct-seed manifest vs Shahin guard vs DAuth (alignment gap)

| Layer | What it uses today | Notes |
|------|---------------------|--------|
| **`foundation-complete-direct-seed.json`** | Per-nav and per-page codes such as `foundation.module.read`, `foundation.data.read`, `foundation.rbac.read`, … | Canonical for **template-binding** rows and **customer-gate** props coverage when those codes exist in AccessStore / RBAC. |
| **`foundationGuard` (Shahin)** | Module `foundation` in `AccessStore.modules()` and **single** check `access.hasPermission('foundation.read')` | Any user who passes the guard can open **any** `/foundation/**` path; finer rules must come from **route-level** or **resolver** permission checks, not this guard alone. |
| **TypeScript `FOUNDATION_CONTRACT` / aggregators** | Mix of `foundation.read`, `foundation.user.read`, `audit_trail.read`, `organization.read`, … | Still true for **backend** `requirePermission`; does not automatically match the **JSON** `foundation.*` matrix. |

**Work to complete (next):**

1. Seed or map DAuth / `platform_dauth.permissions` so **every** code in `foundation-complete-direct-seed.json` `permissions[]` exists and is assignable to roles.
2. Either **narrow `foundationGuard`** (e.g. require `foundation.module.read` or equivalent) or **document** that `foundation.read` is the sole coarse gate and per-page enforcement is deferred.
3. Align **nav resolver / Dynamic UI** so displayed nav items use the same permission strings as the JSON (avoid silent mismatches).

## 3. Roles (`FOUNDATION_MODULE_ROLES` — 8 module roles)

| roleCode | archetype | nameEn | default | scope | permissions |
|---|---|---|---|---|---|
| `foundation.executive_owner` | `executive_owner` | Foundation Executive Owner | false | org | read, record.write, record.delete, record.approve, manage |
| `foundation.module_lead` | `module_lead` | Foundation Module Lead | false | department | read, record.write, record.approve, manage |
| `foundation.approver` | `approver` | Foundation Approver | false | department | read, record.approve |
| `foundation.operator` | `operator` | Foundation Operator | false | department | read, record.write |
| `foundation.contributor` | `contributor` | Foundation Contributor | false | own | read, record.write |
| `foundation.reviewer` | `reviewer` | Foundation Reviewer | false | department | read |
| `foundation.auditor` | `auditor` | Foundation Auditor | false | org | read |
| `foundation.viewer` | `viewer` | Foundation Viewer | true | own | read |

## 4. Navigation (21 items — `foundation-complete-direct-seed.json` → `navigation[]`)

These are the **intended** nav contract for Dynamic UI / AccessStore integration. Parent group row `foundation` has `route: null` (section root).

| sort | nav_item_code | route | permission | icon |
|-----:|---|---|---|---|
| 5 | `foundation` | *(null — group)* | `foundation.module.read` | building |
| 10 | `foundation.overview` | `/foundation/overview` | `foundation.module.read` | layout-dashboard |
| 20 | `foundation.organization` | `/foundation/organization` | `foundation.data.read` | sitemap |
| 30 | `foundation.business-units` | `/foundation/business-units` | `foundation.data.read` | briefcase |
| 40 | `foundation.departments` | `/foundation/departments` | `foundation.data.read` | building-community |
| 50 | `foundation.positions` | `/foundation/positions` | `foundation.data.read` | badge |
| 60 | `foundation.locations` | `/foundation/locations` | `foundation.data.read` | map-pin |
| 70 | `foundation.users` | `/foundation/users` | `foundation.user.read` | users |
| 80 | `foundation.teams` | `/foundation/teams` | `foundation.data.read` | users-group |
| 90 | `foundation.roles` | `/foundation/roles` | `foundation.rbac.read` | shield |
| 100 | `foundation.permissions` | `/foundation/permissions` | `foundation.rbac.read` | key |
| 110 | `foundation.committees` | `/foundation/committees` | `foundation.data.read` | assembly |
| 120 | `foundation.delegations` | `/foundation/delegations` | `foundation.data.read` | share |
| 130 | `foundation.access-review` | `/foundation/access-review` | `foundation.review.read` | checklist |
| 140 | `foundation.policies` | `/foundation/policies` | `foundation.data.read` | book |
| 150 | `foundation.audit` | `/foundation/audit` | `foundation.audit.read` | history |
| 160 | `foundation.ownership` | `/foundation/ownership` | `foundation.data.read` | chart-arcs |
| 170 | `foundation.sod` | `/foundation/sod` | `foundation.sod.write` | shield-lock |
| 180 | `foundation.hierarchy-viz` | `/foundation/hierarchy-viz` | `foundation.hierarchy.read` | binary-tree |
| 190 | `foundation.user-lifecycle` | `/foundation/user-lifecycle` | `foundation.user.write` | arrow-cycle |
| 200 | `foundation.reference-data` | `/foundation/reference-data` | `foundation.data.read` | database |
| 210 | `foundation.diagnostics` | `/foundation/diagnostics` | `foundation.module.read` | stethoscope |

### 4.1 Shahin SPA route wiring (actual)

Under `path: 'foundation'`, **all** child paths are served by a single wildcard child loading `DynamicTemplatePageComponent` from `@platform/shell` (template-only routing). Redirects normalize legacy names: `home` → `overview`, `register` / `detail` → `records`, `module-settings` → `settings`, `module-audit` → `reports` (see `app.routes.ts`). The **resolver** fetches archetype + props for the current URL from **`GET /api/ui-os/template-binding`** (and related ui-os endpoints), not from direct `Foundation*Component` imports.

## 5. Page matrix (21 pages — `pages[]` in JSON + runtime behavior)

| # | page_code | route | archetype | template_export (loader) | permission (JSON) | Primary data APIs (see §6) |
|---:|---|---|---|---|---|---|
| 1 | `foundation.overview` | `/foundation/overview` | command-home | `ModuleOverviewTemplateComponent` | `foundation.module.read` | `/api/foundation/dashboard`, `/api/foundation/lookups` |
| 2 | `foundation.organization` | `/foundation/organization` | org-chart | `OrgChartTemplateComponent` | `foundation.data.read` | `/api/organizations`, `/api/org-hierarchy` |
| 3 | `foundation.business-units` | `/foundation/business-units` | org-chart | `OrgChartTemplateComponent` | `foundation.data.read` | `/api/business-units`, `/api/organizations` |
| 4 | `foundation.departments` | `/foundation/departments` | org-chart | `OrgChartTemplateComponent` | `foundation.data.read` | `/api/departments`, `/api/organizations` |
| 5 | `foundation.positions` | `/foundation/positions` | intelligent-register | `ModuleRecordsTemplateComponent` | `foundation.data.read` | `/api/positions` |
| 6 | `foundation.locations` | `/foundation/locations` | intelligent-register | `ModuleRecordsTemplateComponent` | `foundation.data.read` | `/api/locations` |
| 7 | `foundation.users` | `/foundation/users` | intelligent-register | `ModuleRecordsTemplateComponent` | `foundation.user.read` | `/api/users`, `/api/profiles` |
| 8 | `foundation.teams` | `/foundation/teams` | org-chart | `OrgChartTemplateComponent` | `foundation.data.read` | `/api/teams`, `/api/foundation/teams` |
| 9 | `foundation.roles` | `/foundation/roles` | intelligent-register | `ModuleRecordsTemplateComponent` | `foundation.rbac.read` | `/api/roles`, `/api/foundation/roles` |
| 10 | `foundation.permissions` | `/foundation/permissions` | ownership-map | `OwnershipMapTemplateComponent` | `foundation.rbac.read` | `/api/permissions` (via host / foundation aggregator as mounted) |
| 11 | `foundation.committees` | `/foundation/committees` | intelligent-register | `ModuleRecordsTemplateComponent` | `foundation.data.read` | `/api/committees`, `/api/governance/committees` |
| 12 | `foundation.delegations` | `/foundation/delegations` | delegation-center | `DelegationCenterTemplateComponent` | `foundation.data.read` | `/api/governance/delegations`, `/api/delegations` |
| 13 | `foundation.access-review` | `/foundation/access-review` | workflow-control | `ModuleAssessmentsTemplateComponent` | `foundation.review.read` | `/api/access-reviews`, `/api/access-review` |
| 14 | `foundation.policies` | `/foundation/policies` | intelligent-register | `ModuleRecordsTemplateComponent` | `foundation.data.read` | `/api/governance/policies`, `/api/governance` |
| 15 | `foundation.audit` | `/foundation/audit` | audit-trail-ledger | `AuditTrailLedgerTemplateComponent` | `foundation.audit.read` | `/api/audit-trail` |
| 16 | `foundation.ownership` | `/foundation/ownership` | ownership-map | `OwnershipMapTemplateComponent` | `foundation.data.read` | `/api/ownership-mappings` |
| 17 | `foundation.sod` | `/foundation/sod` | module-settings | `ModuleSettingsTemplateComponent` | `foundation.sod.write` | `/api/sod`, `/api/foundation/sod/*` |
| 18 | `foundation.hierarchy-viz` | `/foundation/hierarchy-viz` | org-chart | `OrgChartTemplateComponent` | `foundation.hierarchy.read` | `/api/org-hierarchy` |
| 19 | `foundation.user-lifecycle` | `/foundation/user-lifecycle` | workflow-timeline | `WorkflowTimelineTemplateComponent` | `foundation.user.write` | `/api/user-lifecycle`, `/api/foundation/user-lifecycle` |
| 20 | `foundation.reference-data` | `/foundation/reference-data` | intelligent-register | `ModuleRecordsTemplateComponent` | `foundation.data.read` | `/api/foundation/lookups`, reference catalogs via foundation routes |
| 21 | `foundation.diagnostics` | `/foundation/diagnostics` | posture-overview | `PostureOverviewTemplateComponent` | `foundation.module.read` | `/api/health/foundation`, `/api/foundation/health` |

**Legacy Angular pages:** files under `platform/foundation/ui/pages/*` match the old `Foundation*Component` routing model. They are **not** the Shahin URL host path today; keep them only until feature parity is proven on DynamicTemplate + archetype renderers, then delete per platform policy.

### 5.1 Snapshot APIs in `foundation-complete-direct-seed.json`

The JSON `apis[]` lists a **minimal** cross-cutting set (template-binding + a few GET surfaces). It is **not** exhaustive; §6 is the full mount inventory. **Missing from JSON (optional next):** explicit rows for `/api/teams`, `/api/roles`, `/api/departments`, `/api/positions`, `/api/locations`, `/api/org-hierarchy`, `/api/committees`, `/api/governance/*`, `/api/access-review*`, `/api/sod`, `/api/user-lifecycle` — add only if you want the direct-seed pack to double as OpenAPI-style documentation (schema allows `method`, `path`, `owner_service`, `permission` only).

## 6. API surface — actual mounts

### 6.0 Gaps vs product completeness (what is still missing or weak)

| Gap | Severity | Detail |
|-----|----------|--------|
| **Per-page AuthZ in SPA** | P1 | `foundationGuard` only checks `foundation.read`; pages that need `foundation.sod.write`, `foundation.user.write`, etc. should enforce via **route `data.permission`**, shell mutator, or **401/403 on API** — verify end-to-end for each row in §5. |
| **DAuth codes from JSON** | P1 | Ensure all `foundation-complete-direct-seed.json` permission codes exist in DAuth and are included in tenant role bundles; until then nav may show items users cannot legally use. |
| **Direct-seed `apis[]` completeness** | P2 | JSON lists 8 paths; §6.1–6.2 list many more — extend `apis[]` if the pack must be self-contained for auditors. |
| **Archetype → live widget data** | P2 | Template loaders render shell; each archetype must still bind to **real** list/detail APIs — track gaps per page in module vertical-slice DoD. |
| **Legacy `Foundation*Component` removal** | P3 | Blocked until DynamicTemplate parity + E2E sign-off (see §10). |

**Next wave suggestion:** run one **vertical slice** per archetype (e.g. intelligent-register + org-chart) with Playwright: login → open route → assert network calls succeed and no empty-state contract break.

### 6.1 Host mounts in `services/user-service/src/server.ts`

Both **flat** and **aggregated** prefixes resolve to the same routers.

| Prefix | Router |
|---|---|
| `/api/users` | `userRouter` (host) + `viewPreferencesRouter` |
| `/api/teams` | `teamRouter` (host) |
| `/api/roles` | `roleRouter` (host) |
| `/api/departments` | `departmentRouter` (host) |
| `/api/organizations` | `organizationsRouter` |
| `/api/business-units` | `businessUnitsRouter` |
| `/api/positions` | `positionsRouter` |
| `/api/locations` | `locationsRouter` |
| `/api/org-hierarchy` | `orgHierarchyRouter` |
| `/api/committees` | `committeeManagementRouter` |
| `/api/ownership-mappings` | `ownershipMappingRouter` |
| `/api/ownership-mapping` | `ownershipMappingRouter` (alias) |
| `/api/sod` | `sodCheckRouter` |
| `/api/governance` | `foundationGovernanceRouter` |
| `/api/governance/delegations` | `delegationRouter` |
| `/api/governance/committees` | `committeeManagementRouter` |
| `/api/user-lifecycle` | `userLifecycleRouter` |
| `/api/bulk-invite` | `bulkInviteRouter` |
| `/api/access-reviews` | `accessReviewRouter` |
| `/api/access-review` | `accessReviewRouter` (alias) |
| `/api/delegations` | `delegationRouter` |
| `/api/invitations` | `invitationsRouter` |
| `/api/audit-trail` | `auditTrailRouter` |
| `/api/profiles` | `profilesRouter` |
| `/api/privacy-ops` | `privacyOpsRouter` |
| `/api/foundation` | `foundationRouter` (aggregator factory) |
| `/api/health/foundation` | `healthFoundationRouter` |

### 6.2 Aggregator sub-mounts under `/api/foundation/*`

| Sub-path | Router |
|---|---|
| `/users` | host `userRouter` (injected) |
| `/teams` | `teamsRouter` |
| `/roles` | host `roleRouter` (injected) |
| `/departments` | host `departmentRouter` (injected) |
| `/organizations` | `organizationsRouter` |
| `/business-units` | `businessUnitsRouter` |
| `/positions` | `positionsRouter` |
| `/locations` | `locationsRouter` |
| `/org-hierarchy` | `orgHierarchyRouter` |
| `/committees` | `committeeManagementRouter` |
| `/module-config` | `moduleConfigRouter` |
| `/ownership-mappings` | `ownershipMappingRouter` |
| `/ownership-mapping` | alias |
| `/sod` | `sodCheckRouter` |
| `/governance` | `foundationGovernanceRouter` |
| `/user-lifecycle` | `userLifecycleRouter` |
| `/bulk-invite` | `bulkInviteRouter` |
| `/access-reviews` | `accessReviewRouter` |
| `/access-review` | alias |
| `/delegations` | `delegationRouter` |
| `/employee-lifecycle` | `employeeLifecycleRouter` |
| `/manager-chain` | `managerChainRouter` |
| `/org-scope` | `orgScopeRouter` |
| `/inheritance` | `inheritanceRouter` |
| `/access-snapshot` | `accessSnapshotRouter` |
| `/dynamic-ui` | `createDynamicUiAllowlistRouter()` |
| `/` (mount-at-root) | `authoritySodRouter` (`/authority`, `/sod`) · `complianceFabricRouter` (`/policy-acks`, `/training`, `/coi`) · `foundationHealthRouter` (`/health`) · `foundationSuggestionsRouter` (`/suggestions`) |
| `/dashboard` | inline aggregator |
| `/lookups` | inline aggregator |

### 6.3 Aggregator inline endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/api/foundation/dashboard` | `foundation.read` |
| GET | `/api/foundation/lookups` | `foundation.read` |
| GET | `/api/foundation/health` | `foundation.read` |

## 7. Database tables (canonical)

### 7.1 Owned `dos.*` tables (28 declared in `module.manifest.json`)

`organizations`, `business_units`, `departments`, `positions`,
`position_assignments`, `locations`, `location_bu_map`, `committees`,
`committee_meetings`, `committee_members`, `teams`, `team_members`,
`team_raci_assignments`, `ownership_mappings`, `user_org_scope`,
`tenant_memberships`, `access_reviews`, `access_review_items`, `delegations`,
`foundation_authority_kinds`, `foundation_position_authority`,
`foundation_employee_lifecycle_state`, `foundation_employee_lifecycle_tasks`,
`foundation_employee_lifecycle_transitions`,
`foundation_employee_lifecycle_workflows`, `foundation_coi_declarations`,
`foundation_policy_acknowledgments`, `foundation_sod_rules`,
`foundation_sod_violations`.

Additional governance / audit tables created by foundation migrations:
`dos.governance_policies`, `dos.audit_trail`.

### 7.2 Owned reference catalogs (16 — `dos.foundation_cat_*`)

`audit_actions`, `bu_templates`, `calendar_systems`, `coi_categories`,
`committee_templates`, `data_classifications`, `dept_templates`,
`lawful_bases`, `location_types`, `org_types`, `ownership_domains`,
`position_templates`, `profile_types`, `readiness_dimensions`, `reference`,
`role_templates`, `tenant_defaults`.

### 7.3 Tenant-schema tables (`tenant_<id>.*`)

`workspaces`, `organizations`, `business_units`, `departments`, `sections`,
`teams`, `team_members`, `positions`, `position_assignments`, `committees`,
`committee_members`, `locations`, `location_bu_map`, `ownership_mappings`.

### 7.4 Shared schemas

| Schema | Tables (foundation-touched) |
|---|---|
| `platform_dauth` | `invitations`, `sod_rules`, `delegations`, `functional_roles`, `role_permissions`, `user_role_assignments`, `permissions` |
| `ai_admin_or_dauth` | `users` |
| `platform_dos` | `tenants_registry`, `tenant_products`, `tenant_product_modules` |

## 8. Provisioning (per tenant)

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + foundation + active` |
| `dos.tenant_memberships` | one row per user with role |
| `dos.tenant_trials` | active trial if applicable |
| `dos.tenant_subscriptions` | active or trialing subscription |
| OpenFGA / DAuth | tuples for `foundation:org`, `foundation:committee`, `foundation:record` |

## 9. Backend wiring contract

- `services/user-service/src/domain/foundation/index.ts` lazy-`require`s the
  canonical `platform/foundation/dist` via `loadModuleExports`. Strict-mode
  boot (`MOUNT_FILTER_MODE=strict`, default) **refuses to start** the host
  if foundation is not built or the aggregator factory is missing.
- `server.ts` calls `bindFoundationPublisher(eventBus)`,
  `bindFoundationPorts({ database, logger })`, and
  `authAdapter.bindDauthShared()` before mounting routers.
- `FOUNDATION_MODULE_DIST` env var overrides the dist path.

## 10. Dynamic-UI / template binding (current state)

- **Shahin product:** All `/foundation/**` UI paths are served by `DynamicTemplatePageComponent` with **DB-driven** `dos.ui_route_template_binding` (archetype, `template_export`, props). Legacy `Foundation*Component` files are **not** reachable from URLs (see comments in `app.routes.ts`).
- **Loader registry:** `platform/core/platform/shell/template-binding.registry.ts` (and related) must export each `template_export` name used in the JSON (`ModuleOverviewTemplateComponent`, `OrgChartTemplateComponent`, …). Customer-gate `loader-resolvability` enforces this.
- **Registry + Carbon:** Component registry rows and `carbon_key` values are enforced by migrations and `trg_carbon_only_runtime` (see e.g. `20260505_0100_wave1_complete_direct_seed_registry.sql` and related foundation masthead / nav dedupe migrations).
- **Not “pending” generic migration:** The old placeholder `2026xxxx_xxxx_foundation_pages_pack.sql` is superseded by the **Phase F / wave-1** binding + registry migrations above. Update any external docs that still reference the placeholder filename.

## 11. Validation checklist (updated for Dynamic UI + DAuth)

- [ ] `foundation-complete-direct-seed.json` validates against `00-universal-module-contract.schema.json`
- [ ] Every `pages[].template_export` resolves in `template-binding.registry.ts` (loader-resolvability gate)
- [ ] Every `pages[].route` has a matching row in `dos.ui_route_template_binding` (or equivalent resolver source) for tenant/global scope as designed
- [ ] `GET /api/ui-os/template-binding` returns correct archetype + props for all 21 paths (vertical-slice or manual spot-check)
- [ ] `dos.dynamic_ui_component_registry` rows for foundation roster have valid `carbon_key` (DB + carbon catalog)
- [ ] DAuth: all JSON `permissions[]` codes exist and are assignable; **or** JSON is rolled back to match live DAuth
- [ ] `foundationGuard` policy documented: either align guard with `foundation.module.read` or accept `foundation.read` as coarse gate and enforce fine permissions elsewhere
- [ ] `requirePermission` on each **user-service** sub-route still matches manifest / OpenAPI (§6)
- [ ] All 8 `FOUNDATION_MODULE_ROLES` (or successor role model) exist where product still uses them
- [ ] All 28 owned `dos.*` tables created by `platform/foundation/db/migrations/*.sql`
- [ ] Tenant-schema tables provisioned per-tenant
- [ ] `pnpm --filter @dos/module-foundation build` succeeds
- [ ] `services/user-service` boots in strict mode with foundation dist resolved
- [ ] `GET /api/health/foundation` returns 200
- [ ] `GET /api/foundation/dashboard` returns aggregate counts
- [ ] No mock-only responses on production routers for foundation paths

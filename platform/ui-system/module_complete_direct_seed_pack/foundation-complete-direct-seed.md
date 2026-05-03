# Foundation — Single Source of Truth (Direct Seed Pack)

> **Status:** Reflects actual code, contracts, routers, and migrations as of
> 2026-05-03. Every row in this document is traceable to a real artifact in
> `platform/foundation/**`, `services/user-service/**`, or
> `platform/dos/migrations/**`. If the file diverges from code, the **code wins**
> and this file MUST be updated to match — never the other way around.

## 0. Provenance map (where each fact lives)

| Concern | Authoritative file |
|---|---|
| Module identity | `platform/foundation/interface/foundation.module.ts` (`FOUNDATION_MANIFEST`) |
| Module manifest | `platform/foundation/module.manifest.json` |
| Page+nav contract | `platform/foundation/contracts/foundation.module-contract.ts` (`FOUNDATION_CONTRACT`) |
| Module permissions | `platform/foundation/interface/security/foundation.permissions.ts` (`FOUNDATION_MODULE_PERMISSIONS`) |
| Cross-module permission codes | `platform/foundation/contracts/foundation.permissions.ts` (`FOUNDATION_PERMISSION_CODES`) |
| Module roles | `platform/foundation/interface/security/foundation.roles.ts` (`FOUNDATION_MODULE_ROLES`) |
| Aggregator router | `platform/foundation/interface/http/foundation-aggregator.routes.ts` |
| OpenAPI surface | `platform/foundation/openapi.yaml` |
| Backend wiring | `services/user-service/src/server.ts`, `services/user-service/src/domain/foundation/index.ts` |
| Page components | `platform/foundation/ui/pages/*.component.ts` |
| Owned tables (DDL) | `platform/foundation/db/migrations/*.sql` |
| Tenant-schema tables | `db/canonical/tenant/*.sql` |
| Dynamic-UI registry seed | `platform/dos/migrations/public/2026xxxx_xxxx_foundation_pages_pack.sql` *(pending)* |

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

## 4. Navigation (21 rows — `FOUNDATION_CONTRACT.nav`)

| order | pageCode | route | group | permission | icon |
|---:|---|---|---|---|---|
| 10  | `foundation.overview` | `/foundation/overview` | organization | `foundation.read` | layout-dashboard |
| 20  | `foundation.organization` | `/foundation/organization` | organization | `foundation.read` | sitemap |
| 30  | `foundation.business-units` | `/foundation/business-units` | organization | `foundation.read` | building |
| 40  | `foundation.departments` | `/foundation/departments` | organization | `foundation.read` | users |
| 50  | `foundation.positions` | `/foundation/positions` | organization | `foundation.read` | id-card |
| 60  | `foundation.locations` | `/foundation/locations` | organization | `foundation.read` | map-pin |
| 70  | `foundation.users` | `/foundation/users` | identity | `foundation.user.read` | user |
| 80  | `foundation.teams` | `/foundation/teams` | identity | `foundation.read` | users-group |
| 90  | `foundation.roles` | `/foundation/roles` | identity | `foundation.admin.read` | key |
| 100 | `foundation.permissions` | `/foundation/permissions` | identity | `foundation.admin.read` | shield-check |
| 110 | `foundation.committees` | `/foundation/committees` | governance | `foundation.read` | gavel |
| 120 | `foundation.delegations` | `/foundation/delegations` | governance | `foundation.read` | share |
| 130 | `foundation.access-review` | `/foundation/access-review` | governance | `access_review.read` | clipboard-check |
| 140 | `foundation.policies` | `/foundation/policies` | governance | `foundation.read` | file-shield |
| 150 | `foundation.audit` | `/foundation/audit` | governance | `audit_trail.read` | history |
| 160 | `foundation.ownership` | `/foundation/ownership` | governance | `foundation.read` | tag |
| 170 | `foundation.sod` | `/foundation/sod` | governance | `foundation.write` | shield-x |
| 180 | `foundation.hierarchy-viz` | `/foundation/hierarchy-viz` | organization | `organization.read` | git-branch |
| 190 | `foundation.user-lifecycle` | `/foundation/user-lifecycle` | identity | `user.write` | activity |
| 200 | `foundation.reference-data` | `/foundation/reference-data` | governance | `foundation.read` | database |
| 210 | `foundation.diagnostics` | `/foundation/diagnostics` | governance | `foundation.read` | stethoscope |

## 5. Page seed matrix (21 pages — `FOUNDATION_CONTRACT.pages`)

| # | pageCode | route | Angular component | component file | apis | permission |
|---|---|---|---|---|---|---|
| 1  | `foundation.overview`        | `/foundation/overview`        | `FoundationOverviewComponent`           | `ui/pages/foundation-overview.component.ts`            | `/api/foundation/dashboard`, `/api/foundation/lookups` | `foundation.read` |
| 2  | `foundation.organization`    | `/foundation/organization`    | `FoundationOrganizationComponent`       | `ui/pages/foundation-organization.component.ts`        | `/api/organizations` | `foundation.read` |
| 3  | `foundation.business-units`  | `/foundation/business-units`  | `FoundationBusinessUnitsComponent`      | `ui/pages/foundation-business-units.component.ts`      | `/api/business-units` | `foundation.read` |
| 4  | `foundation.departments`     | `/foundation/departments`     | `FoundationDepartmentsComponent`        | `ui/pages/foundation-departments.component.ts`         | `/api/foundation/departments` | `foundation.read` |
| 5  | `foundation.positions`       | `/foundation/positions`       | `FoundationPositionsComponent`          | `ui/pages/foundation-positions.component.ts`           | `/api/positions` | `foundation.read` |
| 6  | `foundation.locations`       | `/foundation/locations`       | `FoundationLocationsComponent`          | `ui/pages/foundation-locations.component.ts`           | `/api/locations` | `foundation.read` |
| 7  | `foundation.users`           | `/foundation/users`           | `FoundationUsersComponent`              | `ui/pages/foundation-users.component.ts`               | `/api/users` | `foundation.user.read` |
| 8  | `foundation.teams`           | `/foundation/teams`           | `FoundationTeamsComponent`              | `ui/pages/foundation-teams.component.ts`               | `/api/foundation/teams` | `foundation.read` |
| 9  | `foundation.roles`           | `/foundation/roles`           | `FoundationRolesComponent`              | `ui/pages/foundation-roles.component.ts`               | `/api/foundation/roles` | `foundation.admin.read` |
| 10 | `foundation.permissions`     | `/foundation/permissions`     | `FoundationPermissionMatrixComponent`   | `ui/pages/foundation-permission-matrix.component.ts`   | `/api/permissions` | `foundation.admin.read` |
| 11 | `foundation.committees`      | `/foundation/committees`      | `FoundationCommitteesComponent`         | `ui/pages/foundation-committees.component.ts`          | `/api/committees` | `foundation.read` |
| 12 | `foundation.delegations`     | `/foundation/delegations`     | `FoundationDelegationsComponent`        | `ui/pages/foundation-delegations.component.ts`         | `/api/governance/delegations` | `foundation.read` |
| 13 | `foundation.access-review`   | `/foundation/access-review`   | `FoundationAccessReviewComponent`       | `ui/pages/foundation-access-review.component.ts`       | `/api/access-review/campaigns` | `access_review.read` |
| 14 | `foundation.policies`        | `/foundation/policies`        | `FoundationDataProcessingComponent`     | `ui/pages/foundation-data-processing.component.ts`     | `/api/governance/policies` | `foundation.read` |
| 15 | `foundation.audit`           | `/foundation/audit`           | `FoundationAuditTrailPage`              | `ui/pages/foundation-audit.component.ts`               | `/api/audit-trail` | `audit_trail.read` |
| 16 | `foundation.ownership`       | `/foundation/ownership`       | `FoundationOwnershipMappingComponent`   | `ui/pages/foundation-ownership-mapping.component.ts`   | `/api/ownership-mappings` | `foundation.read` |
| 17 | `foundation.sod`             | `/foundation/sod`             | `FoundationSodConfigPage`               | `ui/pages/foundation-sod-config.component.ts`          | `/api/foundation/sod/rules`, `/api/foundation/sod/check`, `/api/foundation/sod/violations` | `foundation.write` |
| 18 | `foundation.hierarchy-viz`   | `/foundation/hierarchy-viz`   | `FoundationOrgCanvasComponent`          | (org-canvas: served from foundation org modules)       | `/api/org-hierarchy` | `organization.read` |
| 19 | `foundation.user-lifecycle`  | `/foundation/user-lifecycle`  | `FoundationUserLifecyclePage`           | `ui/pages/foundation-user-lifecycle.component.ts`      | `/api/foundation/user-lifecycle/*` | `user.write` |
| 20 | `foundation.reference-data`  | `/foundation/reference-data`  | `FoundationReferenceDataComponent`      | `ui/pages/foundation-reference-data.component.ts`      | `/api/reference-data` | `foundation.read` |
| 21 | `foundation.diagnostics`     | `/foundation/diagnostics`     | `FoundationDiagnosticsPage`             | `ui/pages/foundation-diagnostics.component.ts`         | `/api/foundation/health` | `foundation.read` |

## 6. API surface — actual mounts

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

## 10. Dynamic-UI registry seed (pending migration)

A migration `platform/dos/migrations/public/2026xxxx_xxxx_foundation_pages_pack.sql`
must seed the 21 `foundation.<x>.page` rows into:

- `dos.dynamic_ui_modules` — one row for `foundation`.
- `dos.dynamic_ui_component_registry` — 21 rows, all
  `vendor='ibm-carbon'`, `approval_status='approved'`, with verified
  `carbon_key` values from `dos.ui_carbon_components` (enforced by
  `trg_carbon_only_runtime`).
- `dos.dynamic_ui_routes` — 21 rows under `module_code='foundation'`,
  `tenant_id IS NULL`, paths from §4.

Component-map loader entries (`platform/dos/registry/component-map.ts`)
must add a Phase F-FOUND block with one entry per `foundation.<x>.page`
pointing at the corresponding standalone Angular component file from §5.

A CI gate `scripts/ci-guards/foundation-pages-coverage.mjs` (mirroring
`auth-pages-coverage.mjs`) must verify migration ⇄ component-map ⇄
contract ⇄ archetype-map ⇄ component file coverage.

## 11. Validation checklist

- [ ] `dos.module_registry` row exists for `foundation`
- [ ] All 21 `dos.dynamic_ui_routes` rows exist under `module_code='foundation'`
- [ ] All 21 `dos.dynamic_ui_component_registry` `foundation.*.page` rows exist with verified Carbon keys
- [ ] `component-map.ts` has loader for each of the 21 pages
- [ ] All page component files in §5 exist on disk
- [ ] `requirePermission` on every route resolves to a row in `platform_dauth.permissions`
- [ ] All 8 module roles exist in `platform_dauth.functional_roles`
- [ ] All 28 owned `dos.*` tables created by `platform/foundation/db/migrations/*.sql`
- [ ] All 16 reference catalogs created
- [ ] Tenant-schema tables provisioned per-tenant
- [ ] OpenFGA tuples for `foundation:org`, `foundation:committee`, `foundation:record` exist
- [ ] `pnpm --filter @dos/module-foundation build` succeeds
- [ ] `services/user-service` boots in strict mode with foundation dist resolved
- [ ] `GET /api/health/foundation` returns 200
- [ ] `GET /api/foundation/dashboard` returns aggregate counts
- [ ] No mock or static data in any router

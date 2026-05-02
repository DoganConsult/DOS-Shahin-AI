# Phase 1 — Foundation / Organization Layer (DB + Activation Audit)

**Phase intent (per AGENTS.md):** Foundation must be complete before Governance, Risk, Compliance, Audit, Workflow, or AI modules. Modules covered here: Workspace Home, Foundation Overview, Organization, Users, Teams, Roles & Permissions, Notifications, Audit Trail.

**Owning service:** `services/user-service` (canonical Foundation host) + `platform/dauth/services/auth-service` (DAuth) + `services/tenant-service` (tenant config) + `services/notification-service` + `services/notification-inbox-service` + `services/audit-service`.

---

## 1.1 Module map (Phase 1)

| Phase 1 module | Manifest | Service | Gateway prefix(es) |
|----------------|----------|---------|--------------------|
| foundation (host) | `modules/foundation/module.manifest.json`, `platform/foundation/module.manifest.json` | user-service | `/api/foundation`, `/api/users`, `/api/teams`, `/api/roles`, `/api/departments`, `/api/organizations`, `/api/business-units`, `/api/positions`, `/api/locations`, `/api/org-hierarchy`, `/api/committees`, `/api/ownership-mappings`, `/api/sod`, `/api/governance/delegations`, `/api/governance/committees`, `/api/user-lifecycle`, `/api/bulk-invite`, `/api/access-reviews`, `/api/delegations`, `/api/invitations`, `/api/audit-trail`, `/api/profiles`, `/api/privacy-ops` (`services/gateway/src/server.ts:711-742`) |
| dauth (platform) | `platform/dauth/module.manifest.json` | auth-service | `/api/auth/*`, `/api/access/my-permissions` (gateway proxy `services/gateway/src/server.ts:626`) |
| dos (platform registry) | `platform/dos/module.manifest.json` | tenant-service / platform-product-service | `/api/config/products-modules`, `/api/tenants/*`, `/api/config-center/*` |
| notification | `Notification Module/module.manifest.json` | notification-service / notification-inbox-service | `/api/notifications`, `/api/notifications/unread-count` |
| inbox | `Inbox Module/module.manifest.json` | notification-inbox-service | `/api/inbox/*`, `/api/inbox/items` |
| audit (audit trail) | `Audit Module/module.manifest.json` | audit-service / evidence-audit-reporting-service | `/api/audit-trail` (Foundation surface), `/api/audit/*` |
| team | `modules/foundation/team/module.manifest.json`, `platform/foundation/team/module.manifest.json` | user-service | `/api/teams` |

---

## 1.2 Phase 1 owned-table map (DB-verified)

The following live-DB tables back Phase 1 surfaces. Layer column = the 6-layer model from the audit spec.

### Layer 1 — Public reference catalogs (Phase 1 inputs)

| Table | Schema | Rows | Function | Owner module | Status |
|-------|--------|-----:|----------|--------------|--------|
| `lookup_countries` | public | (live) | ISO country list | foundation (consumes) | seeded |
| `lookup_cities` | public | (live) | City catalog | foundation | seeded |
| `lookup_sectors`, `lookup_sub_sectors`, `lookup_nca_sectors`, `lookup_ncec_sectors` | public | (live) | Industry sector taxonomy | foundation | seeded |
| `lookup_languages`, `lookup_timezones`, `lookup_employee_ranges`, `lookup_org_types` | public | (live) | Foundation reference data declared in `requiredReferenceData` of `modules/foundation/module.manifest.json` | foundation | seeded |
| `lookup_team_functions`, `lookup_grc_role_staffing` | public | (live) | Team/role catalog | team / foundation | seeded |
| `lookup_identity_providers`, `lookup_sso_providers`, `lookup_siem_providers` | public | (live) | DAuth IdP catalog | dauth | seeded |
| `org_pack_templates`, `org_pack_template_roles`, `org_pack_template_permissions`, `org_pack_template_role_permissions`, `org_pack_template_workflows`, `org_pack_template_sod_rules`, `org_pack_template_sections`, `org_pack_template_teams`, `org_pack_template_departments`, `org_pack_template_profiles` | public | (live) | "Org pack" templates used at tenant activation to materialize default org structure | foundation + dauth | seeded |
| `foundation_cat_*` (18 tables) | dos | (live) | Foundation catalogs: `foundation_cat_audit_actions`, `foundation_cat_bu_templates`, `foundation_cat_calendar_systems`, `foundation_cat_coi_categories`, `foundation_cat_committee_templates`, `foundation_cat_data_classifications`, `foundation_cat_dept_templates`, `foundation_cat_lawful_bases`, `foundation_cat_location_types`, `foundation_cat_org_types`, `foundation_cat_ownership_domains`, `foundation_cat_position_templates`, `foundation_cat_profile_types`, `foundation_cat_readiness_dimensions`, `foundation_cat_reference`, `foundation_cat_role_templates`, `foundation_cat_tenant_defaults` | foundation | seeded |
| `foundation_authority_kinds` | dos | (live) | Authority taxonomy | foundation | seeded |
| `grc_frameworks`, `grc_regulators`, `grc_kri_catalog`, `grc_maturity_model`, `grc_audit_universe`, `grc_sector_framework_matrix`, `grc_sector_groups`, `grc_framework_dependencies`, `grc_risk_domain_coverage`, `grc_architecture_map` | public | (live) | GRC framework/regulator catalog (consumed by Foundation tenant-bootstrap) | foundation (reads), governance (reads) | seeded |

**Layer 1 verdict for Phase 1:** Catalogs exist and are seeded. **Recommendation:** move all `foundation_cat_*` and `grc_*` references to a dedicated `dos_reference` schema in a future cleanup batch (P2).

### Layer 2 — Platform / module registry (Phase 1)

| Table | Schema | Rows | Function | Status |
|-------|--------|-----:|----------|--------|
| `tenants_registry` | platform_dos | **56** | Master tenant registry | populated |
| `products_registry` | platform_dos | (live) | Product catalog | populated |
| `modules_registry` | platform_dos | **66** | Module catalog | populated |
| `services_registry` | platform_dos | (live) | Service catalog | populated |
| `module_config` | platform_dos | (live) | Module-level runtime config | populated |
| `module_permissions` | platform_dos | (live) | Module-declared permission catalog | populated |
| `module_versions` | platform_dos | (live) | Module versioning | populated |
| `product_bundles`, `product_modules`, `product_services` | platform_dos | (live) | Product-to-module/service mapping | populated |
| `tenant_products` | platform_dos | **56** | Per-tenant product activation | populated |
| `tenant_product_modules` | platform_dos | **2499** | Per-tenant per-product module entitlement (~45 modules × 56 tenants) | populated |
| `tenant_services` | platform_dos | (live) | Per-tenant service binding | populated |
| `tenant_provisioning_jobs` | platform_dos | (live) | Provisioning job log | populated |
| `tenant_secrets_ref` | platform_dos | (live) | Secret references (not values) | populated |
| `tenant_config` | platform_dos | (live) | Per-tenant config bag | populated |
| `module_registry` (legacy) | dos | (live) | **Duplicate** of `platform_dos.modules_registry` | **P1 — collapse** |
| `product_registry` (legacy) | dos / public | (live) | **Duplicate × 2** of `platform_dos.products_registry` | **P1 — collapse** |
| `feature_flags` | platform_dos / dos | (live) | Feature flag catalog (cross-schema duplicate) | **P1 — collapse to platform_dos** |
| `feature_flag_overrides` | platform_dos / public | (live) | Per-context overrides (duplicate) | **P1 — collapse to platform_dos** |
| `default_navigation_items` | public | (live) | Layer 2 navigation defaults | should move to `platform_dos.navigation_defaults` (P2) |
| `module_visibility_contracts`, `module_visibility_contracts_legacy` | public | (live) | Module visibility rules | **P1 — promote to `platform_dos`, drop legacy** |
| `navigation_registry` | dos | (live) | Active navigation registry | should move to `platform_dos` |
| `dynamic_ui_modules`, `dynamic_ui_navigation`, `dynamic_ui_routes`, `dynamic_ui_route_permissions`, `dynamic_ui_module_icons`, `dynamic_ui_module_status`, `dynamic_ui_navigation_icons`, `dynamic_ui_widgets`, `dynamic_ui_kpis`, `dynamic_ui_actions`, `dynamic_ui_intents`, `dynamic_ui_data_resources`, `dynamic_ui_i18n_keys`, `dynamic_ui_component_registry`, `dynamic_ui_shells`, `dynamic_ui_skill_packs`, `dynamic_ui_theme_tokens`, `dynamic_ui_tenant_overrides`, `dynamic_ui_user_preferences`, `dynamic_ui_agents`, `dynamic_ui_agent_actions`, `dynamic_ui_agent_squads`, `dynamic_ui_agent_squad_members`, `dynamic_ui_page_agents`, `dynamic_ui_workflow_agents` | dos | (live, 25 tables) | **Layer 2** Dynamic UI registry (manifests, navigation, routes, widgets, agents) | populated; **dauth-style cutover to a dedicated `platform_dynamic_ui` schema is recommended (P2)** |

**Layer 2 verdict:** Registry is populated and live. Critical findings:
- **P1**: Three-schema duplication for `feature_flags`, `feature_flag_overrides`, `product_registry`, `module_registry`. Activation logic must read from one canonical source — currently risks reading stale duplicates.
- **P0 (drift)**: 56 `tenants_registry` rows vs 13 physical `tenant_*` schemas. **The activation contract is leaking**: `platform_dos.tenant_products` rows exist for tenants whose schemas don't.

### Layer 3 — Tenant activation / entitlement / configuration (Phase 1)

| Table | Schema | Function | Status |
|-------|--------|----------|--------|
| `tenants` | dos (32 rows) / public (15 rows) | Tenant operational registry — **duplicate** | **P0 — must canonicalize** |
| `tenant_settings`, `tenant_settings_legacy` | dos | Per-tenant settings (active + legacy) | **P1 — drop `_legacy` suffix tables** |
| `tenant_config_versions`, `tenant_config_versions_legacy` | dos | Tenant config versioning | **P1 — drop legacy** |
| `tenant_memberships` | dos | User-tenant membership | populated (3 rows) |
| `tenant_product_activation` | dos | Tenant-level product activation flag | populated |
| `tenant_feature_flag_overrides` | dos | Tenant-scoped feature flag override | populated |
| `tenant_dashboard_widget_pins` | dos | Pinned widgets per tenant | populated |
| `workspace_config`, `workspaces` | dos | Workspace configuration (Workspace Home) | populated |
| `shell_config` | dos | Shell config (Workspace Home shell layout) | populated |
| `runtime_config`, `runtime_config_history` | dos / public (duplicate) | Tenant runtime config + history | **P1 — collapse to dos** |
| `tenant_feature_flag_overrides`, `feature_flag_overrides` | dos / platform_dos / public | Three places hold tenant feature overrides | **P0** |
| `module_operating_state` | dos | Module enablement runtime state | populated |
| `platform_operation_config` | dos | Cross-tenant platform config | populated |

**Layer 3 verdict:** Activation contract physically exists but is fragmented across three schemas (`platform_dos.*`, `dos.*`, `public.*`) with `_legacy` siblings still present. Activation should be considered **DB_PARTIAL**.

### Layer 4 — Tenant operational data (Phase 1)

These are the per-tenant business records consumed by Foundation pages. Counts shown for `dos.*` cross-tenant + per-tenant template (`tenant_dogan`).

| Table | Schema(s) | Rows (snapshot) | Function | Status |
|-------|-----------|-----------------|----------|--------|
| `users` | dos (30) + public (26 — **duplicate**) + tenant schemas | Identity | **P0 — canonicalize to dos.users; drop public.users** |
| `user_roles`, `user_role_assignments` | dos / platform_dauth (3) | Role assignments | active in DAuth |
| `user_org_scope` | dos | User scoping (org/BU) | populated |
| `user_mfa` | platform_dauth + public (duplicate) | MFA per user | **P1 — drop public copy** |
| `iam_identities` | public | Identity registry | unclear ownership — likely DAuth pre-promotion |
| `sso_identities`, `sso_providers`, `sso_role_mappings`, `sso_sessions` | dos | SSO identity link tables | populated |
| `organizations` | dos (41) | Tenant org tree | populated |
| `business_units` | dos | BU level | populated |
| `departments` | dos | Department level | populated |
| `positions`, `position_assignments` | dos | Position registry + assignments | populated |
| `locations`, `location_bu_map` | dos | Location registry | populated |
| `teams` | dos (3) | Team registry | populated (low) |
| `team_members` | dos | Team membership | populated |
| `team_raci_assignments` | dos | RACI matrix | populated |
| `committees`, `committee_meetings`, `committee_members` | dos | Committee module (Foundation surface) | populated |
| `invitations` | dos (0) + platform_dauth (0) | User invitations — **duplicate, both empty** | **P1 — canonicalize to platform_dauth.invitations** |
| `email_verification_tokens`, `password_reset_tokens` | public | Auth token tables | should move to `platform_dauth` |
| `ownership_mappings` | dos | Resource ownership (Foundation surface) | populated |
| `notifications` | dos (4) + tenant schemas | Tenant notification feed | populated |
| `inbox_items` | dos | Inbox module operational data | populated |
| `permissions` | platform_dauth (594) | Permission catalog | populated (Layer 2 strictly) |
| `role_permissions` | platform_dauth (2835) | Role↔permission map | populated (Layer 2 strictly) |
| `functional_roles` | platform_dauth (25) | Role registry | populated (Layer 2 strictly) |
| `access_profiles`, `access_profiles_legacy`, `user_access_profiles`, `user_access_profiles_legacy` | platform_dauth | Access profile assignments + legacy | **P1 — drop legacy** |
| `delegations` | platform_dauth | OOO/delegation rules | populated |
| `sod_rules` | platform_dauth + public (duplicate) | SoD rules | **P1 — drop public copy** |
| `sod_conflict_audit`, `sod_conflict_audit_template` | dos / platform_dauth | SoD violation log | populated |
| `foundation_sod_rules`, `foundation_sod_violations` | dos | SoD inside foundation namespace | **P1 — overlap with `platform_dauth.sod_rules`; reconcile** |
| `foundation_position_authority`, `foundation_authority_kinds` | dos | Position-authority matrix | populated |
| `foundation_employee_lifecycle_state`, `foundation_employee_lifecycle_tasks`, `foundation_employee_lifecycle_transitions`, `foundation_employee_lifecycle_workflows` | dos | Employee lifecycle workflows | populated |
| `foundation_coi_declarations` | dos | Conflict-of-interest declarations | populated |
| `foundation_policy_acknowledgments` | dos | Policy attestation per user | populated |
| `foundation_training_assignments`, `foundation_training_courses` | dos | Foundation training (overlaps Training module) | **P1 — overlap with Training module owned-tables** |
| `tenant_dogan.team_*` (15 tables) | tenant_dogan | Per-tenant team detail | tenant-replicated |
| `tenant_dogan.audit_*` (40+ tables) | tenant_dogan | Per-tenant audit module data | tenant-replicated; **see also `dos.audit_trail`** |
| `tenant_dogan.notification_*` (24 tables) | tenant_dogan | Per-tenant notification operational data | tenant-replicated; overlaps `Notification Module/module.manifest.json` declared 7-table set |
| `tenant_dogan.inbox_*` (24 tables) | tenant_dogan | Per-tenant inbox operational | overlaps `Inbox Module/module.manifest.json` declared 6-table set |

**Layer 4 verdict (Phase 1):** Operational tables exist for every Phase 1 surface. **Critical gaps:**
- **P0**: Cross-schema identity duplicates (`users`, `tenants`, `login_attempts`, `invitations`, `user_mfa`, `api_keys`, `sod_rules`).
- **P0**: 15 `tenants` rows in `public` and 32 in `dos` and 56 in `platform_dos.tenants_registry` — three sources of truth for tenant identity.
- **P1**: Foundation declares 30+ `foundation_*` tables but **does not list any of them** in `modules/foundation/module.manifest.json` `ownedTables` (the manifest is empty for tables, only declares `tablePrefix: "foundation_"`). Manifest debt.
- **P1**: Notification & Inbox manifests declare ~6–7 tables each but the live tenant template carries 24 tables per module. Massive declared-vs-actual gap.

### Layer 5 — Cross-module relationship / trigger / projection (Phase 1)

| Table | Schema | Function |
|-------|--------|----------|
| `tenant_memberships` | dos | User ↔ tenant relationship (multi-tenant users) |
| `team_members` | dos | User ↔ team |
| `position_assignments` | dos | User ↔ position ↔ org |
| `user_org_scope` | dos | User ↔ org/BU scope (used by AuthZ) |
| `ownership_mappings` | dos | Generic resource ownership (Foundation provides; consumed by Risk, Controls, Evidence, Policy) |
| `role_permissions` | platform_dauth | Role ↔ permission |
| `user_role_assignments` | platform_dauth | User ↔ role (with scope) |
| `dynamic_ui_route_permissions` | dos | Route ↔ permission gating (consumed by gateway + frontend nav) |
| `dynamic_ui_module_status` | dos | Module enablement signal consumed by SPA shell |
| `tenant_product_modules` | platform_dos | Tenant entitlement projection (drives navigation) |
| `event_outbox`, `outbox`, `platform_outbox`, `platform_outbox_archive`, `dead_letter_queue`, `event_dead_letter_queue`, `event_traces`, `event_traces_legacy` | platform_dos / dos / public | Event backbone for Foundation events (`foundation.role.assigned`, `foundation.role.unassigned`, …) | **P1 — three outbox tables across three schemas**; consolidate to `platform_dos.event_outbox` |

**Layer 5 verdict:** Relationship tables exist but the **event backbone is fragmented** (4 outbox-style tables across 3 schemas). Cross-module trigger reliability is at risk.

### Layer 6 — Audit / ledger / runtime trace (Phase 1)

| Table | Schema | Rows | Function | Status |
|-------|--------|-----:|----------|--------|
| `audit_trail` | dos | **569** | Primary tenant-scoped audit log (Foundation surface `/api/audit-trail`) | active |
| `audit_logs` | dos | 0 | Possibly newer table — empty | **P2 — confirm purpose; collapse if unused** |
| `audit_log_archive` | dos | (live) | Archived audit rows | active |
| `audit_trail_global` | public | **50** | Cross-tenant audit log | **P1 — should move to `platform_dos.audit_trail_global`** |
| `platform_audit_logs` | dos | (live) | Platform-level audit | should move to `platform_dos` |
| `authorization_audit_log`, `authz_decision_log` | platform_dauth | DAuth authorization decision audit | active |
| `lifecycle_auth_log`, `lifecycle_auth_log_template` | dos / platform_dauth | Lifecycle authorization audit | active |
| `keycloak_event_log`, `keycloak_event_bridge_cursor` | platform_dauth | KC event bridge | active |
| `security_events` | platform_dauth | Security event log | active |
| `login_attempts` | dos / platform_dauth / public | **Three copies** | **P0 — collapse to platform_dauth.login_attempts** |
| `mcp_audit_log` | public | MCP tool invocation audit | should move to `dos.mcp_audit_log` |
| `system_events` | dos | System event log | active |

**Layer 6 verdict:** Audit ledger exists but split across schemas. Headline issues: 3-way duplication of `login_attempts`, audit_trail spread across `dos.audit_trail` + `public.audit_trail_global` + `dos.platform_audit_logs`.

---

## 1.3 Phase 1 module DoD checklist (per AGENTS.md)

| Layer | Foundation/Org Phase 1 status | Evidence |
|-------|-------------------------------|----------|
| Navigation | EXISTS — `dos.navigation_registry`, `dos.dynamic_ui_navigation`, role-gated | |
| Frontend Route | EXISTS — gateway prefixes proxied to user-service (`services/gateway/src/server.ts:711-742`) | |
| API Contract | PARTIAL — `/api/access/my-permissions` exists on auth-service; `/api/foundation/*` covered by user-service routers (`services/user-service/src/routes/{user,team,role,department,invitations,profiles,audit-trail,view-preferences,privacy-ops}.routes.ts`) | |
| Gateway Routing | OK — explicit prefix list in gateway server.ts:711 | |
| Service Handler | OK — user-service is online in PM2 | |
| DB Schema | **PARTIAL** — see Layer 4 duplicates and Layer 3 fragmentation above | |
| Seed Data | **PARTIAL** — `ops/seed/permissions-i18n.sql`, `ops/seed/config-platform-defaults.sql`, `ops/seeds/access/{roles,users,row_policies,settings_profiles,quotas,masking_policies}.list`, `ops/seeds/seed_platform_hierarchy.py`. Module-level seeders in `Onboarding Module/.../seed-foundation-extras.ts`, `seed-team-steps.ts`. **No single canonical Foundation seed manifest exists.** | |
| AuthN | OK — Keycloak online, DAuth proxies | |
| AuthZ | **PARTIAL** — `platform_dauth.role_permissions` populated (2835 rows, 594 permissions, 25 functional roles) but `platform_dauth.user_role_assignments` only 3 rows in cross-tenant view → AuthZ is mostly enforced from per-tenant schemas | |
| SoD | **PARTIAL** — `platform_dauth.sod_rules` and `dos.foundation_sod_rules` both exist; ownership unclear | |
| Workflow | EXISTS — `dos.workflow_*` tables back foundation employee lifecycle workflows | |
| Events | **PARTIAL** — outbox tables fragmented (P1) | |
| Observability | OK — Prometheus/Loki online (PM2: `prometheus`, `grafana`, `loki`) | |
| UI Quality | not assessed in this audit (no browser run) | |
| Negative Test | **MISSING** — no automated negative-test evidence captured | |

**Phase 1 verdict:** `YELLOW_RENDERING_WITH_GAPS` for the Foundation surface. Database is structurally complete but normalization/duplication and seed-canonicalization are blockers for production-readiness gates.

---

## 1.4 Phase 1 onboarding & activation contract (live state)

When a tenant is provisioned (per the user-chosen modules), these rows must be created:

| Step | Table | Source code path | Verified populated for `tenant_dogan`? |
|------|-------|------------------|-----------------------------------------|
| 1. Tenant entitlement | `platform_dos.tenants_registry` | `services/tenant-service` (provisioning runner) | YES (56 entries platform-wide) |
| 2. Product activation | `platform_dos.tenant_products` | `services/tenant-service` | YES (56) |
| 3. Module entitlement | `platform_dos.tenant_product_modules` | `services/tenant-service` + `Onboarding Module/.../seed-core-steps.ts` | YES (2499 rows ≈ 45 modules × 56 tenants) |
| 4. Tenant schema bootstrap | `tenant_<id>` schema (1850 tables) | `migration/migration-runner.ts` (tenant-template apply) | **PARTIAL — only 13 of 56 registered tenants have a physical schema** |
| 5. Default roles | `platform_dauth.functional_roles` (25 globals) + per-tenant `role_profiles` table | DAuth bootstrap + onboarding `seed-core-steps.ts` | YES (globals); per-tenant TBD |
| 6. Permissions catalog | `platform_dauth.permissions` (594) | DAuth bootstrap | YES |
| 7. Role-permission map | `platform_dauth.role_permissions` (2835) | DAuth bootstrap | YES |
| 8. Dynamic UI navigation | `dos.dynamic_ui_navigation` | `services/dynamic-ui-service` | YES |
| 9. Dynamic UI routes | `dos.dynamic_ui_routes` + `dynamic_ui_route_permissions` | dynamic-ui-service | YES |
| 10. Dashboard widgets | `dos.dynamic_ui_widgets` + `tenant_dashboard_widget_pins` | dashboard-widgets-service | partial |
| 11. Workflow templates | `dos.workflow_templates` | workflow-service | YES |
| 12. Notification templates | `dos.notification_*` (template tables) + per-tenant `tenant_<id>.notification_templates` | notification-service | partial |
| 13. Event subscriptions | `dos.ai_workflow_triggers`, `Notification Module` `subscribes` list | manifest-driven | declared, not auto-provisioned |
| 14. Scheduled jobs | `platform_dos.scheduled_jobs`, `platform_dos.scheduled_job_runs` | tenant-service + ops/ecosystem.platform.config.js | partial |
| 15. AI agents/widgets | `dos.ai_agent_registry`, `dos.dynamic_ui_agents` | ai-engine-service / dynamic-ui-service | partial |
| 16. Default framework/control selections | `dos.compliance_frameworks`, `dos.compliance_requirements`, `dos.controls` | `Onboarding Module/.../seed-compliance-steps.ts` | partial |
| 17. Default settings | `dos.tenant_settings` (+ legacy) | tenant-service | YES |
| 18. Empty starter workspace data | `dos.workspaces`, `workspace_config` | tenant-service | YES |
| 19. Audit row | `dos.audit_trail` (`tenant.activated`, `module.activated`) | tenant-service | partial — `audit_trail` has 569 rows total, no per-event proof captured here |
| 20. AuthZ decision log | `platform_dauth.authz_decision_log` | DAuth runtime | live |

**Activation contract verdict:** **DB_PARTIAL.** The provisioning surface exists end-to-end, but step 4 (tenant schema bootstrap) is the critical break: **43 of 56 registered tenants have no physical schema**, meaning either (a) provisioning failed silently for those tenants, or (b) the `tenants_registry` carries deleted/test/stub rows that should be archived. This must be reconciled before declaring Phase 1 production-ready.

---

## 1.5 Cross-module fire-out from Foundation (publishers)

Per `Notification Module/module.manifest.json` (subscribes) and `Audit Module/module.manifest.json` (subscribes) — Foundation publishes events that downstream modules consume. Inferred publishers for Phase 1:

| Source action | Source table | Event emitted | Subscribers (declared) | Status |
|---------------|--------------|---------------|-----------------------|--------|
| User invited | `platform_dauth.invitations` (or `dos.invitations`) | `foundation.invitation.sent` | notification | **inferred — duplicate-table risk** |
| User role assigned | `platform_dauth.user_role_assignments` | `foundation.role.assigned` | audit (subscribes), notification | declared in `Audit Module` manifest |
| User role unassigned | `platform_dauth.user_role_assignments` | `foundation.role.unassigned` | audit | declared |
| Org structure changed | `dos.organizations` / `dos.business_units` / `dos.departments` | `foundation.org.updated` | dashboard, analytics, governance | not declared in current manifests — **P1 missing publisher contract** |
| Position authority changed | `dos.foundation_position_authority` | `foundation.position.authority_changed` | governance, audit | **not declared** |
| SoD violation detected | `dos.foundation_sod_violations` / `platform_dauth.sod_conflict_audit` | `foundation.sod.violation_detected` | inbox, governance, audit | **not declared, but DSOC has `sod_violations` table** |
| Login attempt | `platform_dauth.login_attempts` | `dauth.login.attempt` | dsoc | implicit; verify |
| MFA failure | `platform_dauth.user_mfa` | `dauth.mfa.failed` | dsoc | implicit; verify |
| Access profile assigned | `platform_dauth.user_access_profiles` | `dauth.access_profile.assigned` | audit | implicit |

**Cross-module trigger verdict for Phase 1:** publishers are **partially declared** in manifests. Manifest contracts must be tightened to enumerate every Foundation event so downstream modules can subscribe declaratively.

---

## 1.6 Phase 1 normalization findings

Ranked by severity:

| # | Severity | Finding | Tables involved | Recommendation (no action this audit) |
|---|----------|---------|-----------------|---------------------------------------|
| 1 | **P0** | `tenants_registry` drift: 56 registry rows vs 13 physical schemas | `platform_dos.tenants_registry`, `platform_dos.tenant_products`, all `tenant_*` schemas | Reconcile registry vs physical schemas; archive orphan rows; harden provisioning to fail fast on schema-create |
| 2 | **P0** | `users` 2-schema duplicate, `tenants` 3-schema duplicate, `login_attempts` 3-schema duplicate | `dos.users` (30) + `public.users` (26); `dos.tenants` (32) + `public.tenants` (15) + `platform_dos.tenants_registry` (56); `login_attempts` × 3 | Canonicalize to `platform_dauth` (identity tables) and `platform_dos.tenants_registry` (registry); rebind FKs; quarantine duplicates after proof |
| 3 | **P0** | 246 cross-tenant tables hold `tenant_id` with no RLS — Foundation tables included | `dos.users`, `dos.organizations`, `dos.business_units`, `dos.departments`, `dos.positions`, `dos.locations`, `dos.teams`, `dos.team_members`, `dos.committees`, `dos.foundation_*`, `dos.audit_trail`, `dos.notifications`, `dos.workspaces`, … | Enable RLS with `current_setting('app.tenant_id')` policy on all Foundation tables; gate gateway requests to set the GUC |
| 4 | **P1** | `_legacy` table siblings still present and queryable | `tenant_settings_legacy`, `tenant_config_versions_legacy`, `module_visibility_contracts_legacy`, `access_profiles_legacy`, `user_access_profiles_legacy`, `sessions_legacy`, `event_traces_legacy`, `lifecycle_checkpoints_legacy`, `lifecycle_transitions_legacy`, `dead_letter_queue_legacy`, `contract_catalog_legacy`, `lifecycle_checkpoints_legacy` | Archive after dual-write window; drop after Phase 1 production cutover proof |
| 5 | **P1** | Foundation manifest declares `tablePrefix: "foundation_"` but does **not** enumerate the 30+ `foundation_*` tables in `ownedTables` | `modules/foundation/module.manifest.json`, `platform/foundation/module.manifest.json` | Populate `ownedTables` list to match live `dos.foundation_*` and `dos_reference.foundation_cat_*` |
| 6 | **P1** | DAuth/DOS/Dynamic-UI/DSOC/DNOC/AI/Admin platform manifests have **no `ownedTables` at all** | `platform/{dauth,dos,dsoc,dnoc,dynamic-ui,admin,ai}/module.manifest.json` | Populate from live schema introspection (this audit can be the input) |
| 7 | **P1** | `Notification Module` declares 7 owned tables but `tenant_dogan.notification_*` carries 24; `Inbox Module` declares 6 but tenant carries 24 | manifest vs `tenant_dogan` | Reconcile manifest to actual table set; quarantine extras OR add to manifest |
| 8 | **P1** | Outbox/event backbone fragmented across `platform_dos.event_outbox` + `dos.outbox` + `dos.platform_outbox` + `dos.event_dead_letter_queue` + `public.dead_letter_queue` + `public.dead_letter_queue_legacy` | Cross-schema | Canonicalize to `platform_dos.event_outbox` + `platform_dos.dead_letter_queue`; archive others |
| 9 | **P1** | Foundation training tables overlap with Training module | `dos.foundation_training_assignments`, `dos.foundation_training_courses` vs Training module's owned tables (Phase 7) | Confirm ownership: Foundation should not own training; move to Training schema |
| 10 | **P1** | SoD ownership unclear: `platform_dauth.sod_rules` (canonical) vs `dos.foundation_sod_rules` + `public.sod_rules` (duplicates) + `dos.sod_conflict_audit` + `dos.foundation_sod_violations` + `platform_dsoc.sod_violations` | 6 tables across 4 schemas | Single owner = DAuth (rules) + DSOC (violations); foundation_* and public.* must be deprecated |
| 11 | **P1** | Two `Foundation` manifests (`modules/foundation` AND `platform/foundation`) with identical content | `modules/foundation/module.manifest.json` vs `platform/foundation/module.manifest.json` | Canonicalize to one (likely `platform/foundation`) and have `modules/foundation` re-export |
| 12 | **P1** | Two `team` manifests | `modules/foundation/team/module.manifest.json` vs `platform/foundation/team/module.manifest.json` | Same as above |
| 13 | **P1** | `findings` table sits in `dos` but Audit Module declares both `findings` AND `audit_findings` as owned | `dos.findings`, `dos.audit_findings` (Audit manifest) | Decide: one owns audit findings; the other should be renamed (e.g., `risk_findings`) |
| 14 | **P2** | Audit table proliferation in tenant schema: `tenant_dogan.audit_*` has 40+ tables (audit_capa, audit_kpis, audit_quality_review, audit_repeat_findings, audit_team_assignments, audit_time_tracking, audit_universe, …) — Audit Module manifest declares only 8 owned | `tenant_*.audit_*` | Either expand Audit manifest OR confirm extras belong to a sub-module |
| 15 | **P2** | `incidents` collision: business `dos.incidents` vs security `platform_dsoc.incidents` | both | Rename DSOC table to `security_incidents` for clarity |
| 16 | **P2** | `email_verification_tokens`, `password_reset_tokens` live in `public` instead of `platform_dauth` | both | Move to `platform_dauth` |
| 17 | **P2** | 11 `mcp_*` tables in `public` instead of `dos.mcp_*` or new `platform_mcp` schema | 11 tables | Schema move (after Phase 8 audit) |

---

## 1.7 Phase 1 verdict

**Verdict:** `COMPLETE WITH BLOCKING NORMALIZATION DEBT` (per AGENTS.md vocabulary, this is `YELLOW_RENDERING_WITH_GAPS` not `GREEN_WORKING`).

**Top 3 blockers for `GREEN_WORKING` Phase 1:**
1. Tenant registry drift (56 registry rows vs 13 schemas) — must reconcile or archive.
2. Cross-schema identity duplication (`users`/`tenants`/`login_attempts`/`invitations`/`user_mfa`/`api_keys`/`sod_rules`).
3. RLS not enforced on the 246 tenant-scoped tables in `dos.*` and `platform_*.*`.

**Next phase:** Phase 2 — Workflow layer (workflow-service + workflow templates + tasks + approvals + delegation). Will be produced in the next deliverable.

# Foundation Module — Provisioning & Seeding Specification

**Module code:** `foundation` · **Host service:** `user-service` (port 4003) · **Tier:** platform · **Criticality:** P0

This document is the contractual checklist for bringing the Foundation module to **100% provisioned** for any tenant. It distinguishes four classes of data:

| Class | Meaning | Re-runnable? |
|---|---|---|
| **A. MUST-PROVISION (DDL)** | Schema/tables/indexes/constraints/RLS — without these the module cannot start | Idempotent migrations |
| **B. MUST-SEED — Process Content** | Catalogue & RBAC data the module logic depends on (permissions, roles, role-permission bindings, reference catalogues, workflow templates). Missing => 403 / empty dropdowns / runtime errors | Idempotent seeds, run on every deploy |
| **C. MAY-SEED — Demo Content** | Realistic-looking tenant data used to populate empty pages on first login (sample org, BUs, locations, committees). Operator-controllable | Toggleable per environment |
| **D. MAY-SEED — Guidance Templates** | Starter content the end-user is expected to customize or replace (default position library, committee charters, audit-action vocab). Shipped as suggestions | Once on tenant create, then user-owned |

---

## A. MUST-PROVISION — Database Footprint (DDL)

Run via `pnpm migrate` → bundle [`db/module-migration-bundle.json`](./db/module-migration-bundle.json).

### Schemas
- `dos` (shared platform schema)
- `tenant_<code>` (per-tenant; created by tenant-service provisioner; foundation drift-repaired in zero-blocker)
- Read/write into `platform_dauth.*` (users, invitations, sod_rules, delegations) and `platform_dos.*` (tenants_registry, tenant_products, tenant_product_modules)

### Owned tables (28)
`organizations`, `business_units`, `departments`, `positions`, `position_assignments`, `locations`, `location_bu_map`, `committees`, `committee_meetings`, `committee_members`, `teams`, `team_members`, `team_raci_assignments`, `ownership_mappings`, `user_org_scope`, `tenant_memberships`, `access_reviews`, `access_review_items`, `delegations`, `foundation_authority_kinds`, `foundation_position_authority`, `foundation_employee_lifecycle_state`, `foundation_employee_lifecycle_tasks`, `foundation_employee_lifecycle_transitions`, `foundation_employee_lifecycle_workflows`, `foundation_coi_declarations`, `foundation_policy_acknowledgments`, `foundation_sod_rules`, `foundation_sod_violations`

### Owned reference (catalogue) tables (16)
`foundation_cat_audit_actions`, `foundation_cat_bu_templates`, `foundation_cat_calendar_systems`, `foundation_cat_coi_categories`, `foundation_cat_committee_templates`, `foundation_cat_data_classifications`, `foundation_cat_dept_templates`, `foundation_cat_lawful_bases`, `foundation_cat_location_types`, `foundation_cat_org_types`, `foundation_cat_ownership_domains`, `foundation_cat_position_templates`, `foundation_cat_profile_types`, `foundation_cat_readiness_dimensions`, `foundation_cat_reference`, `foundation_cat_role_templates`, `foundation_cat_tenant_defaults`

### Cross-cutting
- RLS on all 11 core `dos.*` foundation tables (`20260425_0500_foundation_rls.sql`)
- `module_kickstart_log` row per tenant
- Workflow template `foundation_org_change` registered

---

## B. MUST-SEED — Process Content (deploy-time, all tenants)

Without this, every Foundation API returns 403 or empty.

| Item | Volume | Source | Target table |
|---|---|---|---|
| Permission codes | **40** (`organization.read`, `organization.write`, `business_unit.*`, `position.*`, `location.*`, `committee.*`, `role.*`, `team.*`, `delegation.*`, `access_review.*`, `invitation.*`, `audit_trail.read`, `foundation.read/write`, `user.read/write`) | embedded in `20260424_0100_foundation_zero_blocker.sql` | `dos.permissions` |
| Functional roles | **8** (`tenant_owner`, `platform_super_admin`, `org_admin`, `hr_admin`, `compliance_admin`, `risk_admin`, `audit_admin`, `member`) | zero_blocker | `dos.functional_roles` |
| Role → permission bindings | **1302** | zero_blocker | `dos.role_permissions` |
| Universal catalogues (org-types, BU templates, dept templates, position templates, location types, calendar systems, lawful bases, data classifications, profile types, readiness dimensions, ownership domains, audit actions, COI categories, committee templates, role templates, tenant defaults) | 16 tables, ~hundreds of rows | `20260430_1310_foundation_universal_catalogs_seed.sql`, `20260430_1320_foundation_reference_data_seed.sql` | `foundation_cat_*` |
| Sector packs (KSA-specific authority, regulatory bodies) | full catalogue | `20260430_1410_foundation_sector_packs_seed.sql` | sector pack tables |
| Workflow template registration | 1 (`foundation_org_change`) | `20260425_0400_foundation_workflow_template.sql` | workflow-service registry |
| Permission-code reconciliation | dot/colon harmonisation | `20260430_1510_foundation_permission_code_reconcile.sql` | `dos.permissions` |

---

## C. MAY-SEED — Demo Content (per-tenant, toggleable)

Run by `ops/scripts/run-migrations.sh` Phase 2b, or `20260425_0600_foundation_demo_seed.sql`. Source: [`db/seeds/foundation-demo-tenant.sql`](./db/seeds/foundation-demo-tenant.sql).

Filter: tenants in `public.tenants` with status ∈ {registered, email_pending, verified, onboarding, provisioning, onboarding_ready, active} OR `dos.tenants` with `status='active'`.

| Entity | Sample rows |
|---|---|
| `dos.organizations` | 1 (`ORG-HQ`, holding/active) |
| `dos.business_units` | 3 (HQ, FIN→HQ, TECH→HQ) |
| `dos.positions` | 6 (CEO, CFO, CTO, COO, CCO, CRO) |
| `dos.locations` | 3 (Riyadh HQ, Jeddah, Dammam) |
| `dos.committees` | 3 (Audit, Risk, Compliance) |
| `dos.audit_trail` | 1 marker row `foundation.seed.applied` |

---

## D. MAY-SEED — Guidance Templates (per-tenant, starter content)

Inserted by `bootstrapFoundationDefaults({tenantId, ownerUserId})` ([`application/bootstrap/foundation-bootstrap.service.ts`](./application/bootstrap/foundation-bootstrap.service.ts)) when the foundation module is activated by `services/tenant-service/src/domain/provisioning/module-kickstart.service.ts`.

Intent: end-user **must rename / extend / delete** these — they are scaffolding, not master data.

| Entity | Starter rows | User expected to |
|---|---|---|
| `dos.organizations` | 1 "Default Organization" / "المؤسسة الافتراضية" | Rename to actual legal entity |
| `dos.business_units` | 1 root BU | Replace with real org chart |
| `dos.positions` | 4 (CEO, CFO, CTO, COO) | Extend to full position library |
| `dos.position_assignments` | 1 (owner ↔ `tenant_owner` role) | Add full HR roster |

Plus the *guidance templates* in `foundation_cat_*` (committee charters, audit action vocab, lawful basis explanations, calendar systems) — these are reference catalogues the user picks from but does not modify directly.

---

## Activation Inputs Required

| Input | Source | Used for |
|---|---|---|
| `tenantId` (uuid) | `public.tenants` | scope all writes |
| `tenantCode` | `public.tenants.tenant_code` | per-tenant schema name |
| `ownerUserId` | `platform_dauth.users` | `created_by`, role assignment |
| `tenant.status` | non-terminal | gates demo seed CTE |
| `org_name`, `country`, `language` | `public.tenants.settings` | populates default org |
| DAuth/Keycloak token claims | `tenant_id`, role | `requireTenantId` + `requireAnyPermission` |
| `tenant_memberships` row | `platform_dauth` | binds user ↔ tenant |
| Per-tenant schema | tenant-service | required by `withTenantClient` |

---

## Definition-of-Done Checklist

- [x] Schema `dos` created
- [x] All 28 owned tables present
- [x] All 16 catalogue tables present
- [x] RLS enabled on 11 core tables
- [x] 40 permissions seeded
- [x] 8 functional roles seeded
- [x] 1302 role-permission bindings present
- [x] Universal & sector-pack catalogues populated
- [x] Workflow template `foundation_org_change` registered
- [x] Tenant has `tenant_<code>` schema with foundation drift repair applied
- [ ] `bootstrapFoundationDefaults` ran successfully (1 org + 1 BU + 4 positions + tenant_owner assignment) → see `module_kickstart_log.foundation = completed`
- [ ] (optional) Demo seed applied for non-empty UI on first login
- [x] DAuth token includes `tenant_id` + at least one of (`admin`, `org_admin`, `org_read`, `member`)
- [x] `GET /api/organizations` returns 200 with non-empty `data[]`
- [x] `GET /api/foundation/health` returns 200 (schema_exists, tables_exist, hierarchy_integrity)
- [x] Negative test: unauthenticated/unauthorized role gets 401/403

---

## Gaps Identified

1. **Demo seed not declared in migration bundle.** [`foundation-demo-tenant.sql`](./db/seeds/foundation-demo-tenant.sql) is invoked only by `ops/scripts/run-migrations.sh` Phase 2b — not by `pnpm migrate`. Bundle [`seeds[]`](./db/module-migration-bundle.json) lists empty placeholders. **Fix:** add the demo seed under `seeds[]` with `phase: post-migrate` and an `enabledByEnv` flag (e.g. `SEED_DEMO_DATA=true`).
2. **Bootstrap silently swallows failures.** `module-kickstart.service.ts` wraps `bootstrapFoundationDefaults` in try/catch and only pushes a string into `errors[]`. A tenant whose owner user is not yet present in `platform_dauth.users` ends up with no org row, no kickstart_log error visible to operators. **Fix:** surface bootstrap failures to `module_kickstart_log.status = failed` with structured error code.
3. **Schema drift between `dos.organizations` (`organization_id`/`name_en`) and the `org_hierarchy` admin code (`org_id`/`org_name`).** Two coexisting shapes; hierarchy writes never appear in the org list. **Fix:** delete or migrate `application/org-hierarchy/*` to the canonical column names.
4. **Demo seed CTE excludes `pending`** lifecycle state — admin-imposed pending tenants render empty.
5. **No seed for `position_assignments`, `committee_members`, `location_bu_map`, `ownership_mappings`** — downstream pages joining these stay blank until manual data entry.
6. **Permission catalogue mixes `dot.notation` and `colon:notation`.** Reconcile migration `_1510` exists but tenants migrated before it may still hold legacy codes. **Fix:** add data-fix migration to backfill.
7. **Seed splits "process content" and "demo content" into the same migration** (`zero_blocker` carries permissions + role bindings inline). Operationally fine but makes selective re-seed of demo data impossible.

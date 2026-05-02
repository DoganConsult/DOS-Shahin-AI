# Foundation Module — DB Reconciliation Gate

**Mode:** AUDIT-ONLY. No data changes, no DDL, no migrations executed.
**Live DB:** PostgreSQL 18 @ `127.0.0.1:5432/shahin_grc` — introspected at gate run.
**Scope:** `modules/foundation`, `services/user-service` Foundation surfaces, `platform_dauth` permission/role/audit, `platform_dos` registry, `dos` Foundation operational tables.

---

## 1. Canonical table map

### 1.1 Foundation-OWNED operational tables (`dos`)

Direct Foundation business data (cross-tenant operational schema):

| Table | tenant_id | RLS | Purpose |
|-------|:--------:|:---:|---------|
| `dos.organizations` | yes | **ON** | Tenant org tree |
| `dos.business_units` | yes | **ON** | BU layer |
| `dos.departments` | yes | **ON** | Department layer |
| `dos.positions` | yes | **ON** | Position registry |
| `dos.position_assignments` | yes | **ON** | User↔position |
| `dos.locations` | yes | **ON** | Location registry |
| `dos.location_bu_map` | yes | **ON** | Location↔BU |
| `dos.committees` | yes | **ON** | Committee registry |
| `dos.committee_meetings` | yes | OFF | Meeting log |
| `dos.committee_members` | yes | **ON** | Membership |
| `dos.teams` | yes | **ON** | Team registry |
| `dos.team_members` | no  | OFF | Membership (missing tenant_id) |
| `dos.team_raci_assignments` | yes | OFF | RACI matrix |
| `dos.ownership_mappings` | yes | **ON** | Resource ownership |
| `dos.user_org_scope` | yes | OFF | User scoping |
| `dos.tenant_memberships` | yes | OFF | User↔tenant |
| `dos.access_reviews` | yes | OFF | Access review campaign |
| `dos.access_review_items` | yes | OFF | Review line items |
| `dos.delegations` | yes | OFF | Delegation rules (Foundation surface) |
| `dos.invitations` | yes | **ON** | Invitations (duplicate — see §5) |
| `dos.foundation_authority_kinds` | no  | OFF | Authority taxonomy (catalog) |
| `dos.foundation_position_authority` | yes | OFF | Position authority bindings |
| `dos.foundation_employee_lifecycle_state` | yes | OFF | Lifecycle state |
| `dos.foundation_employee_lifecycle_tasks` | yes | OFF | Lifecycle tasks |
| `dos.foundation_employee_lifecycle_transitions` | yes | OFF | Lifecycle transitions |
| `dos.foundation_employee_lifecycle_workflows` | yes | OFF | Lifecycle workflows |
| `dos.foundation_coi_declarations` | yes | OFF | Conflict-of-interest |
| `dos.foundation_policy_acknowledgments` | yes | OFF | Policy attestations |
| `dos.foundation_sod_rules` | yes | OFF | SoD rules (overlaps `platform_dauth.sod_rules`) |
| `dos.foundation_sod_violations` | yes | OFF | SoD violations |
| `dos.foundation_training_assignments` | yes | OFF | Overlaps Training module |
| `dos.foundation_training_courses` | yes | OFF | Overlaps Training module |

### 1.2 Foundation-CONSUMED reference tables (Layer 1 catalogs)

| Table | Schema | Notes |
|-------|--------|-------|
| `lookup_countries`, `lookup_cities`, `lookup_sectors`, `lookup_sub_sectors`, `lookup_languages`, `lookup_timezones`, `lookup_employee_ranges`, `lookup_org_types`, `lookup_team_functions`, `lookup_grc_role_staffing`, `lookup_identity_providers`, `lookup_sso_providers` | `public` | Required by `requiredReferenceData` in `modules/foundation/module.manifest.json` |
| `org_pack_templates`, `org_pack_template_roles`, `org_pack_template_permissions`, `org_pack_template_role_permissions`, `org_pack_template_workflows`, `org_pack_template_sod_rules`, `org_pack_template_sections`, `org_pack_template_teams`, `org_pack_template_departments`, `org_pack_template_profiles` | `public` | Materialized at tenant activation |
| `foundation_cat_audit_actions`, `foundation_cat_bu_templates`, `foundation_cat_calendar_systems`, `foundation_cat_coi_categories`, `foundation_cat_committee_templates`, `foundation_cat_data_classifications`, `foundation_cat_dept_templates`, `foundation_cat_lawful_bases`, `foundation_cat_location_types`, `foundation_cat_org_types`, `foundation_cat_ownership_domains`, `foundation_cat_position_templates`, `foundation_cat_profile_types`, `foundation_cat_readiness_dimensions`, `foundation_cat_reference`, `foundation_cat_role_templates`, `foundation_cat_tenant_defaults` | `dos` | Foundation-owned **catalogs** (no tenant_id, RLS off — correct for Layer 1) |
| `grc_frameworks`, `grc_regulators`, `grc_kri_catalog`, `grc_maturity_model`, `grc_audit_universe`, `grc_sector_framework_matrix`, `grc_sector_groups`, `grc_framework_dependencies`, `grc_risk_domain_coverage`, `grc_architecture_map` | `public` | Cross-domain GRC catalogs |

### 1.3 DAuth-owned tables used by Foundation (`platform_dauth`)

| Table | Rows | Purpose |
|-------|-----:|---------|
| `permissions` | 594 | Permission catalog |
| `functional_roles` | 25 | Role registry |
| `role_permissions` | 2835 | Role↔permission map |
| `user_role_assignments` | 3 | User↔role (cross-tenant view; per-tenant lives in `tenant_*`) |
| `invitations` | 3 | Canonical invitations |
| `sod_rules` | 0 | SoD rule catalog (canonical) |
| `authz_decision_log` | 673 | AuthZ decisions |
| `security_events` | 107 | Security events |
| `lifecycle_auth_log` | live | Lifecycle authorization audit |
| `keycloak_event_log` | live | KC bridge audit |
| `delegations` | live | (overlaps `dos.delegations` — see §5) |
| `access_profiles`, `user_access_profiles` | live | Access profile bindings |
| `user_mfa` | 0 | MFA per user |
| `api_keys` | 1 | API key registry |
| `login_attempts` | 0 | Login attempts (canonical; data is in `public.login_attempts`!) |
| `sso_*` (sessions, identities, …) | live | SSO bindings |

### 1.4 DOS / platform registry tables used by Foundation (`platform_dos`)

| Table | Rows | Purpose |
|-------|-----:|---------|
| `tenants_registry` | **56** | Master tenant registry |
| `tenant_products` | **56** | Tenant product activation |
| `tenant_product_modules` | **2499** | Tenant↔module entitlement |
| `tenant_services` | live | Tenant↔service binding |
| `tenant_provisioning_jobs` | live | Provisioning log |
| `tenant_config` | live | Per-tenant config bag |
| `tenant_secrets_ref` | live | Secret references |
| `modules_registry` | 66 | Module catalog |
| `module_config` | live | Module-level runtime config |
| `module_permissions` | live | Module-declared permissions |
| `module_versions` | live | Module versioning |
| `services_registry` | live | Service catalog |
| `products_registry` | live | Product catalog |
| `product_bundles`, `product_modules`, `product_services` | live | Product composition |
| `feature_flags` | 11 | Canonical feature flag catalog |
| `event_outbox` | live | Event backbone |
| `scheduled_jobs`, `scheduled_job_runs` | live | Job scheduling |

### 1.5 Audit tables used by Foundation

| Table | Rows | Role |
|-------|-----:|------|
| `dos.audit_trail` | **572** | Tenant-scoped operational audit (Foundation surface `/api/audit-trail`) |
| `dos.audit_log_archive` | 0 | Archive sink |
| `dos.platform_audit_logs` | 1 | Platform-level (cross-tenant) audit |
| `dos.audit_logs` | 0 | Empty — purpose unclear |
| `public.audit_trail_global` | 50 | Cross-tenant global audit (legacy location) |
| `platform_dauth.authz_decision_log` | 673 | AuthZ decision proof |
| `platform_dauth.security_events` | 107 | Security/auth event log |
| `platform_dauth.lifecycle_auth_log` | live | Lifecycle authZ |
| `platform_dauth.keycloak_event_log` | live | KC audit |
| `public.login_attempts` | **1343** | Login attempt log (lives in `public` despite canonical owner being `platform_dauth`) |

---

## 2. Tenant truth reconciliation

### 2.1 Counts

| Source | Count |
|--------|------:|
| `platform_dos.tenants_registry` | **56** |
| `platform_dos.tenant_products` | **56** |
| `platform_dos.tenant_product_modules` | **2499** |
| `dos.tenants` | **33** |
| `public.tenants` | **15** |
| Physical `tenant_*` schemas | **13** |

### 2.2 Physical tenant schemas (13)

```
tenant_2ba4b5323361413cac6c9c992f66bec4
tenant_2c71cc2d67284394b2c402ac087bba82
tenant_51f36271df62ea3d
tenant_76ce30e4168341d09913919227afdf1a
tenant_84387f0b783a47f78cf1f844b31ad286
tenant_a765b0362188
tenant_a7f7b3f6f0df
tenant_d28556d16acd46b79b2f170ad3b5cfb8
tenant_dogan
tenant_douhan_consult
tenant_f2a45bc25f31
tenant_shahin_visitors
tenant_validate_migrations
```

### 2.3 Registry → physical schema reconciliation

**Matched (registry row ↔ physical schema): 8**

| Registry tenant_id | Physical schema | Display name | product_code |
|-------------------|-----------------|--------------|--------------|
| `dogan` | `tenant_dogan` | dogan | shahin |
| `shahin_visitors` | `tenant_shahin_visitors` | Shahin-Ai Visitors | shahin-ai |
| `2ba4b532-3361-413c-ac6c-9c992f66bec4` | `tenant_2ba4b5323361413cac6c9c992f66bec4` | Dpgan Consult | shahin-ai |
| `2c71cc2d-6728-4394-b2c4-02ac087bba82` | `tenant_2c71cc2d67284394b2c402ac087bba82` | Dpgan Consult | shahin-ai |
| `76ce30e4-1683-41d0-9913-919227afdf1a` | `tenant_76ce30e4168341d09913919227afdf1a` | E2E Test Co 1777020322813 | shahin-ai |
| `84387f0b-783a-47f7-8cf1-f844b31ad286` | `tenant_84387f0b783a47f78cf1f844b31ad286` | werwerwer | shahin-ai |
| `a765b0362188` | `tenant_a765b0362188` | E2E Probe Company | shahin-ai |
| `d28556d1-6acd-46b7-9b2f-170ad3b5cfb8` | `tenant_d28556d16acd46b79b2f170ad3b5cfb8` | Hehheh | shahin-ai |

**Registry rows WITH NO physical schema (48 orphans):**

```
003d6d1f266e   084e492569fb   088998ce759f   0a1cdbfe41d5   0aab56662691
0b39d8d1a9a6   0c9af04e4243   13e91c72b4e4   1eb4087dfdcc   2856df9a8b63
2963efa656f1   2e6957b63d7b   31b12d374efd   323e23ad3e67   45a199b1e41b
46007594e959   4f83bed8eb1d   54163fe24f23   5585ee20292f   56b8b9370073
64365928abfa   67da4d9d260c   762682747b1b   7848c0325342   78db092c8ad7
8877128dc850   909f6ca6988c   9c8f47c64767   a25de2b0871b   a653f3c71896
ad2b81baf07b   af0e7d27ab67   b1f0df8beac7   b56613950751   b9bcb9d0c75d
c359c313958f   c387757bf473   d2d4f1869096   dcbc20b03704   de6e72d188fe
e3b0e51dba13   e87836841d17   eae7368cc0f3   eef2865f31c6   ffdcba7e2a72
rimtest1776461709   tenta   tentb
```

**Physical schemas WITH NO registry row (5 dangling):**

```
tenant_51f36271df62ea3d
tenant_a7f7b3f6f0df
tenant_douhan_consult
tenant_f2a45bc25f31
tenant_validate_migrations
```

### 2.4 Classification

| Class | Count | Tenants |
|-------|------:|---------|
| **active** (registry ↔ schema, real customer) | 2 | `dogan`, `2ba4b532-…` (Dpgan Consult — UUID variant 1) |
| **active duplicate** (same display_name, multiple registry+schema) | 2 | `2c71cc2d-…` is a 2nd "Dpgan Consult" (typo of "Dogan"); registry shows TWO rows for same display_name |
| **test/E2E** (visible by name) | 4 | `shahin_visitors`, `76ce30e4-…` ("E2E Test Co"), `a765b0362188` ("E2E Probe Company"), `84387f0b-…` ("werwerwer") |
| **test schema, no registry** | 5 | `tenant_51f36271df62ea3d`, `tenant_a7f7b3f6f0df`, `tenant_douhan_consult`, `tenant_f2a45bc25f31`, `tenant_validate_migrations` |
| **failed/orphan provisioning** (12-char hex stubs in registry, no schema) | 45 | All `[0-9a-f]{12}` rows in §2.3 orphan list |
| **other orphans** | 3 | `rimtest1776461709`, `tenta`, `tentb` |

**Net real customers:** **0–2** (only `dogan` is plausibly a non-test tenant; everything else is test/E2E/orphan).

### 2.5 Reconciliation actions (proposed, NOT applied)

1. Mark all 12-char-hex orphan rows in `platform_dos.tenants_registry` as `status='orphan_provisioning_failed'` and the matching `tenant_products` rows as `status='orphan'`.
2. Add a `schema_status` enum column to `tenants_registry` derived from the physical-schema check; populate via a one-shot reconciliation job.
3. For the 5 dangling physical schemas without registry rows: create back-fill registry rows OR drop the schemas after a 7-day quarantine + backup.
4. Hard-fail provisioning when schema-create step fails (currently fails silently; this is the root cause of the 45 orphan stubs).
5. Reconcile `dos.tenants` (33) and `public.tenants` (15) against the registry; both should converge to 1-to-1 with the registry's *tenants-with-schema* subset.

---

## 3. Foundation manifest debt

### 3.1 Live `dos.foundation_*` tables (29)

```
foundation_authority_kinds
foundation_cat_audit_actions
foundation_cat_bu_templates
foundation_cat_calendar_systems
foundation_cat_coi_categories
foundation_cat_committee_templates
foundation_cat_data_classifications
foundation_cat_dept_templates
foundation_cat_lawful_bases
foundation_cat_location_types
foundation_cat_org_types
foundation_cat_ownership_domains
foundation_cat_position_templates
foundation_cat_profile_types
foundation_cat_readiness_dimensions
foundation_cat_reference
foundation_cat_role_templates
foundation_cat_tenant_defaults
foundation_coi_declarations
foundation_employee_lifecycle_state
foundation_employee_lifecycle_tasks
foundation_employee_lifecycle_transitions
foundation_employee_lifecycle_workflows
foundation_policy_acknowledgments
foundation_position_authority
foundation_sod_rules
foundation_sod_violations
foundation_training_assignments
foundation_training_courses
```

### 3.2 Live Foundation-owned non-prefixed tables in `dos` (27)

```
organizations          business_units        departments
positions              position_assignments
locations              location_bu_map
committees             committee_meetings    committee_members
teams                  team_members          team_raci_assignments
ownership_mappings
user_org_scope         tenant_memberships
access_reviews         access_review_items
delegations
invitations            (also in platform_dauth — duplicate)
sso_identities         sso_providers         sso_role_mappings   sso_sessions
```

### 3.3 Proposed `ownedTables` block for `modules/foundation/module.manifest.json`

```json
"ownedTables": [
  "organizations",
  "business_units",
  "departments",
  "positions",
  "position_assignments",
  "locations",
  "location_bu_map",
  "committees",
  "committee_meetings",
  "committee_members",
  "teams",
  "team_members",
  "team_raci_assignments",
  "ownership_mappings",
  "user_org_scope",
  "tenant_memberships",
  "access_reviews",
  "access_review_items",
  "delegations",
  "foundation_authority_kinds",
  "foundation_position_authority",
  "foundation_employee_lifecycle_state",
  "foundation_employee_lifecycle_tasks",
  "foundation_employee_lifecycle_transitions",
  "foundation_employee_lifecycle_workflows",
  "foundation_coi_declarations",
  "foundation_policy_acknowledgments",
  "foundation_sod_rules",
  "foundation_sod_violations"
],
"ownedReferenceTables": [
  "foundation_cat_audit_actions",
  "foundation_cat_bu_templates",
  "foundation_cat_calendar_systems",
  "foundation_cat_coi_categories",
  "foundation_cat_committee_templates",
  "foundation_cat_data_classifications",
  "foundation_cat_dept_templates",
  "foundation_cat_lawful_bases",
  "foundation_cat_location_types",
  "foundation_cat_org_types",
  "foundation_cat_ownership_domains",
  "foundation_cat_position_templates",
  "foundation_cat_profile_types",
  "foundation_cat_readiness_dimensions",
  "foundation_cat_reference",
  "foundation_cat_role_templates",
  "foundation_cat_tenant_defaults"
],
"sharedTables": {
  "platform_dauth": ["invitations", "sod_rules", "delegations"],
  "ai_admin_or_dauth": ["users"],
  "platform_dos":   ["tenants_registry", "tenant_products", "tenant_product_modules"]
},
"disownedTables": [
  "foundation_training_assignments",
  "foundation_training_courses"
],
"contestedTables": [
  "users", "tenants", "invitations", "sod_rules", "delegations"
]
```

Notes on `disownedTables`: `foundation_training_*` should move to the Training module (Phase 7) — they are currently mis-prefixed.

Notes on `contestedTables`: see §5 for resolution path.

---

## 4. RLS gap report

### 4.1 Foundation tables with `tenant_id` and RLS DISABLED (24)

| Schema.Table | tenant_id | RLS |
|--------------|:--------:|:---:|
| `dos.access_reviews` | yes | OFF |
| `dos.access_review_items` | yes | OFF |
| `dos.committee_meetings` | yes | OFF |
| `dos.delegations` | yes | OFF |
| `dos.team_raci_assignments` | yes | OFF |
| `dos.tenant_memberships` | yes | OFF |
| `dos.user_org_scope` | yes | OFF |
| `dos.user_role_assignments` | yes | OFF |
| `dos.user_roles` | yes | OFF |
| `dos.users` | yes | OFF |
| `dos.tenants` | yes | OFF |
| `dos.foundation_coi_declarations` | yes | OFF |
| `dos.foundation_employee_lifecycle_state` | yes | OFF |
| `dos.foundation_employee_lifecycle_tasks` | yes | OFF |
| `dos.foundation_employee_lifecycle_transitions` | yes | OFF |
| `dos.foundation_employee_lifecycle_workflows` | yes | OFF |
| `dos.foundation_policy_acknowledgments` | yes | OFF |
| `dos.foundation_position_authority` | yes | OFF |
| `dos.foundation_sod_rules` | yes | OFF |
| `dos.foundation_sod_violations` | yes | OFF |
| `dos.foundation_training_assignments` | yes | OFF |
| `dos.foundation_training_courses` | yes | OFF |
| `dos.sso_providers` | yes | OFF |
| `dos.sso_role_mappings` | yes | OFF |
| `dos.sso_sessions` | yes | OFF |

### 4.2 Foundation tables with RLS but missing `tenant_id` (1)

| Table | Issue |
|-------|-------|
| `dos.team_members` | RLS OFF AND no `tenant_id` — must add `tenant_id` first, then enable RLS |
| `dos.sso_identities` | RLS OFF AND no `tenant_id` — same |

### 4.3 Foundation tables with RLS already enforced (12 — keep)

`dos.business_units`, `dos.committee_members`, `dos.committees`, `dos.departments`, `dos.invitations`, `dos.location_bu_map`, `dos.locations`, `dos.organizations`, `dos.ownership_mappings`, `dos.position_assignments`, `dos.positions`, `dos.teams`.

### 4.4 Proposed RLS policy template (NOT applied)

```sql
-- Per-table policy (run once per Foundation operational table that has tenant_id):
ALTER TABLE dos.<table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.<table> FORCE ROW LEVEL SECURITY;

CREATE POLICY <table>_tenant_isolation ON dos.<table>
  USING      (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- Optional cross-tenant escape for platform-admin background jobs only:
CREATE POLICY <table>_platform_bypass ON dos.<table>
  USING      (current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on');
```

**Pre-requisite (gateway/service-bootstrap change, not applied):** every PG client connection must `SET LOCAL app.tenant_id = $1` from the resolved tenant in the request context (currently absent in `services/gateway` + most services). Until that is in place, enabling RLS will hard-fail every query.

### 4.5 Catalog tables (Layer 1) — RLS verdict

The 17 `foundation_cat_*` tables correctly have **no `tenant_id`** and **RLS off**. They are global reference data. **No action required.**

---

## 5. Duplicate table report

| Table name | Schemas (rows) | Canonical owner | Compatibility plan |
|------------|----------------|-----------------|--------------------|
| **users** | `dos` (31), `public` (26) | **`dos.users`** (Foundation-owned identity); long-term consolidate identity surfaces under `platform_dauth.users` view | (a) Audit FK refs to `public.users`; (b) introduce `dos.users` view in `public.users` slot; (c) update writers to `dos.users`; (d) drop `public.users` after 30-day no-write window |
| **tenants** | `dos` (33), `public` (15), plus registry `platform_dos.tenants_registry` (56) | **`platform_dos.tenants_registry`** (Layer 2 registry of truth); `dos.tenants` becomes a Layer 4 operational view | (a) Backfill `dos.tenants` ↔ registry; (b) replace `public.tenants` with view onto `platform_dos.tenants_registry`; (c) drop `public.tenants`; (d) consolidate `dos.tenants` → registry-derived view |
| **login_attempts** | `dos` (0), `platform_dauth` (0), `public` (**1343**) | **`platform_dauth.login_attempts`** | All writes are currently going to `public.login_attempts` (1343 rows) while DAuth canonical is empty (0). This is the most acute duplicate. Plan: (a) point auth-service writer to `platform_dauth.login_attempts`; (b) ETL-copy `public.login_attempts` rows over; (c) replace `public.login_attempts` with view; (d) drop `dos.login_attempts` (always empty) |
| **invitations** | `dos` (0), `platform_dauth` (3), `public` (3) | **`platform_dauth.invitations`** | (a) Diff `public.invitations` vs `platform_dauth.invitations`; (b) consolidate writers to `platform_dauth.invitations`; (c) replace others with views; (d) drop after no-write window |
| **user_mfa** | `platform_dauth` (0), `public` (0) | **`platform_dauth.user_mfa`** | Both empty — safe to drop `public.user_mfa` after grep confirms no readers |
| **api_keys** | `ai_admin` (5), `platform_dauth` (1), `public` (0) | **Two distinct purposes**: `platform_dauth.api_keys` = DAuth API keys; `ai_admin.api_keys` = AI extension service keys | Rename `ai_admin.api_keys` → `ai_admin.extension_api_keys` to remove name collision; drop `public.api_keys` |
| **sod_rules** | `dos` (0), `platform_dauth` (0), `public` (0) | **`platform_dauth.sod_rules`** | All empty. Safe to drop `dos.sod_rules` and `public.sod_rules`. Note: `dos.foundation_sod_rules` and `dos.foundation_sod_violations` are a separate Foundation-owned set — see §5.1 |
| **runtime_config** | `dos` (0), `public` (0) | **`dos.runtime_config`** | Both empty. Drop `public.runtime_config`. |
| **feature_flags** | `dos` (43), `platform_dos` (11), 13× tenant_*.feature_flags (0 each) | **`platform_dos.feature_flags`** + **`platform_dos.feature_flag_overrides`** (per tenant) | (a) Diff `dos.feature_flags` (43) vs `platform_dos.feature_flags` (11) — likely `dos` has the real catalog and `platform_dos` is partial; (b) merge into `platform_dos.feature_flags`; (c) drop tenant-level empty `feature_flags` tables (overrides belong in `platform_dos.feature_flag_overrides`); (d) replace `dos.feature_flags` with view |

### 5.1 SoD ownership disambiguation

- `platform_dauth.sod_rules` = canonical SoD policy catalog (DAuth owns the access-control intent).
- `dos.foundation_sod_rules` = Foundation-tenant-scoped SoD overlay (overlap with DAuth catalog — must declare relationship).
- `dos.foundation_sod_violations` = Foundation-tenant-scoped violation log.
- `platform_dsoc.sod_violations` = security-domain duplicate.
- `dos.sod_conflict_audit` = Foundation conflict audit.

Recommendation: keep DAuth as catalog owner; Foundation owns tenant overlay + violations; DSOC subscribes to violations rather than owning a parallel table.

---

## 6. Audit/ledger report

### 6.1 Current state

| Table | Rows | Scope | Verdict |
|-------|-----:|-------|---------|
| `dos.audit_trail` | **572** | Tenant-scoped operational audit (Foundation `/api/audit-trail` reads this) | **Canonical for tenant-scoped audit** |
| `dos.audit_logs` | 0 | Empty — purpose unclear; possibly newer naming or unfinished migration | **Drop after lineage proof** |
| `dos.platform_audit_logs` | 1 | Cross-tenant platform audit | **Move to `platform_dos.audit_trail_global`** |
| `dos.audit_log_archive` | 0 | Archive sink for `dos.audit_trail` | Keep as archive partition |
| `public.audit_trail_global` | 50 | Cross-tenant audit (legacy location) | **Move to `platform_dos.audit_trail_global`**; converge with `dos.platform_audit_logs` |
| `platform_dauth.authz_decision_log` | 673 | AuthZ decision proof (Layer 6) | **Canonical for AuthZ audit** |
| `platform_dauth.security_events` | 107 | Security event log (Layer 6) | **Canonical for security events** |

### 6.2 Canonical usage (target state)

| Concern | Canonical writer |
|---------|------------------|
| Tenant operational audit (any business action) | `dos.audit_trail` (with archive to `dos.audit_log_archive`) |
| Cross-tenant platform audit | `platform_dos.audit_trail_global` (new — collapse `dos.platform_audit_logs` + `public.audit_trail_global`) |
| AuthZ decision proof | `platform_dauth.authz_decision_log` |
| Security events (login fail, MFA fail, lockout, suspicious IP) | `platform_dauth.security_events` (+ `platform_dauth.login_attempts` for raw attempts) |
| Lifecycle authorization (joiner/mover/leaver) | `platform_dauth.lifecycle_auth_log` |
| Keycloak source-of-truth bridge | `platform_dauth.keycloak_event_log` |

### 6.3 Migration sequence (proposed, NOT executed)

1. **Stop writers to `public.audit_trail_global`** — point them at `platform_dos.audit_trail_global` (create if absent).
2. **Stop writers to `dos.platform_audit_logs`** — same target.
3. **ETL-copy** the 50 + 1 rows into `platform_dos.audit_trail_global`.
4. **Replace `public.audit_trail_global` and `dos.platform_audit_logs` with VIEWS** onto `platform_dos.audit_trail_global` for back-compat.
5. **Drop `dos.audit_logs`** after grep confirms no readers/writers.
6. **Stop writers to `public.login_attempts`** (currently 1343 rows accumulating) — point to `platform_dauth.login_attempts`; ETL-copy; replace public with view; drop after no-write window.
7. **Drop `dos.login_attempts`** (always empty).
8. **Confirm `dos.audit_trail` writers** are emitting all required Foundation events (`org.created`, `bu.changed`, `position.assigned`, `role.assigned`, `role.unassigned`, `delegation.granted`, `access_review.completed`, `committee.member_added`, `coi.declared`, `lifecycle.state_changed`).
9. **Backfill any missing publishers** in user-service handlers.
10. **Add `audit_trail_correlation_id` FK** between `dos.audit_trail` and `platform_dauth.authz_decision_log` for proof-of-permission per audit row.

---

## 7. Final verdict

| Gate | Verdict | Why |
|------|---------|-----|
| **FOUNDATION_DB_READY** | **NO** | Manifest declares 0 owned tables but 56 Foundation tables exist live; identity tables duplicated across schemas; tenant registry drift |
| **RLS_READY** | **NO** | 24 Foundation tables have `tenant_id` without RLS; 246 across the platform; gateway/service-bootstrap doesn't `SET LOCAL app.tenant_id` yet |
| **TENANT_ACTIVATION_READY** | **NO** | 56 registry rows, 13 schemas, 48 orphan registry rows + 5 dangling schemas; provisioning fails silently on schema-create |
| **MANIFEST_OWNERSHIP_READY** | **NO** | `modules/foundation/module.manifest.json` and `platform/foundation/module.manifest.json` both have empty `ownedTables`; 8 platform manifests likewise empty |
| **AUDIT_LEDGER_READY** | **PARTIAL** | `dos.audit_trail` (572 rows) is functioning as Foundation audit sink and `platform_dauth.authz_decision_log` (673) is live; but cross-tenant audit is split across `dos.platform_audit_logs` (1) + `public.audit_trail_global` (50); `public.login_attempts` (1343) is accumulating in the wrong schema |

### Recommended sequence (no code changes this audit)

1. **Manifest debt fix** (lowest-risk, doc-only): populate `ownedTables`/`ownedReferenceTables` in both `modules/foundation/module.manifest.json` and `platform/foundation/module.manifest.json` from §3.3.
2. **Tenant registry reconciliation**: classify the 48 orphan rows + 5 dangling schemas; mark statuses; add `schema_status` column.
3. **Wire `app.tenant_id` GUC** in gateway + service-bootstrap (pre-requisite for any RLS rollout).
4. **Cutover `login_attempts`** → `platform_dauth.login_attempts` (1343 rows misfiled, highest data volume).
5. **Cutover platform audit** → `platform_dos.audit_trail_global` (51 rows total).
6. **Cutover `users` / `tenants` / `invitations` / `sod_rules` / `feature_flags`** to canonical schemas; swap duplicates with views.
7. **Enable RLS** in batches of 5 Foundation tables, with per-batch read/write smoke tests.
8. **Add Foundation event publishers** for the cross-module trigger map (org change, position change, lifecycle transition, SoD violation).
9. **Drop `_legacy` table siblings** after no-write proof.

**Final gate verdict: Foundation cannot be declared production-ready until items 1–6 above are completed.**

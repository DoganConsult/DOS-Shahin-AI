# Foundation Reconciliation Master Plan — Agent Directive

**Program:** Dogan AI OS / Shahin-AI Foundation Reconciliation
**Scope:** Foundation DB ownership, tenant reconciliation, migrations, seeding, templates, RLS readiness, audit/ledger alignment, duplicate-table cutover, and production gates
**Mode:** Controlled staged execution. Evidence first. No silent production changes.

---

## 0. Executive Instruction to the Agent

You are executing the Foundation reconciliation program. Do not improvise. Do not widen scope. Do not collapse phases. Do not treat a green staging step as production approval.

The current accepted status is:

```text
Foundation Gate initial audit: NOT READY
Phase 2B-R1 preflight/static review: PASS
Phase 2B-S1 staging rehearsal of migration 0001: PASS
Production apply: NOT APPROVED
Next allowed action: staging rehearsal of 0002 only
```

Parallel runtime/UI-OS truth as of 2026-05-05:

```text
Foundation direct-seed publisher/runtime reconciliation: CLOSED
Verified live after publish/verify:
- platform_dauth.functional_roles = 8
- platform_dauth.role_permissions = 79
- dos.navigation_registry (module_code='foundation') = 22
- dos.dynamic_ui_routes (module_code='foundation', tenant_id IS NULL) = 21
- dos.ui_route_template_binding (/foundation/*) = 21
- empty Foundation binding props = 0

Remaining runtime blocker:
- Shahin foundationGuard is now aligned to `foundation.module.read` for /foundation/**.
- Page-level permission enforcement exists in the dynamic template host and live baseline roles now carry the direct-seed Foundation permission set via `20260508_0001_grant_foundation_direct_seed_perms_baseline_roles.sql`.
- Route-level AuthZ proof is GREEN: `phase-foundation-route-authz-contract.spec.ts` passed `22/22` against live Postgres + tenant-service + ui-os-service.
- Remaining open item: per-page backend API/network-call proof against the broader `apis[]` inventory.
```

This plan is the baseline operating manual for the remaining Foundation reconciliation work.

The DB reconciliation track and the direct-seed/runtime track are related but not identical. The accepted Phase 2B status above still governs DB migration rehearsal. The runtime/UI-OS closure above does not imply Foundation DB production readiness.

The work must proceed through explicit phases and gates:

```text
Audit → Manifest ownership → Migration static review → Staging rehearsal → Seed/template rehearsal → Runtime GUC proof → RLS batch proof → Duplicate cutover proof → Production readiness review → Production apply window → Post-apply verification
```

No DB production change is allowed unless the relevant staging rehearsal has passed and explicit production approval is given.

---

## 1. Non-Negotiable Rules

### 1.1 No Production Mutation Without Approval

Do not touch production DB unless a phase explicitly says production is approved.

Forbidden without explicit approval:

```text
ALTER TABLE on production
CREATE/DROP INDEX on production
INSERT/UPDATE/DELETE on production
schema drops
legacy table drops
RLS enablement
ETL cutovers
tenant status changes
registry status changes
seed backfills
template activation
```

### 1.2 Staging Must Be Real

A staging rehearsal must use a real clone of production DB, not a synthetic test DB.

Required staging identity fields in every report:

```text
host
database
source DB
dump file
free disk
git HEAD
migration sha256
production touched: NO
```

### 1.3 Migrations Are Immutable During Rehearsal

Do not edit a migration file while applying it.

If a migration fails:

```text
STOP
report failure
record exact error
record DB state
recommend fix in a new patch
restart rehearsal only after approval
```

### 1.4 No Hidden Fixes

Do not fix data silently during a rehearsal. If data does not match expected baseline, report it and stop.

### 1.5 No Phase Jumping

Only the approved next phase may run.

Allowed next step after current accepted state:

```text
Phase 2B-S2 — Staging rehearsal of migration 0002 only
```

0003 and 0004 are not allowed until 0002 staging apply, idempotency, rollback, and final re-apply all pass.

---

## 2. Canonical Source and Environment

### 2.1 Canonical Repo Root

All commands must run from:

```bash
cd "/root/DOS-Platform"
```

Do not use stale repo-root folders outside `/root/DOS-Platform` unless explicitly required for evidence.

### 2.2 Canonical DBs

Production DB:

```text
host: 127.0.0.1
production database: shahin_grc
```

Current staging clone:

```text
database: shahin_grc_gate2b_staging
source: shahin_grc
state: post-0001 applied
production touched: NO
```

### 2.3 Current Migration Set

The Gate 2B migration sequence is:

```text
20260430_0001_*  → additive registry columns/constraints/index
20260430_0002_*  → tenant registry classification/reconciliation marking
20260430_0003_*  → tenant product/module status reconciliation or related follow-up
20260430_0004_*  → final safety/consolidation actions, comments, or guarded cleanup
```

Use the exact filenames in `ops/migrations/`. Do not infer names. Always compute sha256 before apply.

---

## 3. Known Foundation Gate Status

The Foundation gate audit established these live facts:

```text
FOUNDATION_DB_READY: NO
RLS_READY: NO
TENANT_ACTIVATION_READY: NO
MANIFEST_OWNERSHIP_READY: NO
AUDIT_LEDGER_READY: PARTIAL
```

Headline baseline:

```text
tenants_registry: 56 rows
physical tenant_* schemas: 13
registry orphans: 48
dangling physical schemas: 5
restricted hex orphans: 45
named test stubs: 3
tenant_product_modules: 2499
phantom TPM rows: 2448
Dpgan tenants in registry: 2
onboarding spam dos.tenants rows: 27
```

Current DB risk summary:

```text
- Foundation owns live tables not declared in manifest.
- Many Foundation tenant_id tables have RLS off.
- team_members and sso_identities lack tenant_id.
- tenant registry has many orphan stubs and dangling schemas.
- public.login_attempts contains live data while platform_dauth.login_attempts is empty.
- cross-tenant audit is split across legacy locations.
- duplicate tables exist for users, tenants, invitations, sod_rules, feature_flags, login_attempts, runtime_config, user_mfa, api_keys.
```

Do not claim Foundation DB production-ready until the readiness gates in this document pass.

---

## 4. Phase Overview

```text
Phase 0   — Baseline Freeze and Evidence Pack
Phase 1A  — Manifest Ownership Reconciliation
Phase 1B  — Tenant Registry Reconciliation Plan
Phase 2A  — Migration Static Review
Phase 2B  — Staging Rehearsal of 0001–0004
Phase 3   — Seed and Template Rehearsal
Phase 4   — Runtime Tenant Context / app.tenant_id GUC Proof
Phase 5   — RLS Batch Enablement Rehearsal
Phase 6   — Duplicate Table Cutover Rehearsal
Phase 7   — Audit and Ledger Cutover Rehearsal
Phase 8   — Foundation Publisher Backfill and Event Proof
Phase 9   — Production Readiness Review
Phase 10  — Production Apply Window
Phase 11  — Post-Production Verification and Freeze
Phase 12  — Legacy Drop / Quarantine Windows
```

Each phase has:

```text
scope
allowed actions
forbidden actions
entry criteria
execution steps
validation gates
stop conditions
report format
exit criteria
```

---

# Phase 0 — Baseline Freeze and Evidence Pack

## Purpose

Freeze the live evidence so later work can prove drift or stability.

## Allowed

```text
read-only DB queries
sha256 checks
file inventory
git status
doc creation
```

## Forbidden

```text
no DB writes
no migrations
no seed inserts
no code changes except docs/scripts for audit
```

## Required Evidence

Collect:

```bash
git rev-parse HEAD
git status --short
sha256sum ops/migrations/20260430_000*.sql
```

DB invariants:

```text
tenants_registry count
tenant_products count
tenant_product_modules count
physical tenant_* schema count
registry orphan count
phantom tenant_product_modules rows
hex orphan count
named test stub count
FK count pointing to tenant_product_modules
known dangling schemas count
excluded 51f3 schema presence
Dpgan tenant count
onboarding spam dos.tenants count
schema_status column presence
```

## Exit Criteria

```text
14/14 invariants recorded
migration hashes recorded
no production changes
```

---

# Phase 1A — Manifest Ownership Reconciliation

## Purpose

Make code ownership match the live Foundation DB reality before any migration/cutover.

## Allowed

```text
edit module manifests
add validation guard
add docs
run builds/validation
```

## Forbidden

```text
no DB writes
no migrations
no tenant status changes
no RLS
no duplicate cutover
```

## Required Manifest Fields

Update `modules/foundation/module.manifest.json` and any active canonical platform/foundation manifest if it exists.

Required fields:

```json
{
  "ownedTables": [],
  "ownedReferenceTables": [],
  "sharedTables": {},
  "disownedTables": [],
  "contestedTables": []
}
```

### ownedTables

```text
organizations
business_units
departments
positions
position_assignments
locations
location_bu_map
committees
committee_meetings
committee_members
teams
team_members
team_raci_assignments
ownership_mappings
user_org_scope
tenant_memberships
access_reviews
access_review_items
delegations
foundation_authority_kinds
foundation_position_authority
foundation_employee_lifecycle_state
foundation_employee_lifecycle_tasks
foundation_employee_lifecycle_transitions
foundation_employee_lifecycle_workflows
foundation_coi_declarations
foundation_policy_acknowledgments
foundation_sod_rules
foundation_sod_violations
```

### ownedReferenceTables

```text
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
```

### sharedTables

```json
{
  "platform_dauth": ["invitations", "sod_rules", "delegations"],
  "ai_admin_or_dauth": ["users"],
  "platform_dos": ["tenants_registry", "tenant_products", "tenant_product_modules"]
}
```

### disownedTables

```text
foundation_training_assignments
foundation_training_courses
```

### contestedTables

```text
users
tenants
invitations
sod_rules
delegations
```

## Required Guard

Create/maintain:

```text
scripts/ci-guards/foundation-manifest-ownership.mjs
```

It must fail if:

```text
ownedTables is empty
ownedReferenceTables contains duplicates
ownedTables contains duplicates
a table appears in both ownedTables and disownedTables
contestedTables lack canonical/shared owner
foundation_training_* is re-owned by Foundation without Training decision
```

## Validation

```bash
pnpm run validate:foundation-manifest
pnpm run validate:manifests
```

## Exit Criteria

```text
manifest ownership populated
validation guard green
no DB changes
```

---

# Phase 1B — Tenant Registry Reconciliation Plan

## Purpose

Plan tenant truth cleanup without mutating data.

## Allowed

```text
read-only tenant classification
proposal SQL drafts
runbook creation
rollback design
data safety review
```

## Forbidden

```text
no UPDATE/DELETE/INSERT
no schema drop
no tenant archiving yet
```

## Required Classification

Classify all registry rows and physical schemas into:

```text
active real customer
active duplicate
test/E2E
test schema with no registry
failed/orphan provisioning
named orphan
dangling schema
excluded protected schema
```

Baseline groups:

```text
registry rows: 56
physical schemas: 13
matched registry↔schema: 8
registry rows with no physical schema: 48
physical schemas with no registry row: 5
hex orphan stubs: 45
named test stubs: 3
```

## Required Output

```text
docs/db/foundation-tenant-registry-reconciliation-plan.md
```

Must include:

```text
classification table
excluded tenants/schemas
safe statuses
proposed schema_status values
rollback design
no-write proof
production risk
```

## Exit Criteria

```text
reconciliation plan reviewed
no DB changes
ready for migration static review
```

---

# Phase 2A — Migration Static Review

## Purpose

Review migration drafts 0001–0004 before execution.

## Required Static Review Checks

For each migration:

```text
sha256 recorded
transactional
idempotent
rollback exists
stop guards exist where data mutation occurs
excluded tenants protected
Dpgan duplicates protected
onboarding spam protected if excluded
no CASCADE drops
no live production assumption
```

## Required Report

```text
docs/db/foundation-gate-2b-review.md
```

## Exit Criteria

```text
0001 static review PASS
0002 static review PASS
0003 static review PASS
0004 static review PASS
READY_FOR_STAGING_0001_ONLY initially
```

---

# Phase 2B — Staging Rehearsal of 0001–0004

## Global Rules

Run every migration on staging clone only first.

For each migration:

```text
preflight
sha256 check
apply
postflight
idempotency re-apply
rollback rehearsal
rollback verification
final re-apply
leave staging in post-migration state
```

## Current Accepted State

```text
2B-S1 0001: PASS
staging: shahin_grc_gate2b_staging
state: post-0001 applied
production: NOT touched
```

---

## Phase 2B-S1 — 0001 Staging Rehearsal

Status: PASS.

Accepted facts:

```text
0001 added 5 columns:
- schema_status
- schema_status_reason
- schema_checked_at
- duplicate_of_tenant_id
- archived_at

Added:
- tenants_registry_schema_status_check (NOT VALID)
- tenants_registry_duplicate_of_fk (NOT VALID)
- tenants_registry_schema_status_idx

Rows unchanged:
- tenants_registry = 56
- tenant_product_modules = 2499

Default:
- schema_status='active' for 56 rows

Idempotency: PASS
Rollback: PASS
Final re-apply: PASS
```

---

## Phase 2B-S2 — 0002 Staging Rehearsal

## Purpose

Rehearse tenant registry classification/status marking on staging.

## Entry Criteria

Staging must be post-0001:

```text
5 schema_status columns present
check exists
FK exists
index exists
tenants_registry = 56
tenant_product_modules = 2499
```

## Required sha256

```bash
sha256sum ops/migrations/20260430_0002_*.sql
```

Must match preflight recorded hash.

## Allowed

```text
apply 0002 on staging only
re-apply for idempotency
rollback 0002 only
verify 0001 artifacts preserved
final re-apply 0002
```

## Forbidden

```text
no production
no 0003
no 0004
no migration edits
no manual data repair
```

## Required Checks

Report:

```text
tenants_registry rows
tenant_products rows
tenant_product_modules rows
physical tenant schemas
orphan_count
hex_orphans
named_test_stubs
dangling schema count
Dpgan tenant count
onboarding spam dos.tenants count
schema_status distribution
schema_status_reason populated count
duplicate_of_tenant_id populated count
archived_at populated count
rows affected by 0002
```

## Rollback Rule

Rollback 0002 must remove only 0002 effects and preserve 0001 columns/constraints/index.

## Exit Criteria

```text
STAGING_0002_PREFLIGHT_PASS
STAGING_0002_APPLY_PASS
STAGING_0002_IDEMPOTENT
STAGING_0002_ROLLBACK_PASS
staging left post-0002
READY_FOR_STAGING_0003 = YES
READY_FOR_PRODUCTION = NO
```

---

## Phase 2B-S3 — 0003 Staging Rehearsal

## Purpose

Rehearse the next tenant/product/module reconciliation step after 0002.

## Entry Criteria

```text
0001 applied
0002 applied
0003 sha256 matches preflight
post-0002 distributions match expected
```

## Allowed

```text
apply 0003 on staging only
idempotency re-apply
rollback 0003 only
verify 0001/0002 effects preserved
final re-apply 0003
```

## Required Checks

Because 0003 may touch tenant product/module activation, report at minimum:

```text
tenants_registry distribution
tenant_products distribution
tenant_product_modules distribution
phantom_tpm_rows
rows active/inactive/orphaned
foundation module activation count
product_key distribution
module_code/product_key mismatches
FK impact
no unexpected delete count
```

## Stop Conditions

```text
unexpected tenant_product_modules drop
Foundation active customers disabled
Dpgan/dogan protected rows changed unexpectedly
migration tries to repair unrelated module data
rollback damages 0001/0002 artifacts
```

## Exit Criteria

```text
STAGING_0003_PREFLIGHT_PASS
STAGING_0003_APPLY_PASS
STAGING_0003_IDEMPOTENT
STAGING_0003_ROLLBACK_PASS
staging left post-0003
READY_FOR_STAGING_0004 = YES
READY_FOR_PRODUCTION = NO
```

---

## Phase 2B-S4 — 0004 Staging Rehearsal

## Purpose

Rehearse final guarded reconciliation or safety action in the 0001–0004 set.

## Entry Criteria

```text
0001 applied
0002 applied
0003 applied
0004 sha256 matches preflight
post-0003 checks match expected
```

## Allowed

```text
apply 0004 on staging only
idempotency re-apply
rollback 0004 only
verify 0001/0002/0003 effects preserved
final re-apply 0004
```

## Required Checks

Report every object and row touched by 0004.

If 0004 is comments/safety-only, prove no row mutation.

If 0004 mutates data, report:

```text
rows affected per table
protected tenants unchanged
excluded schemas unchanged
final status distribution
warnings/notices
```

## Exit Criteria

```text
STAGING_0004_PREFLIGHT_PASS
STAGING_0004_APPLY_PASS
STAGING_0004_IDEMPOTENT
STAGING_0004_ROLLBACK_PASS
FULL_STAGING_0001_0004_REHEARSAL_PASS = YES
READY_FOR_PRODUCTION_REVIEW = YES
READY_FOR_PRODUCTION_APPLY = NO until approval
```

---

# Phase 3 — Seed and Template Rehearsal

## Purpose

Verify Foundation seed/template behavior after tenant registry reconciliation.

This phase covers:

```text
Foundation catalogs
Foundation reference data
org pack templates
tenant activation templates
module activation seeds
role/permission seeds
navigation/dynamic UI seeds
agent/UI capability seeds if in scope
```

## Entry Criteria

```text
full 0001–0004 staging rehearsal PASS
staging clone in post-0004 state
manifest ownership PASS
```

## Seed Scope Inventory

Inventory these before running any seed:

```text
modules/foundation/db/seeds
modules/foundation/db/migrations
modules/foundation/contracts
modules/foundation/module.manifest.json
platform/dynamic-ui seeds
platform_dos module/product registry seed scripts
org_pack_templates and children
foundation_cat_* tables
permissions/roles/role_permissions seeds
navigation/dynamic UI contracts
```

## Required Seed Categories

### 3.1 Foundation Catalog Seeds

Tables:

```text
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
```

Gate:

```text
idempotent
no duplicate natural keys
no tenant_id required
catalog row count stable on re-run
```

### 3.2 Org Pack Template Seeds

Tables:

```text
org_pack_templates
org_pack_template_roles
org_pack_template_permissions
org_pack_template_role_permissions
org_pack_template_workflows
org_pack_template_sod_rules
org_pack_template_sections
org_pack_template_teams
org_pack_template_departments
org_pack_template_profiles
```

Gate:

```text
template count
template role count
template permission count
template workflow count
template SoD count
idempotency re-run stable
activation simulation can read templates
```

### 3.3 Foundation Activation Seeds

These prove a tenant can activate Foundation without producing phantom/orphan module rows.

Gate:

```text
foundation product/module activation uses platform_dos tenant registry
no tenant_product_modules phantom creation
module_registry product_key foundation alignment
permissions available
navigation visible only when entitled
```

### 3.4 Role/Permission Seeds

Canonical owner: `platform_dauth`.

Gate:

```text
permissions exist
functional_roles exist
role_permissions exist
Foundation roles get Foundation permissions
no colon/dot drift unless alias plan approved
idempotency stable
```

### 3.5 Dynamic UI / Navigation Seeds

Gate:

```text
foundation dynamic UI contract present
navigation route catalog present
component keys allowlisted
responsive mobile/tablet/desktop contracts present
no static-nav fallback required for Foundation
```

## Seed Rehearsal Execution

Use staging only:

```bash
# Example only; use actual repo scripts
pnpm run seed:foundation -- --db shahin_grc_gate2b_staging --dry-run
pnpm run seed:foundation -- --db shahin_grc_gate2b_staging
pnpm run seed:foundation -- --db shahin_grc_gate2b_staging
```

If no script exists, report missing seed runner. Do not invent one without approval.

## Seed Rehearsal Report

Required:

```text
Phase: Foundation Reconciliation Phase 3 — Seed and Template Rehearsal
Status: PASS / PARTIAL / BLOCKED

Seed scripts found:
- ...

Catalog seeds:
- before count:
- after count:
- idempotency count:

Org pack templates:
- before:
- after:
- idempotency:

Role/permission seeds:
- before:
- after:
- idempotency:

Dynamic UI/navigation seeds:
- contracts:
- route catalog:
- component keys:
- responsive contracts:

Tenant activation simulation:
- tenant used:
- product/module activation:
- permissions:
- nav visibility:

DB changes:
- staging only
- production none

Final verdict:
- SEED_CATALOG_PASS:
- TEMPLATE_PASS:
- ACTIVATION_SIM_PASS:
- READY_FOR_RUNTIME_GUC_PROOF:
```

---

# Phase 4 — Runtime Tenant Context / app.tenant_id GUC Proof

## Purpose

RLS cannot be enabled safely until every DB request sets tenant context.

Required DB context:

```sql
SET LOCAL app.tenant_id = '<tenant id>';
```

Optional platform bypass for controlled jobs:

```sql
SET LOCAL app.bypass_rls = 'on';
```

## Entry Criteria

```text
full 0001–0004 staging PASS
seed/template rehearsal PASS or explicitly not required
```

## Scope

Inspect and update, if approved:

```text
services/gateway
packages/dos-service-bootstrap
packages/dos-db
services/user-service
services/tenant-service
Foundation data-access paths
```

## Required Proof

For authenticated requests:

```text
resolved tenant exists
DB transaction starts
SET LOCAL app.tenant_id set
query reads tenant-scoped table
current_setting('app.tenant_id', true) returns expected value
transaction ends without leaking tenant context
```

For background jobs:

```text
job declares tenant or platform bypass
platform bypass is audited
no unscoped tenant reads
```

## Required Tests

At minimum:

```text
user-service Foundation endpoint with tenant A sees tenant A rows
same endpoint with tenant B sees tenant B rows
no tenant context returns deny/error, not global data
platform admin bypass only works for approved service account/job
```

## Exit Criteria

```text
APP_TENANT_ID_GUC_READY = YES
RLS_SAFE_TO_REHEARSE = YES
```

---

# Phase 5 — RLS Batch Enablement Rehearsal

## Purpose

Enable RLS in safe batches only after GUC proof.

## Entry Criteria

```text
APP_TENANT_ID_GUC_READY = YES
staging clone ready
Foundation seed/template state stable
```

## Foundation Tables With tenant_id and RLS OFF

Batch candidates include:

```text
access_reviews
access_review_items
committee_meetings
delegations
team_raci_assignments
tenant_memberships
user_org_scope
foundation_coi_declarations
foundation_employee_lifecycle_state
foundation_employee_lifecycle_tasks
foundation_employee_lifecycle_transitions
foundation_employee_lifecycle_workflows
foundation_policy_acknowledgments
foundation_position_authority
foundation_sod_rules
foundation_sod_violations
sso_providers
sso_role_mappings
sso_sessions
```

Do not enable RLS on tables lacking tenant_id until tenant_id is added and backfilled:

```text
team_members
sso_identities
```

## Batch Size

```text
max 5 tables per batch
```

## Policy Template

```sql
ALTER TABLE dos.<table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.<table> FORCE ROW LEVEL SECURITY;

CREATE POLICY <table>_tenant_isolation ON dos.<table>
  USING      (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY <table>_platform_bypass ON dos.<table>
  USING      (current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on');
```

## Required Per-Batch Tests

```text
read own tenant rows: PASS
write own tenant rows: PASS if table is writable
read other tenant rows: DENY/EMPTY
write other tenant rows: DENY
no tenant context: DENY/EMPTY
platform bypass: PASS only for approved service account/job
rollback disables only batch policies
```

## Exit Criteria

For each batch:

```text
RLS_BATCH_N_APPLY_PASS
RLS_BATCH_N_ISOLATION_PASS
RLS_BATCH_N_ROLLBACK_PASS
```

Global:

```text
FOUNDATION_RLS_READY = YES
```

---

# Phase 6 — Duplicate Table Cutover Rehearsal

## Purpose

Move writers/readers to canonical schemas and replace duplicates with compatibility views.

## Duplicate Table Priorities

### P0 — login_attempts

Current:

```text
public.login_attempts = 1343 rows
platform_dauth.login_attempts = 0 rows
```

Canonical:

```text
platform_dauth.login_attempts
```

Plan:

```text
1. prove current writer path
2. point writer to platform_dauth.login_attempts
3. ETL-copy public rows
4. replace public.login_attempts with compatibility view
5. no-write window
6. drop legacy after proof
```

### P1 — audit_trail_global / platform audit

Current split:

```text
public.audit_trail_global = 50
dos.platform_audit_logs = 1
```

Target:

```text
platform_dos.audit_trail_global
```

### P1 — users / tenants / invitations / sod_rules / feature_flags

Canonical targets:

```text
users: dos.users now; long-term platform_dauth view plan
tenants: platform_dos.tenants_registry
invitations: platform_dauth.invitations
sod_rules: platform_dauth.sod_rules catalog + Foundation overlay declared
feature_flags: platform_dos.feature_flags + overrides
```

## Required Cutover Gates

For each duplicate:

```text
reader grep
writer grep
FK/reference audit
row diff
ETL rehearsal
compatibility view rehearsal
application smoke test
rollback rehearsal
no-write proof window design
```

## Exit Criteria

```text
DUPLICATE_CUTOVER_REHEARSAL_PASS = YES
LEGACY_DROP_NOT_YET unless no-write window passed
```

---

# Phase 7 — Audit and Ledger Cutover Rehearsal

## Purpose

Make audit sinks canonical and provable.

## Target Ownership

```text
Tenant operational audit: dos.audit_trail
Tenant audit archive: dos.audit_log_archive
Cross-tenant platform audit: platform_dos.audit_trail_global
AuthZ decisions: platform_dauth.authz_decision_log
Security events: platform_dauth.security_events
Raw login attempts: platform_dauth.login_attempts
Lifecycle authorization: platform_dauth.lifecycle_auth_log
Keycloak bridge audit: platform_dauth.keycloak_event_log
```

## Required Foundation Events

Foundation handlers must emit audit for:

```text
org.created
org.updated
org.deleted
business_unit.created
business_unit.updated
department.created
department.updated
team.created
team.updated
position.assigned
position.unassigned
role.assigned
role.unassigned
delegation.granted
delegation.revoked
access_review.created
access_review.completed
committee.member_added
committee.member_removed
coi.declared
lifecycle.state_changed
sod.violation_detected
```

## Required Proof

For each audited action:

```text
business action succeeds
dos.audit_trail row emitted
authz_decision_log row emitted for permission check
correlation id connects action to auth decision where applicable
actor/user/tenant/request id present
```

## Exit Criteria

```text
AUDIT_LEDGER_READY = YES
```

---

# Phase 8 — Foundation Publisher Backfill and Event Proof

This phase covers Foundation domain-event proof only. It does not represent the already-closed 2026-05-05 direct-seed/runtime reconciliation slice, which was completed by the contract publisher path in `scripts/module/lib/sql-emitter.mjs` and verified live via `module:publish` / `module:verify`.

## Purpose

Ensure Foundation emits domain events for downstream modules and agent workflows.

## Required Event Map

At minimum:

```text
foundation.organization.created
foundation.organization.updated
foundation.business_unit.created
foundation.department.created
foundation.team.created
foundation.position.created
foundation.position.assigned
foundation.user.scope_changed
foundation.delegation.created
foundation.access_review.completed
foundation.sod.violation_detected
foundation.lifecycle.transitioned
```

## Required Proof

```text
event emitted
event_outbox row or broker event exists
audit row exists
subscriber impact verified if subscriber exists
no duplicate event on retry/idempotency
```

## Exit Criteria

```text
FOUNDATION_EVENT_PUBLISHERS_READY = YES
```

---

# Phase 9 — Production Readiness Review

## Purpose

Decide whether production apply can be scheduled.

## Entry Criteria

```text
full staging 0001–0004 PASS
seed/template rehearsal PASS or explicitly deferred
runtime GUC proof PASS if RLS is in production scope
RLS staging PASS if RLS is in production scope
duplicate cutover staging PASS if cutover is in production scope
audit ledger staging PASS if audit cutover is in production scope
backup plan ready
rollback plan ready
operator window approved
```

## Required Production Readiness Checklist

```text
git HEAD pinned
migration hashes pinned
production backup scheduled
disk free >= DB size + 20%
Barman retention safe
psql credentials confirmed
expected counts documented
stop conditions documented
rollback scripts tested on staging
application smoke test plan ready
owner approval recorded
```

## Exit Criteria

```text
READY_FOR_PRODUCTION_APPLY = YES
```

---

# Phase 10 — Production Apply Window

## Purpose

Apply approved migrations/cutovers to production with minimal risk.

## Rules

```text
apply only approved migrations
one batch at a time
record timestamps
record row counts before/after
stop on first unexpected result
no edits during window
```

## Production Apply Sequence Template

```bash
cd "/root/DOS-Platform"
git rev-parse HEAD
sha256sum ops/migrations/20260430_000*.sql
# backup confirmation here
psql -d shahin_grc -f ops/migrations/20260430_0001_*.sql
# postflight 0001
psql -d shahin_grc -f ops/migrations/20260430_0002_*.sql
# postflight 0002
# continue only as approved
```

## Required Post-Apply Checks

After each migration:

```text
same counts as staging expectation
no unexpected row changes
constraints/index present
status distribution expected
application health check green
Foundation basic read endpoint works
```

## Exit Criteria

```text
PRODUCTION_APPLY_PASS = YES
```

---

# Phase 11 — Post-Production Verification and Freeze

## Purpose

Prove production remains healthy after apply.

## Required Checks

```text
gateway health
auth-service health
tenant-service health
user-service/Foundation health
/api/access/my-permissions
/api/foundation/health or equivalent
workspace login
Foundation overview read
Foundation entity read/write smoke if in scope
audit row emitted
authz decision row emitted
no error spike in logs
```

## Required DB Checks

```text
tenants_registry count
schema_status distribution
tenant_product_modules count
Foundation owned table counts
login_attempts writer target if cutover in scope
audit target if cutover in scope
RLS enabled table count if in scope
```

## Freeze Window

After production apply, freeze related Foundation DB changes until verification passes.

## Exit Criteria

```text
POST_PRODUCTION_VERIFICATION_PASS = YES
```

---

# Phase 12 — Legacy Drop / Quarantine Windows

## Purpose

Remove or quarantine legacy tables only after no-write proof.

## Rules

No legacy table drop immediately after cutover.

Required before drop:

```text
compatibility view active
readers migrated
writers migrated
no-write proof window complete
backup exists
rollback path exists
owner approval
```

## Candidate Legacy Artifacts

```text
public.login_attempts after platform_dauth cutover
public.audit_trail_global after platform_dos cutover
dos.platform_audit_logs after platform_dos cutover
public.invitations after platform_dauth cutover
public.user_mfa if grep confirms no readers
public.runtime_config if grep confirms no readers
empty tenant-level feature_flags after override model accepted
```

## Exit Criteria

```text
LEGACY_CLEANUP_PASS = YES
```

---

# Universal Gate Templates

## Migration Rehearsal Report Template

```text
Phase: Foundation Reconciliation Phase <X> — <Name>
Status: PASS / PARTIAL / BLOCKED

Identity:
- host:
- database:
- source state:
- git HEAD:
- migration sha256:
- production touched: NO/YES

Preflight:
- expected invariants:
- actual invariants:
- pass/fail:

Apply:
- command:
- result:
- rows affected:
- objects changed:
- notices/warnings:

Postflight:
- counts:
- distributions:
- constraints/indexes:
- protected rows:

Idempotency:
- re-apply result:
- state unchanged:

Rollback:
- rollback source:
- effects removed:
- prior-phase artifacts preserved:
- verdict:

Final re-apply:
- result:
- staging left in expected state:

DB changes:
- production:
- staging:

Final verdict:
- PREFLIGHT_PASS:
- APPLY_PASS:
- IDEMPOTENT:
- ROLLBACK_PASS:
- READY_FOR_NEXT_PHASE:
- READY_FOR_PRODUCTION:
```

## Seed Rehearsal Report Template

```text
Phase: Foundation Seed/Template Rehearsal
Status: PASS / PARTIAL / BLOCKED

Seed scope:
- catalogs:
- templates:
- roles/permissions:
- dynamic UI/navigation:
- activation simulation:

Before counts:
- ...

After first run:
- ...

After idempotency re-run:
- ...

Diff:
- ...

Validation:
- no duplicate natural keys:
- no phantom tenant rows:
- permissions readable:
- navigation readable:
- activation simulation:

DB changes:
- staging only
- production none

Final verdict:
- CATALOG_SEEDS_PASS:
- TEMPLATE_SEEDS_PASS:
- ACTIVATION_SEEDS_PASS:
- IDEMPOTENT:
```

## RLS Batch Report Template

```text
Phase: Foundation RLS Batch <N>
Status: PASS / PARTIAL / BLOCKED

Tables:
- ...

Preconditions:
- app.tenant_id GUC proof:
- tenant data available:

Apply:
- policies created:
- RLS enabled:
- FORCE RLS:

Isolation tests:
- tenant A reads A:
- tenant A reads B:
- tenant B reads B:
- no tenant context:
- platform bypass:

Rollback:
- policies removed:
- RLS disabled if rollback requires:

Final verdict:
- RLS_BATCH_PASS:
```

---

# Stop Conditions Across All Phases

Stop immediately if any of these occur:

```text
production targeted without approval
migration hash mismatch
staging baseline mismatch
unexpected row count drop
unexpected tenant status change
protected tenant changed unexpectedly
rollback fails
rollback removes prior-phase artifacts
RLS blocks normal tenant reads unexpectedly
seed creates duplicate natural keys
seed creates phantom tenant/module rows
writer continues writing to legacy table after cutover
health checks red after apply
agent edits migration during rehearsal
```

---

# Current Immediate Next Instruction

The next allowed action from the current accepted state is:

```text
Proceed with Phase 2B-S2 — Staging rehearsal of 0002 only.
```

Do not run 0003 or 0004.
Do not touch production.
Do not run seed/template rehearsal yet.
Do not enable RLS.
Do not cut over login_attempts.

Use the Phase 2B-S2 report format.

---

# Master Final Readiness Definition

Foundation can only be called production-ready when all are true:

```text
FOUNDATION_DB_READY = YES
MANIFEST_OWNERSHIP_READY = YES
TENANT_ACTIVATION_READY = YES
APP_TENANT_ID_GUC_READY = YES
RLS_READY = YES or explicitly out-of-scope for this release
AUDIT_LEDGER_READY = YES
DUPLICATE_TABLE_CUTOVER_READY = YES or explicitly deferred with compatibility views
SEED_TEMPLATE_READY = YES
DYNAMIC_UI_FOUNDATION_READY = YES
PRODUCTION_APPLY_PASS = YES
POST_PRODUCTION_VERIFICATION_PASS = YES
```

Until then, use precise labels:

```text
STAGING_PASS
REHEARSAL_PASS
BUILD_PASS
PARTIAL
NOT_READY
```

Never use vague labels like “done” or “production-ready” without the gate name.

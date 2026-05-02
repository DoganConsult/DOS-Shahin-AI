# Foundation DB Reconciliation — Phase 1A (Manifest Ownership)

**Source gate report:** `DOS-AIO-Specs/audit/modules/_phase1-foundation-gate.md`
**Mode:** AUDIT-ONLY for the database. Manifest + guard changes only. No DDL, no migrations, no data writes, no RLS changes, no `_legacy` drops.

## What was changed

| Change | Path |
|--------|------|
| Added `ownedTables`, `ownedReferenceTables`, `sharedTables`, `disownedTables`, `contestedTables` | `modules/foundation/module.manifest.json` |
| Added the same five fields | `platform/foundation/module.manifest.json` |
| New regression guard script | `scripts/ci-guards/foundation-manifest-ownership.mjs` |
| Wired guard into pnpm scripts as `validate:foundation-manifest` | `package.json` |
| This reconciliation note | `platform/docs/foundation/foundation-db-reconciliation-phase1a.md` |

## Manifest counts

- **ownedTables**: 29 (Foundation operational tables in `dos`)
- **ownedReferenceTables**: 17 (Foundation `dos.foundation_cat_*` catalogs)
- **sharedTables**: 3 keys — `platform_dauth` (3 tables), `ai_admin_or_dauth` (1), `platform_dos` (3)
- **disownedTables**: 2 — `foundation_training_assignments`, `foundation_training_courses` (move to Training module in a later phase, NOT this phase)
- **contestedTables**: 5 — `users`, `tenants`, `invitations`, `sod_rules`, `delegations` (resolution tracked in Phase 1B+)

## DB changes

**NONE.** Phase 1A explicitly forbids DB writes, DDL, RLS enablement, schema renames, table drops, ETL, or login_attempts cutover.

## Validator contract (`validate:foundation-manifest`)

The new guard enforces:

1. `ownedTables` must be a non-empty array (regression guard against empty Foundation manifest).
2. `ownedTables` entries must be unique.
3. `ownedReferenceTables` entries must be unique.
4. A table cannot appear in both `ownedTables` and `disownedTables`.
5. Every `contestedTables` entry must have a declared canonical/shared owner (i.e. appear in `sharedTables.*`).
6. `foundation_training_assignments` and `foundation_training_courses` must remain in `disownedTables` until Training-module ownership is decided.

## Next phase recommendation

**Phase 1B — Tenant Registry Reconciliation Plan (audit/proposal only).**

Inputs: §2 of the gate report. Proposed scope:
- Classify the 48 orphan registry rows + 5 dangling physical schemas.
- Propose a `schema_status` column for `platform_dos.tenants_registry`.
- Propose a one-shot reconciliation job (read-only first, then dry-run write).
- Define the provisioning hard-fail change so future schema-create failures cannot leave orphan registry rows.
- No data changes in 1B; deliverable is a written plan + SQL drafts queued for review.

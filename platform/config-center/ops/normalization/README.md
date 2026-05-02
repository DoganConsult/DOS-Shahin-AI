# DB Normalization Pipeline

End-to-end tooling to bring the schema-per-tenant Postgres model
(~2,200 tables/tenant + ~280 in public/dos) under disciplined normalization.

This directory holds **tooling and decision packets** — not migrations
that run themselves. Every schema-affecting action remains gated on
operator review.

## Architecture context

- One Postgres instance.
- One schema per tenant: `tenant_<id>` (regex-validated; see
  [packages/dos-db/src/tenant.ts](../../packages/dos-db/src/tenant.ts)).
- ~2,200 CREATE TABLE statements per tenant, sourced from:
  - [ops/migrations/tenant/](../migrations/tenant/) (central per-tenant chain)
  - `modules/*/source/backend/*/migrations/` (per-module per-tenant chain)
  - [ops/migrations/tenant/000_inline_baseline.sql](../migrations/tenant/000_inline_baseline.sql)
    (the previously-inline DDL extracted from `modules/onboarding/source/config/db.ts`)
- Public/dos schema (~280 tables) for platform metadata.
- Multi-tenancy isolation: `withTenantClient` sets `search_path`; RLS is
  a secondary layer when `RLS_ENABLED=true`.

## Pipeline order

```
  ┌─────────────────────┐
  │ Phase 0: drift      │   read-only, snapshots all live tenant shapes
  │ snapshot+matrix     │   → ops/normalization/snapshots/<ts>/
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ Phase 1: catalog    │   read-only, scans every migration file
  │ canonical inventory │   → ops/normalization/catalog.yml
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ Phase P-A/P-B fix   │   one-time structural fixes (REQUIRED before any
  │ tracker + baseline  │   ALTER work). Apply tracker DDL, backfill, then
  │                     │   the inline-baseline file is picked up by future
  │                     │   provisioning.
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ Phase 2: drift      │   per-table reconciliation migrations. Hand-curated
  │ reconciliation      │   from the drift matrix; no generator (every table
  │                     │   needs a real human decision).
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ Phase 3: FK rebuild │   generator emits ALTER...NOT VALID per inferred FK
  │                     │   → ops/normalization/proposals/fk-rebuild/
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ Phase 4: JSONB      │   decision matrix per JSONB column; --sample mode
  │ decomposition       │   for live key-shape inspection
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ Phase 5: counters   │   per denormalized _count column: DROP/TRIGGER/NIGHTLY
  └──────────┬──────────┘
             │
  ┌──────────▼──────────┐
  │ Phase 6/7: drops    │   destructive, gated, per-drop approval. No generator.
  └─────────────────────┘
```

## Quick start

```bash
cd ops/normalization

make catalog     # ~5s, no DB connection
make drift       # ~30s on a small fleet, requires DB connection
make plans       # generates all decision matrices

# Then, when ready to operationalize the tracker:
make tracker-dry # prints what it would do
make tracker     # applies dos.tenant_migrations + backfills every tenant
```

## What each script does

### `scripts/drift-detect.ts`
Connects to the platform DB (via `@dos/db`'s pool), enumerates every
`tenant_*` schema (and optionally `public`/`dos`), pulls
columns/constraints/indexes from `information_schema`, hashes each
table's normalized shape, and produces a matrix of which tables drift
across schemas.

Read-only. Output: `snapshots/<UTC-ISO>/drift-matrix.{md,json}` plus
`per-tenant/<schema>.json`.

### `scripts/catalog-build.ts`
Pure file scan. Parses every CREATE TABLE / ALTER TABLE statement
across `ops/migrations/`, `ops/migrations/tenant/`, and
`modules/*/source/backend/*/migrations/`. Detects normalization smells
(JSONB columns, `*_count` denormalized counters, missing FKs on `*_id`
columns, layer conflicts) and matches each table against a monolith
ancestor when present.

No DB connection. Output: `catalog.yml`.

### `scripts/fk-rebuild-generate.ts` (Phase 3)
For every `*_id` column with no FK, infers the target table by
pluralization heuristic, and writes per-table SQL files with
`ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` plus a separate
commented `VALIDATE` line. Also produces `decisions.md` — one row per
proposal with confidence and the operator's choice column.

Output: `proposals/fk-rebuild/`.

### `scripts/jsonb-decompose-plan.ts` (Phase 4)
Reads the catalog's `jsonb-column:*` smells and classifies each:

- **KEEP** — name signals legitimate document storage
  (`settings`, `metadata`, `config`, `*_data`, `*_state`, ...).
- **REVIEW** — operator decides; default for everything else.

`--sample <schema>` connects to a tenant and `SELECT`s up to N rows per
column to compute key frequency and top-shape overlap %. Stable shapes
(>90% overlap) are good promotion candidates.

Output: `proposals/jsonb-decompose/decisions.md` (+ per-column samples).

### `scripts/counter-cleanup-plan.ts` (Phase 5)
For every `*_count` integer column flagged as denormalized: infer the
child table by stem matching, then write a per-counter `.sql` file with
three policy scaffolds (DROP+view, TRIGGER, NIGHTLY reconcile).
`decisions.md` is the matrix the operator fills in.

Output: `proposals/counter-cleanup/`.

### `scripts/apply-tracker.ts` (Phase P-A)
Applies `ops/migrations/050_tenant_migrations_tracker.sql` to create
`dos.tenant_migrations`, then iterates every existing tenant schema and
calls `backfillTrackerByExistence` so each tenant's known-applied
migrations are recorded as `verified-by-backfill` rows.

This is the one script in this directory that **writes to the
platform schema and to every tenant's tracker rows**. It does not alter
tenant data tables.

## Bug fixes shipped with this work

- **Bug 1**: [services/onboarding-service/src/application/tenant-schema-provisioner.ts](../../services/onboarding-service/src/application/tenant-schema-provisioner.ts)
  used a permissive `[a-zA-Z0-9_]{1,128}` regex; the runtime
  ([packages/dos-db/src/tenant.ts](../../packages/dos-db/src/tenant.ts))
  enforces strict lowercase `[a-z0-9_-]`. Now both share `tenantSchema()`.
- **Bug 2**: [modules/onboarding/source/config/db.ts](../../modules/onboarding/source/config/db.ts)
  did `tenant_${tenantId.replace(/-/g, '_')}` — wrote DDL to a schema
  the runtime never read. Now derives via `tenantSchema()`.
- **Bug 3**: [modules/onboarding/source/backend/onboarding/services/provisioning-steps/tenant-steps.ts](../../modules/onboarding/source/backend/onboarding/services/provisioning-steps/tenant-steps.ts)
  swallowed migration failures and silently created stub `(id, tenant_id,
  created_at, updated_at)` tables for "critical" names — the drift
  factory. Replaced with `runTenantMigrationsTracked` which records
  every attempt and fails loud (set
  `TENANT_MIGRATIONS_CONTINUE_ON_ERROR=1` to opt out for dev).

## Output directories (not committed by default)

```
ops/normalization/
├── catalog.yml                        # Phase 1 output
├── snapshots/<UTC-ISO>/               # Phase 0 output
│   ├── drift-matrix.{md,json}
│   └── per-tenant/<schema>.json
└── proposals/                         # Phases 3/4/5 outputs
    ├── fk-rebuild/{decisions.md,*.sql}
    ├── jsonb-decompose/{decisions.md,*.sample.json}
    └── counter-cleanup/{decisions.md,*.sql}
```

## Hard rules

1. **Never apply a generator's SQL output unattended.** Every proposal
   needs a recorded operator decision.
2. **Every per-tenant schema change MUST go through
   `runTenantMigrationsTracked`** so `dos.tenant_migrations` reflects
   reality.
3. **`CREATE TABLE IF NOT EXISTS` does NOT update existing tables.**
   For shape changes, write `ALTER TABLE ... IF EXISTS ...` migrations.
4. **Drift detection is the truth source**, not the migration files.
   When the matrix and the migrations disagree, trust the matrix.

---

## Operational runbook

### "I want to ship a normalization migration to all tenants"

```bash
make catalog                 # refresh inventory
make plans                   # regenerate decision matrices
$EDITOR proposals/fk-rebuild/decisions.md   # mark the rows you want to apply
make fk-emit                 # writes ops/migrations/tenant/100_fk_rebuild_*.sql
make lint                    # confirm policy compliance
make rollout MIG=ops/migrations/tenant/100_fk_rebuild_<date>_tenant.sql            # dry-run
make rollout MIG=ops/migrations/tenant/100_fk_rebuild_<date>_tenant.sql APPLY=1    # actually run
make fk-validate SCHEMA=tenant_acme APPLY=1   # validate a canary first
# then loop through other tenants on a low-traffic schedule
```

### "A tenant migration failed in production"

```bash
make tenants-failed                                # see all failures
npx tsx ops/normalization/scripts/tenants.ts retry <tenantId>          # dry-run
npx tsx ops/normalization/scripts/tenants.ts retry <tenantId> --apply  # re-run only that tenant's failed migrations
```

The tracker holds the failure row; once the retry succeeds, a new row
with `status=applied` supersedes it via `dos.tenant_migrations_latest`.

### "I added a new tenant migration locally and want to test it"

```bash
make lint                                         # policy check
make rollout MIG=path/to/new.sql --tenants tenant_devseed     # one tenant, dry-run
make rollout MIG=path/to/new.sql --tenants tenant_devseed APPLY=1
make tenants-status --tenant devseed              # confirm row in tracker
```

### "I want to know if drift is increasing"

```bash
make drift-check          # compares catalog vs drift-baseline.json, exits 1 if regressed
make drift-baseline       # re-records the current state as the new baseline
```

CI hook: add `make catalog && make drift-check` to the build.

### "Two tenants are diverging — which tables differ?"

```bash
npx tsx ops/normalization/scripts/tenants.ts diff acme demo
```

Lists tables only-in-A, only-in-B, and tables with different column counts.

### "Monitoring needs to alert on tracker health"

`@dos/db` exports `summarizeTenantMigrationsHealth()`:

```ts
import { summarizeTenantMigrationsHealth } from '@dos/db';

app.get('/admin/db-migrations-health', async (_req, res) => {
  const h = await summarizeTenantMigrationsHealth();
  res.status(h.status === 'critical' ? 503 : 200).json(h);
});
```

Health rules baked in:
- `> 25%` of tenants with failures = `critical`
- `> 5%` = `degraded`
- a single migration failing on `> 10` tenants = `critical` regardless

### "I need to roll back a migration"

There is no automatic rollback. The convention is to ship a forward-fix
migration that reverses the change (drop the column, recreate the old
default, etc). Every migration emitted by this pipeline uses
`ALTER ... NOT VALID` or guarded `DO $$ EXCEPTION` blocks so partial
fleet rollouts leave a recoverable state.

If you really must remove a tracker entry (you are about to re-run a
migration whose checksum changed and you've manually undone it on the
tenant), do it surgically:

```sql
DELETE FROM dos.tenant_migrations
 WHERE tenant_id = $1 AND migration_id = $2 AND checksum = $3;
```

Never `TRUNCATE dos.tenant_migrations`.

### "I want to know which tracker rows need attention"

The tracker exposes two read-side views:

- `dos.tenant_migrations_latest` — DISTINCT ON (tenant_id, migration_id),
  newest row wins. Use this for "what is the current state?"
- `dos.tenant_migrations_failed` — every (tenant, migration) currently
  in `status=failed`. Use this for "what's broken?"

Both are indexed and constant-cost.

## Pipeline component map

| Concern                                | File / module                                                                 |
|----------------------------------------|--------------------------------------------------------------------------------|
| Tenant ID safety                       | `packages/dos-db/src/tenant.ts`                                                |
| Tracked migration runner               | `packages/dos-db/src/tenant-migrations.ts`                                     |
| Health summary                         | `packages/dos-db/src/tenant-migrations-health.ts`                              |
| Tracker DDL                            | `ops/migrations/050_tenant_migrations_tracker.sql`                             |
| Tenant baseline (was inline DDL)       | `ops/migrations/tenant/000_inline_baseline.sql`                                |
| Drift snapshot + matrix                | `ops/normalization/scripts/drift-detect.ts`                                    |
| Drift CI gate                          | `ops/normalization/scripts/drift-ci.ts`                                        |
| Catalog generator                      | `ops/normalization/scripts/catalog-build.ts`                                   |
| FK rebuild planner                     | `ops/normalization/scripts/fk-rebuild-generate.ts`                             |
| FK rebuild emitter                     | `ops/normalization/scripts/fk-rebuild-emit.ts`                                 |
| FK validate runner                     | `ops/normalization/scripts/fk-validate.ts`                                     |
| JSONB decomposition planner            | `ops/normalization/scripts/jsonb-decompose-plan.ts`                            |
| Counter cleanup planner                | `ops/normalization/scripts/counter-cleanup-plan.ts`                            |
| Migration policy linter                | `ops/normalization/scripts/lint-migrations.ts`                                 |
| Multi-tenant rollout runner            | `ops/normalization/scripts/rollout.ts`                                         |
| Tracker apply + backfill               | `ops/normalization/scripts/apply-tracker.ts`                                   |
| Operations CLI                         | `ops/normalization/scripts/tenants.ts`                                         |
| Pipeline entrypoint                    | `ops/normalization/Makefile`                                                   |

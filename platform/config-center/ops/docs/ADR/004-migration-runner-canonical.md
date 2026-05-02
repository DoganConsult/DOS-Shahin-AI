# ADR 004: Canonical Migration Runner

## Status

Accepted

## Context

Two migration runners existed in the repository:

| Runner | Tracking table | Column names | CONCURRENTLY | Down support |
|---|---|---|---|---|
| `migration/migration-runner.ts` | `dos.migration_history` | `migration_number`, `migration_name`, `duration_ms` | No | Yes |
| `ops/scripts/migration-runner.ts` | `dos.platform_migrations` | `name`, `execution_time_ms` | No | Partial |

The Phase-1 enterprise spec requires a single runner that writes to:

```sql
dos.platform_migrations(filename TEXT PK, checksum TEXT, applied_at TIMESTAMPTZ, duration_ms INTEGER)
```

with exact column names. Neither runner satisfied all requirements:

1. `migration/migration-runner.ts` used `dos.migration_history` with different column names.
2. `ops/scripts/migration-runner.ts` used `dos.platform_migrations` but with `name` instead of `filename` and `execution_time_ms` instead of `duration_ms`.
3. Neither runner supported `CREATE INDEX CONCURRENTLY` (both wrapped all SQL in explicit transaction blocks, which PostgreSQL prohibits for `CONCURRENTLY` DDL).
4. The `down` subcommand accepted a version number, not a filename — incompatible with the `20260418_NNNN_*` naming scheme.
5. Neither runner enforced SHA-256 checksum drift detection on re-run.

## Decision

**`migration/migration-runner.ts` is the canonical runner.**

`ops/scripts/migration-runner.ts` is **deprecated**. It is kept in place to avoid breaking any in-flight CI scripts that reference it, but it emits a deprecation warning on startup and delegates to the canonical runner for future work.

### Canonical runner capabilities

| Capability | Implementation |
|---|---|
| Tracking table | `dos.platform_migrations(filename, checksum, applied_at, duration_ms)` — exact spec column names |
| Table bootstrap | `CREATE TABLE IF NOT EXISTS` on every run (idempotent) |
| File discovery | All `*.sql` files in the target dir excluding `*_down.sql`, sorted lexicographically |
| CONCURRENTLY support | Detects `CONCURRENTLY` keyword (case-insensitive) OR `-- dos:no-transaction` header; skips `BEGIN`/`COMMIT` for those files |
| Checksum | Full 64-char SHA-256 of file contents; drift fails fast with descriptive error |
| Idempotency | Already-applied migrations (matching checksum) are silently skipped |
| `up` command | Applies all pending migrations in order |
| `down <filename>` command | Finds `<basename>_down.sql`, executes it, removes tracking row |
| `status` command | Lists all applied migrations with `applied_at` and `duration_ms` |
| `duration_ms` | Measured from OS clock, stored as INTEGER milliseconds |

### CLI

```bash
# Apply pending migrations from default dir (ops/migrations/)
DATABASE_URL=... ts-node migration/migration-runner.ts up

# Apply from custom dir
DATABASE_URL=... ts-node migration/migration-runner.ts up --dir migration/phase1

# Roll back a specific migration
DATABASE_URL=... ts-node migration/migration-runner.ts down 20260418_0001_users_email_ci_uk.sql --dir migration/phase1

# Show status
DATABASE_URL=... ts-node migration/migration-runner.ts status
```

### Programmatic API

```typescript
import { MigrationRunner, migrateUp, migrateDown, getStatus } from './migration/migration-runner.js';

const runner = new MigrationRunner(process.env.DATABASE_URL!);
await runner.up('./ops/migrations');
await runner.down('./ops/migrations', '20260418_0001_users_email_ci_uk.sql');
await runner.close();
```

## Consequences

- All Phase-1 (`20260418_00XX_*.sql`) migrations must be placed in `migration/` or a subdirectory and applied via this runner.
- `ops/scripts/migration-runner.ts` must not be used for new migrations. It remains for backward compatibility with existing CI steps that reference it, but those steps should be updated to use the canonical runner.
- `dos.migration_history` (created by `migration/001_migration_history.sql`) remains for audit log purposes but is no longer the primary tracking table. `dos.platform_migrations` is the single source of truth for whether a migration has been applied.
- The CONCURRENTLY path (no-transaction) means that if a CONCURRENTLY migration fails mid-execution, the index is left in `INVALID` state and must be dropped and re-created manually. This is the correct PostgreSQL behavior.
- Tests covering idempotency, CONCURRENTLY detection, down rollback, and checksum drift are in `tests/migration/migration-runner.unit.test.ts`.

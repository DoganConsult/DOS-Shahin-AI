# Phase 0.1 — PostgreSQL snapshot, restore drill, and row-count proof

## Purpose

Off-box backup (`pg_dump -Fc`), periodic restore verification on a clone, and deterministic row-count checks for the **platform** database backing the new-user / onboarding slice.

## Prerequisites

- `pg_dump` and `pg_restore` client tools (PostgreSQL 15+ recommended; match server major if possible).
- `DATABASE_URL` or discrete `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`.
- Write access to a **backup directory outside the database volume** (e.g. object storage mount or NFS).

## Gate (a) — Files

| Artifact | Path |
|----------|------|
| Dump wrapper | `ops/scripts/db-snapshot-pgdump.sh` |
| Restore + proof | `ops/scripts/db-restore-verify.sh` |
| Row-count SQL | `ops/scripts/sql/row-count-proof.sql` |
| This runbook | `ops/docs/runbooks/db-snapshot-restore-phase0.md` |

## Gate (b) — Snapshot (off-box)

From an operator workstation or a dedicated backup host (PostgreSQL runs natively on the DB host — not in a container):

```bash
export DATABASE_URL='postgresql://user:pass@db-host:5432/dos_platform'
export BACKUP_DIR=/secure/backups/dos-platform
bash ops/scripts/db-snapshot-pgdump.sh
```

Expected artifact: `dos_platform_YYYYMMDD_HHMM.dump` (custom `-Fc` format).

## Gate (c) — Restore drill (target &lt; 10 minutes on staging-sized DB)

Use a **throwaway** database or instance clone:

```bash
export RESTORE_URL='postgresql://user:pass@restore-host:5432/dos_platform_restore'
export DUMP_FILE=/secure/backups/dos_platform/dos_platform_YYYYMMDD_HHMM.dump
bash ops/scripts/db-restore-verify.sh
```

The script runs `pg_restore` (schema+data or `--data-only` per flags), then applies `ops/scripts/sql/row-count-proof.sql`.

## Gate (d) — Row-count proof

The proof SQL emits one row per check (`check_name`, `cnt`). Operators archive stdout with the migration ticket / change record.

## Gate (e) — Observability

- Tag backup jobs with `component=postgres`, `backup_type=platform_full`.
- Alert if snapshot job exits non-zero or restore drill exceeds SLA.

## Gate (f) — Rollback path

Restore from the latest **verified** `-Fc` dump onto the primary only via documented failback (blue/green or DNS cut). Re-run `migration/migration-runner.ts status` after restore to confirm `dos.platform_migrations` matches expectations.

## Production readiness

`STATUS: NOT_YET_READY` until an operator has executed snapshot + restore drill in staging and attached evidence (timestamps, exit codes, row-count output).

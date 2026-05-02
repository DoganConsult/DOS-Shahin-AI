# Rejected migrations

Migrations placed here have been formally **rejected** during a Phase 2A
static review or a Phase 2B rehearsal. They are kept ONLY as audit
evidence and MUST NOT be executed by any tool, runner, or CI job.

The runtime migration runner (`migration/migration-runner.ts`) and PM2
boot path scan `ops/migrations/*.sql`. This directory uses the suffix
`.rejected` so that pattern does not pick these files up.

## Index

| File | Original date | Rejected during | Reason | Replacement |
|------|---------------|-----------------|--------|-------------|
| `20260430_0002_archive_phantom_tenant_product_modules.sql.rejected` | 2026-04-30 | Phase 2B-S2 staging rehearsal (Foundation Reconciliation) | Parse error at line 166 — invalid `RAISE NOTICE` used inside a SQL scalar expression `(SELECT (RAISE NOTICE 'unreachable')::text)`. PostgreSQL rejects the file at parse time; `BEGIN` was opened but the script never reached `COMMIT`, so zero objects/rows were committed on staging (`shahin_grc_gate2b_staging`). Production was never touched. | `ops/migrations/20260430_0002a_archive_phantom_tenant_product_modules_fixed.sql` |

## Rules

- Do NOT remove the `.rejected` suffix.
- Do NOT copy these files back into `ops/migrations/`.
- Do NOT edit them — they are frozen evidence of the rejected revision.
- Any new corrective migration must live in `ops/migrations/` under a
  new file name (e.g. `..._0002a_..._fixed.sql`) and go through Phase 2A
  static review with a fresh `sha256`.

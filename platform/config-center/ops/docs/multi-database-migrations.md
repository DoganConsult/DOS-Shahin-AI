# Multi-database migrations (design)

Production may use **more than one PostgreSQL target** (separate instances, separate logical databases, or separate schemas with independent migration history). The default automation uses **one** connection string:

| Variable | Used by |
|----------|---------|
| `DATABASE_URL` | `pnpm run migrate` → `ops/scripts/run-migrations.sh`, CI `migration-validation`, application services |

## Extending to multiple targets

1. **Name each target** (example): `DATABASE_URL` (primary platform), `DATABASE_URL_ANALYTICS`, `DATABASE_URL_AUDIT`, etc.
2. **Keep migration directories disjoint** per target, or use a single repo layout with explicit prefixes (e.g. `ops/migrations/` vs `services/foo/migrations/`) and **never** apply the same file twice to two DBs unless that is intentional.
3. **Tracking table per DB**: today the shell runner records applied migrations in `dos.schema_migrations` on the DB pointed to by `DATABASE_URL`. Each additional DB needs its **own** database (or schema) with its **own** `dos.schema_migrations` — do not share one tracking table across unrelated migration sets.
4. **Orchestration**: add a wrapper script (e.g. `ops/scripts/run-migrations-all-dbs.sh`) that:
   - reads a **declarative list** of `{ envVar, label }` in fixed order;
   - for each defined non-empty URL, exports `DATABASE_URL` (or pass `--url` if you extend `run-migrations.sh`) and invokes the same migration runner;
   - fails fast on first non-zero exit.
5. **CI**: mirror the same sequence in a dedicated workflow job or extend `migration-validation` with multiple Postgres services / steps if you need parity tests per DB.

Until multiple URLs exist in your environment files, **only `DATABASE_URL` is migrated** by `pnpm run migrate` and by the documented deploy path in `ops/runbooks/deploy.md`.

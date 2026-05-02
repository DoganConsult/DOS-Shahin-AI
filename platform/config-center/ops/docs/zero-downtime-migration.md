# Zero-Downtime Migration Strategy

## Principles
In DOS-AIO, we strive to deploy code independently of database migrations. A true zero-downtime deployment implies that users currently active on the platform experience zero interruption, and existing queries do not lock out updates.

To achieve this, every schema change MUST follow these rules:

1. **Online DDL Operations Only**
   - Use `CREATE INDEX CONCURRENTLY` instead of `CREATE INDEX`.
   - Never run `ALTER TABLE ... ADD COLUMN ... DEFAULT ...` if it executes a table rewrite. In PostreSQL 11+, this is mitigated, but ensure no volatile functions are used as defaults.
   - Separate table re-writes from quick metadata changes.

2. **No Table Locks**
   - Heavy table locking statements (like `ALTER TABLE ... DROP COLUMN`) must be avoided. Instead, sunset logic where the backend explicitly stops writing to the column first, and the column is dropped in a *subsequent* release wave.
   - Lock timeouts must be enforced in the script using `SET lock_timeout = '2s';`

3. **Additive First migrations**
   - Add nullable fields. Deploy code. Then back-fill data.
   - Code must be backward and forward compatible. Deploying the migration before the code must never break the running instance.

4. **Rollback (`_down.sql`) Support**
   - If `004_add_feature_up.sql` creates a schema component, `004_add_feature_down.sql` must cleanly invert the state. It is run using `npx tsx ops/scripts/migration-runner.ts --rollback`.

## CI Blockers
Our automated validation checks `MIGRATION validation` workflows against seeded replicas of production DB structures. If any operation escalates past typical locks or violates idempotent structures, the pipeline will fail immediately, prohibiting the PR merge.

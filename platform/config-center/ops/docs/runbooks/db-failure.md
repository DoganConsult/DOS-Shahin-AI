# Runbook: DB Failure

## Context
If Prometheus or the Gateway raises an alert for Database Down (`expr: pg_up == 0`), access to all stateful components in the DOS-AIO stack degrades.

## Diagnosis Steps
1. **Check process running**: Log onto the core database server or AWS RDS console and ensure the Postgres process is still operating.
2. **Check connection limits**: If the Node instances spawned too many processes without PgBouncer, the database will refuse connections. Check logs for `FATAL: sorry, too many clients already`.
3. **Verify PM2 states**: Occasionally PM2 process crashes will spam connections on boot loops if env is misconfigured.

## Mitigation
1. **Clear connection locks**:
   Kill zombie queries tying up resources.
   ````sql
   SELECT pg_terminate_backend(pg_stat_activity.pid)
   FROM pg_stat_activity
   WHERE pg_stat_activity.datname = 'dos_platform'
     AND pid <> pg_backend_pid();
   ````
2. **Failover**:
   Promote read replica to master and cycle the application's connection `DATABASE_URL` routing domain.

## Validation
Poll the health endpoints manually mapping to `packages/dos-platform-core/src/observability/health.ts`.
Dependencies block should read `"database": "connected"`.

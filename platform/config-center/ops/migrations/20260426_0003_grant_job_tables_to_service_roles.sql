-- Grant the platform service roles read/write on dos.job_registry and
-- dos.job_executions. The platform-core JobScheduler runs inside every
-- service (auth, tenant, workflow, notification, gateway, ai, audit) and
-- INSERTs/UPDATEs both tables on every cron tick. Without these grants
-- every cron tick logged a SAFE_QUERY_SCHEMA_DRIFT-style "permission
-- denied for table job_registry" wrapped error, leaving the registry
-- table empty and the scheduler effectively blind to its own runs.
--
-- Idempotent.
GRANT USAGE ON SCHEMA dos TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway, dos_notification, dos_tenant, dos_ai;

GRANT SELECT, INSERT, UPDATE, DELETE ON dos.job_registry, dos.job_executions TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway, dos_notification, dos_tenant, dos_ai;

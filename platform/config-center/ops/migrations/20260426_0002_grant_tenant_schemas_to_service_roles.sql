-- Grant USAGE + table privileges on every tenant_<id> schema to the
-- platform service roles. Without this, any handler that uses
-- withTenantClient() (which sets search_path to the tenant schema)
-- returned 500 with PG 42501 "permission denied for schema
-- tenant_<id>" or 60-second timeouts as middleware probed missing
-- tables. Discovered by Phase-2 DoD harnesses (Tasks/Workflow/etc.).
--
-- Idempotent (DO/EXECUTE pattern) — safe to re-run.
DO $$
DECLARE s text;
BEGIN
  FOR s IN
    SELECT nspname FROM pg_namespace WHERE nspname LIKE 'tenant\_%' ESCAPE '\'
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway, dos_notification, dos_tenant, dos_ai', s);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway, dos_notification, dos_tenant, dos_ai', s);
    EXECUTE format('GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA %I TO dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway, dos_notification, dos_tenant, dos_ai', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway, dos_notification, dos_tenant, dos_ai', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, USAGE ON SEQUENCES TO dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway, dos_notification, dos_tenant, dos_ai', s);
  END LOOP;
END $$;

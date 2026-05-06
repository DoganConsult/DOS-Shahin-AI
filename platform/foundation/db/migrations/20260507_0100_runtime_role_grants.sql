-- =====================================================================
-- Runtime role grants — workspace_shell_binding sequences and related
--
-- Live tenant-service runs as role `dos_auth` and triggers an INSERT into
-- dos.workspace_shell_binding via tenant /register. Live deploys created
-- the sequence under a different owner without granting USAGE to dos_auth,
-- producing 42501 "permission denied for sequence
-- workspace_shell_binding_id_seq". Fix at the DB layer (doctrine: never
-- patch around missing privileges in TS).
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_auth') THEN
    -- All current + future sequences in dos.* schema usable by tenant-service.
    EXECUTE 'GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA dos TO dos_auth';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA dos
             GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO dos_auth';
    -- Foundation tenant-bootstrap trigger fans out to workspace_shell_binding.
    -- Ensure SELECT/INSERT/UPDATE survives even when tables are recreated.
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA dos
             GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dos_auth';
  END IF;
END$$;

COMMIT;

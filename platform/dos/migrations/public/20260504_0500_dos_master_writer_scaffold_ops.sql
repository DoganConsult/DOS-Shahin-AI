-- 20260504_0500_dos_master_writer_scaffold_ops.sql
-- Owner: dos-platform / DOS Master.
--
-- Ops-side companion of `20260504_0500_dos_master_writer_scaffold.sql`.
-- Run by a CREATEROLE/superuser identity (e.g. postgres) AFTER the main
-- migration. Idempotent.
--
-- Creates the `dos_master` PG role if missing, then GRANTs it to the
-- service identities that legitimately write to controlled tables.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_master') THEN
    CREATE ROLE dos_master NOLOGIN;
    COMMENT ON ROLE dos_master IS
      'DOS Master writer trust. Only roles inheriting dos_master may write to controlled tables.';
  END IF;
END
$$;

-- Service identities that may legitimately write to controlled tables
-- (uncomment per environment as roles are provisioned):
-- GRANT dos_master TO workspace_bff;
-- GRANT dos_master TO publish_service;
-- GRANT dos_master TO rollout_service;
-- GRANT dos_master TO admin_console_bff;
-- GRANT dos_master TO provisioning_service;
-- GRANT dos_master TO signup_bff;
-- GRANT dos_master TO marketing_shell_service;
-- GRANT dos_master TO anti_abuse_service;

-- Dev convenience: in the offline-window dev DB, lend dos_master to the
-- application user so migrations and seed scripts can apply.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_auth') THEN
    EXECUTE 'GRANT dos_master TO dos_auth';
  END IF;
END
$$;

COMMIT;

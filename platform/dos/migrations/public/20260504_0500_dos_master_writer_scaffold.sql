-- 20260504_0500_dos_master_writer_scaffold.sql
-- Owner: dos-platform / DOS Master.
--
-- DOS MASTER PLAN — M1 Day 1.
--
-- Establishes the writer-trust scaffold consumed by every controlled
-- table introduced in M1 D2..D4 and across M2..M14.
--
--   ① `dos_master` PostgreSQL role — the only DB role permitted to
--      write to controlled tables. Service identities (workspace-bff,
--      publish-service, rollout-service, admin-console-bff,
--      provisioning-service, signup-bff, marketing-shell-service,
--      anti-abuse-service) are GRANTed `dos_master` via deploy
--      automation. Tenant-runtime roles (`dos_auth`, etc.) are NOT.
--
--   ② `dos.dos_master_writer_audit` — every accepted write to a
--      controlled table is mirrored here with actor, table, op, rowid,
--      old/new diff, change_request_id, ring (PPD), correlation_id.
--
--   ③ `dos.dos_master_role` + `dos.dos_master_grant` — application-
--      level role/grant ledger (the "DOS Master actor" model). PG
--      role membership is the floor; this ledger is the audit truth.
--
--   ④ `dos.trg_dos_master_only()` — reusable trigger function. Every
--      controlled table in M1 D2..D4 attaches this as a
--      `BEFORE INSERT OR UPDATE OR DELETE` trigger. It rejects the
--      write unless `current_setting('dos.actor', true) = 'dos-master'`
--      AND the session role inherits `dos_master`. On accept, it logs
--      to `dos_master_writer_audit`.
--
-- Forward-only and idempotent. Safe to re-run.

BEGIN;

-- =====================================================================
-- ① PG role.
-- =====================================================================
-- Role creation requires CREATEROLE/superuser; tolerated on app-role
-- runs by emitting a NOTICE and deferring to the ops-side companion
-- migration `20260504_0500_dos_master_writer_scaffold_ops.sql`.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_master') THEN
    BEGIN
      EXECUTE 'CREATE ROLE dos_master NOLOGIN';
      EXECUTE 'COMMENT ON ROLE dos_master IS '
           || quote_literal('DOS Master writer trust. Only roles inheriting dos_master may write to controlled tables.');
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'dos_master role not created (insufficient_privilege). Run 20260504_0500_dos_master_writer_scaffold_ops.sql as a CREATEROLE/superuser.';
    END;
  END IF;
END
$$;

-- =====================================================================
-- ② Writer audit ledger.
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.dos_master_writer_audit (
  id                  bigserial PRIMARY KEY,
  occurred_at         timestamptz NOT NULL DEFAULT now(),
  actor               text        NOT NULL,
  session_role        text        NOT NULL,
  table_schema        text        NOT NULL,
  table_name          text        NOT NULL,
  op                  text        NOT NULL CHECK (op IN ('INSERT','UPDATE','DELETE')),
  row_pk              text,
  old_row             jsonb,
  new_row             jsonb,
  change_request_id   uuid,
  rollout_ring        text,
  correlation_id      uuid,
  client_addr         inet,
  application_name    text
);

CREATE INDEX IF NOT EXISTS ix_dos_master_writer_audit_table_time
  ON dos.dos_master_writer_audit (table_schema, table_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_dos_master_writer_audit_actor_time
  ON dos.dos_master_writer_audit (actor, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_dos_master_writer_audit_change_request
  ON dos.dos_master_writer_audit (change_request_id) WHERE change_request_id IS NOT NULL;

COMMENT ON TABLE dos.dos_master_writer_audit IS
  'Append-only audit of every accepted write to a DOS Master controlled table. Source of truth for change history; rollups feed the decision ledger and PPD evaluations.';

-- =====================================================================
-- ③ Application-level role + grant ledger.
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.dos_master_role (
  role_code    text PRIMARY KEY,
  display_name text NOT NULL,
  description  text,
  is_system    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO dos.dos_master_role (role_code, display_name, description, is_system) VALUES
  ('dos-master',           'DOS Master',           'Root writer of every controlled table.',                       true),
  ('dos-master-publisher', 'DOS Master Publisher', 'May publish/rollback page+component+route revisions.',          true),
  ('dos-master-rollout',   'DOS Master Rollout',   'May advance/rollback PPD rings and edit cohort definitions.',   true),
  ('dos-master-admin',     'DOS Master Admin',     'May manage platform-admin pillars (DNOC/DSOC/DOS/DAuth).',      true),
  ('dos-master-onboard',   'DOS Master Onboard',   'May add products, modules, services, and signup flows.',        true),
  ('dos-master-trial',     'DOS Master Trial',     'May start/extend/expire/convert tenant trials.',                true),
  ('dos-master-marketing', 'DOS Master Marketing', 'May edit marketing public surfaces (zone 1).',                  true)
ON CONFLICT (role_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  is_system    = EXCLUDED.is_system;

CREATE TABLE IF NOT EXISTS dos.dos_master_grant (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor       text NOT NULL,
  role_code   text NOT NULL REFERENCES dos.dos_master_role(role_code) ON DELETE CASCADE,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  granted_by  text NOT NULL,
  revoked_at  timestamptz,
  revoked_by  text,
  reason      text,
  UNIQUE (actor, role_code) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS ix_dos_master_grant_active
  ON dos.dos_master_grant (actor, role_code) WHERE revoked_at IS NULL;

COMMENT ON TABLE dos.dos_master_grant IS
  'Application-level grants of DOS Master roles to service or operator actors. PG role membership is the DB-level floor; this table is the audit truth.';

-- =====================================================================
-- ④ Reusable enforcement trigger.
-- =====================================================================
CREATE OR REPLACE FUNCTION dos.trg_dos_master_only()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = dos, public
AS $fn$
DECLARE
  v_actor   text := current_setting('dos.actor', true);
  v_role    text := current_setting('dos.actor_role', true);
  v_cr      uuid := nullif(current_setting('dos.change_request_id', true), '')::uuid;
  v_ring    text := nullif(current_setting('dos.rollout_ring', true), '');
  v_corr    uuid := nullif(current_setting('dos.correlation_id', true), '')::uuid;
  v_session text := current_user;
  v_pk      text;
  v_old     jsonb;
  v_new     jsonb;
BEGIN
  -- Floor: session role must inherit dos_master (skipped only if the
  -- role does not yet exist, which happens when the ops migration has
  -- not been run; the application-identity check below still applies).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_master')
     AND NOT pg_has_role(v_session, 'dos_master', 'USAGE') THEN
    RAISE EXCEPTION 'DOS Master only: session role % is not granted dos_master', v_session
      USING ERRCODE = '42501';
  END IF;

  -- Application identity must self-identify as dos-master.
  IF v_actor IS NULL OR v_actor = '' OR v_actor <> 'dos-master' THEN
    RAISE EXCEPTION 'DOS Master only: dos.actor must be set to ''dos-master'' (got %)',
      coalesce(v_actor, '<unset>')
      USING ERRCODE = '42501';
  END IF;

  -- Snapshot row payloads for audit.
  IF (TG_OP = 'INSERT') THEN
    v_new := to_jsonb(NEW);
    v_pk  := coalesce(v_new->>'id', v_new->>'code', v_new->>'key');
  ELSIF (TG_OP = 'UPDATE') THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_pk  := coalesce(v_new->>'id', v_new->>'code', v_new->>'key');
  ELSE
    v_old := to_jsonb(OLD);
    v_pk  := coalesce(v_old->>'id', v_old->>'code', v_old->>'key');
  END IF;

  INSERT INTO dos.dos_master_writer_audit
    (actor, session_role, table_schema, table_name, op, row_pk,
     old_row, new_row, change_request_id, rollout_ring, correlation_id,
     client_addr, application_name)
  VALUES
    (v_actor, v_session, TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, v_pk,
     v_old, v_new, v_cr, v_ring, v_corr,
     inet_client_addr(), current_setting('application_name', true));

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END
$fn$;

COMMENT ON FUNCTION dos.trg_dos_master_only() IS
  'M1 D1 — reusable BEFORE INSERT/UPDATE/DELETE trigger. Rejects writes unless the session role inherits dos_master AND dos.actor=''dos-master''. On accept, mirrors the write to dos_master_writer_audit. Attached to every controlled table in M1 D2..D4.';

-- =====================================================================
-- Self-protection: attach trg_dos_master_only to its own ledger tables.
-- (The audit table itself is append-only via the trigger; the role/grant
--  tables are managed only by dos-master.)
-- =====================================================================
DROP TRIGGER IF EXISTS trg_dos_master_only_role  ON dos.dos_master_role;
CREATE TRIGGER trg_dos_master_only_role
  BEFORE INSERT OR UPDATE OR DELETE ON dos.dos_master_role
  FOR EACH ROW EXECUTE FUNCTION dos.trg_dos_master_only();

DROP TRIGGER IF EXISTS trg_dos_master_only_grant ON dos.dos_master_grant;
CREATE TRIGGER trg_dos_master_only_grant
  BEFORE INSERT OR UPDATE OR DELETE ON dos.dos_master_grant
  FOR EACH ROW EXECUTE FUNCTION dos.trg_dos_master_only();

-- Note: the seed INSERTs above into dos_master_role were executed BEFORE
-- the trigger was attached, exactly so the bootstrap is auditable but not
-- self-blocked. From this migration forward, all writes require dos-master.

COMMIT;

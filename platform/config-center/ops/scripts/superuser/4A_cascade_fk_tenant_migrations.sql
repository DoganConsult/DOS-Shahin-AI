-- Phase-2A — FK dos.tenant_migrations.tenant_id → dos.tenants.tenant_id
--                 ON DELETE CASCADE
--
-- Pre-conditions verified 2026-04-30:
--   - dos.tenants.tenant_id is varchar; dos.tenant_migrations.tenant_id is text
--     (Postgres allows FK between text↔varchar; both compatible.)
--   - 1663 orphan ledger rows exist (tenant_ids that don't appear in dos.tenants)
--     → archive + delete before adding the constraint.
--
-- Run as postgres superuser.

\set ON_ERROR_STOP on
BEGIN;

-- 1) Archive the 1663 orphan rows (audit trail before destructive op)
DROP TABLE IF EXISTS dos_archive.tenant_migrations_orphans_20260430;
CREATE TABLE dos_archive.tenant_migrations_orphans_20260430 AS
  SELECT *, NOW() AS archived_at, current_user AS archived_by, 'pre-FK-cascade-add' AS archive_reason
    FROM dos.tenant_migrations
   WHERE tenant_id NOT IN (SELECT tenant_id FROM dos.tenants);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM dos_archive.tenant_migrations_orphans_20260430;
  RAISE NOTICE 'archived % orphan ledger rows', n;
END $$;

-- 2) Delete the orphans (the FK we're about to add would reject them)
DELETE FROM dos.tenant_migrations
 WHERE tenant_id NOT IN (SELECT tenant_id FROM dos.tenants);

-- 3) Add the FK with CASCADE
--    NOT VALID first (zero downtime), VALIDATE in same TX since rows are clean.
ALTER TABLE dos.tenant_migrations
  ADD CONSTRAINT fk_tenant_migrations_tenant
    FOREIGN KEY (tenant_id) REFERENCES dos.tenants(tenant_id) ON DELETE CASCADE
    NOT VALID;

ALTER TABLE dos.tenant_migrations VALIDATE CONSTRAINT fk_tenant_migrations_tenant;

-- 4) Index the FK column (required for fast cascade DELETE on parent)
CREATE INDEX IF NOT EXISTS ix_tenant_migrations_tenant_id
  ON dos.tenant_migrations (tenant_id);

-- 5) Verification
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM dos.tenant_migrations
    WHERE tenant_id NOT IN (SELECT tenant_id FROM dos.tenants);
  IF n <> 0 THEN RAISE EXCEPTION 'still % orphans after FK add', n; END IF;
  RAISE NOTICE 'PASS — FK fk_tenant_migrations_tenant validated, 0 orphans, index present';
END $$;

COMMIT;

-- 20260504_0500_dos_master_writer_scaffold_down.sql
-- Reverses M1 D1 writer scaffold. Forward-only normally; this is for
-- staging/test only.

BEGIN;

DROP TRIGGER IF EXISTS trg_dos_master_only_grant ON dos.dos_master_grant;
DROP TRIGGER IF EXISTS trg_dos_master_only_role  ON dos.dos_master_role;

DROP FUNCTION IF EXISTS dos.trg_dos_master_only();

DROP TABLE IF EXISTS dos.dos_master_grant;
DROP TABLE IF EXISTS dos.dos_master_role;
DROP TABLE IF EXISTS dos.dos_master_writer_audit;

-- PG role kept; dropping it would orphan grants in services. Manual drop
-- only after explicit decommission.

COMMIT;

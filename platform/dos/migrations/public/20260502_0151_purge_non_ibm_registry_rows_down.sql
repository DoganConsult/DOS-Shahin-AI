-- 0151 DOWN — Restore the deleted non-IBM dynamic_ui_component_registry rows.
--
-- WARNING: This down migration cannot perfectly restore the 57 deleted
-- custom/unapproved rows; their original payload was not snapshotted. If
-- the rows are needed back, they must be regenerated from the original
-- pre-stage source (separate seed). This down migration only removes the
-- 0151 schema_migrations row so the runner can re-apply 0151 idempotently.
-- =====================================================================
BEGIN;

DELETE FROM dos.schema_migrations
 WHERE filename = '20260502_0151_purge_non_ibm_registry_rows.sql';

COMMIT;

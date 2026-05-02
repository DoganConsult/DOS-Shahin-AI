-- Rollback for 001_agrc_tables.sql

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_agrc_tasks_status;
DROP INDEX IF EXISTS idx_agrc_tasks_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.agrc_tasks CASCADE;

COMMIT;

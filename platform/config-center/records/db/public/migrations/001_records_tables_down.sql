BEGIN;
-- Rollback for 001_records_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_records_type;
DROP INDEX IF EXISTS idx_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.records CASCADE;

COMMIT;

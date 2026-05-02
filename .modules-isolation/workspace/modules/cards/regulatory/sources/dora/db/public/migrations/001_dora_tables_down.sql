BEGIN;
-- Rollback for 001_dora_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_dora_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.dora_assessments CASCADE;

COMMIT;

BEGIN;
-- Rollback for 001_training_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_training_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.training_programs CASCADE;

COMMIT;

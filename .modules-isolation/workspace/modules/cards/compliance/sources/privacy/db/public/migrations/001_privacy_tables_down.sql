BEGIN;
-- Rollback for 001_privacy_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_privacy_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.privacy_assessments CASCADE;

COMMIT;

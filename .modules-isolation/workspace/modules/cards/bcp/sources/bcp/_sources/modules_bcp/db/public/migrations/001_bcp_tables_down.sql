BEGIN;
-- Rollback for 001_bcp_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_bcp_plans_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.bcp_plans CASCADE;

COMMIT;

BEGIN;
-- Rollback for 001_governance_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_policies_status;
DROP INDEX IF EXISTS idx_policies_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.policies CASCADE;

COMMIT;

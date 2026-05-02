BEGIN;
-- Rollback for 001_integrations_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_integrations_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.integrations CASCADE;

COMMIT;

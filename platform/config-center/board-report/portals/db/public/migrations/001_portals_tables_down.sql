BEGIN;
-- Rollback for 001_portals_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_portals_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.portals CASCADE;

COMMIT;

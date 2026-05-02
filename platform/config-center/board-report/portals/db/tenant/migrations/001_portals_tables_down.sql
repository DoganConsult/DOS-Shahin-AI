-- Rollback for 001_portals_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_portals_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.portals_records CASCADE;

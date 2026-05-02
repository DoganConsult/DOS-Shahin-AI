-- Rollback for 001_reporting_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_reporting_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.reporting_records CASCADE;

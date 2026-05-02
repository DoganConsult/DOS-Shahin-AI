-- Rollback for 001_exception_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_exception_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.exception_records CASCADE;

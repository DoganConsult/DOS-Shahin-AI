-- Rollback for 001_inbox_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_inbox_records_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.inbox_records CASCADE;
